import "server-only";

import type { createServiceRoleClient } from "@/lib/supabase/service-role";
import { maybePushFromSocialThongBao } from "@/lib/push/su-kien";

export type ThongBaoLoai = "thong_tin" | "hanh_dong" | "mention_binh_luan";

type InsertRow = {
  nguoi_nhan: string;
  loai: ThongBaoLoai;
  noi_dung: string;
  loai_doi_tuong: string;
  id_doi_tuong: string;
  noi_dung_ai?: string | null;
  da_doc?: boolean;
  xu_ly_luc?: string | null;
};

/** Insert `social_thong_bao` — DB yêu cầu `loai` + `noi_dung` NOT NULL. */
export async function insertSocialThongBao(
  admin: ReturnType<typeof createServiceRoleClient>,
  row: InsertRow,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data, error } = await admin
    .from("social_thong_bao")
    .insert({
      nguoi_nhan: row.nguoi_nhan,
      loai: row.loai,
      noi_dung: row.noi_dung,
      loai_doi_tuong: row.loai_doi_tuong,
      id_doi_tuong: row.id_doi_tuong,
      noi_dung_ai: row.noi_dung_ai ?? null,
      da_doc: row.da_doc ?? false,
      xu_ly_luc: row.xu_ly_luc ?? null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data?.id) {
    return { ok: false, error: error?.message ?? "Không tạo được thông báo." };
  }

  /* FCM: chỉ loại trong allowlist (su-kien.ts). Vanity không push. */
  maybePushFromSocialThongBao({
    nguoi_nhan: row.nguoi_nhan,
    noi_dung: row.noi_dung,
    loai_doi_tuong: row.loai_doi_tuong,
    id_doi_tuong: row.id_doi_tuong,
  });

  return { ok: true, id: data.id };
}
