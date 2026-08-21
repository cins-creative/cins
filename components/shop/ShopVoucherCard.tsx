"use client";

import { Copy } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { formatDate, formatMoney } from "@/lib/format";
import { useT } from "@/lib/i18n/use-t";
import { useLocale } from "@/lib/locale/context";
import type {
  ShopLoaiGiam,
  ShopVoucherDesign,
  ShopVoucherLyDoHet,
} from "@/lib/shop/types";

export type ShopVoucherCardProps = {
  ma: string;
  ten: string;
  loaiGiam: ShopLoaiGiam;
  giaTri: number;
  designKieu: ShopVoucherDesign;
  designMauNen?: string | null;
  designMauChu?: string | null;
  designNhan?: string | null;
  designAnhUrl?: string | null;
  donToiThieu?: number;
  soLuongTong?: number | null;
  soLuongDaDung?: number;
  /** Số người đã lưu ví, chưa dùng — chỉ hiện khi prop được truyền. */
  soLuongDaLuu?: number;
  ketThuc?: string | null;
  tenCuaHang?: string | null;
  shopAvatarUrl?: string | null;
  shopBannerUrl?: string | null;
  compact?: boolean;
  conHieuLuc?: boolean;
  lyDoHetHieuLuc?: ShopVoucherLyDoHet | null;
  daLuu?: boolean;
  actions?: ReactNode;
  onCopy?: () => void;
};

const LY_DO_KEY: Record<
  ShopVoucherLyDoHet,
  | "shop.voucher.reason.het_luot"
  | "shop.voucher.reason.het_han"
  | "shop.voucher.reason.chua_bat_dau"
  | "shop.voucher.reason.da_dung"
  | "shop.voucher.reason.tat"
  | "shop.voucher.reason.xoa"
> = {
  het_luot: "shop.voucher.reason.het_luot",
  het_han: "shop.voucher.reason.het_han",
  chua_bat_dau: "shop.voucher.reason.chua_bat_dau",
  da_dung: "shop.voucher.reason.da_dung",
  tat: "shop.voucher.reason.tat",
  xoa: "shop.voucher.reason.xoa",
};

function shopInitial(ten: string | null | undefined): string {
  const t = ten?.trim();
  if (!t) return "?";
  return t.charAt(0).toUpperCase();
}

export function ShopVoucherCard({
  ma,
  ten,
  loaiGiam,
  giaTri,
  designKieu,
  designMauNen,
  designMauChu,
  designNhan,
  designAnhUrl,
  donToiThieu = 0,
  soLuongTong,
  soLuongDaDung = 0,
  soLuongDaLuu,
  ketThuc,
  tenCuaHang,
  shopAvatarUrl,
  shopBannerUrl,
  compact = false,
  conHieuLuc = true,
  lyDoHetHieuLuc,
  daLuu,
  actions,
  onCopy,
}: ShopVoucherCardProps) {
  const t = useT();
  const locale = useLocale();
  const disabled = !conHieuLuc;
  const hetHanLabel = ketThuc
    ? (() => {
        const d = new Date(ketThuc);
        return Number.isNaN(d.getTime()) ? null : formatDate(d, locale);
      })()
    : null;
  const badgeLabel =
    lyDoHetHieuLuc != null ? t(LY_DO_KEY[lyDoHetHieuLuc]) : null;
  const giamLabel =
    loaiGiam === "phan_tram" ? `${giaTri}%` : formatMoney(giaTri, locale);

  const bodyStyle =
    designKieu === "rieng"
      ? ({
          ...(designMauNen ? { backgroundColor: designMauNen } : {}),
          ...(designMauChu ? { color: designMauChu } : {}),
          ...(designAnhUrl
            ? {
                backgroundImage: `url(${designAnhUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}),
        } as CSSProperties)
      : undefined;

  const showShopRow = Boolean(tenCuaHang || shopAvatarUrl || shopBannerUrl);
  const conLai =
    soLuongTong != null
      ? Math.max(0, soLuongTong - soLuongDaDung)
      : null;

  return (
    <article
      className={[
        "shop-voucher-card",
        designKieu === "mac_dinh" ? "is-mac-dinh" : "is-rieng",
        compact ? "shop-voucher-card--compact" : "",
        disabled ? "is-disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-disabled={disabled || undefined}
    >
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

      <div className="shop-voucher-card-body" style={bodyStyle}>
        <div className="shop-voucher-card-content">
          <div className="shop-voucher-card-main">
            <div className="shop-voucher-card-title-row">
              {designNhan ? (
                <span className="shop-voucher-card-label">{designNhan}</span>
              ) : null}
              <p className="shop-voucher-card-ten">{ten}</p>
            </div>
            <p className="shop-voucher-card-giam">
              {giamLabel}
            </p>
          </div>

          <div className="shop-voucher-card-code-block">
            <span className="shop-voucher-card-code-label">
              {t("shop.voucher.code")}
            </span>
            <div className="shop-voucher-card-ma-row">
              <code className="shop-voucher-card-ma">{ma}</code>
              {onCopy ? (
                <button
                  type="button"
                  className="shop-voucher-card-copy"
                  onClick={onCopy}
                  aria-label={t("shop.voucher.copy")}
                >
                  <Copy size={16} aria-hidden />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="shop-voucher-card-meta-list">
          {donToiThieu > 0 ? (
            <p className="shop-voucher-card-meta">
              {t("shop.voucher.minOrder", {
                amount: formatMoney(donToiThieu, locale),
              })}
            </p>
          ) : null}
          {hetHanLabel ? (
            <p className="shop-voucher-card-meta">
              {t("shop.voucher.expires", { date: hetHanLabel })}
            </p>
          ) : null}
          {soLuongDaLuu != null ? (
            <p className="shop-voucher-card-meta">
              {t("shop.voucher.savedCount", { count: soLuongDaLuu })}
            </p>
          ) : null}
          {soLuongTong != null ? (
            <>
              <p className="shop-voucher-card-meta">
                {t("shop.voucher.usedCount", { count: soLuongDaDung })}
              </p>
              <p className="shop-voucher-card-meta shop-voucher-card-meta--con-lai">
                {t("shop.voucher.left")}{" "}
                <strong className="shop-voucher-card-meta-highlight">
                  {conLai}
                </strong>
                <span className="shop-voucher-card-meta-total">
                  {" "}
                  / {soLuongTong}
                </span>
              </p>
            </>
          ) : null}
        </div>
        {daLuu ? (
          <span className="shop-voucher-card-saved">{t("shop.voucher.saved")}</span>
        ) : null}
        {badgeLabel ? (
          <span className="shop-voucher-card-badge">{badgeLabel}</span>
        ) : null}
        {actions ? (
          <div className="shop-voucher-card-actions">{actions}</div>
        ) : null}
      </div>
    </article>
  );
}
