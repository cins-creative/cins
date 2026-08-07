/** Helpers combo storefront — client-safe. */

import {
  shopLoaiHref,
  shopLoaiMauHref,
  shopSlugFromTen,
} from "@/lib/shop/cua-hang-href";
import type { ShopCombo, ShopComboDieuKien } from "@/lib/shop/types";

export function comboTrangThaiPublic(combo: ShopCombo): string {
  if (!combo.kichHoat) return "Tắt";
  const now = Date.now();
  if (combo.batDau && Date.parse(combo.batDau) > now) return "Chưa bắt đầu";
  if (combo.ketThuc && Date.parse(combo.ketThuc) <= now) return "Hết hạn";
  if (combo.dieuKienLoi) return "Lỗi điều kiện";
  return "Đang chạy";
}

/** URL trang loại/mẫu cho một dòng điều kiện combo. */
export function comboDieuKienHref(
  dk: Pick<
    ShopComboDieuKien,
    "phamVi" | "idNhom" | "idSanPham" | "idBienThe"
  >,
  ownerSlug: string,
  shopName: string | null | undefined,
  comboId?: string,
): string | null {
  const shopSeg = shopSlugFromTen(shopName, ownerSlug);
  const comboQ = comboId
    ? `?combo=${encodeURIComponent(comboId)}`
    : "";

  if (dk.phamVi === "loai_hang" && dk.idNhom) {
    return `${shopLoaiHref(ownerSlug, shopSeg, dk.idNhom)}${comboQ}`;
  }
  if (dk.idNhom && dk.idSanPham) {
    const base = shopLoaiMauHref(
      ownerSlug,
      shopSeg,
      dk.idNhom,
      dk.idSanPham,
    );
    return comboId ? `${base}&combo=${encodeURIComponent(comboId)}` : base;
  }
  if (dk.idNhom) {
    return `${shopLoaiHref(ownerSlug, shopSeg, dk.idNhom)}${comboQ}`;
  }
  return null;
}

/** «Mua ngay» → loại/mẫu của điều kiện đầu tiên. */
export function comboMuaNgayHref(
  combo: ShopCombo,
  ownerSlug: string,
  shopName: string | null | undefined,
): string | null {
  const first = combo.dieuKien[0];
  if (!first) return null;
  return comboDieuKienHref(first, ownerSlug, shopName, combo.id);
}

export const COMBO_ACTIVE_STORAGE_PREFIX = "cins:combo-active:";

export function rememberActiveCombo(sellerId: string, comboId: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      `${COMBO_ACTIVE_STORAGE_PREFIX}${sellerId}`,
      comboId,
    );
  } catch {
    /* quota / private mode */
  }
}
