"use client";

import { Search, X } from "lucide-react";

import {
  activeLuongPresetId,
  CAP_DO_OPTIONS,
  formatLuongShort,
  LOAI_HINH_OPTIONS,
  LUONG_PRICE_PRESETS,
  LUONG_SLIDER_MAX,
  LUONG_SLIDER_MIN,
  LUONG_SLIDER_STEP,
  NOI_LAM_OPTIONS,
  sliderValueForLuong,
  snapLuongToSlider,
  type LuongPresetId,
  type TuyenDungFiltersState,
} from "@/app/tuyen-dung/_components/tuyen-dung-filters";

type Props = TuyenDungFiltersState & {
  total: number;
};

export function TuyenDungFilterBar({
  q,
  setQ,
  loaiHinh,
  setLoaiHinh,
  capDo,
  setCapDo,
  linhVuc,
  setLinhVuc,
  linhVucOptions,
  noiLam,
  setNoiLam,
  onlyOpen,
  setOnlyOpen,
  luongMin,
  setLuongMin,
  luongMax,
  setLuongMax,
  filtered,
  filtersActive,
  resetFilters,
  applyLuongPreset,
  total,
}: Props) {
  const hasQuery = q.trim().length > 0;
  const activePreset = activeLuongPresetId(luongMin, luongMax);
  const sliderMin = sliderValueForLuong(luongMin);
  const sliderMax = sliderValueForLuong(luongMax);

  return (
    <div className="td-hub-panel" aria-label="Lọc tin tuyển dụng">
      <div className="td-hub-row td-hub-row--main">
        <div className="td-hub-scope" role="group" aria-label="Trạng thái tin">
          <button
            type="button"
            className={`td-hub-scope-tab${!onlyOpen ? " is-on" : ""}`}
            aria-pressed={!onlyOpen}
            onClick={() => setOnlyOpen(false)}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`td-hub-scope-tab${onlyOpen ? " is-on" : ""}`}
            aria-pressed={onlyOpen}
            onClick={() => setOnlyOpen(true)}
          >
            Đang tuyển
          </button>
        </div>

        <div className="td-hub-row__end">
          <div className="td-hub-search" role="search">
            <Search size={15} strokeWidth={2.2} aria-hidden className="td-hub-search-ico" />
            <input
              type="search"
              className="td-hub-search-input"
              value={q}
              placeholder="Tìm vị trí, studio, lĩnh vực…"
              aria-label="Tìm tin tuyển dụng"
              autoComplete="off"
              onChange={(e) => setQ(e.target.value)}
            />
            {hasQuery ? (
              <button
                type="button"
                className="td-hub-search-clear"
                aria-label="Xóa từ khóa"
                onClick={() => setQ("")}
              >
                <X size={14} strokeWidth={2.2} aria-hidden />
              </button>
            ) : null}
          </div>

          <div className="td-hub-meta">
            <span className="td-hub-count">
              <strong>{filtered.length}</strong>/{total}
            </span>
            {filtersActive ? (
              <button type="button" className="td-hub-reset" onClick={resetFilters}>
                Xóa lọc
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="td-hub-filter-groups">
        <div className="td-hub-filter-group">
          <span className="td-hub-filter-group-label">Lĩnh vực</span>
          <select
            className="td-hub-filter-select"
            value={linhVuc}
            aria-label="Lĩnh vực"
            onChange={(e) => setLinhVuc(e.target.value)}
            disabled={linhVucOptions.length === 0}
          >
            <option value="all">Mọi lĩnh vực</option>
            {linhVucOptions.map((lv) => (
              <option key={lv} value={lv}>
                {lv}
              </option>
            ))}
          </select>
        </div>

        <div className="td-hub-filter-group">
          <span className="td-hub-filter-group-label">Loại hình</span>
          <select
            className="td-hub-filter-select"
            value={loaiHinh}
            aria-label="Loại hình công việc"
            onChange={(e) => setLoaiHinh(e.target.value as typeof loaiHinh)}
          >
            {LOAI_HINH_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="td-hub-filter-group">
          <span className="td-hub-filter-group-label">Cấp độ</span>
          <select
            className="td-hub-filter-select"
            value={capDo}
            aria-label="Cấp độ vị trí"
            onChange={(e) => setCapDo(e.target.value)}
          >
            {CAP_DO_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="td-hub-filter-group">
          <span className="td-hub-filter-group-label">Nơi làm</span>
          <select
            className="td-hub-filter-select"
            value={noiLam}
            aria-label="Nơi làm việc"
            onChange={(e) => setNoiLam(e.target.value as typeof noiLam)}
          >
            {NOI_LAM_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="td-hub-filter-group td-hub-filter-group--price">
          <span className="td-hub-filter-group-label">Mức lương / tháng</span>
          <div className="td-hub-price-presets" role="group" aria-label="Mức lương nhanh">
            {LUONG_PRICE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`td-hub-price-chip${activePreset === preset.id ? " is-on" : ""}`}
                aria-pressed={activePreset === preset.id}
                onClick={() => applyLuongPreset(preset.id as LuongPresetId)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="td-hub-price-slider">
            <div
              className="td-hub-range-wrap"
              style={
                {
                  "--range-min-pct": `${(sliderMin / LUONG_SLIDER_MAX) * 100}%`,
                  "--range-max-pct": `${(sliderMax / LUONG_SLIDER_MAX) * 100}%`,
                } as React.CSSProperties
              }
            >
              <div className="td-hub-price-range-labels" aria-live="polite">
                <span
                  className="td-hub-price-range-label td-hub-price-range-label--min"
                  style={{
                    transform:
                      sliderMin <= LUONG_SLIDER_MAX * 0.06
                        ? "translateX(0)"
                        : "translateX(-50%)",
                  }}
                >
                  {formatLuongShort(luongMin)}
                </span>
                <span
                  className="td-hub-price-range-label td-hub-price-range-label--max"
                  style={{
                    transform:
                      sliderMax >= LUONG_SLIDER_MAX * 0.94
                        ? "translateX(-100%)"
                        : "translateX(-50%)",
                  }}
                >
                  {formatLuongShort(luongMax)}
                </span>
              </div>
              <input
                type="range"
                className="td-hub-range td-hub-range--min"
                min={LUONG_SLIDER_MIN}
                max={LUONG_SLIDER_MAX}
                step={LUONG_SLIDER_STEP}
                value={sliderMin}
                aria-label="Mức lương tối thiểu"
                aria-valuetext={formatLuongShort(luongMin)}
                onChange={(e) => {
                  const next = snapLuongToSlider(Math.min(Number(e.target.value), sliderMax));
                  setLuongMin(next);
                }}
              />
              <input
                type="range"
                className="td-hub-range td-hub-range--max"
                min={LUONG_SLIDER_MIN}
                max={LUONG_SLIDER_MAX}
                step={LUONG_SLIDER_STEP}
                value={sliderMax}
                aria-label="Mức lương tối đa"
                aria-valuetext={formatLuongShort(luongMax)}
                onChange={(e) => {
                  const next = snapLuongToSlider(Math.max(Number(e.target.value), sliderMin));
                  setLuongMax(next);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
