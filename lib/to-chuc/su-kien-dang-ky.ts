import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const LOAI_PHAN_HOI_SU_KIEN = ["quan_tam", "se_tham_gia"] as const;
export type LoaiPhanHoiSuKien = (typeof LOAI_PHAN_HOI_SU_KIEN)[number];

const LOAI_SET = new Set<string>(LOAI_PHAN_HOI_SU_KIEN);
const TRANG_THAI_HUY = new Set(["tu_choi", "huy"]);

export function isLoaiPhanHoiSuKien(value: unknown): value is LoaiPhanHoiSuKien {
  return typeof value === "string" && LOAI_SET.has(value);
}

type DangKyRow = {
  id: string;
  loai_phan_hoi: string;
  trang_thai: string;
};

async function getSuKienMeta(suKienId: string): Promise<{
  orgId: string;
  slotToiDa: number | null;
} | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_su_kien")
    .select("id_to_chuc, slot_toi_da")
    .eq("id", suKienId)
    .maybeSingle<{ id_to_chuc: string; slot_toi_da: number | null }>();
  if (!data?.id_to_chuc) return null;
  return {
    orgId: data.id_to_chuc,
    slotToiDa:
      typeof data.slot_toi_da === "number" && data.slot_toi_da > 0
        ? data.slot_toi_da
        : null,
  };
}

export async function demDangKySeThamGia(
  suKienIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!suKienIds.length) return counts;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_dang_ky_su_kien")
    .select("id_su_kien, loai_phan_hoi, trang_thai")
    .in("id_su_kien", suKienIds);

  for (const row of data ?? []) {
    const sid = (row as { id_su_kien?: string }).id_su_kien;
    const loai = (row as { loai_phan_hoi?: string }).loai_phan_hoi;
    const trangThai = (row as { trang_thai?: string }).trang_thai ?? "";
    if (!sid || loai !== "se_tham_gia" || TRANG_THAI_HUY.has(trangThai)) continue;
    counts.set(sid, (counts.get(sid) ?? 0) + 1);
  }
  return counts;
}

export async function layPhanHoiViewer(
  suKienId: string,
  profileId: string,
): Promise<LoaiPhanHoiSuKien | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_dang_ky_su_kien")
    .select("loai_phan_hoi, trang_thai")
    .eq("id_su_kien", suKienId)
    .eq("id_nguoi_dung", profileId)
    .maybeSingle<{ loai_phan_hoi: string; trang_thai: string }>();

  if (!data?.loai_phan_hoi || TRANG_THAI_HUY.has(data.trang_thai)) return null;
  return isLoaiPhanHoiSuKien(data.loai_phan_hoi) ? data.loai_phan_hoi : null;
}

export async function datPhanHoiSuKien(
  suKienId: string,
  profileId: string,
  loai: LoaiPhanHoiSuKien,
): Promise<
  | {
      ok: true;
      loai: LoaiPhanHoiSuKien | null;
      soDangKy: number;
    }
  | { ok: false; error: string }
> {
  const meta = await getSuKienMeta(suKienId);
  if (!meta) return { ok: false, error: "Không tìm thấy sự kiện." };

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("org_dang_ky_su_kien")
    .select("id, loai_phan_hoi, trang_thai")
    .eq("id_su_kien", suKienId)
    .eq("id_nguoi_dung", profileId)
    .maybeSingle<DangKyRow>();

  if (
    existing &&
    !TRANG_THAI_HUY.has(existing.trang_thai) &&
    existing.loai_phan_hoi === loai
  ) {
    const { error: delErr } = await admin
      .from("org_dang_ky_su_kien")
      .delete()
      .eq("id", existing.id);
    if (delErr) return { ok: false, error: delErr.message };
    const counts = await demDangKySeThamGia([suKienId]);
    return { ok: true, loai: null, soDangKy: counts.get(suKienId) ?? 0 };
  }

  if (loai === "se_tham_gia" && meta.slotToiDa != null) {
    const counts = await demDangKySeThamGia([suKienId]);
    const current = counts.get(suKienId) ?? 0;
    const alreadySeThamGia =
      existing &&
      !TRANG_THAI_HUY.has(existing.trang_thai) &&
      existing.loai_phan_hoi === "se_tham_gia";
    if (!alreadySeThamGia && current >= meta.slotToiDa) {
      return { ok: false, error: "Sự kiện đã hết chỗ." };
    }
  }

  const payload = {
    id_su_kien: suKienId,
    id_nguoi_dung: profileId,
    loai_phan_hoi: loai,
    trang_thai: "da_duyet" as const,
  };

  if (existing && !TRANG_THAI_HUY.has(existing.trang_thai)) {
    const { error } = await admin
      .from("org_dang_ky_su_kien")
      .update(payload)
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await admin.from("org_dang_ky_su_kien").upsert(payload, {
      onConflict: "id_su_kien,id_nguoi_dung",
    });
    if (error) return { ok: false, error: error.message };
  }

  const counts = await demDangKySeThamGia([suKienId]);
  return { ok: true, loai, soDangKy: counts.get(suKienId) ?? 0 };
}
