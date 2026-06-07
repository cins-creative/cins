"use client";

import { Loader2, Search, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import "@/components/tag/tag-input.css";

import {
  articleTagLabel,
  articleTagLoaiClass,
} from "@/lib/editor/article-tag";
import type { CongDongCategory } from "@/lib/cong-dong/types";
import { CONG_DONG_CATEGORY_MAX } from "@/lib/cong-dong/constants";

type Props = {
  value: CongDongCategory[];
  onChange: (next: CongDongCategory[]) => void;
  max?: number;
  disabled?: boolean;
  hint?: string;
};

type LoaiFilter = "all" | CongDongCategory["loaiBaiViet"];

const LOAI_FILTER_OPTIONS: { id: LoaiFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "nghe", label: "Nghề" },
  { id: "nganh_dao_tao", label: "Ngành" },
];

const MENU_Z_INDEX = 10500;
const MENU_GAP = 6;
const MENU_MAX_WIDTH = 360;
const MENU_EST_HEIGHT = 280;

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  openAbove: boolean;
};

function CategoryLoaiBadge({
  loai,
}: {
  loai: CongDongCategory["loaiBaiViet"];
}) {
  return (
    <span className={`tag-input-item-loai ${articleTagLoaiClass(loai)}`}>
      {loai === "nganh_dao_tao" ? "Ngành" : articleTagLabel(loai)}
    </span>
  );
}

export function CongDongCategoryPicker({
  value,
  onChange,
  max = CONG_DONG_CATEGORY_MAX,
  disabled = false,
  hint,
}: Props) {
  const inputId = useId();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<CongDongCategory[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loaiFilter, setLoaiFilter] = useState<LoaiFilter>("all");
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<MenuPosition | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLLabelElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedIds = useMemo(() => new Set(value.map((v) => v.id)), [value]);
  const atMax = value.length >= max;

  const search = useCallback(async (q: string) => {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(
        `/api/cong-dong/category-articles/search?${params.toString()}`,
      );
      const json = (await res.json().catch(() => null)) as {
        items?: CongDongCategory[];
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(json?.error ?? "Không tải được danh sách.");
      }
      setHits(json?.items ?? []);
    } catch (e) {
      setHits([]);
      setErr(e instanceof Error ? e.message : "Không tải được danh sách.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void search(query);
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [open, query, search]);

  const updateMenuPosition = useCallback(() => {
    const el = fieldRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(rect.width, MENU_MAX_WIDTH);
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
    const openAbove =
      spaceBelow < MENU_EST_HEIGHT && rect.top > MENU_EST_HEIGHT + MENU_GAP;
    setMenuStyle({
      top: openAbove ? rect.top - MENU_GAP : rect.bottom + MENU_GAP,
      left: rect.left,
      width,
      openAbove,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition, hits.length, loading, err, query, loaiFilter]);

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      const target = ev.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function addItem(item: CongDongCategory) {
    if (selectedIds.has(item.id) || atMax) return;
    onChange([...value, item]);
    setQuery("");
    setOpen(false);
  }

  function removeItem(id: string) {
    onChange(value.filter((v) => v.id !== id));
  }

  const visibleHits = useMemo(
    () =>
      hits.filter((h) => {
        if (selectedIds.has(h.id)) return false;
        if (loaiFilter === "all") return true;
        return h.loaiBaiViet === loaiFilter;
      }),
    [hits, selectedIds, loaiFilter],
  );

  const menuPanel =
    open && menuStyle ? (
      <div
        ref={menuRef}
        id={listId}
        className="tag-input-menu is-portal cd-category-picker-menu"
        role="listbox"
        aria-label="Gợi ý nghề và ngành"
        style={{
          position: "fixed",
          top: menuStyle.top,
          left: menuStyle.left,
          width: menuStyle.width,
          zIndex: MENU_Z_INDEX,
          transform: menuStyle.openAbove ? "translateY(-100%)" : undefined,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="tag-input-filters"
          role="group"
          aria-label="Lọc nghề hoặc ngành"
        >
          {LOAI_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`tag-input-filter${loaiFilter === opt.id ? " is-active" : ""}`}
              aria-pressed={loaiFilter === opt.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setLoaiFilter(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="tag-input-loading">
            <Loader2 size={14} className="cd-category-picker-spin" aria-hidden />
            Đang tìm…
          </div>
        ) : err ? (
          <div className="tag-input-empty">{err}</div>
        ) : visibleHits.length === 0 ? (
          <div className="tag-input-empty">
            {query.trim()
              ? `Không thấy kết quả${loaiFilter !== "all" ? ` trong mục ${LOAI_FILTER_OPTIONS.find((o) => o.id === loaiFilter)?.label ?? ""}` : ""}.`
              : "Gõ để tìm nghề hoặc ngành."}
          </div>
        ) : (
          visibleHits.map((item) => (
            <button
              key={item.id}
              type="button"
              className="tag-input-item"
              role="option"
              onClick={() => addItem(item)}
            >
              <span className="tag-input-item-label">{item.tieuDe}</span>
              <CategoryLoaiBadge loai={item.loaiBaiViet} />
            </button>
          ))
        )}
      </div>
    ) : null;

  return (
    <div className="cd-category-picker" ref={wrapRef}>
      {hint ? <p className="cd-category-picker-hint">{hint}</p> : null}

      {value.length > 0 ? (
        <ul className="cd-category-picker-chips" aria-label="Chủ đề đã chọn">
          {value.map((item) => (
            <li key={item.id}>
              <span
                className={`cd-category-chip ${articleTagLoaiClass(item.loaiBaiViet)}`}
              >
                <span className="cd-category-chip-loai">
                  {item.loaiBaiViet === "nganh_dao_tao"
                    ? "Ngành"
                    : articleTagLabel(item.loaiBaiViet)}
                </span>
                <span className="cd-category-chip-title">{item.tieuDe}</span>
                {!disabled ? (
                  <button
                    type="button"
                    className="cd-category-chip-remove"
                    aria-label={`Gỡ ${item.tieuDe}`}
                    onClick={() => removeItem(item.id)}
                  >
                    <X size={12} strokeWidth={2} aria-hidden />
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {!disabled && !atMax ? (
        <div className="cd-category-picker-search-wrap">
          <label
            ref={fieldRef}
            className="cd-category-picker-search"
            htmlFor={inputId}
          >
            <Search size={15} strokeWidth={2} aria-hidden />
            <input
              id={inputId}
              type="search"
              value={query}
              placeholder="Tìm nghề hoặc ngành học…"
              autoComplete="off"
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              disabled={disabled}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
            />
            {loading ? (
              <Loader2
                size={15}
                className="cd-category-picker-spin"
                aria-hidden
              />
            ) : null}
          </label>
        </div>
      ) : null}

      {mounted && menuPanel ? createPortal(menuPanel, document.body) : null}

      <p className="cd-category-picker-meta">
        {value.length}/{max} chủ đề
        {atMax && !disabled ? " — đã đủ." : null}
      </p>
    </div>
  );
}
