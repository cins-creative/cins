import { NextResponse } from "next/server";

import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";
import { hideNganhProgramFromOrg } from "@/lib/truong/nganh-program-crud";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string; programId: string }> };

const FIELDS = [
  "ten_chuong_trinh",
  "tom_tat",
  "tieu_de_eng",
  "he_dao_tao",
  "thoi_gian_thang",
  "cover_id",
  "trang_thai_chuong_trinh",
] as const;

export async function PATCH(request: Request, context: RouteContext) {
  const { id: orgId, programId } = await context.params;
  if (!orgId?.trim() || !programId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(request, orgId);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  for (const key of FIELDS) {
    if (key in body) patch[key] = body[key];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("org_truong_nganh")
    .update(patch)
    .eq("id", programId)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ program: data });
}

/** Ẩn ngành khỏi trang trường (`trang_thai_chuong_trinh = tam_dung`), không xóa dữ liệu liên quan. */
export async function DELETE(_request: Request, context: RouteContext) {
  const { id: orgId, programId } = await context.params;
  if (!orgId?.trim() || !programId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(_request, orgId);
  if (denied) return denied;

  const supabase = createServiceRoleClient();
  const result = await hideNganhProgramFromOrg(
    supabase,
    orgId.trim(),
    programId.trim(),
  );

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true, hidden: true });
}
