"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { JourneyFilterRenameButton } from "@/components/journey/JourneyFilterRenameButton";
import { JourneyFilterShareButton } from "@/components/journey/JourneyFilterShareButton";
import { useOrgBaiDangFilterShareOptional } from "@/components/org/OrgBaiDangFilterShareContext";
import {
  createOrgBaiDangFilterClient,
  deleteOrgBaiDangFilterClient,
  updateOrgBaiDangFilterClient,
  useOrgBaiDangFilterOptional,
} from "@/components/truong/OrgBaiDangFilterContext";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { DEFAULT_FILTER_MAU, MAX_FILTER_NAME } from "@/lib/filter/constants";
import type { PersonalFilter } from "@/lib/filter/types";
import {
  MAX_TRUONG_ORG_BAI_DANG_FILTERS,
  orgBaiDangNhanFilterKey,
} from "@/lib/truong/org-bai-dang-filters.shared";
import type { OrgBaiDangTimelineFilterKey } from "@/lib/truong/bai-dang-timeline";

type Props = {
  filterKey: OrgBaiDangTimelineFilterKey;
  onFilterKeyChange: (key: OrgBaiDangTimelineFilterKey) => void;
  nhanCounts: Record<string, number>;
  onItemSelect?: () => void;
};

function PersonalFilterRow({
  filter,
  active,
  count,
  onSelect,
  showManage,
  onDelete,
  onRename,
  onShareMenuClose,
}: {
  filter: PersonalFilter;
  active: boolean;
  count?: number;
  onSelect: () => void;
  showManage?: boolean;
  onDelete?: () => void;
  onRename?: (ten: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onShareMenuClose?: () => void;
}) {
  const mau = filter.mau ?? DEFAULT_FILTER_MAU;
  const filterShare = useOrgBaiDangFilterShareOptional();
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
        role="menuitem"
        aria-selected={active}
        className="j-dd-opt-main"
        onClick={onSelect}
      >
        <span className="j-dd-dot" style={{ background: mau }} aria-hidden />
        <span className="j-dd-lbl">{filter.ten}</span>
        {typeof count === "number" ? <span className="j-dd-n">{count}</span> : null}
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
                filterShare.openBaiDangFilterShare({
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

export function OrgBaiDangCustomFilterMenuSection({
  filterKey,
  onFilterKeyChange,
  nhanCounts,
  onItemSelect,
}: Props) {
  const ctx = useOrgBaiDangFilterOptional();
  const inline = useTruongInlineEdit();
  const [newName, setNewName] = useState("");
  const [newMau, setNewMau] = useState(DEFAULT_FILTER_MAU);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const onCreate = useCallback(() => {
    if (!ctx || !inline) return;
    if (ctx.filters.length >= MAX_TRUONG_ORG_BAI_DANG_FILTERS) {
      setError(`Tối đa ${MAX_TRUONG_ORG_BAI_DANG_FILTERS} nhãn tùy chỉnh.`);
      return;
    }
    const ten = newName.trim();
    if (!ten) return;
    setError(null);
    startTransition(async () => {
      const result = await createOrgBaiDangFilterClient(
        inline.orgId,
        ten,
        newMau,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewName("");
      setNewMau(DEFAULT_FILTER_MAU);
      await ctx.refreshFilters();
    });
  }, [ctx, inline, newName, newMau]);

  const onDelete = useCallback(
    (filter: PersonalFilter) => {
      if (!ctx || !inline) return;
      if (!window.confirm(`Xóa nhãn "${filter.ten}"?`)) return;
      startTransition(async () => {
        const ok = await deleteOrgBaiDangFilterClient(inline.orgId, filter.id);
        if (!ok) return;
        if (filterKey === orgBaiDangNhanFilterKey(filter.slug)) {
          onFilterKeyChange("all");
        }
        await ctx.refreshFilters();
      });
    },
    [ctx, inline, filterKey, onFilterKeyChange],
  );

  const onRename = useCallback(
    async (filter: PersonalFilter, ten: string) => {
      if (!ctx || !inline) {
        return { ok: false as const, error: "Không có quyền sửa." };
      }
      const result = await updateOrgBaiDangFilterClient(inline.orgId, filter.id, {
        ten,
      });
      if (!result.ok) return result;
      await ctx.refreshFilters();
      return { ok: true as const };
    },
    [ctx, inline],
  );

  if (!ctx) return null;

  const { filters, loading, canManage } = ctx;

  if (loading && filters.length === 0) return null;
  if (!loading && filters.length === 0 && !canManage) return null;

  const selectSlug = (slug: string) => {
    const key = orgBaiDangNhanFilterKey(slug);
    onFilterKeyChange(filterKey === key ? "all" : key);
    onItemSelect?.();
  };

  const atLimit = filters.length >= MAX_TRUONG_ORG_BAI_DANG_FILTERS;

  return (
    <div className="j-dd-section j-dd-section--personal-labels">
      <div className="j-dd-section-label">Nhãn riêng</div>
      {filters.map((filter) => (
        <PersonalFilterRow
          key={filter.id}
          filter={filter}
          active={filterKey === orgBaiDangNhanFilterKey(filter.slug)}
          count={nhanCounts[filter.slug] ?? filter.count ?? 0}
          onSelect={() => selectSlug(filter.slug)}
          showManage={canManage}
          onDelete={() => onDelete(filter)}
          onRename={
            canManage ? (ten) => onRename(filter, ten) : undefined
          }
          onShareMenuClose={onItemSelect}
        />
      ))}
      {canManage ? (
        <div className="j-personal-filter-dd-manage">
          {atLimit ? (
            <p className="j-personal-filter-hint">
              Đã đủ {MAX_TRUONG_ORG_BAI_DANG_FILTERS} nhãn — xóa một nhãn để thêm mới.
            </p>
          ) : (
            <div className="j-personal-filter-create">
              <input
                type="color"
                className="j-personal-filter-color"
                value={newMau}
                aria-label="Màu nhãn mới"
                onChange={(e) => setNewMau(e.target.value)}
              />
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
          {filters.length === 0 && !atLimit ? (
            <p className="j-personal-filter-hint">
              Gắn trên bài đăng để lọc — khác loại bài đăng (Thông báo, Sự kiện, …).
              Chọn màu làm icon chấm. Tối đa {MAX_TRUONG_ORG_BAI_DANG_FILTERS} nhãn.
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="j-dd-divider j-dd-divider--section" aria-hidden />
    </div>
  );
}
