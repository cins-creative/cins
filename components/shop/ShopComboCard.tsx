"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { ImagePlus, Layers, Package, Tag } from "lucide-react";

import {
  comboDieuKienHref,
  rememberActiveCombo,
} from "@/lib/shop/combo-storefront";
import type {
  ShopCombo,
  ShopComboDieuKien,
  ShopComboPhamVi,
} from "@/lib/shop/types";

function formatGiam(combo: ShopCombo): string {
  if (combo.loaiGiam === "phan_tram") {
    const cap =
      combo.giamToiDa != null
        ? ` (tối đa ${combo.giamToiDa.toLocaleString("vi-VN")} ₫)`
        : "";
    return `${combo.giaTri}%${cap}`;
  }
  return `${combo.giaTri.toLocaleString("vi-VN")} ₫`;
}

function formatGiamHero(combo: ShopCombo): string {
  if (combo.loaiGiam === "phan_tram") {
    return `${combo.giaTri}%`;
  }
  const n = combo.giaTri;
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString("vi-VN", {
      maximumFractionDigits: 1,
    })} triệu`;
  }
  if (n >= 1000) {
    return `${Math.round(n / 1000).toLocaleString("vi-VN")}k`;
  }
  return n.toLocaleString("vi-VN");
}

function phamViLabel(phamVi: ShopComboPhamVi): string {
  if (phamVi === "loai_hang") return "Loại hàng";
  if (phamVi === "san_pham") return "Mặt hàng";
  return "Biến thể";
}

function phamViIcon(phamVi: ShopComboPhamVi) {
  if (phamVi === "loai_hang") return <Layers size={11} aria-hidden />;
  if (phamVi === "san_pham") return <Package size={11} aria-hidden />;
  return <Tag size={11} aria-hidden />;
}

function ConditionBadgeThumb({ dk }: { dk: ShopComboDieuKien }) {
  if (dk.anhUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={dk.anhUrl}
        alt=""
        className="shop-uu-dai-combo-badge-thumb"
      />
    );
  }
  return (
    <span className="shop-uu-dai-combo-badge-thumb is-empty" aria-hidden>
      <ImagePlus size={11} />
    </span>
  );
}

function ConditionBadgeCore({
  dk,
  href,
  onNavigate,
}: {
  dk: ShopComboDieuKien;
  href?: string | null;
  onNavigate?: () => void;
}) {
  const label = phamViLabel(dk.phamVi);
  const inner = (
    <>
      <ConditionBadgeThumb dk={dk} />
      <span className="shop-uu-dai-combo-badge-copy">
        <span className="shop-uu-dai-combo-badge-kind">
          {phamViIcon(dk.phamVi)}
          {label}
        </span>
        <span className="shop-uu-dai-combo-badge-name">
          {dk.nhan ?? label}
          <em>×{dk.soLuong}</em>
        </span>
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="shop-uu-dai-combo-badge-core is-link"
        title={`Mở ${label}: ${dk.nhan ?? label}`}
        onClick={onNavigate}
      >
        {inner}
      </Link>
    );
  }

  return (
    <span className="shop-uu-dai-combo-badge-core" title={label}>
      {inner}
    </span>
  );
}

export type ShopComboCardStorefrontLinks = {
  ownerSlug: string;
  shopName?: string | null;
  sellerId: string;
};

export type ShopComboCardProps = {
  combo: ShopCombo;
  status: string;
  /** CTA storefront (vd. Mua ngay) — cùng hàng với meta. */
  actions?: ReactNode;
  /** Bật link điều kiện → trang loại/mẫu (storefront). */
  storefront?: ShopComboCardStorefrontLinks;
};

/** Thẻ combo dashboard — stack ngang: giảm giá | nội dung + điều kiện. */
export function ShopComboCard({
  combo,
  status,
  actions,
  storefront,
}: ShopComboCardProps) {
  const heroGiam = formatGiamHero(combo);
  const disabled = !combo.kichHoat || status === "Hết hạn" || status === "Tắt";
  const showMeta =
    actions || combo.dieuKienLoi || combo.apDungLap || Boolean(status);

  return (
    <article
      className={["shop-uu-dai-combo-card", disabled ? "is-off" : ""]
        .filter(Boolean)
        .join(" ")}
      aria-disabled={disabled || undefined}
    >
      <div className="shop-uu-dai-combo-discount">
        <span className="shop-uu-dai-combo-discount-kicker">Combo</span>
        <p className="shop-uu-dai-combo-discount-hero">
          <span className="shop-uu-dai-combo-discount-label">Giảm</span>
          <span className="shop-uu-dai-combo-discount-fig">{heroGiam}</span>
        </p>
      </div>

      <div className="shop-uu-dai-combo-main">
        <div className="shop-uu-dai-combo-title-row">
          <h3>{combo.ten}</h3>
        </div>
        <p className="shop-uu-dai-combo-giam">{formatGiam(combo)}</p>

        {combo.moTa ? (
          <p className="shop-uu-dai-combo-desc">{combo.moTa}</p>
        ) : null}

        {combo.dieuKien.length > 0 ? (
          <>
            <p className="shop-uu-dai-combo-recipe-label">Điều kiện mua</p>
            <div className="shop-uu-dai-combo-badges" role="list">
              {combo.dieuKien.map((dk) => (
                <span key={dk.id} className="shop-uu-dai-combo-badge" role="listitem">
                  <ConditionBadgeCore
                      dk={dk}
                      href={
                        storefront
                          ? comboDieuKienHref(
                              dk,
                              storefront.ownerSlug,
                              storefront.shopName,
                              combo.id,
                            )
                          : null
                      }
                      onNavigate={
                        storefront
                          ? () =>
                              rememberActiveCombo(
                                storefront.sellerId,
                                combo.id,
                              )
                          : undefined
                      }
                    />
                </span>
              ))}
            </div>
          </>
        ) : null}

        {(showMeta) && (
          <div className="shop-uu-dai-combo-meta">
            <div className="shop-uu-dai-combo-meta-tags">
              {combo.dieuKienLoi ? (
                <span className="shop-uu-dai-status is-error">Điều kiện lỗi</span>
              ) : null}
              {combo.apDungLap ? (
                <span className="shop-uu-dai-tag">Áp dụng nhiều lần</span>
              ) : null}
              {status ? (
                <span
                  className={[
                    "shop-uu-dai-status",
                    status === "Đang chạy" ? "is-live" : "",
                    status === "Hết hạn" || status === "Tắt" ? "is-muted" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {status}
                </span>
              ) : null}
            </div>
            {actions ? (
              <div className="shop-uu-dai-combo-meta-actions">{actions}</div>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}
