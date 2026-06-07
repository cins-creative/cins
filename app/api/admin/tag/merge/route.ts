import { NextResponse } from "next/server";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { mergeAdminTags } from "@/lib/tag/admin-merge";

export async function POST(req: Request) {
  const isAdmin = await getCurrentUserIsCinsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  let body: { id_giu?: string; id_gop?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const id_giu = typeof body.id_giu === "string" ? body.id_giu.trim() : "";
  const id_gop = typeof body.id_gop === "string" ? body.id_gop.trim() : "";
  if (!id_giu || !id_gop) {
    return NextResponse.json({ error: "Thiếu id_giu hoặc id_gop." }, { status: 400 });
  }

  const result = await mergeAdminTags(id_giu, id_gop);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id_giu, id_gop });
}
