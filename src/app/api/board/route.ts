import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/db/supabaseClients";
import { resolveSchool } from "@/lib/db/schoolResolver";
import { countUrls, validateFormToken, type BoardPostRow } from "@/lib/board";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request) {
  const client = supabaseServer();
  if (!client) return NextResponse.json({ posts: [] });

  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country")?.trim() ?? "";
  const q = searchParams.get("q")?.trim() ?? "";
  const limitRaw = Number(searchParams.get("limit") ?? 30);
  const limit = Math.min(
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 30,
    60,
  );

  let query = client
    .from("board_posts")
    .select("*")
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString());

  if (country) query = query.ilike("country", country);
  if (q) {
    // Strip PostgREST filter syntax characters before interpolating.
    const safe = q.replace(/[(),]/g, " ").trim();
    if (safe) {
      query = query.or(
        `title.ilike.%${safe}%,school_name.ilike.%${safe}%,body.ilike.%${safe}%`,
      );
    }
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ posts: (data ?? []) as BoardPostRow[] });
}

interface CreatePostBody {
  title?: string;
  body?: string;
  schoolName?: string;
  city?: string;
  country?: string;
  roleType?: string;
  salaryMinUsd?: number | null;
  salaryMaxUsd?: number | null;
  currency?: string;
  applyUrl?: string;
  contactEmail?: string;
  website?: string;
  formToken?: string;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let body: CreatePostBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const client = supabaseServer();
  if (!client) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const { data: session, error: sessionErr } = await client.auth.getUser(authHeader.slice(7));
  if (sessionErr || !session.user) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }
  const userId = session.user.id;

  // Honeypot: real users never fill this field. Keep the error generic.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ error: "Could not submit post" }, { status: 400 });
  }

  const tokenCheck = validateFormToken(body.formToken ?? "");
  if (!tokenCheck.ok) {
    return NextResponse.json({ error: "Could not submit post" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  const postBody = (body.body ?? "").trim();
  const schoolName = (body.schoolName ?? "").trim();
  const country = (body.country ?? "").trim();
  const city = (body.city ?? "").trim();
  const applyUrl = (body.applyUrl ?? "").trim();
  const contactEmail = (body.contactEmail ?? "").trim();

  if (title.length < 8 || title.length > 140) {
    return NextResponse.json({ error: "Title must be between 8 and 140 characters" }, { status: 422 });
  }
  if (postBody.length < 40 || postBody.length > 8000) {
    return NextResponse.json({ error: "Description must be between 40 and 8000 characters" }, { status: 422 });
  }
  if (!schoolName) {
    return NextResponse.json({ error: "School name is required" }, { status: 422 });
  }
  if (!country) {
    return NextResponse.json({ error: "Country is required" }, { status: 422 });
  }
  if (applyUrl && !isValidHttpUrl(applyUrl)) {
    return NextResponse.json({ error: "Apply URL must be a valid http(s) link" }, { status: 422 });
  }
  if (contactEmail && !EMAIL_RE.test(contactEmail)) {
    return NextResponse.json({ error: "Contact email is not valid" }, { status: 422 });
  }

  const salaryMin = body.salaryMinUsd ?? null;
  const salaryMax = body.salaryMaxUsd ?? null;
  if (salaryMin != null && (typeof salaryMin !== "number" || !Number.isFinite(salaryMin) || salaryMin < 0)) {
    return NextResponse.json({ error: "Salary minimum must be a number of at least 0" }, { status: 422 });
  }
  if (salaryMax != null && (typeof salaryMax !== "number" || !Number.isFinite(salaryMax) || salaryMax < 0)) {
    return NextResponse.json({ error: "Salary maximum must be a number of at least 0" }, { status: 422 });
  }
  if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) {
    return NextResponse.json({ error: "Salary minimum cannot exceed the maximum" }, { status: 422 });
  }

  if (countUrls(postBody) > 3) {
    return NextResponse.json({ error: "Too many links" }, { status: 422 });
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentPosts } = await client
    .from("board_posts")
    .select("id")
    .eq("author_id", userId)
    .gte("created_at", dayAgo);
  if ((recentPosts ?? []).length >= 5) {
    return NextResponse.json({ error: "Posting limit reached (5 per day)" }, { status: 429 });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: duplicates } = await client
    .from("board_posts")
    .select("id")
    .eq("author_id", userId)
    .eq("title", title)
    .gte("created_at", weekAgo)
    .limit(1);
  if ((duplicates ?? []).length > 0) {
    return NextResponse.json({ error: "You already posted this recently" }, { status: 409 });
  }

  const resolved = await resolveSchool(schoolName, city, country);
  const schoolId = resolved?.schoolId ?? null;

  const { data, error } = await client
    .from("board_posts")
    .insert({
      author_id: userId,
      school_id: schoolId,
      school_name: schoolName,
      title,
      body: postBody,
      country,
      city: city || null,
      role_type: body.roleType?.trim() || "Teacher",
      salary_min_usd: salaryMin,
      salary_max_usd: salaryMax,
      currency: body.currency?.trim() || "USD",
      apply_url: applyUrl || null,
      contact_email: contactEmail || null,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: (data as { id: string }).id });
}
