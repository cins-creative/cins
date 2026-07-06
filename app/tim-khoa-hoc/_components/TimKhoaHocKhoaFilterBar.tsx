"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";

import {
  activePricePresetId,
  formatPriceShort,
  HINH_THUC_OPTIONS,
  MO_HINH_OPTIONS,
  PHI_PRICE_PRESETS,
  PHI_SLIDER_MAX,
  PHI_SLIDER_MIN,
  PHI_SLIDER_STEP,
  sliderValueForPrice,
  snapPriceToSlider,
  type KhoaHocFiltersState,
  type PricePresetId,
} from "@/app/tim-khoa-hoc/_components/khoa-hoc-filters";
import {
  timKhoaHocHubHref,
  type TimKhoaHocLoai,
} from "@/app/tim-khoa-hoc/_components/tim-khoa-hoc-params";

const SCOPE_TABS: { id: TimKhoaHocLoai; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "khoa", label: "Khóa học" },
  { id: "nganh", label: "Ngành" },
];

type Props = KhoaHocFiltersState & {
  q: string;
  loai: TimKhoaHocLoai;
  total: number;
  showKhoaFilters: boolean;
};

export function TimKhoaHocKhoaFilterBar({
  q,
  loai,
  showKhoaFilters,
  moHinh,
  setMoHinh,
  hinhThuc,
  setHinhThuc,
  phiMin,
  setPhiMin,
  phiMax,
  setPhiMax,
  priceSuffix,
  filtered,
  filtersActive,
  resetFilters,
  applyPricePreset,
  total,
}: Props) {
  const hasQuery = q.length > 0;
  const activePreset = activePricePresetId(phiMin, phiMax);
  const sliderMin = sliderValueForPrice(phiMin);
  const sliderMax = sliderValueForPrice(phiMax);

  return (
    <div className="tkh-hub-panel" aria-label="Tìm kiếm và lọc">
      <div className="tkh-hub-row tkh-hub-row--main">
        <div className="tkh-hub-scope" role="tablist" aria-label="Phạm vi">
          {SCOPE_TABS.map((tab) => (
            <Link
              key={tab.id}
              href={timKhoaHocHubHref({ q: q || undefined, loai: tab.id })}
              prefetch={false}
              role="tab"
              aria-selected={loai === tab.id}
              className={`tkh-hub-scope-tab${loai === tab.id ? " is-on" : ""}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="tkh-hub-row__end">
          <form action="/tim-khoa-hoc" method="get" className="tkh-hub-search" role="search">
          {loai !== "all" ? <input type="hidden" name="loai" value={loai} /> : null}
          <Search size={15} strokeWidth={2.2} aria-hidden className="tkh-hub-search-ico" />
          <input
            type="search"
            name="q"
            className="tkh-hub-search-input"
            defaultValue={q}
            placeholder="Tìm khóa, cơ sở, ngành…"
            aria-label="Tìm khóa học và ngành đại học"
            autoComplete="off"
          />
          <button type="submit" className="tkh-hub-search-submit">
            Tìm
          </button>
          {hasQuery ? (
            <Link
              href={timKhoaHocHubHref({ loai })}
              className="tkh-hub-search-clear"
              prefetch={false}
              aria-label="Xóa từ khóa"
            >
              <X size={14} strokeWidth={2.2} aria-hidden />
            </Link>
          ) : null}
        </form>

        {showKhoaFilters ? (
          <div className="tkh-hub-meta">
            <span className="tkh-hub-count">
              <strong>{filtered.length}</strong>/{total}
            </span>
            {filtersActive ? (
              <button type="button" className="tkh-hub-reset" onClick={resetFilters}>
                Xóa lọc
              </button>
            ) : null}
          </div>
        ) : null}
        </div>
      </div>

      {showKhoaFilters ? (
        <div className="tkh-hub-filter-groups">
          <div className="tkh-hub-filter-group">
            <span className="tkh-hub-filter-group-label">Mô hình</span>
            <select
              className="tkh-hub-filter-select"
              value={moHinh}
              aria-label="Mô hình khóa"
              onChange={(e) => setMoHinh(e.target.value as typeof moHinh)}
            >
              {MO_HINH_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="tkh-hub-filter-group">
            <span className="tkh-hub-filter-group-label">Hình thức</span>
            <select
              className="tkh-hub-filter-select"
              value={hinhThuc}
              aria-label="Hình thức học"
              onChange={(e) => setHinhThuc(e.target.value as typeof hinhThuc)}
            >
              {HINH_THUC_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="tkh-hub-filter-group tkh-hub-filter-group--price">
            <span className="tkh-hub-filter-group-label">Học phí</span>
            <div className="tkh-hub-price-presets" role="group" aria-label="Học phí nhanh">
              {PHI_PRICE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`tkh-hub-price-chip${activePreset === preset.id ? " is-on" : ""}`}
                  aria-pressed={activePreset === preset.id}
                  onClick={() => applyPricePreset(preset.id as PricePresetId)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="tkh-hub-price-slider">
              <div
                className="tkh-hub-range-wrap"
                style={
                  {
                    "--range-min-pct": `${(sliderMin / PHI_SLIDER_MAX) * 100}%`,
                    "--range-max-pct": `${(sliderMax / PHI_SLIDER_MAX) * 100}%`,
                  } as React.CSSProperties
                }
              >
                <div className="tkh-hub-price-range-labels" aria-live="polite">
                  <span
                    className="tkh-hub-price-range-label tkh-hub-price-range-label--min"
                    style={{
                      transform:
                        sliderMin <= PHI_SLIDER_MAX * 0.06
                          ? "translateX(0)"
                          : "translateX(-50%)",
                    }}
                  >
                    {formatPriceShort(phiMin)}
                    {priceSuffix}
                  </span>
                  <span
                    className="tkh-hub-price-range-label tkh-hub-price-range-label--max"
                    style={{
                      transform:
                        sliderMax >= PHI_SLIDER_MAX * 0.94
                          ? "translateX(-100%)"
                          : "translateX(-50%)",
                    }}
                  >
                    {formatPriceShort(phiMax)}
                    {priceSuffix}
                  </span>
                </div>
                <input
                  type="range"
                  className="tkh-hub-range tkh-hub-range--min"
                  min={PHI_SLIDER_MIN}
                  max={PHI_SLIDER_MAX}
                  step={PHI_SLIDER_STEP}
                  value={sliderMin}
                  aria-label="Học phí tối thiểu"
                  aria-valuetext={`${formatPriceShort(phiMin)}${priceSuffix}`}
                  onChange={(e) => {
                    const next = snapPriceToSlider(Math.min(Number(e.target.value), sliderMax));
                    setPhiMin(next);
                  }}
                />
                <input
                  type="range"
                  className="tkh-hub-range tkh-hub-range--max"
                  min={PHI_SLIDER_MIN}
                  max={PHI_SLIDER_MAX}
                  step={PHI_SLIDER_STEP}
                  value={sliderMax}
                  aria-label="Học phí tối đa"
                  aria-valuetext={`${formatPriceShort(phiMax)}${priceSuffix}`}
                  onChange={(e) => {
                    const next = snapPriceToSlider(Math.max(Number(e.target.value), sliderMin));
                    setPhiMax(next);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
