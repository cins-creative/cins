import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Tạo cột mốc Journey verified khi user tạo cộng đồng (org_to_chuc loai cong_dong).
 * Cộng đồng là tổ chức — xác nhận qua verify_xac_nhan (loai to_chuc).
 */
export async function createCongDongCreatorMilestone(params: {
  creatorId: string;
  orgId: string;
  orgTen: string;
  orgSlug: string;
  orgMoTa?: string | null;
}): Promise<{ ok: true; cotMocId: string } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  const { data: existing } = await admin
    .from("content_cot_moc")
    .select("id")
    .eq("id_nguoi_dung", params.creatorId)
    .eq("id_to_chuc", params.orgId)
    .eq("nguon_goc", "sinh_tu_org_assign")
    .maybeSingle<{ id: string }>();

  if (existing?.id) {
    return { ok: true, cotMocId: existing.id };
  }

  const tieuDe = `Tạo cộng đồng ${params.orgTen}`;
  const moTa =
    params.orgMoTa?.trim() ||
    `Người tạo cộng đồng · ${params.orgTen} trên CINs.`;

  const { data: cotMoc, error: cotErr } = await admin
    .from("content_cot_moc")
    .insert({
      id_nguoi_dung: params.creatorId,
      loai_moc: "thanh_tuu",
      nguon_goc: "sinh_tu_org_assign",
      tieu_de: tieuDe,
      mo_ta: moTa,
      thoi_diem: todayIsoDate(),
      che_do_hien_thi: "public",
      id_to_chuc: params.orgId,
    })
    .select("id")
    .single<{ id: string }>();

  if (cotErr || !cotMoc) {
    return { ok: false, error: cotErr?.message ?? "Không tạo được cột mốc." };
  }

  const now = new Date().toISOString();
  const { error: verifyErr } = await admin.from("verify_xac_nhan").insert({
    id_cot_moc: cotMoc.id,
    loai_nguoi_xac_nhan: "to_chuc",
    id_nguoi_xac_nhan: null,
    trang_thai: "da_xac_nhan",
    url_proof: `/cong-dong/${params.orgSlug}`,
    xu_ly_luc: now,
  });

  if (verifyErr) {
    await admin.from("content_cot_moc").delete().eq("id", cotMoc.id);
    return { ok: false, error: verifyErr.message };
  }

  return { ok: true, cotMocId: cotMoc.id };
}
