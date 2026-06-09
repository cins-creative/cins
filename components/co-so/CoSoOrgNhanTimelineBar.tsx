"use client";

import { ChevronDown, Circle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { CoSoFilterChip } from "@/lib/to-chuc/co-so-page-queries";

export type CoSoNhanFilter = "all" | string;

type Props = {
  year: number | null;
  monthLabel: string | null;
  filter: CoSoNhanFilter;
  onFilterChange: (f: CoSoNhanFilter) => void;
  counts: Record<string, number>;
  filters: CoSoFilterChip[];
  enabled?: boolean;
};

export function CoSoOrgNhanTimelineBar({
  year,
  monthLabel,
  filter,
  onFilterChange,
  counts,
  filters,
  enabled = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const activeLabel =
    filter === "all"
      ? "Tất cả"
      : (filters.find((f) => f.slug === filter)?.ten ?? "Tất cả");

  return (
    <div className="j-tlb org-baidang-tlb">
      <div className="j-tlb-year">{year ?? "—"}</div>
      <div className="j-tlb-month">{monthLabel ?? ""}</div>
      <div className={`j-tlb-filter${open ? " is-open" : ""}`} ref={wrapRef}>
        <button
          type="button"
          className="j-tlb-dd-btn"
          disabled={!enabled}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {activeLabel}
          <span className="j-tlb-dd-count">{counts[filter] ?? counts.all ?? 0}</span>
          <ChevronDown size={14} className="j-tlb-dd-caret" aria-hidden />
        </button>
        <div className="j-tlb-dd-menu" role="menu">
          <div className="j-dd-section-label">Nhãn lọc</div>
          <button
            type="button"
            role="menuitem"
            className={
              "j-dd-opt j-dd-opt-main" + (filter === "all" ? " is-active" : "")
            }
            onClick={() => {
              onFilterChange("all");
              setOpen(false);
            }}
          >
            <Circle size={14} aria-hidden />
            <span className="j-dd-lbl">Tất cả</span>
            <span className="j-dd-n">{counts.all ?? 0}</span>
          </button>
          {filters.map((chip) => (
            <button
              key={chip.id}
              type="button"
              role="menuitem"
              className={
                "j-dd-opt j-dd-opt-main" +
                (filter === chip.slug ? " is-active" : "")
              }
              onClick={() => {
                onFilterChange(chip.slug);
                setOpen(false);
              }}
            >
              <span
                className="j-dd-dot"
                style={{ background: chip.mau ?? "var(--cins-blue)" }}
                aria-hidden
              />
              <span className="j-dd-lbl">{chip.ten}</span>
              <span className="j-dd-n">{counts[chip.slug] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
