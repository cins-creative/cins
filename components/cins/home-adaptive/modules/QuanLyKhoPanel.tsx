"use client";

import { ChevronDown, Package } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { CinsArrowIos } from "@/components/icons/CinsArrowIos";
import { QuanLyKhoList } from "@/components/cins/home-adaptive/modules/QuanLyKhoList";
import { useDraftModuleItemLimit } from "@/components/cins/home-adaptive/draft-module-limit";
import type {
  QuanLyKhoFilter,
  QuanLyKhoItem,
} from "@/lib/cins/home-adaptive/quan-ly-kho-types";
import { QUAN_LY_KHO_FILTERS } from "@/lib/cins/home-adaptive/quan-ly-kho-types";

function KhoStatusFilter({
  value,
  onChange,
  counts,
}: {
  value: QuanLyKhoFilter;
  onChange: (next: QuanLyKhoFilter) => void;
  counts: Record<QuanLyKhoFilter, number>;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const current =
    QUAN_LY_KHO_FILTERS.find((f) => f.id === value) ?? QUAN_LY_KHO_FILTERS[0]!;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`ha-don-filter${open ? " is-open" : ""}`} ref={wrapRef}>
      <button
        type="button"
        className="ha-don-filter-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        title="Lọc tồn kho"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ha-don-filter-label">{current.label}</span>
        <ChevronDown size={12} strokeWidth={2.5} aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          className="ha-don-filter-menu"
          role="listbox"
          aria-label="Lọc tồn kho"
        >
          {QUAN_LY_KHO_FILTERS.map((opt) => {
            const active = opt.id === value;
            const count = counts[opt.id];
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={active}
                className={`ha-don-filter-option${active ? " is-active" : ""}`}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                <span className="ha-don-filter-count">{count}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  items: QuanLyKhoItem[];
  canhBao: number;
  limit?: number;
};

/** Shop · Quản lý kho hàng + dropdown Còn hàng / Sắp hết / Hết hàng. */
export function QuanLyKhoPanel({
  items: initial,
  canhBao,
  limit = 4,
}: Props) {
  const liveLimit = useDraftModuleItemLimit("quan_ly_kho", limit);
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState<QuanLyKhoFilter>(() =>
    canhBao > 0 ? "sap_het" : "ok",
  );
  const rowLimit = Math.min(10, Math.max(1, Math.round(liveLimit)));

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const counts = useMemo(() => {
    const base: Record<QuanLyKhoFilter, number> = {
      ok: 0,
      sap_het: 0,
      het: 0,
    };
    for (const it of items) {
      base[it.mucDo] += 1;
    }
    return base;
  }, [items]);

  /* Nếu tab mặc định trống mà tab khác có hàng → nhảy sang tab có dữ liệu. */
  useEffect(() => {
    if (counts[filter] > 0) return;
    const fallback =
      QUAN_LY_KHO_FILTERS.find((f) => counts[f.id] > 0)?.id ?? null;
    if (fallback && fallback !== filter) setFilter(fallback);
  }, [counts, filter]);

  const rows = useMemo(
    () => items.filter((it) => it.mucDo === filter).slice(0, rowLimit),
    [items, filter, rowLimit],
  );

  const filterLabel =
    QUAN_LY_KHO_FILTERS.find((f) => f.id === filter)?.label ?? "";

  return (
    <section className="ha-card ha-card--kho">
      <div className="ha-card-head">
        <Package size={16} strokeWidth={2} aria-hidden />
        <span className="ha-card-title">Quản lý kho hàng</span>
        {canhBao > 0 ? (
          <span className="ha-card-badge">{canhBao}</span>
        ) : null}
        <KhoStatusFilter
          value={filter}
          onChange={setFilter}
          counts={counts}
        />
        <Link
          href="/ban-hang/kho"
          className="ha-card-more"
          prefetch={false}
          aria-label="Quản lý kho"
          title="Quản lý kho"
        >
          <CinsArrowIos size={16} strokeWidth={2.5} aria-hidden />
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="ha-card-empty">
          {items.length === 0
            ? "Chưa có hàng trong kho."
            : `Không có mục «${filterLabel}».`}
        </p>
      ) : (
        <QuanLyKhoList items={rows} />
      )}
    </section>
  );
}
