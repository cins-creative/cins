"use client";

import { useMemo, useState } from "react";

import { TruongDoanProjectMasonry } from "@/components/truong/TruongDoanProjectMasonry";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import {
  MOCK_TRUONG_DOAN_PROJECTS,
  doanProjectYearOptions,
} from "@/lib/truong/doan-project-mock";

const ALL_YEAR = "";
const ALL_NGANH = "";

export function TruongTabDoanSinhVien() {
  const inline = useTruongInlineEdit();
  const yearOptions = useMemo(() => doanProjectYearOptions(), []);
  const [yearFilter, setYearFilter] = useState(ALL_YEAR);
  const [nganhFilter, setNganhFilter] = useState(ALL_NGANH);

  const nganhOptions = useMemo(() => {
    const fromPrograms = (inline?.programs ?? []).map((p) => p.nganhTitle);
    const fromMock = MOCK_TRUONG_DOAN_PROJECTS.map((p) => p.nganhLabel).filter(
      (l): l is string => Boolean(l?.trim()),
    );
    return [...new Set([...fromPrograms, ...fromMock])].sort((a, b) =>
      a.localeCompare(b, "vi"),
    );
  }, [inline?.programs]);

  const filtered = useMemo(() => {
    const yearNum = yearFilter ? Number(yearFilter) : null;
    return MOCK_TRUONG_DOAN_PROJECTS.filter((p) => {
      if (yearNum != null && p.nam !== yearNum) return false;
      if (nganhFilter && p.nganhLabel !== nganhFilter) return false;
      return true;
    });
  }, [yearFilter, nganhFilter]);

  const countLabel =
    filtered.length === 0
      ? "Không có dự án"
      : filtered.length === 1
        ? "1 dự án"
        : `${filtered.length} dự án`;

  return (
    <>
      <div className="sec-hdr">
        <span className="sec-num">05</span>
        <h2 className="sec-title">
          Đồ án <em>sinh viên</em>
        </h2>
      </div>

      <div
        className="tdh-v6-filter-row tdh-doan-filter-row"
        role="group"
        aria-label="Lọc đồ án"
      >
        <label className="tdh-doan-filter-field">
          <span className="tdh-doan-filter-label">Năm</span>
          <select
            className="sec-year-select tdh-doan-year-select"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            aria-label="Năm đồ án"
          >
            <option value={ALL_YEAR}>Tất cả các năm</option>
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>
                Năm {y}
              </option>
            ))}
          </select>
        </label>
        <label className="tdh-doan-filter-field">
          <span className="tdh-doan-filter-label">Ngành</span>
          <select
            className="sec-year-select tdh-doan-nganh-select"
            value={nganhFilter}
            onChange={(e) => setNganhFilter(e.target.value)}
            aria-label="Ngành đồ án"
          >
            <option value={ALL_NGANH}>Tất cả ngành</option>
            {nganhOptions.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <span className="tdh-doan-filter-count" aria-live="polite">
          {countLabel}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="tdh-placeholder">
          Chưa có đồ án nào được gắn vào trường
          {nganhFilter ? ` — ngành ${nganhFilter}` : ""}
          {yearFilter ? ` trong năm ${yearFilter}` : ""}.
        </p>
      ) : (
        <TruongDoanProjectMasonry projects={filtered} />
      )}
    </>
  );
}
