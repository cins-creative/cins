"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback, useState, useTransition } from "react";

import { useJourneyPersonalFilterOptional } from "@/components/journey/JourneyPersonalFilterContext";
import {
  countUserPersonalFilters,
  filterTimelinePersonalFilters,
  isSystemPersonalFilterSlug,
} from "@/lib/filter/cong-dong-personal-filter.shared";
import { DEFAULT_FILTER_MAU, MAX_FILTERS_PER_OWNER } from "@/lib/filter/constants";
import type { PersonalFilter } from "@/lib/filter/types";

type Props = {
  /** Gọi sau khi chọn nhãn — parent thường đóng dropdown. */
  onItemSelect?: () => void;
  /** Gọi khi bật một nhãn — parent reset loại milestone về "Tất cả". */
  onActivate?: () => void;
};

function PersonalFilterRow({
  filter,
  active,
  count,
  onSelect,
  showDelete,
  onDelete,
}: {
  filter: PersonalFilter;
  active: boolean;
  count?: number;
  onSelect: () => void;
  showDelete?: boolean;
  onDelete?: () => void;
}) {
  const mau = filter.mau ?? DEFAULT_FILTER_MAU;

  return (
    <div className={"j-dd-opt j-dd-row" + (active ? " is-active" : "")}>
      <button
        type="button"
        role="option"
        aria-selected={active}
        className="j-dd-opt-main"
        onClick={onSelect}
      >
        <span
          className="j-dd-dot"
          style={{ background: mau }}
          aria-hidden
        />
        <span className="j-dd-lbl">{filter.ten}</span>
        {typeof count === "number" ? (
          <span className="j-dd-n">{count}</span>
        ) : null}
      </button>
      {showDelete && onDelete ? (
        <button
          type="button"
          className="j-dd-del"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title={`Xóa nhãn "${filter.ten}"`}
          aria-label={`Xóa ${filter.ten}`}
        >
          <Trash2 size={12} strokeWidth={1.8} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Section "Nhãn riêng" trong dropdown filter timeline / gallery.
 * Khác loại milestone `ca-nhan` ("Cá nhân") — nhãn gắn trên mọi loại cột mốc.
 */
export function JourneyPersonalFilterMenuSection({
  onItemSelect,
  onActivate,
}: Props) {
  const ctx = useJourneyPersonalFilterOptional();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const onCreate = useCallback(() => {
    if (!ctx) return;
    if (countUserPersonalFilters(ctx.filters) >= MAX_FILTERS_PER_OWNER) {
      setError(`Tối đa ${MAX_FILTERS_PER_OWNER} nhãn mỗi Journey.`);
      return;
    }
    const ten = newName.trim();
    if (!ten) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ten, mau: DEFAULT_FILTER_MAU }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Không tạo được nhãn.");
        return;
      }
      setNewName("");
      await ctx.refreshFilters();
    });
  }, [ctx, newName]);

  const onDelete = useCallback(
    (filter: PersonalFilter) => {
      if (!ctx) return;
      if (!window.confirm(`Xóa nhãn "${filter.ten}"?`)) return;
      startTransition(async () => {
        const res = await fetch(`/api/filters/${encodeURIComponent(filter.id)}`, {
          method: "DELETE",
        });
        if (!res.ok) return;
        if (ctx.activeSlug === filter.slug) ctx.setActiveSlug(null);
        await ctx.refreshFilters();
      });
    },
    [ctx],
  );

  if (!ctx) return null;

  const { filters: rawFilters, activeSlug, setActiveSlug, isOwner, loading } = ctx;
  const filters = filterTimelinePersonalFilters(rawFilters);

  if (loading && filters.length === 0) return null;
  if (!loading && filters.length === 0 && !isOwner) return null;

  const selectSlug = (slug: string | null) => {
    setActiveSlug(slug);
    if (slug) onActivate?.();
    onItemSelect?.();
  };

  const hasRows = filters.length > 0;
  const userFilterCount = countUserPersonalFilters(rawFilters);
  const atLabelLimit = userFilterCount >= MAX_FILTERS_PER_OWNER;

  return (
    <div className="j-dd-section j-dd-section--personal-labels">
      <div className="j-dd-section-label">Nhãn riêng</div>
      {filters.map((filter) => (
        <PersonalFilterRow
          key={filter.id}
          filter={filter}
          active={activeSlug === filter.slug}
          count={filter.count}
          onSelect={() =>
            selectSlug(activeSlug === filter.slug ? null : filter.slug)
          }
          showDelete={isOwner && !isSystemPersonalFilterSlug(filter.slug)}
          onDelete={() => onDelete(filter)}
        />
      ))}
      {isOwner ? (
        <div className="j-personal-filter-dd-manage">
          {atLabelLimit ? (
            <p className="j-personal-filter-hint">
              Đã đủ {MAX_FILTERS_PER_OWNER} nhãn — xóa một nhãn để thêm mới.
            </p>
          ) : (
            <div className="j-personal-filter-create">
              <input
                type="text"
                className="j-personal-filter-input"
                placeholder="Tên nhãn mới…"
                maxLength={40}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCreate();
                }}
              />
              <button
                type="button"
                className="j-personal-filter-create-btn"
                onClick={onCreate}
                aria-label="Tạo nhãn"
              >
                <Plus size={14} />
              </button>
            </div>
          )}
          {error ? <p className="j-personal-filter-error">{error}</p> : null}
          {!hasRows && !atLabelLimit ? (
            <p className="j-personal-filter-hint">
              Gắn trên cột mốc để lọc — khác loại cột mốc (Học tập, Cá nhân, …). Tối đa{" "}
              {MAX_FILTERS_PER_OWNER} nhãn.
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="j-dd-divider j-dd-divider--section" aria-hidden />
    </div>
  );
}
