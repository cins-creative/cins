import { NextResponse } from "next/server";

import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string; tsId: string }> };

const FIELDS = [
  "chi_tieu",
  "diem_chuan",
  "tinh_trang",
  "ngay_mo_ho_so",
  "ngay_dong_ho_so",
  "ngay_thi_tu",
  "ngay_thi_den",
  "ngay_cong_bo_diem",
  "ngay_xac_nhan_nhap_hoc_tu",
  "ngay_xac_nhan_nhap_hoc_den",
  "ghi_chu_timeline",
  "link_thong_tin",
] as const;

export async function PATCH(request: Request, context: RouteContext) {
  const { id: orgId, tsId } = await context.params;
  if (!orgId?.trim() || !tsId?.trim()) {
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
    .from("org_tuyen_sinh_nam")
    .update(patch)
    .eq("id", tsId)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ row: data });
}
