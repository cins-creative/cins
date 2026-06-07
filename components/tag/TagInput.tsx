"use client";

import { BadgeCheck, Check, Loader2, Plus } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import { articleTagLabel } from "@/lib/editor/article-tag";
import {
  CREATABLE_TAG_LOAI,
  type CreatableTagLoai,
  type PickableTagLoai,
} from "@/lib/tag/tag-loai";

import "./tag-input.css";

export type TagLoai = PickableTagLoai;

export type TagInputValue = {
  id: string;
  tieu_de: string;
  loai_bai_viet: TagLoai;
  da_verify?: boolean;
};

type TagMatch = TagInputValue & { da_verify: boolean };

type DedupExact = {
  type: "exact";
  match: TagMatch;
};

type DedupFuzzy = {
  type: "fuzzy";
  suggestions: TagMatch[];
};

type LoaiFilter = PickableTagLoai | "all";

type MenuItem =
  | { kind: "suggestion"; tag: TagMatch }
  | { kind: "create"; label: string; loai: CreatableTagLoai };

const LOAI_FILTER_OPTIONS: { id: LoaiFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "keyword", label: "Khái niệm" },
  { id: "phan_mem", label: "Phần mềm" },
  { id: "mon_hoc", label: "Môn học" },
  { id: "nganh_dao_tao", label: "Ngành" },
];

type Props = {
  value: TagInputValue[];
  onChange: (tags: { id: string; tieu_de: string; loai_bai_viet: TagLoai }[]) => void;
  mode?: "multi" | "single";
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

const CREATE_LOAI_LABEL: Record<CreatableTagLoai, string> = {
  keyword: "khái niệm",
  phan_mem: "phần mềm",
};

const MENU_Z_INDEX = 10200;
const MENU_GAP = 6;
const MENU_MAX_WIDTH = 360;
const MENU_EST_HEIGHT = 300;

function SuggestionLoaiBadge({ loai }: { loai: PickableTagLoai }) {
  return (
    <span className={`tag-input-item-loai is-loai-${loai.replace(/_/g, "-")}`}>
      {articleTagLabel(loai)}
    </span>
  );
}

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  openAbove: boolean;
};

export function TagInput({
  value,
  onChange,
  mode = "multi",
  placeholder = "Gõ khái niệm, phần mềm, môn học, ngành…",
  disabled = false,
  className,
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<MenuPosition | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [exactMatch, setExactMatch] = useState<TagMatch | null>(null);
  const [suggestions, setSuggestions] = useState<TagMatch[]>([]);
  const [creating, setCreating] = useState(false);
  const [loaiFilter, setLoaiFilter] = useState<LoaiFilter>("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedIds = useMemo(() => new Set(value.map((t) => t.id)), [value]);

  const trimmed = query.trim();

  const menuItems = useMemo((): MenuItem[] => {
    if (!trimmed || exactMatch) return [];
    const items: MenuItem[] = suggestions
      .filter((s) => {
        if (selectedIds.has(s.id)) return false;
        if (loaiFilter === "all") return true;
        return s.loai_bai_viet === loaiFilter;
      })
      .map((tag) => ({ kind: "suggestion" as const, tag }));
    const hasExactSuggestion = suggestions.some(
      (s) => s.tieu_de.toLowerCase() === trimmed.toLowerCase(),
    );
    if (!hasExactSuggestion) {
      for (const loai of CREATABLE_TAG_LOAI) {
        if (loaiFilter === "all" || loaiFilter === loai) {
          items.push({ kind: "create", label: trimmed, loai });
        }
      }
    }
    return items;
  }, [trimmed, exactMatch, suggestions, selectedIds, loaiFilter]);

  const exactVisible =
    exactMatch &&
    (loaiFilter === "all" || exactMatch.loai_bai_viet === loaiFilter);

  useEffect(() => {
    setActiveIdx(0);
  }, [menuItems.length, trimmed, loaiFilter]);

  const runDedup = useCallback(async (ten: string) => {
    const q = ten.trim();
    if (!q) {
      setExactMatch(null);
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch("/api/tag/dedup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ten: q }),
      });
      const json = (await res.json().catch(() => null)) as
        | DedupExact
        | DedupFuzzy
        | { error?: string }
        | null;
      if (!res.ok || !json || !("type" in json)) {
        setExactMatch(null);
        setSuggestions([]);
        return;
      }
      if (json.type === "exact") {
        setExactMatch(json.match);
        setSuggestions([]);
      } else if (json.type === "fuzzy") {
        setExactMatch(null);
        setSuggestions(json.suggestions ?? []);
      }
    } catch {
      setExactMatch(null);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!trimmed) {
      setExactMatch(null);
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void runDedup(trimmed);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [trimmed, runDedup]);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const showMenu = Boolean(
    open &&
      trimmed.length > 0 &&
      (loading || exactVisible || menuItems.length > 0),
  );

  useLayoutEffect(() => {
    if (!showMenu) {
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
  }, [showMenu, updateMenuPosition, menuItems.length, loading, exactMatch]);

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

  const emitChange = useCallback(
    (next: TagInputValue[]) => {
      onChange(
        next.map(({ id, tieu_de, loai_bai_viet }) => ({
          id,
          tieu_de,
          loai_bai_viet,
        })),
      );
    },
    [onChange],
  );

  const addTag = useCallback(
    (tag: TagInputValue) => {
      if (selectedIds.has(tag.id)) return;
      const next =
        mode === "single"
          ? [tag]
          : [...value, { ...tag, da_verify: tag.da_verify }];
      emitChange(next);
      setQuery("");
      setOpen(false);
      setExactMatch(null);
      setSuggestions([]);
    },
    [emitChange, mode, selectedIds, value],
  );

  const createTag = useCallback(
    async (loai: CreatableTagLoai) => {
      const ten = trimmed;
      if (!ten || creating) return;
      setCreating(true);
      try {
        const res = await fetch("/api/tag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ten, loai }),
        });
        const json = (await res.json().catch(() => null)) as
          | { id?: string; da_ton_tai?: boolean; error?: string }
          | null;
        if (!res.ok || !json?.id) return;
        addTag({
          id: json.id,
          tieu_de: ten,
          loai_bai_viet: loai,
          da_verify: false,
        });
      } finally {
        setCreating(false);
      }
    },
    [addTag, creating, trimmed],
  );

  const pickMenuItem = useCallback(
    async (item: MenuItem) => {
      if (item.kind === "suggestion") {
        addTag(item.tag);
        return;
      }
      await createTag(item.loai);
    },
    [addTag, createTag],
  );

  const onKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !query && value.length > 0) {
      emitChange(value.slice(0, -1));
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (
        exactVisible &&
        exactMatch &&
        !selectedIds.has(exactMatch.id)
      ) {
        addTag(exactMatch);
        return;
      }
      if (menuItems.length > 0) {
        await pickMenuItem(menuItems[activeIdx] ?? menuItems[0]!);
        return;
      }
      if (trimmed) await createTag("keyword");
    }
    if (e.key === "ArrowDown" && menuItems.length > 0) {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % menuItems.length);
    }
    if (e.key === "ArrowUp" && menuItems.length > 0) {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + menuItems.length) % menuItems.length);
    }
  };

  const menuPanel =
    showMenu && menuStyle ? (
      <div
        ref={menuRef}
        className="tag-input-menu is-portal"
        id={listId}
        role="listbox"
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
        <div className="tag-input-filters" role="group" aria-label="Lọc loại tag">
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
            <Loader2 size={14} className="ed-spin" aria-hidden /> Đang tìm…
          </div>
        ) : exactVisible && exactMatch ? (
          <button
            type="button"
            className="tag-input-item is-active"
            role="option"
            aria-selected
            disabled={selectedIds.has(exactMatch.id)}
            onClick={() => addTag(exactMatch)}
          >
            {exactMatch.da_verify ? (
              <BadgeCheck
                className="tag-input-item-verified"
                size={16}
                strokeWidth={2}
                aria-hidden
              />
            ) : null}
            <span className="tag-input-item-label">{exactMatch.tieu_de}</span>
            <SuggestionLoaiBadge loai={exactMatch.loai_bai_viet} />
          </button>
        ) : (
          <>
            {menuItems.length === 0 ? (
              <div className="tag-input-empty">
                Không thấy kết quả
                {loaiFilter !== "all"
                  ? ` trong mục ${LOAI_FILTER_OPTIONS.find((o) => o.id === loaiFilter)?.label ?? ""}`
                  : ""}
                .
              </div>
            ) : null}
            {menuItems.map((item, idx) =>
              item.kind === "suggestion" ? (
                <button
                  key={item.tag.id}
                  type="button"
                  className={`tag-input-item${idx === activeIdx ? " is-active" : ""}`}
                  role="option"
                  aria-selected={idx === activeIdx}
                  onClick={() => void pickMenuItem(item)}
                >
                  {item.tag.da_verify ? (
                    <BadgeCheck
                      className="tag-input-item-verified"
                      size={16}
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : null}
                  <span className="tag-input-item-label">{item.tag.tieu_de}</span>
                  <SuggestionLoaiBadge loai={item.tag.loai_bai_viet} />
                </button>
              ) : (
                <button
                  key={`create-${item.loai}`}
                  type="button"
                  className={`tag-input-item tag-input-create${idx === activeIdx ? " is-active" : ""}`}
                  role="option"
                  aria-selected={idx === activeIdx}
                  disabled={creating}
                  onClick={() => void pickMenuItem(item)}
                >
                  <Plus size={16} strokeWidth={2} aria-hidden />
                  <span className="tag-input-item-label">
                    Tạo {CREATE_LOAI_LABEL[item.loai]} &ldquo;{item.label}&rdquo;
                  </span>
                </button>
              ),
            )}
          </>
        )}
      </div>
    ) : null;

  return (
    <div
      className={`tag-input-wrap${className ? ` ${className}` : ""}`}
      ref={wrapRef}
    >
      <div
        ref={fieldRef}
        className="tag-input-field"
        onClick={() => inputRef.current?.focus()}
        role="combobox"
        aria-expanded={showMenu}
        aria-controls={listId}
        aria-haspopup="listbox"
      >
        {value.map((tag) => (
          <span key={tag.id} className="tag-input-chip">
            {tag.da_verify ? (
              <Check
                className="tag-input-chip-verified"
                size={14}
                strokeWidth={2.5}
                aria-hidden
              />
            ) : null}
            <span className="tag-input-chip-label">{tag.tieu_de}</span>
            {!disabled ? (
              <button
                type="button"
                className="tag-input-chip-x"
                aria-label={`Bỏ tag ${tag.tieu_de}`}
                onClick={(e) => {
                  e.stopPropagation();
                  emitChange(value.filter((t) => t.id !== tag.id));
                }}
              >
                ×
              </button>
            ) : null}
          </span>
        ))}
        {!disabled && (mode === "multi" || value.length === 0) ? (
          <input
            ref={inputRef}
            className="tag-input-text"
            type="text"
            value={query}
            placeholder={value.length === 0 ? placeholder : ""}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => trimmed && setOpen(true)}
            onKeyDown={onKeyDown}
            aria-autocomplete="list"
            aria-controls={listId}
          />
        ) : null}
      </div>

      {mounted && menuPanel ? createPortal(menuPanel, document.body) : null}
    </div>
  );
}
