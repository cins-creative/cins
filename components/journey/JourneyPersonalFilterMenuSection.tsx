"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { JourneyFilterRenameButton } from "@/components/journey/JourneyFilterRenameButton";
import { JourneyFilterShareButton } from "@/components/journey/JourneyFilterShareButton";
import { useJourneyFilterShareOptional } from "@/components/journey/JourneyFilterShareContext";
import { useJourneyPersonalFilterOptional } from "@/components/journey/JourneyPersonalFilterContext";
import {
  countUserPersonalFilters,
  isSystemPersonalFilterSlug,
  orderTimelinePersonalFilters,
} from "@/lib/filter/cong-dong-personal-filter.shared";
import {
  DEFAULT_FILTER_MAU,
  MAX_FILTER_NAME,
  MAX_FILTERS_PER_OWNER,
} from "@/lib/filter/constants";
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
  onSelect,
  showManage,
  onDelete,
  onRename,
  onShareMenuClose,
}: {
  filter: PersonalFilter;
  active: boolean;
  onSelect: () => void;
  showManage?: boolean;
  onDelete?: () => void;
  onRename?: (ten: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onShareMenuClose?: () => void;
}) {
  const mau = filter.mau ?? DEFAULT_FILTER_MAU;
  const filterShare = useJourneyFilterShareOptional();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(filter.ten);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurRef = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(filter.ten);
  }, [filter.ten, editing]);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const commitRename = useCallback(async () => {
    if (!onRename || saving) return;
    const ten = draft.trim();
    if (!ten) {
      setRenameError("Tên nhãn không được trống.");
      return;
    }
    if (ten === filter.ten) {
      skipBlurRef.current = true;
      setEditing(false);
      setRenameError(null);
      return;
    }
    setSaving(true);
    setRenameError(null);
    const result = await onRename(ten);
    setSaving(false);
    if (!result.ok) {
      setRenameError(result.error);
      return;
    }
    skipBlurRef.current = true;
    setEditing(false);
  }, [onRename, saving, draft, filter.ten]);

  if (editing && onRename) {
    return (
      <div className={"j-dd-opt j-dd-row is-editing" + (active ? " is-active" : "")}>
        <span className="j-dd-dot" style={{ background: mau }} aria-hidden />
        <input
          ref={inputRef}
          type="text"
          className="j-dd-rename-input"
          value={draft}
          maxLength={MAX_FILTER_NAME}
          disabled={saving}
          aria-label="Tên nhãn"
          onChange={(e) => setDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
              e.preventDefault();
              void commitRename();
            } else if (e.key === "Escape") {
              e.preventDefault();
              skipBlurRef.current = true;
              setEditing(false);
              setRenameError(null);
              setDraft(filter.ten);
            }
          }}
          onBlur={() => {
            if (skipBlurRef.current) {
              skipBlurRef.current = false;
              return;
            }
            void commitRename();
          }}
        />
        {renameError ? (
          <span className="j-dd-rename-error" role="alert">
            {renameError}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={"j-dd-opt j-dd-row" + (active ? " is-active" : "")}>
      <button
        type="button"
        role="option"
        aria-selected={active}
        className="j-dd-opt-main"
        onClick={onSelect}
      >
        <span className="j-dd-dot" style={{ background: mau }} aria-hidden />
        <span className="j-dd-lbl">{filter.ten}</span>
      </button>
      {showManage && onRename ? (
        <JourneyFilterRenameButton
          label={filter.ten}
          onEdit={() => {
            setDraft(filter.ten);
            setRenameError(null);
            setEditing(true);
          }}
        />
      ) : null}
      <JourneyFilterShareButton
        label={filter.ten}
        onShare={
          filterShare
            ? () => {
                filterShare.openGalleryFilterShare({
                  kind: "personal-label",
                  slug: filter.slug,
                  label: filter.ten,
                });
                onShareMenuClose?.();
              }
            : undefined
        }
      />
      {showManage && onDelete ? (
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

  const onRename = useCallback(
    async (filter: PersonalFilter, ten: string) => {
      if (!ctx) return { ok: false as const, error: "Không có quyền sửa." };
      const res = await fetch(`/api/filters/${encodeURIComponent(filter.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ten }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        return {
          ok: false as const,
          error: data?.error ?? "Không đổi được tên nhãn.",
        };
      }
      await ctx.refreshFilters();
      return { ok: true as const };
    },
    [ctx],
  );

  if (!ctx) return null;

  const { filters: rawFilters, activeSlug, setActiveSlug, isOwner, loading } = ctx;
  const filters = orderTimelinePersonalFilters(rawFilters, { isOwner });

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
      {filters.map((filter) => {
        const canManageRow =
          isOwner && !isSystemPersonalFilterSlug(filter.slug);
        return (
          <PersonalFilterRow
            key={filter.id}
            filter={filter}
            active={activeSlug === filter.slug}
            onSelect={() =>
              selectSlug(activeSlug === filter.slug ? null : filter.slug)
            }
            showManage={canManageRow}
            onDelete={() => onDelete(filter)}
            onRename={
              canManageRow ? (ten) => onRename(filter, ten) : undefined
            }
            onShareMenuClose={onItemSelect}
          />
        );
      })}
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
