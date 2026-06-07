import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { findExactAlias, suggestFuzzy } from "@/lib/tag/dedup";

export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { ten?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const ten = typeof body.ten === "string" ? body.ten.trim() : "";
  if (!ten) {
    return NextResponse.json({ error: "Thiếu ten." }, { status: 400 });
  }

  const exact = await findExactAlias(ten);
  if (exact) {
    return NextResponse.json({
      type: "exact",
      match: exact,
    });
  }

  const suggestions = await suggestFuzzy(ten);
  return NextResponse.json({
    type: "fuzzy",
    suggestions,
  });
}
