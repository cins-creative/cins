import { NextResponse } from "next/server";

import { loadVerifySummaryForCotMoc } from "@/lib/journey/milestone-verify";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cotMocId = searchParams.get("cotMocId")?.trim();
  if (!cotMocId) {
    return NextResponse.json({ error: "Thiếu cotMocId." }, { status: 400 });
  }

  const summary = await loadVerifySummaryForCotMoc(cotMocId);
  if (!summary) {
    return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  }

  return NextResponse.json(summary);
}
