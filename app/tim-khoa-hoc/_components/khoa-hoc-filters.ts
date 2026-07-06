"use client";

import { useMemo, useState } from "react";

import type { KhoaHocListItem } from "@/lib/to-chuc/khoa-hoc-listing";
import type { HinhThucLop, LoaiMoHinhKhoa } from "@/lib/to-chuc/khoa-hoc-types";

export type MoHinhFilter = "all" | LoaiMoHinhKhoa;
export type HinhThucFilter = "all" | HinhThucLop;

export const MO_HINH_OPTIONS: { id: MoHinhFilter; label: string }[] = [
  { id: "all", label: "Mọi mô hình" },
  { id: "lien_tuc_theo_thang", label: "Liên tục / tháng" },
  { id: "cohort_co_dinh", label: "Theo khóa" },
];

export const HINH_THUC_OPTIONS: { id: HinhThucFilter; label: string }[] = [
  { id: "all", label: "Mọi hình thức" },
  { id: "truc_tiep", label: "Offline" },
  { id: "truc_tuyen", label: "Online" },
  { id: "ket_hop", label: "Kết hợp" },
];

/** Slider hero: 0 → 20 tr (bao gồm dưới 500K và vùng 500K–10 tr). */
export const PHI_SLIDER_MIN = 0;
export const PHI_SLIDER_MAX = 20_000_000;
export const PHI_SLIDER_STEP = 100_000;

/** Nhập tay có thể lên tới 100 tr (khóa cao cấp / theo khóa dài). */
export const PHI_INPUT_MAX = 100_000_000;

export const PHI_DEFAULT_MIN = PHI_SLIDER_MIN;
export const PHI_DEFAULT_MAX = PHI_SLIDER_MAX;

export type PricePresetId = "all" | "below500" | "mid" | "above10";

export const PHI_PRICE_PRESETS: {
  id: PricePresetId;
  label: string;
  min: number;
  max: number;
}[] = [
  { id: "all", label: "Mọi mức", min: PHI_DEFAULT_MIN, max: PHI_DEFAULT_MAX },
  { id: "below500", label: "Dưới 500K", min: 0, max: 500_000 },
  { id: "mid", label: "500K – 10 tr", min: 500_000, max: 10_000_000 },
  { id: "above10", label: "Trên 10 tr", min: 10_000_000, max: PHI_INPUT_MAX },
];

export function formatPriceShort(v: number): string {
  if (v >= 1_000_000) {
    const tr = v / 1_000_000;
    return `${Number.isInteger(tr) ? tr : tr.toFixed(1).replace(/\.0$/, "")} tr`;
  }
  if (v >= 1_000) {
    const k = v / 1_000;
    return `${Number.isInteger(k) ? k : k.toFixed(0)}K`;
  }
  return new Intl.NumberFormat("vi-VN").format(v);
}

/** Gom bước slider (0 – 20 tr). */
export function snapPriceToSlider(v: number): number {
  const clamped = Math.min(PHI_SLIDER_MAX, Math.max(PHI_SLIDER_MIN, v));
  return Math.round(clamped / PHI_SLIDER_STEP) * PHI_SLIDER_STEP;
}

/** Giới hạn khi nhập tay / preset — cho phép > 20 tr. */
export function clampPriceForFilter(v: number): number {
  return Math.min(PHI_INPUT_MAX, Math.max(PHI_SLIDER_MIN, v));
}

/** Parse nhập tay: 900K, 1.5 tr, 1500000, 25 tr… */
export function parsePriceInput(raw: string): number | null {
  let s = raw.trim().toLowerCase();
  if (!s) return null;

  s = s.replace(/\/th$/i, "").replace(/\s+/g, "");

  if (/^\d+$/.test(s)) {
    return clampPriceForFilter(Number(s));
  }

  const trMatch = s.match(/^(\d+(?:[.,]\d+)?)(?:tr|tri[eệ]u|m)$/);
  if (trMatch) {
    return clampPriceForFilter(parseFloat(trMatch[1].replace(",", ".")) * 1_000_000);
  }

  const kMatch = s.match(/^(\d+(?:[.,]\d+)?)k$/);
  if (kMatch) {
    return clampPriceForFilter(parseFloat(kMatch[1].replace(",", ".")) * 1_000);
  }

  const digits = s.replace(/,(?=\d{3})/g, "").replace(",", ".");
  const plain = Number(digits);
  if (Number.isFinite(plain) && plain >= 0) {
    return clampPriceForFilter(plain);
  }

  return null;
}

export function sliderValueForPrice(v: number): number {
  return snapPriceToSlider(Math.min(v, PHI_SLIDER_MAX));
}

export function activePricePresetId(phiMin: number, phiMax: number): PricePresetId | null {
  const hit = PHI_PRICE_PRESETS.find((p) => p.min === phiMin && p.max === phiMax);
  return hit?.id ?? null;
}

export function isDefaultPriceRange(phiMin: number, phiMax: number): boolean {
  return phiMin === PHI_DEFAULT_MIN && phiMax === PHI_DEFAULT_MAX;
}

export function useKhoaHocFilters(items: KhoaHocListItem[]) {
  const [moHinh, setMoHinh] = useState<MoHinhFilter>("all");
  const [hinhThuc, setHinhThuc] = useState<HinhThucFilter>("all");
  const [phiMin, setPhiMin] = useState(PHI_DEFAULT_MIN);
  const [phiMax, setPhiMax] = useState(PHI_DEFAULT_MAX);

  const priceSuffix =
    moHinh === "lien_tuc_theo_thang" ||
    items.some((k) => k.loaiMoHinh === "lien_tuc_theo_thang")
      ? "/th"
      : "";

  const priceFilterActive = !isDefaultPriceRange(phiMin, phiMax);

  const filtered = useMemo(() => {
    return items.filter((k) => {
      if (moHinh !== "all" && k.loaiMoHinh !== moHinh) return false;
      if (hinhThuc !== "all" && k.hinhThuc !== hinhThuc) return false;
      if (!priceFilterActive) return true;
      if (k.hocPhi != null) {
        return k.hocPhi >= phiMin && k.hocPhi <= phiMax;
      }
      return false;
    });
  }, [items, moHinh, hinhThuc, phiMin, phiMax, priceFilterActive]);

  const filtersActive =
    moHinh !== "all" ||
    hinhThuc !== "all" ||
    priceFilterActive;

  function resetFilters() {
    setMoHinh("all");
    setHinhThuc("all");
    setPhiMin(PHI_DEFAULT_MIN);
    setPhiMax(PHI_DEFAULT_MAX);
  }

  function applyPricePreset(id: PricePresetId) {
    const preset = PHI_PRICE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPhiMin(preset.min);
    setPhiMax(preset.max);
  }

  return {
    moHinh,
    setMoHinh,
    hinhThuc,
    setHinhThuc,
    phiMin,
    setPhiMin,
    phiMax,
    setPhiMax,
    priceSuffix,
    priceFilterActive,
    filtered,
    filtersActive,
    resetFilters,
    applyPricePreset,
    activePricePresetId: activePricePresetId(phiMin, phiMax),
  };
}

export type KhoaHocFiltersState = ReturnType<typeof useKhoaHocFilters>;
