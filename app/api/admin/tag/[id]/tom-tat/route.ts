import { NextResponse } from "next/server";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteCtx = { params: Promise<{ id: string }> };

const MAX_TOM_TAT = 500;

export async function PATCH(req: Request, ctx: RouteCtx) {
  const isAdmin = await getCurrentUserIsCinsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Thiếu id tag." }, { status: 400 });
  }

  let body: { tom_tat?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  if (typeof body.tom_tat !== "string") {
    return NextResponse.json({ error: "tom_tat phải là string." }, { status: 400 });
  }

  const tom_tat = body.tom_tat.trim();
  if (tom_tat.length > MAX_TOM_TAT) {
    return NextResponse.json(
      { error: `tom_tat tối đa ${MAX_TOM_TAT} ký tự.` },
      { status: 400 },
    );
  }

  const admin = createServiceRoleClient();
  const { data: row, error: readErr } = await admin
    .from("article_bai_viet")
    .select("id, loai_bai_viet")
    .eq("id", id)
    .maybeSingle<{ id: string; loai_bai_viet: string }>();

  if (readErr) {
    console.error("[admin/tag/tom-tat] read:", readErr.message);
    return NextResponse.json({ error: "Không đọc được tag." }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Tag không tồn tại." }, { status: 404 });
  }
  if (row.loai_bai_viet !== "keyword" && row.loai_bai_viet !== "phan_mem") {
    return NextResponse.json(
      { error: "Chỉ sửa tag keyword/phan_mem." },
      { status: 400 },
    );
  }

  const { error: writeErr } = await admin
    .from("article_bai_viet")
    .update({
      tom_tat: tom_tat || null,
      meta_description: tom_tat ? tom_tat.slice(0, 200) : null,
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", id);

  if (writeErr) {
    console.error("[admin/tag/tom-tat] write:", writeErr.message);
    return NextResponse.json({ error: "Không cập nhật được." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id, tom_tat: tom_tat || null });
}
