import { NextResponse } from "next/server";

import { findNgheRolePreview } from "@/lib/articles/nghe-role-preview";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title")?.trim();
  if (!title) {
    return NextResponse.json({ error: "Thiếu title." }, { status: 400 });
  }

  const preview = await findNgheRolePreview(title);
  return NextResponse.json({ preview });
}
