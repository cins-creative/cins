"use client";

import { Copy } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

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
  ketThuc?: string | null;
  tenCuaHang?: string | null;
  conHieuLuc?: boolean;
  lyDoHetHieuLuc?: ShopVoucherLyDoHet | null;
  daLuu?: boolean;
  actions?: ReactNode;
  onCopy?: () => void;
};

const LY_DO_LABEL: Record<ShopVoucherLyDoHet, string> = {
  het_luot: "Đã hết lượt",
  het_han: "Hết hạn",
  chua_bat_dau: "Chưa bắt đầu",
  da_dung: "Bạn đã dùng",
  tat: "Đã tắt",
  xoa: "Đã xóa",
};

function formatGiam(loaiGiam: ShopLoaiGiam, giaTri: number): string {
  if (loaiGiam === "phan_tram") return `${giaTri}%`;
  return `${giaTri.toLocaleString("vi-VN")} ₫`;
}

function formatHetHan(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("vi-VN");
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
  ketThuc,
  tenCuaHang,
  conHieuLuc = true,
  lyDoHetHieuLuc,
  daLuu,
  actions,
  onCopy,
}: ShopVoucherCardProps) {
  const disabled = !conHieuLuc;
  const hetHanLabel = formatHetHan(ketThuc);
  const badgeLabel =
    lyDoHetHieuLuc != null ? LY_DO_LABEL[lyDoHetHieuLuc] : null;

  const style =
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

  return (
    <article
      className={[
        "shop-voucher-card",
        designKieu === "mac_dinh" ? "is-mac-dinh" : "is-rieng",
        disabled ? "is-disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      aria-disabled={disabled || undefined}
    >
      <div className="shop-voucher-card-inner">
        {tenCuaHang ? (
          <p className="shop-voucher-card-shop">{tenCuaHang}</p>
        ) : null}
        {designNhan ? (
          <span className="shop-voucher-card-label">{designNhan}</span>
        ) : null}
        <p className="shop-voucher-card-ten">{ten}</p>
        <p className="shop-voucher-card-giam">{formatGiam(loaiGiam, giaTri)}</p>
        <div className="shop-voucher-card-ma-row">
          <code className="shop-voucher-card-ma">{ma}</code>
          {onCopy ? (
            <button
              type="button"
              className="shop-voucher-card-copy"
              onClick={onCopy}
              aria-label="Sao chép mã voucher"
            >
              <Copy size={16} aria-hidden />
            </button>
          ) : null}
        </div>
        {donToiThieu > 0 ? (
          <p className="shop-voucher-card-meta">
            Đơn tối thiểu {donToiThieu.toLocaleString("vi-VN")} ₫
          </p>
        ) : null}
        {hetHanLabel ? (
          <p className="shop-voucher-card-meta">HSD: {hetHanLabel}</p>
        ) : null}
        {soLuongTong != null ? (
          <p className="shop-voucher-card-meta">
            Còn {Math.max(0, soLuongTong - soLuongDaDung)} / {soLuongTong} lượt
          </p>
        ) : null}
        {daLuu ? (
          <span className="shop-voucher-card-saved">Đã lưu</span>
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
