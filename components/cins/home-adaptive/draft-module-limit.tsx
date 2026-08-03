"use client";

import { createContext, useContext, type ReactNode } from "react";

import {
  HOME_LAYOUT_ITEM_LIMIT_DEFAULT,
  clampItemLimit,
  type HomeLayoutItemLimits,
} from "@/lib/cins/home-adaptive/layout-prefs";
import type { ModuleId } from "@/lib/cins/home-adaptive/persona";

type DraftLimitCtx = {
  editing: boolean;
  limits: HomeLayoutItemLimits;
};

const DraftLimitContext = createContext<DraftLimitCtx | null>(null);

/** Provider mỏng — tránh circular import với HomeLayoutBoard. */
export function DraftModuleLimitProvider({
  editing,
  limits,
  children,
}: {
  editing: boolean;
  limits: HomeLayoutItemLimits;
  children: ReactNode;
}) {
  return (
    <DraftLimitContext.Provider value={{ editing, limits }}>
      {children}
    </DraftLimitContext.Provider>
  );
}

/**
 * Số dòng hiển thị khi đang edit layout — đọc `draft.limits`.
 * Ngoài edit / không có provider → dùng `fallback` (thường từ SSR prop).
 */
export function useDraftModuleItemLimit(
  id: ModuleId,
  fallback: number = HOME_LAYOUT_ITEM_LIMIT_DEFAULT,
): number {
  const ctx = useContext(DraftLimitContext);
  const raw =
    ctx?.editing
      ? (ctx.limits[id] ?? HOME_LAYOUT_ITEM_LIMIT_DEFAULT)
      : fallback;
  return clampItemLimit(raw) ?? HOME_LAYOUT_ITEM_LIMIT_DEFAULT;
}
