import { NextResponse } from "next/server";

import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id: orgId } = await context.params;
  if (!orgId?.trim()) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(request, orgId);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id_tuyen_sinh_nam = String(body.id_tuyen_sinh_nam ?? "").trim();
  const ten_phuong_thuc = String(body.ten_phuong_thuc ?? "").trim();
  if (!id_tuyen_sinh_nam || !ten_phuong_thuc) {
    return NextResponse.json({ error: "Thiếu trường bắt buộc" }, { status: 400 });
  }

  const ap_dung_tat_ca_nganh = body.ap_dung_tat_ca_nganh === true;
  const id_nganh_ap_dung =
    !ap_dung_tat_ca_nganh && Array.isArray(body.id_nganh_ap_dung)
      ? (body.id_nganh_ap_dung as string[]).filter(Boolean)
      : null;

  const chi =
    body.chi_tieu_phuong_thuc === null || body.chi_tieu_phuong_thuc === ""
      ? null
      : Number(body.chi_tieu_phuong_thuc);
  const chi_tieu_phuong_thuc =
    chi != null && !Number.isNaN(chi) ? chi : null;

  const tieu_chi =
    typeof body.tieu_chi === "object" && body.tieu_chi !== null
      ? body.tieu_chi
      : typeof body.dieu_kien === "string" && body.dieu_kien.trim()
        ? { dieu_kien: body.dieu_kien.trim() }
        : null;

  const supabase = createServiceRoleClient();

  const { data: tsRow, error: tsErr } = await supabase
    .from("org_tuyen_sinh_nam")
    .select("id, org_truong_nganh!inner ( id_to_chuc )")
    .eq("id", id_tuyen_sinh_nam)
    .maybeSingle();

  if (tsErr) {
    return NextResponse.json({ error: tsErr.message }, { status: 500 });
  }
  const tsOrgId = (
    tsRow as { org_truong_nganh?: { id_to_chuc?: string } | null } | null
  )?.org_truong_nganh?.id_to_chuc;
  if (!tsRow || tsOrgId !== orgId.trim()) {
    return NextResponse.json(
      { error: "Năm tuyển sinh không thuộc trường này" },
      { status: 400 },
    );
  }

  const thuFromBody =
    body.thu_tu_uu_tien === null || body.thu_tu_uu_tien === ""
      ? null
      : Number(body.thu_tu_uu_tien);

  let thu_tu_uu_tien =
    thuFromBody != null && !Number.isNaN(thuFromBody) ? thuFromBody : null;

  if (thu_tu_uu_tien == null) {
    const { data: existing, error: countErr } = await supabase
      .from("org_phuong_thuc_xet_tuyen")
      .select("thu_tu_uu_tien")
      .eq("id_tuyen_sinh_nam", id_tuyen_sinh_nam);

    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 500 });
    }

    const maxThu = (existing ?? []).reduce((m, row) => {
      const n = (row as { thu_tu_uu_tien?: number }).thu_tu_uu_tien;
      return typeof n === "number" && n > m ? n : m;
    }, 0);
    thu_tu_uu_tien = maxThu + 1;
  }

  const { data, error } = await supabase
    .from("org_phuong_thuc_xet_tuyen")
    .insert({
      id_tuyen_sinh_nam,
      ten_phuong_thuc,
      ap_dung_tat_ca_nganh,
      id_nganh_ap_dung,
      chi_tieu_phuong_thuc,
      tieu_chi,
      thu_tu_uu_tien,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ row: data });
}
