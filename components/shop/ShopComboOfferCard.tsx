"use client";

import type { ShopCombo, ShopComboPhamVi, ShopLoaiGiam } from "@/lib/shop/types";

export type ShopComboOfferCardProps = {
  ten: string;
  loaiGiam: ShopLoaiGiam;
  giaTri: number;
  giamToiDa?: number | null;
  apDungLap?: boolean;
  dieuKien?: Array<{
    phamVi: ShopComboPhamVi;
    soLuong: number;
    nhan?: string | null;
  }>;
  tenCuaHang?: string | null;
  shopAvatarUrl?: string | null;
  shopBannerUrl?: string | null;
};

function phamViLabel(phamVi: ShopComboPhamVi): string {
  if (phamVi === "loai_hang") return "Loại hàng";
  if (phamVi === "san_pham") return "Mặt hàng";
  return "Biến thể";
}

function formatGiam(
  loaiGiam: ShopLoaiGiam,
  giaTri: number,
  giamToiDa?: number | null,
): string {
  if (loaiGiam === "phan_tram") {
    const cap =
      giamToiDa != null && giamToiDa > 0
        ? ` (tối đa ${giamToiDa.toLocaleString("vi-VN")} ₫)`
        : "";
    return `${giaTri}%${cap}`;
  }
  return `${giaTri.toLocaleString("vi-VN")} ₫`;
}

function shopInitial(ten: string | null | undefined): string {
  const t = ten?.trim();
  if (!t) return "?";
  return t.charAt(0).toUpperCase();
}

/** Thẻ combo mặt tiền shop — layout đồng bộ ShopVoucherCard. */
export function ShopComboOfferCard({
  ten,
  loaiGiam,
  giaTri,
  giamToiDa,
  apDungLap = false,
  dieuKien = [],
  tenCuaHang,
  shopAvatarUrl,
  shopBannerUrl,
}: ShopComboOfferCardProps) {
  const showShopRow = Boolean(tenCuaHang || shopAvatarUrl || shopBannerUrl);
  const conditionLabels = dieuKien.map(
    (dk) => `${dk.nhan?.trim() || phamViLabel(dk.phamVi)} ×${dk.soLuong}`,
  );

  return (
    <article className="shop-voucher-card is-mac-dinh">
      <div className="shop-voucher-card-banner">
        {shopBannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="shop-voucher-card-banner-img"
            src={shopBannerUrl}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : null}
        <div className="shop-voucher-card-banner-shade" aria-hidden />
        {showShopRow ? (
          <div className="shop-voucher-card-shop-row">
            <div className="shop-voucher-card-avatar">
              {shopAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shopAvatarUrl} alt="" loading="lazy" decoding="async" />
              ) : (
                <span aria-hidden>{shopInitial(tenCuaHang)}</span>
              )}
            </div>
            {tenCuaHang ? (
              <span className="shop-voucher-card-shop-name">{tenCuaHang}</span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="shop-voucher-card-body">
        <div className="shop-voucher-card-content">
          <div className="shop-voucher-card-main">
            <div className="shop-voucher-card-title-row">
              <span className="shop-voucher-card-label">Combo</span>
              <p className="shop-voucher-card-ten">{ten}</p>
            </div>
            <p className="shop-voucher-card-giam">
              {formatGiam(loaiGiam, giaTri, giamToiDa)}
            </p>
          </div>
        </div>

        {conditionLabels.length > 0 || apDungLap ? (
          <div className="shop-voucher-card-meta-list">
            {conditionLabels.map((label, i) => (
              <p key={`${label}-${i}`} className="shop-voucher-card-meta">
                {label}
              </p>
            ))}
            {apDungLap ? (
              <p className="shop-voucher-card-meta">Áp dụng nhiều lần</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

/** Map combo API → props card (storefront). */
export function comboToOfferCardProps(
  combo: Pick<
    ShopCombo,
    "ten" | "loaiGiam" | "giaTri" | "giamToiDa" | "apDungLap" | "dieuKien"
  >,
): Omit<
  ShopComboOfferCardProps,
  "tenCuaHang" | "shopAvatarUrl" | "shopBannerUrl"
> {
  return {
    ten: combo.ten,
    loaiGiam: combo.loaiGiam,
    giaTri: combo.giaTri,
    giamToiDa: combo.giamToiDa,
    apDungLap: combo.apDungLap,
    dieuKien: combo.dieuKien.map((dk) => ({
      phamVi: dk.phamVi,
      soLuong: dk.soLuong,
      nhan: dk.nhan,
    })),
  };
}
