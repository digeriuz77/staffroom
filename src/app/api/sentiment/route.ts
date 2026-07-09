import { NextResponse } from "next/server";
import { searchSchoolOnReddit } from "@/lib/reddit/client";
import { staticSentimentFor } from "@/lib/data/sentiment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { schoolName?: string; schoolId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const schoolName = (body.schoolName ?? "").trim();
  if (!schoolName) return NextResponse.json({ error: "schoolName is required" }, { status: 400 });

  const reddit = await searchSchoolOnReddit(schoolName);

  let posts = reddit.posts;
  let redditStatus: "live" | "fallback" | "unavailable" = "unavailable";

  if (reddit.source === "live") {
    redditStatus = posts.length > 0 ? "live" : "fallback";
  }

  if (posts.length < 3) {
    const fallback = staticSentimentFor(schoolName).map((p) => ({ ...p, school: schoolName }));
    posts = [...posts, ...fallback].slice(0, 12);
  }

  return NextResponse.json({
    count: posts.length,
    redditStatus,
    redditReason: reddit.reason,
    posts,
  });
}
