"use client";

import Link from "next/link";
import { useMemo } from "react";

import { TruongNganhRemoveButton } from "@/components/truong/inline/TruongNganhRemoveButton";
import { TruongNganhMonThiDauVao } from "@/components/truong/TruongNganhMonThiDauVao";
import { formatThoiGianThang } from "@/lib/nganh/truong-shared";
import type { TruongCauHinhTinhDiem } from "@/lib/truong/types";
import {
  chiTieuForYear,
  diemChuanForYear,
  diemChuanRows,
  formatDiemChuan,
} from "@/lib/truong/diem-chuan";
import { getCfImageUrlWithFallbacks } from "@/lib/truong/images";
import type { TruongNganhProgram } from "@/lib/truong/types";

type Props = {
  prog: TruongNganhProgram;
  year: number;
  open: boolean;
  onToggle: () => void;
  onRemoved?: () => void;
  orgId: string;
  cauHinhMonThi?: TruongCauHinhTinhDiem | null;
};

function nganhThumbInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "NH";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0] ?? ""}${words[words.length - 1]![0] ?? ""}`.toUpperCase();
}

function nganhThumbLabel(prog: TruongNganhProgram): string {
  const code = prog.ma_nganh?.trim();
  if (code) return code;
  return nganhThumbInitials(prog.nganhTitle);
}

function NganhThumb({ prog }: { prog: TruongNganhProgram }) {
  const thumbUrl =
    prog.cover_src?.trim() ||
    getCfImageUrlWithFallbacks(prog.cover_id, ["public", "cover", "medium"]);
  const hasImg = Boolean(thumbUrl);

  return (
    <span
      className={[
        "nganh-item-thumb",
        hasImg ? "nganh-item-thumb--has-img" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    >
      {hasImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbUrl!}
          alt=""
          className="nganh-item-thumb-img"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="nganh-item-thumb-ph">{nganhThumbLabel(prog)}</span>
      )}
    </span>
  );
}

function NganhDiemChuanTable({
  prog,
  highlightYear,
}: {
  prog: TruongNganhProgram;
  highlightYear: number;
}) {
  const rows = useMemo(() => {
    const fromDiem = diemChuanRows(prog);
    if (fromDiem.length > 0) {
      return fromDiem.map(({ year, diem }) => ({
        year,
        diem,
        chiTieu: chiTieuForYear(prog, year),
      }));
    }
    const years = new Set<number>();
    for (const key of Object.keys(prog.chiTieuByYear ?? {})) {
      const y = Number(key);
      if (!Number.isNaN(y) && y > 0) years.add(y);
    }
    return [...years]
      .sort((a, b) => b - a)
      .map((y) => ({
        year: y,
        diem: diemChuanForYear(prog, y),
        chiTieu: chiTieuForYear(prog, y),
      }));
  }, [prog]);

  if (rows.length < 2) return null;

  return (
    <div className="nganh-dc-table-wrap">
      <div className="nganh-dc-table-title">So sánh điểm chuẩn các năm</div>
      <table className="nganh-dc-table">
        <thead>
          <tr>
            <th scope="col">Năm</th>
            <th scope="col">Điểm chuẩn</th>
            <th scope="col">Chỉ tiêu</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.year}
              className={row.year === highlightYear ? "is-highlight" : undefined}
            >
              <td className="nganh-dc-year">{row.year}</td>
              <td className="nganh-dc-diem">{formatDiemChuan(row.diem)}</td>
              <td className="nganh-dc-ct">
                {row.chiTieu != null ? `${row.chiTieu} SV` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TruongNganhProgramItem({
  prog,
  year,
  open,
  onToggle,
  onRemoved,
  orgId,
  cauHinhMonThi,
}: Props) {
  const href = `/nganh-hoc/${encodeURIComponent(prog.nganhSlug)}`;
  const diemLabel = formatDiemChuan(diemChuanForYear(prog, year));
  const chiTieu = chiTieuForYear(prog, year);
  const diemSelected = diemChuanForYear(prog, year);

  return (
    <article className={`nganh-item${open ? " open" : ""}`}>
      <div className="nganh-head">
        <button
          type="button"
          className="nganh-head-toggle"
          aria-expanded={open}
          onClick={onToggle}
        >
          <NganhThumb prog={prog} />
          <span className="nganh-name">{prog.nganhTitle}</span>
          <div className="nganh-score" aria-label={`Điểm chuẩn năm ${year}`}>
            {diemLabel}
            <span className="nganh-year">{year}</span>
          </div>
        </button>
        {onRemoved ? (
          <TruongNganhRemoveButton
            programId={prog.id}
            nganhTitle={prog.nganhTitle}
            onRemoved={onRemoved}
          />
        ) : null}
        <button
          type="button"
          className="nganh-arrow-btn"
          aria-expanded={open}
          aria-label={open ? "Thu gọn" : "Mở rộng"}
          onClick={onToggle}
        >
          <span className="nganh-arrow" aria-hidden>
            &#9662;
          </span>
        </button>
      </div>
      <div className="nganh-item-body">
        <div className="nib-grid nib-grid--4">
          <div className="nib-cell nib-cell--ma-nganh">
            <div className="nib-cell-label">Mã ngành</div>
            <div className="nib-cell-val mono nib-cell-val--code">
              {prog.ma_nganh ?? "—"}
            </div>
          </div>
          <div>
            <div className="nib-cell-label">Thời gian đào tạo</div>
            <div className="nib-cell-val">
              {formatThoiGianThang(prog.thoi_gian_thang)}
            </div>
          </div>
          <div>
            <div className="nib-cell-label">Điểm chuẩn {year}</div>
            <div className="nib-cell-val mono nib-cell-val--diem">
              {formatDiemChuan(diemSelected)}
            </div>
          </div>
          <div>
            <div className="nib-cell-label">Chỉ tiêu {year}</div>
            <div className="nib-cell-val mono">
              {chiTieu != null ? `${chiTieu} SV` : "—"}
            </div>
          </div>
        </div>

        <TruongNganhMonThiDauVao
          orgId={orgId}
          programId={prog.id}
          year={year}
          open={open}
          cached={cauHinhMonThi}
        />

        <NganhDiemChuanTable prog={prog} highlightYear={year} />

        <Link href={href} className="nib-link">
          Xem trang ngành
        </Link>
      </div>
    </article>
  );
}
