"use client";

import { useMemo, useState } from "react";

import type { TuyenDungListItem } from "@/lib/to-chuc/tuyen-dung-listing";
import {
  STUDIO_JOB_CAP_DO_OPTIONS,
  STUDIO_JOB_CAP_DO_LABEL,
} from "@/lib/to-chuc/studio-tuyen-dung-distribution";
import {
  STUDIO_JOB_LOAI_HINH_LABEL,
  type StudioJobLoaiHinh,
} from "@/lib/to-chuc/studio-tuyen-dung-types";

export type LoaiHinhFilter = "all" | StudioJobLoaiHinh;
export type CapDoFilter = "all" | string;
export type NoiLamFilter = "all" | "onsite" | "remote";

export const LOAI_HINH_OPTIONS: { id: LoaiHinhFilter; label: string }[] = [
  { id: "all", label: "Mọi loại hình" },
  ...(
    Object.entries(STUDIO_JOB_LOAI_HINH_LABEL) as [StudioJobLoaiHinh, string][]
  ).map(([id, label]) => ({ id, label })),
];

export const CAP_DO_OPTIONS: { id: CapDoFilter; label: string }[] = [
  { id: "all", label: "Mọi cấp độ" },
  ...STUDIO_JOB_CAP_DO_OPTIONS.filter((o) => o.value).map((o) => ({
    id: o.value as string,
    label: STUDIO_JOB_CAP_DO_LABEL[o.value] ?? o.label,
  })),
];

export const NOI_LAM_OPTIONS: { id: NoiLamFilter; label: string }[] = [
  { id: "all", label: "Mọi nơi làm" },
  { id: "onsite", label: "Tại văn phòng" },
  { id: "remote", label: "Remote" },
];

/** Slider mức lương: 0 → 50 tr/tháng, bước 1 tr. */
export const LUONG_SLIDER_MIN = 0;
export const LUONG_SLIDER_MAX = 50_000_000;
export const LUONG_SLIDER_STEP = 1_000_000;

export const LUONG_DEFAULT_MIN = LUONG_SLIDER_MIN;
export const LUONG_DEFAULT_MAX = LUONG_SLIDER_MAX;

export type LuongPresetId = "all" | "below10" | "mid" | "above20";

export const LUONG_PRICE_PRESETS: {
  id: LuongPresetId;
  label: string;
  min: number;
  max: number;
}[] = [
  { id: "all", label: "Mọi mức", min: LUONG_DEFAULT_MIN, max: LUONG_DEFAULT_MAX },
  { id: "below10", label: "Dưới 10 tr", min: 0, max: 10_000_000 },
  { id: "mid", label: "10 – 20 tr", min: 10_000_000, max: 20_000_000 },
  { id: "above20", label: "Trên 20 tr", min: 20_000_000, max: LUONG_DEFAULT_MAX },
];

export function formatLuongShort(v: number): string {
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

export function snapLuongToSlider(v: number): number {
  const clamped = Math.min(LUONG_SLIDER_MAX, Math.max(LUONG_SLIDER_MIN, v));
  return Math.round(clamped / LUONG_SLIDER_STEP) * LUONG_SLIDER_STEP;
}

export function sliderValueForLuong(v: number): number {
  return snapLuongToSlider(Math.min(v, LUONG_SLIDER_MAX));
}

export function activeLuongPresetId(
  luongMin: number,
  luongMax: number,
): LuongPresetId | null {
  const hit = LUONG_PRICE_PRESETS.find(
    (p) => p.min === luongMin && p.max === luongMax,
  );
  return hit?.id ?? null;
}

export function isDefaultLuongRange(luongMin: number, luongMax: number): boolean {
  return luongMin === LUONG_DEFAULT_MIN && luongMax === LUONG_DEFAULT_MAX;
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

/** Danh sách lĩnh vực xuất hiện trong tin, đã khử trùng lặp và sắp xếp. */
export function collectLinhVuc(items: TuyenDungListItem[]): string[] {
  const set = new Set<string>();
  for (const it of items) {
    if (it.linhVucTen) set.add(it.linhVucTen);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
}

export function useTuyenDungFilters(items: TuyenDungListItem[]) {
  const [q, setQ] = useState("");
  const [loaiHinh, setLoaiHinh] = useState<LoaiHinhFilter>("all");
  const [capDo, setCapDo] = useState<CapDoFilter>("all");
  const [linhVuc, setLinhVuc] = useState<string>("all");
  const [noiLam, setNoiLam] = useState<NoiLamFilter>("all");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [luongMin, setLuongMin] = useState(LUONG_DEFAULT_MIN);
  const [luongMax, setLuongMax] = useState(LUONG_DEFAULT_MAX);

  const linhVucOptions = useMemo(() => collectLinhVuc(items), [items]);
  const luongFilterActive = !isDefaultLuongRange(luongMin, luongMax);

  const filtered = useMemo(() => {
    const needle = normalizeText(q.trim());
    return items.filter((job) => {
      if (onlyOpen && job.expired) return false;
      if (loaiHinh !== "all" && job.loaiHinh !== loaiHinh) return false;
      if (capDo !== "all" && !job.capDoValues.includes(capDo)) return false;
      if (linhVuc !== "all" && job.linhVucTen !== linhVuc) return false;
      if (noiLam === "remote" && !job.remote) return false;
      if (noiLam === "onsite" && job.remote) return false;

      if (luongFilterActive) {
        const lo = job.salaryMin ?? job.salaryMax;
        const hi = job.salaryMax ?? job.salaryMin;
        if (lo == null || hi == null) return false;
        // Giao nhau giữa [lo, hi] của tin và [luongMin, luongMax] của bộ lọc.
        if (hi < luongMin || lo > luongMax) return false;
      }

      if (needle) {
        const hay = normalizeText(
          `${job.tieuDe} ${job.orgTen} ${job.linhVucTen ?? ""}`,
        );
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [
    items,
    q,
    loaiHinh,
    capDo,
    linhVuc,
    noiLam,
    onlyOpen,
    luongFilterActive,
    luongMin,
    luongMax,
  ]);

  const filtersActive =
    q.trim().length > 0 ||
    loaiHinh !== "all" ||
    capDo !== "all" ||
    linhVuc !== "all" ||
    noiLam !== "all" ||
    onlyOpen ||
    luongFilterActive;

  function resetFilters() {
    setQ("");
    setLoaiHinh("all");
    setCapDo("all");
    setLinhVuc("all");
    setNoiLam("all");
    setOnlyOpen(false);
    setLuongMin(LUONG_DEFAULT_MIN);
    setLuongMax(LUONG_DEFAULT_MAX);
  }

  function applyLuongPreset(id: LuongPresetId) {
    const preset = LUONG_PRICE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setLuongMin(preset.min);
    setLuongMax(preset.max);
  }

  return {
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
    luongFilterActive,
    filtered,
    filtersActive,
    resetFilters,
    applyLuongPreset,
  };
}

export type TuyenDungFiltersState = ReturnType<typeof useTuyenDungFilters>;
