import type { TruongCauHinhMon, TruongCauHinhTinhDiem } from "./types";

/** Thang chấm mặc định khi lưu cấu hình (mọi môn thang 10; hệ số ×2 chỉ nhân điểm). */
export function defaultThangDiemForHeSo(heSo: number): number {
  void heSo;
  return 10;
}

/**
 * Thang dùng cho ô nhập & mẫu số chuẩn hóa.
 * DB có thể ghi thang 20 cho môn hệ số 2 (chuẩn thi); máy tính thống nhất thang 10.
 */
export function effectiveThangDiemForCalc(m: TruongCauHinhMon): number {
  if (m.he_so >= 2 && m.thang_diem === 20) return 10;
  return m.thang_diem > 0 ? m.thang_diem : 10;
}

export function applyHeSoOverrides(
  mon: TruongCauHinhMon[],
  overrides: Record<string, number>,
): TruongCauHinhMon[] {
  if (!Object.keys(overrides).length) return mon;
  return mon.map((m) => ({
    ...m,
    he_so:
      typeof overrides[m.id_mon_thi] === "number"
        ? overrides[m.id_mon_thi]!
        : m.he_so,
  }));
}

/** Tính điểm xét tuyển theo công thức brief. */
export function computeAdmissionScore(
  config: TruongCauHinhTinhDiem,
  inputs: Record<string, number>,
  heSoOverrides?: Record<string, number>,
): { score: number; maxScale: number } | null {
  const mon = applyHeSoOverrides(config.mon, heSoOverrides ?? {});
  if (!mon.length) return null;
  let weighted = 0;
  let tongMax = 0;
  for (const m of mon) {
    const raw = inputs[m.id_mon_thi];
    if (raw == null || Number.isNaN(raw)) continue;
    const thang = effectiveThangDiemForCalc(m);
    weighted += raw * m.he_so;
    tongMax += thang * m.he_so;
  }
  if (tongMax <= 0) return null;
  const score = (weighted / tongMax) * config.quy_ve_thang;
  return { score, maxScale: config.quy_ve_thang };
}
