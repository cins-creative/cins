import "server-only";

import { getCinsTaiChinh } from "@/lib/cins/tai-chinh-config";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Đã chốt: tối đa 1 lần tự khai / hoá đơn. */
export const TU_KHAI_TOI_DA = 1;

export type TuKhaiHoaDonSnap = {
  trangThai: string;
  tuKhaiLan: number;
  tuKhaiDaTraLuc: string | null;
};

export type CoTheTuKhaiResult =
  | { ok: true }
  | { ok: false; lyDo: "het_luot_tu_khai" | "khong_con_no" };

export function coTheTuKhai(hd: TuKhaiHoaDonSnap): CoTheTuKhaiResult {
  if (hd.trangThai !== "chua_tra" && hd.trangThai !== "qua_han") {
    return { ok: false, lyDo: "khong_con_no" };
  }
  if (Math.max(0, Math.floor(hd.tuKhaiLan)) >= TU_KHAI_TOI_DA) {
    return { ok: false, lyDo: "het_luot_tu_khai" };
  }
  return { ok: true };
}

export function anHanConHieuLuc(
  hd: { tuKhaiDaTraLuc: string | null },
  soNgay: number,
  now = new Date(),
): boolean {
  const iso = hd.tuKhaiDaTraLuc?.trim();
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  const ms = Math.max(0, Math.floor(soNgay)) * 86_400_000;
  return now.getTime() - t <= ms;
}

export function anHanDenIso(
  tuKhaiDaTraLuc: string | null | undefined,
  soNgay: number,
): string | null {
  const iso = tuKhaiDaTraLuc?.trim();
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Date(
    t + Math.max(0, Math.floor(soNgay)) * 86_400_000,
  ).toISOString();
}

/** Số ngày ân hạn từ `/admin/tai-chinh` (`cins_cau_hinh_tai_chinh.so_ngay_an_han_tu_khai`). */
export async function getSoNgayAnHanTuKhai(): Promise<number> {
  const cfg = await getCinsTaiChinh();
  return Math.max(0, Math.floor(cfg.shop.soNgayAnHanTuKhai));
}

/**
 * Ân hạn theo nguồn kỳ (org_phi_ky / shop_phi_ky) → hoá đơn hub.
 * Không có hoá đơn hub → false (không mở rào oan).
 */
export async function anHanChoNguon(input: {
  nguonBang: "org_phi_ky" | "shop_phi_ky";
  nguonId: string;
  now?: Date;
  soNgay?: number;
}): Promise<{ hieuLuc: boolean; anHanDenIso: string | null }> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("cins_hoa_don")
    .select("tu_khai_da_tra_luc, tu_khai_lan")
    .eq("nguon_bang", input.nguonBang)
    .eq("nguon_id", input.nguonId)
    .maybeSingle<{
      tu_khai_da_tra_luc: string | null;
      tu_khai_lan: number | null;
    }>();

  if (!data) {
    return { hieuLuc: false, anHanDenIso: null };
  }

  const soNgay =
    input.soNgay ?? (await getSoNgayAnHanTuKhai());
  const snap = {
    tuKhaiDaTraLuc: data.tu_khai_da_tra_luc,
  };
  const now = input.now ?? new Date();
  const hieuLuc = anHanConHieuLuc(snap, soNgay, now);
  return {
    hieuLuc,
    anHanDenIso: hieuLuc
      ? anHanDenIso(data.tu_khai_da_tra_luc, soNgay)
      : null,
  };
}

/** Batch: map nguon_id → còn ân hạn? */
export async function anHanMapChoNguonIds(input: {
  nguonBang: "org_phi_ky" | "shop_phi_ky";
  nguonIds: string[];
  now?: Date;
  soNgay?: number;
}): Promise<
  Map<string, { hieuLuc: boolean; anHanDenIso: string | null }>
> {
  const out = new Map<
    string,
    { hieuLuc: boolean; anHanDenIso: string | null }
  >();
  const ids = [...new Set(input.nguonIds.filter(Boolean))];
  if (ids.length === 0) return out;

  const soNgay =
    input.soNgay ?? (await getSoNgayAnHanTuKhai());
  const now = input.now ?? new Date();
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("cins_hoa_don")
    .select("nguon_id, tu_khai_da_tra_luc")
    .eq("nguon_bang", input.nguonBang)
    .in("nguon_id", ids);

  for (const id of ids) {
    out.set(id, { hieuLuc: false, anHanDenIso: null });
  }
  for (const r of (data ?? []) as Array<{
    nguon_id: string;
    tu_khai_da_tra_luc: string | null;
  }>) {
    const hieuLuc = anHanConHieuLuc(
      { tuKhaiDaTraLuc: r.tu_khai_da_tra_luc },
      soNgay,
      now,
    );
    out.set(r.nguon_id, {
      hieuLuc,
      anHanDenIso: hieuLuc
        ? anHanDenIso(r.tu_khai_da_tra_luc, soNgay)
        : null,
    });
  }
  return out;
}
