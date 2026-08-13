import { NextResponse } from "next/server";

import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string; ptId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id: orgId, ptId } = await context.params;
  if (!orgId?.trim() || !ptId?.trim()) {
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
  if ("ten_phuong_thuc" in body) {
    patch.ten_phuong_thuc = String(body.ten_phuong_thuc ?? "").trim() || null;
  }
  if ("ap_dung_tat_ca_nganh" in body) {
    patch.ap_dung_tat_ca_nganh = body.ap_dung_tat_ca_nganh === true;
  }
  if ("id_nganh_ap_dung" in body) {
    patch.id_nganh_ap_dung = Array.isArray(body.id_nganh_ap_dung)
      ? (body.id_nganh_ap_dung as string[]).filter(Boolean)
      : null;
  }
  if ("chi_tieu_phuong_thuc" in body) {
    const chi =
      body.chi_tieu_phuong_thuc === null || body.chi_tieu_phuong_thuc === ""
        ? null
        : Number(body.chi_tieu_phuong_thuc);
    patch.chi_tieu_phuong_thuc =
      chi != null && !Number.isNaN(chi) ? chi : null;
  }
  if ("tieu_chi" in body || "dieu_kien" in body) {
    patch.tieu_chi =
      typeof body.tieu_chi === "object" && body.tieu_chi !== null
        ? body.tieu_chi
        : typeof body.dieu_kien === "string" && body.dieu_kien.trim()
          ? { dieu_kien: body.dieu_kien.trim() }
          : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("org_phuong_thuc_xet_tuyen")
    .update(patch)
    .eq("id", ptId)
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

export async function DELETE(_request: Request, context: RouteContext) {
  const { id: orgId, ptId } = await context.params;
  if (!orgId?.trim() || !ptId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(_request, orgId);
  if (denied) return denied;

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("org_phuong_thuc_xet_tuyen")
    .delete()
    .eq("id", ptId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
