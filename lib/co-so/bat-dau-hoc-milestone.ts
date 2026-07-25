import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { todayYmdVn } from "@/lib/co-so/ky-hoc";

/**
 * Cột mốc Journey «Bắt đầu học tại …» sau khi đóng học phí lần đầu.
 * Idempotent theo user + khóa + nguon_goc.
 */
export async function ensureBatDauHocMilestone(params: {
  userId: string;
  orgId: string;
  orgTen: string;
  orgSlug: string;
  khoaId: string;
  tenKhoa: string;
  lopId?: string | null;
}): Promise<{ ok: true; cotMocId: string; created: boolean } | { ok: false; error: string }> {
  const admin = createServiceRoleClient();

  const { data: existing } = await admin
    .from("content_cot_moc")
    .select("id")
    .eq("id_nguoi_dung", params.userId)
    .eq("id_khoa_hoc", params.khoaId)
    .eq("nguon_goc", "sinh_tu_hoc_vien_lop")
    .maybeSingle<{ id: string }>();

  if (existing?.id) {
    return { ok: true, cotMocId: existing.id, created: false };
  }

  const tieuDe = `Bắt đầu học ${params.tenKhoa} tại ${params.orgTen}`;
  const { data: cotMoc, error: cotErr } = await admin
    .from("content_cot_moc")
    .insert({
      id_nguoi_dung: params.userId,
      loai_moc: "hoc",
      nguon_goc: "sinh_tu_hoc_vien_lop",
      tieu_de: tieuDe,
      mo_ta: `Học viên bắt đầu khóa ${params.tenKhoa} @ ${params.orgTen}.`,
      thoi_diem: todayYmdVn(),
      che_do_hien_thi: "public",
      id_to_chuc: params.orgId,
      id_khoa_hoc: params.khoaId,
      id_lop_hoc: params.lopId ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (cotErr || !cotMoc) {
    return { ok: false, error: cotErr?.message ?? "Không tạo cột mốc." };
  }

  const now = new Date().toISOString();
  const { error: verifyErr } = await admin.from("verify_xac_nhan").insert({
    id_cot_moc: cotMoc.id,
    loai_nguoi_xac_nhan: "to_chuc",
    id_nguoi_xac_nhan: null,
    trang_thai: "da_xac_nhan",
    url_proof: `/co-so/${params.orgSlug}`,
    xu_ly_luc: now,
  });

  if (verifyErr) {
    await admin.from("content_cot_moc").delete().eq("id", cotMoc.id);
    return { ok: false, error: verifyErr.message };
  }

  return { ok: true, cotMocId: cotMoc.id, created: true };
}
