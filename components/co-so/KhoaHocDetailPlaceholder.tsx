"use client";

import { ArrowLeft } from "lucide-react";
import Image from "next/image";

import type { KhoaHocCardData } from "@/lib/to-chuc/khoa-hoc-types";
import {
  formatKhaiGiangCard,
  formatKhoaHocPhi,
  formatThoiLuongKhoa,
  labelLoaiMoHinhKhoa,
  labelTrinhDoDauVao,
} from "@/lib/to-chuc/khoa-hoc-labels";

type Props = {
  khoa: KhoaHocCardData;
  onBack: () => void;
};

export function KhoaHocDetailPlaceholder({ khoa, onBack }: Props) {
  const covClass = `cso-kh-detail-cover c${(khoa.coverVariant % 3) + 1}`;

  return (
    <div className="cso-kh-detail">
      <button type="button" className="cso-kh-detail-back" onClick={onBack}>
        <ArrowLeft size={16} aria-hidden />
        Danh sách khóa học
      </button>

      <div className={covClass}>
        {khoa.coverUrl ? (
          <Image
            src={khoa.coverUrl}
            alt=""
            fill
            className="cso-kh-detail-cover-img"
            sizes="(max-width: 720px) 100vw, 552px"
          />
        ) : null}
      </div>

      <header className="cso-kh-detail-head">
        <h2 className="cso-kh-detail-title">{khoa.tenKhoaHoc}</h2>
        {khoa.moTa ? <p className="cso-kh-detail-desc">{khoa.moTa}</p> : null}
      </header>

      <dl className="cso-kh-detail-meta">
        <div>
          <dt>Mô hình</dt>
          <dd>{labelLoaiMoHinhKhoa(khoa.loaiMoHinh)}</dd>
        </div>
        <div>
          <dt>Trình độ</dt>
          <dd>{labelTrinhDoDauVao(khoa.trinhDoDauVao)}</dd>
        </div>
        <div>
          <dt>Thời lượng</dt>
          <dd>
            {formatThoiLuongKhoa(
              khoa.thoiLuongBuoi,
              khoa.thoiLuongPhutMoiBuoi,
            )}
          </dd>
        </div>
        <div>
          <dt>Học phí</dt>
          <dd>{formatKhoaHocPhi(khoa.hocPhi, khoa.loaiMoHinh)}</dd>
        </div>
        <div>
          <dt>Khai giảng</dt>
          <dd>
            {formatKhaiGiangCard(
              khoa.loaiMoHinh,
              khoa.ngayKhaiGiangGanNhat,
            )}
          </dd>
        </div>
      </dl>

      <p className="tdh-placeholder cso-kh-detail-placeholder">
        Trang chi tiết khóa học (lộ trình, lớp, giới thiệu) — thiết kế ở bước
        sau.
      </p>
    </div>
  );
}
