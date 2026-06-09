"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BAI_DANG_LOAI_LABELS } from "@/lib/truong/bai-dang";
import type { BaiDangTimelineFilter } from "@/lib/truong/bai-dang-timeline";

type Props = {
  year: number | null;
  monthLabel: string | null;
  filter: BaiDangTimelineFilter;
  onFilterChange: (f: BaiDangTimelineFilter) => void;
  counts: Record<BaiDangTimelineFilter, number>;
  enabled?: boolean;
};

const FILTER_OPTIONS: { value: BaiDangTimelineFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "thong_bao", label: BAI_DANG_LOAI_LABELS.thong_bao },
  { value: "tuyen_sinh", label: BAI_DANG_LOAI_LABELS.tuyen_sinh },
  { value: "su_kien", label: BAI_DANG_LOAI_LABELS.su_kien },
  { value: "khac", label: BAI_DANG_LOAI_LABELS.khac },
];

export function OrgBaiDangTimelineBar({
  year,
  monthLabel,
  filter,
  onFilterChange,
  counts,
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
    FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? "Tất cả";

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
          <span className="j-tlb-dd-count">{counts[filter]}</span>
          <ChevronDown size={14} className="j-tlb-dd-caret" aria-hidden />
        </button>
        <div className="j-tlb-dd-menu" role="menu">
          <div className="j-dd-section-label">Loại bài đăng</div>
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="menuitem"
              className={
                "j-dd-opt j-dd-opt-main" + (filter === opt.value ? " is-active" : "")
              }
              onClick={() => {
                onFilterChange(opt.value);
                setOpen(false);
              }}
            >
              <span className="j-dd-lbl">{opt.label}</span>
              <span className="j-dd-n">{counts[opt.value]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
