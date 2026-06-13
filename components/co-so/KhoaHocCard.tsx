"use client";

import {
  ArrowRight,
  CalendarDays,
  CircleDot,
  EyeOff,
  Image as ImageIcon,
  Pause,
  Plus,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { KhoaHocCardMenu } from "@/components/co-so/KhoaHocCardMenu";

import {
  formatKhoaHocPhi,
  formatThoiLuongKhoa,
  isKhoaHocMuted,
  labelLoaiMoHinhKhoa,
  labelTrangThaiKhoaHoc,
  labelTrinhDoDauVao,
} from "@/lib/to-chuc/khoa-hoc-labels";
import type { KhoaHocCardData } from "@/lib/to-chuc/khoa-hoc-types";

type Props = {
  khoa: KhoaHocCardData;
  href?: string;
  canManage?: boolean;
  onClick?: () => void;
  onManage?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function KhoaHocCard({
  khoa,
  href,
  canManage = false,
  onClick,
  onManage,
  onEdit,
  onDelete,
}: Props) {
  const muted = isKhoaHocMuted(khoa.trangThaiKhoaHoc);
  const status = labelTrangThaiKhoaHoc(khoa.trangThaiKhoaHoc);
  const cardThumbUrl = khoa.thumbnailUrl ?? khoa.coverUrl;
  const bannerUrl = khoa.coverUrl ?? khoa.thumbnailUrl;
  const covClass = `cso-kh-card-cov c${(khoa.coverVariant % 3) + 1}`;
  const cardClass = `cso-kh-card${muted ? " muted" : ""}`;
  const lopLabel =
    khoa.loaiMoHinh === "lien_tuc_theo_thang" ? "khung" : "lớp mở";

  const body = (
    <>
      <div className={covClass}>
        {cardThumbUrl ? (
          <Image
            src={cardThumbUrl}
            alt=""
            fill
            className="cso-kh-card-cov-img"
            sizes="(max-width: 640px) 50vw, 280px"
          />
        ) : (
          <span className="cso-kh-card-cov-ph" aria-hidden>
            <ImageIcon size={30} strokeWidth={1.5} />
          </span>
        )}
        <span className={`cso-kh-stt s-${status.tone}`}>
          {status.tone === "pause" ? (
            <Pause size={10} aria-hidden />
          ) : (
            <CircleDot size={10} aria-hidden />
          )}
          {status.text}
        </span>
      </div>
      {canManage && onManage && onEdit && onDelete ? (
        <KhoaHocCardMenu
          khoaTen={khoa.tenKhoaHoc}
          onManage={onManage}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : null}
      <div className="cso-kh-card-body">
        <div className="cso-kh-card-top">
          <div className="cso-kh-card-name">{khoa.tenKhoaHoc}</div>
          {href ? (
            <ArrowRight size={16} className="cso-kh-card-go" aria-hidden />
          ) : null}
        </div>
        {canManage && khoa.cheDoHienThi === "an" ? (
          <span className="cso-kh-card-hidden-tag">
            <EyeOff size={11} aria-hidden />
            Đang ẩn
          </span>
        ) : null}
        <div className="cso-kh-card-model">
          {labelLoaiMoHinhKhoa(khoa.loaiMoHinh)}
          <span className="cso-kh-dot" aria-hidden />
          {labelTrinhDoDauVao(khoa.trinhDoDauVao)}
        </div>
        <div className="cso-kh-card-facts">
          <div className="cso-kh-cf">
            <div className="cso-kh-cf-v">
              {formatThoiLuongKhoa(
                khoa.thoiLuongBuoi,
                khoa.thoiLuongPhutMoiBuoi,
              )}
            </div>
            <div className="cso-kh-cf-k">Thời lượng</div>
          </div>
          <div className="cso-kh-cf">
            <div className="cso-kh-cf-v">
              {formatKhoaHocPhi(khoa.hocPhi, khoa.loaiMoHinh)}
            </div>
            <div className="cso-kh-cf-k">Học phí</div>
          </div>
        </div>
        <div className="cso-kh-card-foot">
          <span className="cso-kh-foot-m">
            <CalendarDays size={13} aria-hidden />
            <b>{khoa.soLopMo}</b> {lopLabel}
          </span>
          <span className="cso-kh-foot-m">
            <Users size={13} aria-hidden />
            <b>{khoa.soHocVien}</b> học viên
          </span>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} scroll={false} className={cardClass}>
        {body}
      </Link>
    );
  }

  return (
    <article
      className={cardClass}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {body}
    </article>
  );
}

type AddTileProps = {
  onClick: () => void;
};

export function KhoaHocAddTile({ onClick }: AddTileProps) {
  return (
    <button type="button" className="cso-kh-add-tile" onClick={onClick}>
      <Plus size={22} aria-hidden />
      <span>Thêm khóa học</span>
    </button>
  );
}
