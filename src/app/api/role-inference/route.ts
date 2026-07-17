import { NextResponse } from "next/server";
import { inferRole } from "@/lib/analysis/roleInference";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { role?: string; text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const text = (body.role ?? body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "role or text is required" }, { status: 400 });

  const prediction = inferRole(text);
  return NextResponse.json(prediction);
}
