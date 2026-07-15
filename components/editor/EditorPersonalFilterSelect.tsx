"use client";

import { Check, Plus, Tag } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import { useJourneyPersonalFilterOptional } from "@/components/journey/JourneyPersonalFilterContext";
import type { LoaiMoc } from "@/lib/editor/types";
import {
  countUserPersonalFilters,
  isSystemPersonalFilterSlug,
  orderTimelinePersonalFilters,
} from "@/lib/filter/cong-dong-personal-filter.shared";
import { DEFAULT_FILTER_MAU, MAX_FILTERS_PER_OWNER } from "@/lib/filter/constants";
import type { PersonalFilter } from "@/lib/filter/types";
import { JOURNEY_MILESTONE_TYPE_OPTIONS } from "@/lib/journey/milestone-type-options";
import {
  collectScrollResizeTargets,
  computeFixedMenuPosition,
} from "@/lib/ui/clamp-fixed-menu-position";

const MENU_W = 264;
const MENU_EST_H = 380;

type Props = {
  ownerId: string;
  valueIds: string[];
  onChange: (ids: string[]) => void;
  /** Loại cột mốc hệ thống — khớp menu gắn trên Journey. */
  loaiMoc: LoaiMoc;
  onLoaiMocChange: (loai: LoaiMoc) => void;
  menuZIndex?: number;
};

/**
 * Topbar compose: chọn loại cột mốc + gắn nhãn riêng (`filter_nhan`).
 * Khớp layout menu `JourneyMilestoneInlineControls` (Loại → Nhãn riêng).
 */
export function EditorPersonalFilterSelect({
  ownerId,
  valueIds,
  onChange,
  loaiMoc,
  onLoaiMocChange,
  menuZIndex = 9600,
}: Props) {
  const ctx = useJourneyPersonalFilterOptional();
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [fetchedFilters, setFetchedFilters] = useState<PersonalFilter[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [, startCreate] = useTransition();

  const isOwner = ctx ? ctx.isOwner : true;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const loadFilters = useCallback(async () => {
    setFetchLoading(true);
    try {
      const res = await fetch(
        `/api/filters?userId=${encodeURIComponent(ownerId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as { filters: PersonalFilter[] };
      setFetchedFilters(data.filters ?? []);
    } catch {
      setFetchedFilters([]);
    } finally {
      setFetchLoading(false);
    }
  }, [ownerId]);

  /* Luôn fetch — compose overlay trước đây nằm ngoài provider nên ctx rỗng. */
  useEffect(() => {
    void loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    if (!open) return;
    if (ctx) {
      void ctx.refreshFilters();
      return;
    }
    if (fetchedFilters.length === 0) void loadFilters();
  }, [open, ctx, fetchedFilters.length, loadFilters]);

  const rawFilters =
    ctx && (!ctx.loading || ctx.filters.length > 0)
      ? ctx.filters
      : fetchedFilters;
  /* Giống JourneyMilestoneInlineControls — gồm Cộng đồng, ghim đầu list. */
  const filters = orderTimelinePersonalFilters(rawFilters, { isOwner });
  const selectedId = valueIds[0] ?? null;
  const selected = selectedId
    ? filters.find((f) => f.id === selectedId) ??
      rawFilters.find((f) => f.id === selectedId) ??
      null
    : null;
  const selectedType =
    JOURNEY_MILESTONE_TYPE_OPTIONS.find((opt) => opt.db === loaiMoc) ?? null;
  const triggerLabel = selected?.ten ?? selectedType?.label ?? "Nhãn";
  const TypeIcon = selectedType?.Icon ?? null;
  const dotMau = selected?.mau ?? null;
  const userFilterCount = countUserPersonalFilters(rawFilters);
  const atLabelLimit = userFilterCount >= MAX_FILTERS_PER_OWNER;
  const listLoading =
    (ctx?.loading ?? false) || (fetchLoading && filters.length === 0);
  const customFilterCount = countUserPersonalFilters(filters);

  const updateMenuPosition = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) {
      setMenuStyle(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    const menuHeight =
      menuRef.current?.getBoundingClientRect().height || MENU_EST_H;
    const { top, left } = computeFixedMenuPosition(
      rect,
      { width: MENU_W, height: menuHeight },
      { gap: 6, margin: 8 },
    );
    setMenuStyle({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    updateMenuPosition();
    const scrollTargets = collectScrollResizeTargets(btnRef.current);
    const onReflow = () => updateMenuPosition();
    for (const target of scrollTargets) {
      target.addEventListener("scroll", onReflow, { passive: true });
    }
    window.addEventListener("resize", onReflow);
    return () => {
      for (const target of scrollTargets) {
        target.removeEventListener("scroll", onReflow);
      }
      window.removeEventListener("resize", onReflow);
    };
  }, [open, updateMenuPosition, filters.length, loaiMoc]);

  useEffect(() => {
    if (!open || !menuRef.current) return;
    const node = menuRef.current;
    const ro = new ResizeObserver(() => updateMenuPosition());
    ro.observe(node);
    return () => ro.disconnect();
  }, [open, updateMenuPosition, menuStyle?.top, filters.length]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const timerId = window.setTimeout(() => {
      document.addEventListener("mousedown", onDoc);
    }, 0);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pickFilter = (ids: string[]) => {
    onChange(ids);
    setOpen(false);
  };

  const pickType = (next: LoaiMoc) => {
    onLoaiMocChange(next);
  };

  const onCreate = () => {
    if (atLabelLimit) {
      setCreateError(`Tối đa ${MAX_FILTERS_PER_OWNER} nhãn mỗi Journey.`);
      return;
    }
    const ten = newName.trim();
    if (!ten) return;
    setCreateError(null);
    startCreate(async () => {
      const res = await fetch("/api/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ten, mau: DEFAULT_FILTER_MAU }),
      });
      const data = (await res.json()) as {
        error?: string;
        filter?: PersonalFilter;
      };
      if (!res.ok) {
        setCreateError(data.error ?? "Không tạo được nhãn.");
        return;
      }
      setNewName("");
      if (ctx) {
        await ctx.refreshFilters();
      }
      if (data.filter) {
        setFetchedFilters((prev) => {
          if (prev.some((f) => f.id === data.filter!.id)) return prev;
          return [...prev, data.filter!];
        });
        onChange([data.filter.id]);
        setOpen(false);
        return;
      }
      await loadFilters();
    });
  };

  if (!isOwner) return null;
  if (listLoading && filters.length === 0 && !open) return null;

  const menu =
    open && menuStyle && portalReady && typeof document !== "undefined"
      ? createPortal(
          <div className="cins-editor-page vis-portal-root">
            <div
              id={menuId}
              ref={menuRef}
              className="vis-menu is-portal ed-personal-filter-menu"
              role="listbox"
              aria-label="Loại cột mốc và nhãn riêng"
              style={{
                position: "fixed",
                top: menuStyle.top,
                left: menuStyle.left,
                width: MENU_W,
                zIndex: menuZIndex,
                maxHeight: "min(70vh, 420px)",
                overflowY: "auto",
                display: "block",
              }}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="ed-personal-filter-section-label">
                Loại cột mốc
              </div>
              {JOURNEY_MILESTONE_TYPE_OPTIONS.map((option) => {
                const active = option.db === loaiMoc;
                const Icon = option.Icon;
                return (
                  <button
                    key={option.db}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`vis-opt ed-personal-filter-opt${active ? " active" : ""}`}
                    onClick={() => pickType(option.db)}
                  >
                    <span className="ed-personal-filter-opt-main">
                      <span className="ed-personal-filter-type-ico" aria-hidden>
                        <Icon size={14} strokeWidth={1.8} />
                      </span>
                      <span>{option.label}</span>
                    </span>
                    {active ? (
                      <Check size={14} strokeWidth={2.1} aria-hidden />
                    ) : null}
                  </button>
                );
              })}

              <div className="ed-personal-filter-divider" aria-hidden />

              <div className="ed-personal-filter-section-label">Nhãn riêng</div>
              <button
                type="button"
                role="option"
                aria-selected={!selectedId}
                className={`vis-opt ed-personal-filter-opt${!selectedId ? " active" : ""}`}
                onClick={() => pickFilter([])}
              >
                <span className="ed-personal-filter-opt-main">
                  <span>Không gắn nhãn</span>
                </span>
                {!selectedId ? (
                  <Check size={14} strokeWidth={2.1} aria-hidden />
                ) : null}
              </button>
              {listLoading && filters.length === 0 ? (
                <p className="ed-personal-filter-hint">Đang tải nhãn…</p>
              ) : null}
              {filters.map((filter) => {
                const active = filter.id === selectedId;
                const mau = filter.mau ?? DEFAULT_FILTER_MAU;
                const isFallbackSystem =
                  isSystemPersonalFilterSlug(filter.slug) &&
                  filter.id.startsWith("system-");
                return (
                  <button
                    key={filter.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`vis-opt ed-personal-filter-opt${active ? " active" : ""}`}
                    disabled={isFallbackSystem}
                    onClick={() => {
                      if (isFallbackSystem) {
                        if (ctx) void ctx.refreshFilters();
                        else void loadFilters();
                        return;
                      }
                      pickFilter(active ? [] : [filter.id]);
                    }}
                  >
                    <span className="ed-personal-filter-opt-main">
                      <span
                        className="j-dd-dot"
                        style={{ background: mau }}
                        aria-hidden
                      />
                      <span>{filter.ten}</span>
                    </span>
                    {active ? (
                      <Check size={14} strokeWidth={2.1} aria-hidden />
                    ) : null}
                  </button>
                );
              })}
              <div className="ed-personal-filter-create">
                {atLabelLimit ? (
                  <p className="ed-personal-filter-hint">
                    Đã đủ {MAX_FILTERS_PER_OWNER} nhãn — xóa một nhãn trên
                    timeline để thêm mới.
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
                        if (e.key === "Enter") {
                          e.preventDefault();
                          onCreate();
                        }
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
                {createError ? (
                  <p className="j-personal-filter-error">{createError}</p>
                ) : null}
                {customFilterCount === 0 && !atLabelLimit && !listLoading ? (
                  <p className="ed-personal-filter-hint">
                    Nhãn riêng gắn thêm để lọc — khác loại cột mốc phía trên.
                    Tối đa {MAX_FILTERS_PER_OWNER} nhãn.
                  </p>
                ) : null}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`vis-select${open ? " open" : ""}`} ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={`vis-btn${selected || selectedType ? " has-filter" : ""}`}
        aria-label={triggerLabel}
        title={triggerLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={menuId}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        {dotMau ? (
          <span
            className="j-dd-dot"
            style={{ background: dotMau }}
            aria-hidden
          />
        ) : TypeIcon ? (
          <span className="ico" aria-hidden>
            <TypeIcon size={18} strokeWidth={1.8} />
          </span>
        ) : (
          <span className="ico" aria-hidden>
            <Tag size={18} strokeWidth={1.8} />
          </span>
        )}
      </button>
      {menu}
    </div>
  );
}
