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

import { TagSuggestionLabel } from "./TagSuggestionLabel";
import {
  useTagSuggestSearch,
  type LoaiFilter,
  type TagSuggestRow,
} from "./useTagSuggestSearch";
import "./tag-input.css";

export type TagLoai = PickableTagLoai;

export type TagInputValue = {
  id: string;
  tieu_de: string;
  loai_bai_viet: TagLoai;
  da_verify?: boolean;
  linh_vuc_ten?: string | null;
};

type MenuItem =
  | { kind: "suggestion"; tag: TagSuggestRow }
  | { kind: "create"; label: string; loai: CreatableTagLoai };

const LOAI_FILTER_OPTIONS: { id: LoaiFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "keyword", label: "Khái niệm" },
  { id: "phan_mem", label: "Phần mềm" },
  { id: "mon_hoc", label: "Môn học" },
  { id: "nganh_dao_tao", label: "Ngành" },
  { id: "nghe", label: "Nghề nghiệp" },
];

type Props = {
  value: TagInputValue[];
  onChange: (tags: { id: string; tieu_de: string; loai_bai_viet: TagLoai }[]) => void;
  mode?: "multi" | "single";
  /** Giới hạn số tag (chỉ `mode="multi"`). */
  maxTags?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "modal";
};

const CREATE_LOAI_LABEL: Record<CreatableTagLoai, string> = {
  keyword: "khái niệm",
  phan_mem: "phần mềm",
};

const MENU_Z_INDEX = 10200;
const MENU_GAP = 6;
const MENU_WIDTH = {
  default: { max: 360 },
  modal: { max: 480 },
} as const;
const MENU_EST_HEIGHT = 280;

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  openAbove: boolean;
};

function formatTagUsage(n: number): string {
  if (n <= 0) return "";
  return n === 1 ? "1 người" : `${n} người`;
}

function TagInputMenuItem({
  tag,
  active,
  onPick,
}: {
  tag: TagSuggestRow;
  active?: boolean;
  onPick: () => void;
}) {
  const lv = tag.linh_vuc_ten?.trim();
  const usage = formatTagUsage(tag.so_nguoi_tagged ?? 0);
  const hasFoot = Boolean(lv || usage);

  return (
    <button
      type="button"
      className={`tag-input-item${active ? " is-active" : ""}`}
      role="option"
      aria-selected={active}
      onClick={onPick}
    >
      <div className="tag-input-item-main">
        <div
          className={`tag-input-item-head${tag.da_verify ? " has-verified" : ""}`}
        >
          {tag.da_verify ? (
            <BadgeCheck
              className="tag-input-item-verified"
              size={15}
              strokeWidth={2}
              aria-hidden
            />
          ) : null}
          <div className="tag-input-item-copy">
            <TagSuggestionLabel
              tieu_de={tag.tieu_de}
              tieu_de_viet={tag.tieu_de_viet}
              tieu_de_eng={tag.tieu_de_eng}
            />
            {hasFoot ? (
              <div className="tag-input-item-foot">
                {lv ? (
                  <span className="tag-input-item-linh-vuc">{lv}</span>
                ) : null}
                {usage ? (
                  <span
                    className="tag-input-item-usage"
                    title="Số người đã gắn tag này"
                  >
                    {usage}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <span
          className={`tag-input-item-loai is-loai-${tag.loai_bai_viet.replace(/_/g, "-")}`}
        >
          {articleTagLabel(tag.loai_bai_viet)}
        </span>
      </div>
    </button>
  );
}

export function TagInput({
  value,
  onChange,
  mode = "multi",
  maxTags,
  placeholder = "Gõ khái niệm, phần mềm, môn học, ngành, nghề nghiệp…",
  disabled = false,
  className,
  variant = "default",
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
  const [activeIdx, setActiveIdx] = useState(0);
  const [creating, setCreating] = useState(false);
  const [loaiFilter, setLoaiFilter] = useState<LoaiFilter>("all");
  const valueRef = useRef(value);
  valueRef.current = value;

  const selectedIds = useMemo(() => new Set(value.map((t) => t.id)), [value]);
  const atMax =
    mode === "multi" && maxTags != null && value.length >= maxTags;
  const trimmed = query.trim();

  const {
    exactMatch,
    suggestions,
    refining,
    loading,
    hasExactSuggestion,
    ensureIndex,
  } = useTagSuggestSearch({
    enabled: !disabled && !atMax && open && trimmed.length > 0,
    query,
    loaiFilter,
    excludeIds: selectedIds,
  });

  const menuItems = useMemo((): MenuItem[] => {
    if (!trimmed || exactMatch) return [];
    const items: MenuItem[] = suggestions.map((tag) => ({
      kind: "suggestion" as const,
      tag,
    }));
    if (!hasExactSuggestion) {
      for (const loai of CREATABLE_TAG_LOAI) {
        if (loaiFilter === "all" || loaiFilter === loai) {
          items.push({ kind: "create", label: trimmed, loai });
        }
      }
    }
    return items;
  }, [trimmed, exactMatch, suggestions, hasExactSuggestion, loaiFilter]);

  const exactVisible =
    exactMatch &&
    !selectedIds.has(exactMatch.id) &&
    (loaiFilter === "all" || exactMatch.loai_bai_viet === loaiFilter);

  useEffect(() => {
    setActiveIdx(0);
  }, [menuItems.length, trimmed, loaiFilter]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = useCallback(() => {
    const el = fieldRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const { max } = MENU_WIDTH[variant];
    const width = Math.min(rect.width, max);
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
    const openAbove =
      spaceBelow < MENU_EST_HEIGHT && rect.top > MENU_EST_HEIGHT + MENU_GAP;
    setMenuStyle({
      top: openAbove ? rect.top - MENU_GAP : rect.bottom + MENU_GAP,
      left: rect.left,
      width,
      openAbove,
    });
  }, [variant]);

  const showMenu = Boolean(
    open &&
      trimmed.length > 0 &&
      !atMax &&
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
      const current = valueRef.current;
      if (
        mode === "multi" &&
        maxTags != null &&
        current.length >= maxTags
      ) {
        return;
      }
      if (current.some((t) => t.id === tag.id)) return;
      const next =
        mode === "single"
          ? [tag]
          : [...current, { ...tag, da_verify: tag.da_verify }];
      emitChange(next);
      setQuery("");
      setOpen(false);
    },
    [emitChange, maxTags, mode],
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
    if (e.key === "Backspace" && !query && valueRef.current.length > 0) {
      emitChange(valueRef.current.slice(0, -1));
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (exactVisible && exactMatch) {
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

  const hasResultPreview = Boolean(exactVisible || menuItems.length > 0);

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
        {loading && !hasResultPreview ? (
          <div className="tag-input-loading">
            <Loader2 size={14} className="ed-spin" aria-hidden /> Đang tìm…
          </div>
        ) : (
          <>
            {refining ? (
              <div className="tag-input-loading tag-input-loading--inline" aria-live="polite">
                <Loader2 size={14} className="ed-spin" aria-hidden /> Đang tinh chỉnh…
              </div>
            ) : null}
            {exactVisible && exactMatch ? (
              <TagInputMenuItem
                tag={exactMatch}
                active
                onPick={() => addTag(exactMatch)}
              />
            ) : (
              <>
                {!loading && menuItems.length === 0 ? (
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
                    <TagInputMenuItem
                      key={item.tag.id}
                      tag={item.tag}
                      active={idx === activeIdx}
                      onPick={() => void pickMenuItem(item)}
                    />
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
          </>
        )}
      </div>
    ) : null;

  return (
    <div
      className={[
        "tag-input-wrap",
        variant === "modal" ? "is-modal" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
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
                  emitChange(valueRef.current.filter((t) => t.id !== tag.id));
                }}
              >
                ×
              </button>
            ) : null}
          </span>
        ))}
        {!disabled && !atMax && (mode === "multi" || value.length === 0) ? (
          <input
            ref={inputRef}
            className="tag-input-text"
            type="text"
            value={query}
            placeholder={value.length === 0 ? placeholder : ""}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              if (next.trim()) {
                setOpen(true);
                ensureIndex();
              }
            }}
            onFocus={() => {
              if (atMax) return;
              ensureIndex();
              if (trimmed) setOpen(true);
            }}
            onKeyDown={onKeyDown}
            aria-autocomplete="list"
            aria-controls={listId}
          />
        ) : null}
      </div>

      {maxTags != null && mode === "multi" ? (
        <p
          className={`tag-input-limit-hint${atMax ? " is-at-max" : ""}`}
          aria-live="polite"
        >
          {atMax
            ? `Đã đạt giới hạn tối đa ${maxTags} tag.`
            : `Tối đa ${maxTags} tag.`}
        </p>
      ) : null}

      {mounted && menuPanel ? createPortal(menuPanel, document.body) : null}
    </div>
  );
}
