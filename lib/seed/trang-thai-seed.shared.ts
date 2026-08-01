/**
 * Mô hình seed dùng chung (page + nick) — logic thuần, client-safe.
 * Plan: docs/PLAN_mo_hinh_seed.md
 *
 * 3 trạng thái:
 *  - clone      → CINs vận hành, chưa được đồng ý  → hiện disclaimer
 *  - duoc_duyet → chủ thể đã đồng ý, CINs vận hành → ẩn (không disclaimer, chưa tick)
 *  - ban_giao   → chủ thể tự điều hành             → tick xanh
 *  - null       → không phải seed (org/nick thật)
 */

export const TRANG_THAI_SEED = ["clone", "duoc_duyet", "ban_giao"] as const;

export type TrangThaiSeed = (typeof TRANG_THAI_SEED)[number];

/** Trạng thái seed hoặc null (không phải seed). */
export type TrangThaiSeedOrNull = TrangThaiSeed | null;

export function laTrangThaiSeed(v: unknown): v is TrangThaiSeed {
  return (
    typeof v === "string" &&
    (TRANG_THAI_SEED as readonly string[]).includes(v)
  );
}

/** Chuẩn hoá giá trị DB (text) → TrangThaiSeed | null. */
export function chuanHoaTrangThaiSeed(v: unknown): TrangThaiSeedOrNull {
  return laTrangThaiSeed(v) ? v : null;
}

export type SeedDisplay = {
  /** true khi cần hiện dòng «Trang do CINs vận hành» / marker nick. */
  hienDisclaimer: boolean;
  /** true khi được cấp tick xanh (đã bàn giao cho chủ thể thật). */
  hienTick: boolean;
  /** true nếu là thực thể seed (bất kỳ giai đoạn nào). */
  laSeed: boolean;
};

/**
 * Suy diễn hiển thị từ trạng thái seed.
 * Lưu ý: tick xanh page thực tế vẫn key theo `verified_official`; hàm này
 * cho biết trạng thái seed *nên* có tick (dùng cho nick, và để kiểm tra chéo).
 */
export function seedDisplay(state: TrangThaiSeedOrNull): SeedDisplay {
  return {
    hienDisclaimer: state === "clone",
    hienTick: state === "ban_giao",
    laSeed: state !== null,
  };
}

/** Chỉ hiện disclaimer khi đang là clone (chưa được đồng ý). */
export function nenHienDisclaimerSeed(state: TrangThaiSeedOrNull): boolean {
  return state === "clone";
}

/**
 * Map lifecycle nick (`auto_tai_khoan`) → 3 trạng thái seed dùng chung.
 * Nick không có cột `trang_thai_seed` riêng — suy từ 2 trục sẵn có.
 */
export function mapNickSangTrangThaiSeed(nick: {
  trangThaiBanGiao?: string | null;
  trangThaiXinPhep?: string | null;
}): TrangThaiSeed {
  if (nick.trangThaiBanGiao === "da_ban_giao") return "ban_giao";
  if (nick.trangThaiXinPhep === "dong_y") return "duoc_duyet";
  return "clone";
}
