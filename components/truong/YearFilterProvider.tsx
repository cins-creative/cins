"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { defaultTruongNganhYear } from "@/lib/truong/diem-chuan";
import { writePinnedDisplayYear } from "@/lib/truong/pin-display-year";

type YearFilterContextValue = {
  year: number;
  yearOptions: number[];
  setYear: (year: number) => void;
};

const YearFilterContext = createContext<YearFilterContextValue | null>(null);

type Props = {
  yearOptions: number[];
  /** Năm khởi tạo (vd. từ pickDefaultTruongYear + cauHinhYears). */
  initialYear?: number;
  /** Slug trường — lưu năm ghim sidebar khi admin đổi năm. */
  persistPinYearSlug?: string | null;
  children: ReactNode;
};

export function YearFilterProvider({
  yearOptions,
  initialYear,
  persistPinYearSlug,
  children,
}: Props) {
  const [runtimeYears, setRuntimeYears] = useState<number[]>([]);

  const options = useMemo(() => {
    const merged = new Set([
      ...(yearOptions.length ? yearOptions : [defaultTruongNganhYear()]),
      ...runtimeYears,
    ]);
    return [...merged].sort((a, b) => b - a);
  }, [yearOptions, runtimeYears]);

  const [year, setYearState] = useState(() => {
    const preferred =
      typeof initialYear === "number" && initialYear > 0
        ? initialYear
        : defaultTruongNganhYear();
    return options.includes(preferred) ? preferred : options[0]!;
  });

  useEffect(() => {
    if (!options.includes(year)) {
      setYearState(options[0]!);
    }
  }, [options, year]);

  const setYear = useCallback(
    (next: number) => {
      if (!Number.isFinite(next) || next < 2000 || next > 2100) return;
      setRuntimeYears((prev) => (prev.includes(next) ? prev : [...prev, next]));
      setYearState(next);
      const slug = persistPinYearSlug?.trim();
      if (slug) writePinnedDisplayYear(slug, next);
    },
    [persistPinYearSlug],
  );

  const value = useMemo(
    () => ({ year, yearOptions: options, setYear }),
    [year, options, setYear],
  );

  return (
    <YearFilterContext.Provider value={value}>
      {children}
    </YearFilterContext.Provider>
  );
}

export function useYearFilter(): YearFilterContextValue {
  const ctx = useContext(YearFilterContext);
  if (!ctx) {
    throw new Error("useYearFilter must be used within YearFilterProvider");
  }
  return ctx;
}

export function TruongYearSelect({
  label = "Năm",
  /** Danh sách riêng (vd. năm lịch từ mốc timeline). */
  years,
}: {
  label?: string;
  years?: number[];
}) {
  const { year, yearOptions, setYear } = useYearFilter();
  const options =
    years && years.length > 0 ? [...years].sort((a, b) => b - a) : yearOptions;

  useEffect(() => {
    if (!options.length) return;
    if (!options.includes(year)) setYear(options[0]!);
  }, [options, year, setYear]);

  return (
    <select
      className="sec-year-select"
      value={options.includes(year) ? year : options[0]!}
      onChange={(e) => setYear(Number(e.target.value))}
      aria-label={label}
    >
      {options.map((y) => (
        <option key={y} value={y}>
          Năm {y}
        </option>
      ))}
    </select>
  );
}
