"use client";

import { createContext, useContext } from "react";

import type {
  SearchEntityKind,
  SearchHit,
  SearchKindTab,
} from "@/lib/search/types";

export type TimKiemStreamValue = {
  query: string;
  activeKind: SearchKindTab;
  setActiveKind: (kind: SearchKindTab) => void;
  /** Kết quả từng loại — được các khối stream đăng ký khi resolve xong. */
  hitsByKind: Partial<Record<SearchEntityKind, SearchHit[]>>;
  registerHits: (kind: SearchEntityKind, hits: SearchHit[]) => void;
};

export const TimKiemStreamContext = createContext<TimKiemStreamValue | null>(
  null,
);

export function useTimKiemStream(): TimKiemStreamValue {
  const ctx = useContext(TimKiemStreamContext);
  if (!ctx) {
    throw new Error(
      "useTimKiemStream phải nằm trong <TimKiemStreamRoot>.",
    );
  }
  return ctx;
}
