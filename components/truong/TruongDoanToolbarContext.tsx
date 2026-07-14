"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { DoanMonOption } from "@/components/truong/TruongDoanToolbar";
import type { DoanViewMode } from "@/lib/truong/doan-project-sort";
import type { TagAggSort } from "@/lib/tag/aggregation-types";

export type TruongDoanToolbarModel = {
  sort: TagAggSort;
  view: DoanViewMode;
  yearFilter: string;
  yearOptions: number[];
  nganhFilter: string;
  nganhOptions: string[];
  monFilter: string;
  monOptions: DoanMonOption[];
  onViewChange: (view: DoanViewMode) => void;
  onSortChange: (sort: TagAggSort) => void;
  onYearChange: (year: string) => void;
  onNganhChange: (nganh: string) => void;
  onMonChange: (monId: string) => void;
};

type ContextValue = {
  toolbar: TruongDoanToolbarModel | null;
  setToolbar: (toolbar: TruongDoanToolbarModel | null) => void;
};

const TruongDoanToolbarContext = createContext<ContextValue | null>(null);

export function TruongDoanToolbarProvider({ children }: { children: ReactNode }) {
  const [toolbar, setToolbar] = useState<TruongDoanToolbarModel | null>(null);
  const value = useMemo(() => ({ toolbar, setToolbar }), [toolbar]);
  return (
    <TruongDoanToolbarContext.Provider value={value}>
      {children}
    </TruongDoanToolbarContext.Provider>
  );
}

export function useTruongDoanToolbarSlot() {
  const ctx = useContext(TruongDoanToolbarContext);
  if (!ctx) {
    throw new Error(
      "useTruongDoanToolbarSlot must be used within TruongDoanToolbarProvider",
    );
  }
  return ctx;
}

export function useOptionalTruongDoanToolbarSlot() {
  return useContext(TruongDoanToolbarContext);
}
