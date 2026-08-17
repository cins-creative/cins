"use client";

import { Loader2, Plus } from "lucide-react";
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

import {
  COMPOSE_VISIBLE_TAG_LOAI_SET,
  isCreatableTagLoai,
  type CreatableTagLoai,
  type PickableTagLoai,
} from "@/lib/tag/tag-loai";

import { TagSuggestionLabel } from "./TagSuggestionLabel";
import { TagSuggestionMeta } from "./TagSuggestionMeta";
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
  | { kind: "create"; label: string };

type Props = {
  value: TagInputValue[];
  onChange: (tags: { id: string; tieu_de: string; loai_bai_viet: TagLoai }[]) => void;
  mode?: "multi" | "single";
  /** Giới hạn số tag (chỉ `mode="multi"`). */
  maxTags?: number;
  /** Ẩn dòng gợi ý dưới ô tag (vd. trong sidebar đóng góp). */
  showLimitHint?: boolean;
  placeholder?: string;
  /** Hiện placeholder cả khi đã có tag (ô tìm/thêm tiếp). */
  keepPlaceholder?: boolean;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "modal";
  /** Khóa lọc loại — ẩn chip lọc, chỉ gợi ý / tạo đúng loai này. */
  loaiFilterFixed?: Exclude<LoaiFilter, "all">;
};

const MENU_Z_INDEX = 10200;
const MENU_GAP = 6;
const MENU_MARGIN = 8;
const MENU_WIDTH = {
  default: { min: 320, max: 400 },
  modal: { min: 380, max: 520 },
} as const;
const MENU_EST_HEIGHT = 280;

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  openAbove: boolean;
};

function TagInputMenuItem({
  tag,
  active,
  onPick,
  compose,
}: {
  tag: TagSuggestRow;
  active?: boolean;
  onPick: () => void;
  compose?: boolean;
}) {
  return (
    <button
      type="button"
      className={`tag-input-item${active ? " is-active" : ""}`}
      role="option"
      aria-selected={active}
      onClick={onPick}
    >
      <TagSuggestionLabel tieu_de={tag.tieu_de} />
      <TagSuggestionMeta
        compose={compose}
        loai={tag.loai_bai_viet}
        linhVucTen={compose ? null : tag.linh_vuc_ten}
        soNguoiTagged={tag.so_nguoi_tagged}
        soGan={tag.so_gan}
      />
    </button>
  );
}

export function TagInput({
  value,
  onChange,
  mode = "multi",
  maxTags,
  showLimitHint = true,
  placeholder = "Gõ để tìm thẻ…",
  keepPlaceholder = false,
  disabled = false,
  className,
  variant = "default",
  loaiFilterFixed,
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
  const loaiFilter: LoaiFilter = loaiFilterFixed ?? "all";
  const composeMode = !loaiFilterFixed;
  const createLoai: CreatableTagLoai | null = loaiFilterFixed
    ? isCreatableTagLoai(loaiFilterFixed)
      ? loaiFilterFixed
      : null
    : "keyword";
  const valueRef = useRef(value);
  valueRef.current = value;

  const selectedIds = useMemo(() => new Set(value.map((t) => t.id)), [value]);
  const atMax =
    mode === "multi" && maxTags != null && value.length >= maxTags;
  const trimmed = query.trim();
  const {
    exactMatch,
    suggestions,
    browse,
    refining,
    loading,
    hasExactSuggestion,
    ensureIndex,
  } = useTagSuggestSearch({
    enabled: !disabled && !atMax && open,
    query,
    loaiFilter,
    allowLoai: composeMode ? COMPOSE_VISIBLE_TAG_LOAI_SET : undefined,
    excludeIds: selectedIds,
  });

  const menuItems = useMemo((): MenuItem[] => {
    if (!trimmed) {
      return browse.map((tag) => ({ kind: "suggestion" as const, tag }));
    }
    if (exactMatch) return [];
    const items: MenuItem[] = suggestions.map((tag) => ({
      kind: "suggestion" as const,
      tag,
    }));
    if (!hasExactSuggestion && createLoai) {
      items.push({ kind: "create", label: trimmed });
    }
    return items;
  }, [
    trimmed,
    exactMatch,
    suggestions,
    browse,
    hasExactSuggestion,
    createLoai,
  ]);

  const exactVisible =
    Boolean(trimmed) &&
    exactMatch &&
    !selectedIds.has(exactMatch.id) &&
    (loaiFilter === "all" || exactMatch.loai_bai_viet === loaiFilter) &&
    (!composeMode || COMPOSE_VISIBLE_TAG_LOAI_SET.has(exactMatch.loai_bai_viet));

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
    const { min, max } = MENU_WIDTH[variant];
    const width = Math.min(Math.max(rect.width, min), max);
    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
    const openAbove =
      spaceBelow < MENU_EST_HEIGHT && rect.top > MENU_EST_HEIGHT + MENU_GAP;
    const maxLeft = window.innerWidth - width - MENU_MARGIN;
    const left = Math.max(MENU_MARGIN, Math.min(rect.left, maxLeft));
    setMenuStyle({
      top: openAbove ? rect.top - MENU_GAP : rect.bottom + MENU_GAP,
      left,
      width,
      openAbove,
    });
  }, [variant]);

  const showMenu = Boolean(
    open &&
      !atMax &&
      (loading || exactVisible || menuItems.length > 0 || browse.length > 0 || !trimmed),
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

  const createTag = useCallback(async () => {
    const ten = trimmed;
    if (!ten || creating || !createLoai) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ten, loai: createLoai }),
      });
      const json = (await res.json().catch(() => null)) as
        | { id?: string; da_ton_tai?: boolean; error?: string }
        | null;
      if (!res.ok || !json?.id) return;
      addTag({
        id: json.id,
        tieu_de: ten,
        loai_bai_viet: createLoai,
        da_verify: false,
      });
    } finally {
      setCreating(false);
    }
  }, [addTag, createLoai, creating, trimmed]);

  const pickMenuItem = useCallback(
    async (item: MenuItem) => {
      if (item.kind === "suggestion") {
        addTag(item.tag);
        return;
      }
      await createTag();
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
      if (trimmed) await createTag();
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
                compose={composeMode}
                onPick={() => addTag(exactMatch)}
              />
            ) : null}
            {!loading && menuItems.length === 0 && !exactVisible ? (
              <div className="tag-input-empty">
                {trimmed ? "Không thấy kết quả." : "Chưa có thẻ."}
              </div>
            ) : null}
            {menuItems.map((item, idx) =>
              item.kind === "suggestion" ? (
                <TagInputMenuItem
                  key={item.tag.id}
                  tag={item.tag}
                  active={idx === activeIdx}
                  compose={composeMode}
                  onPick={() => void pickMenuItem(item)}
                />
              ) : (
                <button
                  key="create"
                  type="button"
                  className={`tag-input-item tag-input-create${idx === activeIdx ? " is-active" : ""}`}
                  role="option"
                  aria-selected={idx === activeIdx}
                  disabled={creating}
                  onClick={() => void pickMenuItem(item)}
                >
                  <Plus size={16} strokeWidth={2} aria-hidden />
                  <span className="tag-input-item-label">
                    Tạo thẻ mới &ldquo;{item.label}&rdquo;
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
            placeholder={
              value.length === 0 || keepPlaceholder ? placeholder : ""
            }
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              setOpen(true);
              ensureIndex();
            }}
            onFocus={() => {
              if (atMax) return;
              ensureIndex();
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
            aria-autocomplete="list"
            aria-controls={listId}
          />
        ) : null}
      </div>

      {showLimitHint && maxTags != null && mode === "multi" ? (
        <p
          className={`tag-input-limit-hint${atMax ? " is-at-max" : ""}`}
          aria-live="polite"
        >
          {atMax
            ? `Đã đạt tối đa ${maxTags} thẻ. `
            : null}
          Mỗi thẻ là một bài viết, bạn có thể xây dựng nội dung bài viết để mọi
          người rõ hơn về thẻ này là gì nhé
        </p>
      ) : null}

      {mounted && menuPanel ? createPortal(menuPanel, document.body) : null}
    </div>
  );
}
