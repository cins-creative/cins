/**
 * Engine ưu đãi thuần (không I/O) — combo đa phạm vi + voucher.
 * Plan: docs/PLAN_shop_combo_voucher.md §3.3b · §4.3
 */

import type {
  ShopCombo,
  ShopComboApDung,
  ShopComboDieuKien,
  ShopComboPhamVi,
  ShopGioChungDong,
  ShopLoaiGiam,
  ShopVoucher,
} from "./types";

export type UuDaiUnit = {
  key: string;
  idBienThe: string;
  idSanPham: string;
  idNhom: string | null;
  gia: number;
  used: boolean;
};

const PHAM_VI_ORDER: ShopComboPhamVi[] = ["bien_the", "san_pham", "loai_hang"];
const MAX_COMBO_LAP = 20;
const MAX_COMBOS_PER_SHOP = 20;

export function roundVnd(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

/** Quy dòng giỏ → danh sách unit (mỗi unit = 1 món). */
export function buildUnits(dong: ShopGioChungDong[]): UuDaiUnit[] {
  const units: UuDaiUnit[] = [];
  let i = 0;
  for (const d of dong) {
    if (d.ngungBan) continue;
    const qty = Math.max(0, Math.trunc(d.soLuong));
    for (let q = 0; q < qty; q++) {
      units.push({
        key: `${d.idBienThe}:${i++}`,
        idBienThe: d.idBienThe,
        idSanPham: d.idSanPham,
        idNhom: d.idNhom,
        gia: d.giaHienThi,
        used: false,
      });
    }
  }
  return units;
}

export function tongHangFromUnits(units: UuDaiUnit[]): number {
  return roundVnd(units.reduce((s, u) => s + u.gia, 0));
}

function unitMatchesDieuKien(
  u: UuDaiUnit,
  dk: ShopComboDieuKien,
): boolean {
  if (dk.phamVi === "bien_the") return u.idBienThe === dk.idBienThe;
  if (dk.phamVi === "san_pham") return u.idSanPham === dk.idSanPham;
  if (dk.phamVi === "loai_hang") {
    return u.idNhom != null && u.idNhom === dk.idNhom;
  }
  return false;
}

/**
 * Thử khớp 1 lần combo trên pool unit còn trống.
 * Gán theo thứ tự cụ thể → rộng; mỗi unit chỉ 1 điều kiện.
 * Trả về keys đã dùng nếu khớp đủ mọi điều kiện; null nếu không.
 */
function tryMatchOnce(
  units: UuDaiUnit[],
  dieuKien: ShopComboDieuKien[],
): string[] | null {
  if (dieuKien.length === 0) return null;
  const free = units.filter((u) => !u.used);
  const claimed = new Set<string>();
  const ordered = [...dieuKien].sort(
    (a, b) => PHAM_VI_ORDER.indexOf(a.phamVi) - PHAM_VI_ORDER.indexOf(b.phamVi),
  );

  for (const dk of ordered) {
    let need = dk.soLuong;
    for (const u of free) {
      if (need <= 0) break;
      if (claimed.has(u.key)) continue;
      if (!unitMatchesDieuKien(u, dk)) continue;
      claimed.add(u.key);
      need -= 1;
    }
    if (need > 0) return null;
  }
  return [...claimed];
}

function tinhTienGiamMotLan(
  loaiGiam: ShopLoaiGiam,
  giaTri: number,
  giamToiDa: number | null,
  tongHangCombo: number,
): number {
  if (tongHangCombo <= 0) return 0;
  let giam: number;
  if (loaiGiam === "phan_tram") {
    giam = (tongHangCombo * giaTri) / 100;
    if (giamToiDa != null && giamToiDa > 0) {
      giam = Math.min(giam, giamToiDa);
    }
  } else {
    giam = giaTri;
  }
  return roundVnd(Math.min(giam, tongHangCombo));
}

function comboConHieuLuc(c: ShopCombo, now: Date): boolean {
  if (!c.kichHoat) return false;
  if (c.dieuKienLoi) return false;
  if (c.dieuKien.length === 0) return false;
  if (c.batDau && new Date(c.batDau) > now) return false;
  if (c.ketThuc && new Date(c.ketThuc) <= now) return false;
  return true;
}

/**
 * Khớp combo greedy: ước lượng giảm lần 1 → sắp giảm dần → áp lần lượt.
 * Mỗi unit chỉ thuộc 1 combo.
 */
export function tinhGiamCombo(
  units: UuDaiUnit[],
  combos: ShopCombo[],
  now: Date = new Date(),
): {
  tongHang: number;
  giamCombo: number;
  apDung: ShopComboApDung[];
} {
  const tongHang = tongHangFromUnits(units);
  const active = combos
    .filter((c) => comboConHieuLuc(c, now))
    .slice(0, MAX_COMBOS_PER_SHOP);

  if (active.length === 0 || units.length === 0) {
    return { tongHang, giamCombo: 0, apDung: [] };
  }

  /* Ước lượng giảm 1 lần (không đánh dấu used) để xếp hạng. */
  const ranked = active
    .map((c) => {
      const keys = tryMatchOnce(units, c.dieuKien);
      if (!keys) return { c, estimate: 0 };
      const sum = units
        .filter((u) => keys.includes(u.key))
        .reduce((s, u) => s + u.gia, 0);
      return {
        c,
        estimate: tinhTienGiamMotLan(c.loaiGiam, c.giaTri, c.giamToiDa, sum),
      };
    })
    .filter((x) => x.estimate > 0)
    .sort((a, b) => b.estimate - a.estimate || a.c.thuTu - b.c.thuTu);

  const apDung: ShopComboApDung[] = [];
  let giamCombo = 0;

  for (const { c } of ranked) {
    let soLan = 0;
    let tien = 0;
    const maxLap = c.apDungLap ? MAX_COMBO_LAP : 1;
    for (let lap = 0; lap < maxLap; lap++) {
      const keys = tryMatchOnce(units, c.dieuKien);
      if (!keys) break;
      const sum = units
        .filter((u) => keys.includes(u.key))
        .reduce((s, u) => s + u.gia, 0);
      const g = tinhTienGiamMotLan(c.loaiGiam, c.giaTri, c.giamToiDa, sum);
      if (g <= 0) break;
      for (const k of keys) {
        const u = units.find((x) => x.key === k);
        if (u) u.used = true;
      }
      soLan += 1;
      tien += g;
    }
    if (soLan > 0) {
      apDung.push({ idCombo: c.id, ten: c.ten, soLan, tien });
      giamCombo += tien;
    }
  }

  giamCombo = roundVnd(Math.min(giamCombo, tongHang));
  return { tongHang, giamCombo, apDung };
}

/** Giảm voucher trên tongSauCombo; don_toi_thieu so với tongHang. */
export function tinhGiamVoucher(
  tongSauCombo: number,
  tongHang: number,
  v: Pick<
    ShopVoucher,
    "loaiGiam" | "giaTri" | "giamToiDa" | "donToiThieu"
  >,
): number {
  if (tongHang < (v.donToiThieu ?? 0)) return 0;
  if (tongSauCombo <= 0) return 0;
  return tinhTienGiamMotLan(
    v.loaiGiam,
    v.giaTri,
    v.giamToiDa,
    tongSauCombo,
  );
}

export function applyUuDai(
  dong: ShopGioChungDong[],
  combos: ShopCombo[],
  voucher: ShopVoucher | null,
  now: Date = new Date(),
): {
  tongHang: number;
  giamCombo: number;
  comboApDung: ShopComboApDung[];
  giamVoucher: number;
  tongTien: number;
} {
  const units = buildUnits(dong);
  const { tongHang, giamCombo, apDung } = tinhGiamCombo(units, combos, now);
  const sauCombo = Math.max(0, tongHang - giamCombo);
  const giamVoucher = voucher
    ? tinhGiamVoucher(sauCombo, tongHang, voucher)
    : 0;
  const tongTien = Math.max(0, sauCombo - giamVoucher);
  return {
    tongHang,
    giamCombo,
    comboApDung: apDung,
    giamVoucher,
    tongTien,
  };
}
