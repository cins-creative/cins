"use client";

import { BadgeCheck, Loader2, Plus } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  type ArticleTagRef,
} from "@/lib/editor/article-tag";
import type { AtHashTrigger } from "@/lib/editor/use-at-hash-trigger";
import { getAvatarUrl } from "@/lib/journey/profile";
import type { CoAuthorDraft } from "@/lib/social/types";
import {
  CREATABLE_TAG_LOAI,
  type CreatableTagLoai,
  type PickableTagLoai,
} from "@/lib/tag/tag-loai";

import { TagSuggestionMeta } from "@/components/tag/TagSuggestionMeta";
import "@/components/tag/tag-input.css";

const USER_MENU_W = 320;
const TAG_MENU_W = 360;
const MENU_H = 300;
const MENU_GAP = 6;
const MENU_MARGIN = 8;

type SearchUser = {
  id: string;
  slug: string;
  ten_hien_thi: string;
  avatar_id: string | null;
};

type TagDedupMatch = {
  id: string;
  tieu_de: string;
  da_verify: boolean;
  loai_bai_viet: PickableTagLoai;
  linh_vuc_ten?: string | null;
};

type LoaiFilter = PickableTagLoai | "all";

type TagMenuItem =
  | { kind: "suggestion"; tag: TagDedupMatch }
  | { kind: "create"; label: string; loai: CreatableTagLoai };

const LOAI_FILTER_OPTIONS: { id: LoaiFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "keyword", label: "Khái niệm" },
  { id: "phan_mem", label: "Phần mềm" },
  { id: "mon_hoc", label: "Môn học" },
  { id: "nganh_dao_tao", label: "Ngành" },
  { id: "nghe", label: "Nghề nghiệp" },
];

const CREATE_LOAI_LABEL: Record<CreatableTagLoai, string> = {
  keyword: "khái niệm",
  phan_mem: "phần mềm",
};

export type EditorTagMenuPick =
  | { kind: "user"; user: CoAuthorDraft }
  | { kind: "tag"; tag: ArticleTagRef };

type Props = {
  trigger: AtHashTrigger;
  anchorRect: DOMRect;
  ownerId: string;
  existingUserIds: ReadonlySet<string>;
  existingTagIds: ReadonlySet<string>;
  onPick: (pick: EditorTagMenuPick) => void;
  onClose: () => void;
};

/** Neo menu ngay dưới caret (anchorRect), căn trái — clamp trong viewport. */
function computeCaretMenuPosition(
  anchorRect: DOMRect,
  width: number,
  height: number,
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = anchorRect.left;
  left = Math.max(MENU_MARGIN, Math.min(left, vw - width - MENU_MARGIN));
  let top = anchorRect.bottom + MENU_GAP;
  if (top + height > vh - MENU_MARGIN) {
    const above = anchorRect.top - height - MENU_GAP;
    top = above >= MENU_MARGIN ? above : Math.max(MENU_MARGIN, vh - height - MENU_MARGIN);
  }
  return { top, left };
}

export function EditorTagMenu({
  trigger,
  anchorRect,
  ownerId,
  existingUserIds,
  existingTagIds,
  onPick,
  onClose,
}: Props) {
  const listId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const mode = trigger.char === "@" ? "user" : "tag";
  const menuWidth = mode === "user" ? USER_MENU_W : TAG_MENU_W;

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [exactMatch, setExactMatch] = useState<TagDedupMatch | null>(null);
  const [suggestions, setSuggestions] = useState<TagDedupMatch[]>([]);
  const [loaiFilter, setLoaiFilter] = useState<LoaiFilter>("all");
  const [creating, setCreating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number }>(() =>
    computeCaretMenuPosition(anchorRect, menuWidth, MENU_H),
  );

  const query = trigger.query.trim();

  /* ── Vị trí: theo caret, cập nhật khi resize/scroll ──────────────── */
  const updatePos = useCallback(() => {
    const height = menuRef.current?.offsetHeight ?? MENU_H;
    setPos(computeCaretMenuPosition(anchorRect, menuWidth, height));
  }, [anchorRect, menuWidth]);

  useEffect(() => {
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [updatePos]);

  // Reposition khi chiều cao menu đổi (kết quả tải xong / lọc / loading).
  useEffect(() => {
    updatePos();
  }, [updatePos, loading, users, suggestions, exactMatch, loaiFilter, query]);

  /* ── @ mode: tìm cộng sự ─────────────────────────────────────────── */
  useEffect(() => {
    if (mode !== "user") return;
    let cancelled = false;
    setLoading(true);
    setActiveIndex(0);
    const run = async () => {
      try {
        const qs = new URLSearchParams({
          q: trigger.query,
          friends_only: "true",
        });
        const res = await fetch(`/api/users/search?${qs.toString()}`);
        const json = await res.json();
        if (cancelled) return;
        setUsers((json.users ?? []) as SearchUser[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(() => void run(), trigger.query ? 200 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [mode, trigger.query]);

  /* ── # mode: dedup (exact + fuzzy) giống TagInput ────────────────── */
  useEffect(() => {
    if (mode !== "tag") return;
    setActiveIndex(0);
    if (!query) {
      setExactMatch(null);
      setSuggestions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/tag/dedup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ten: query }),
            signal: controller.signal,
          });
          const json = (await res.json().catch(() => null)) as
            | { type: "exact"; match: TagDedupMatch }
            | { type: "fuzzy"; suggestions: TagDedupMatch[] }
            | { error?: string }
            | null;
          if (cancelled || !json || !("type" in json)) {
            if (!cancelled) {
              setExactMatch(null);
              setSuggestions([]);
            }
            return;
          }
          if (json.type === "exact") {
            setExactMatch(json.match);
            setSuggestions([]);
          } else {
            setExactMatch(null);
            setSuggestions(json.suggestions ?? []);
          }
        } catch {
          if (!cancelled) {
            setExactMatch(null);
            setSuggestions([]);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 180);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(t);
    };
  }, [mode, query]);

  /* ── Click ngoài → đóng ──────────────────────────────────────────── */
  useEffect(() => {
    const onDocDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [onClose]);

  /* ── Danh sách hiển thị ──────────────────────────────────────────── */
  const userItems = useMemo(
    () =>
      users.filter((u) => u.id !== ownerId && !existingUserIds.has(u.id)),
    [users, ownerId, existingUserIds],
  );

  const exactVisible =
    mode === "tag" &&
    exactMatch &&
    !existingTagIds.has(exactMatch.id) &&
    (loaiFilter === "all" || exactMatch.loai_bai_viet === loaiFilter);

  const tagMenuItems = useMemo((): TagMenuItem[] => {
    if (mode !== "tag" || !query || exactMatch) return [];
    const items: TagMenuItem[] = suggestions
      .filter((s) => {
        if (existingTagIds.has(s.id)) return false;
        if (loaiFilter === "all") return true;
        return s.loai_bai_viet === loaiFilter;
      })
      .map((tag) => ({ kind: "suggestion" as const, tag }));
    const hasExactSuggestion = suggestions.some(
      (s) => s.tieu_de.toLowerCase() === query.toLowerCase(),
    );
    if (!hasExactSuggestion) {
      for (const loai of CREATABLE_TAG_LOAI) {
        if (loaiFilter === "all" || loaiFilter === loai) {
          items.push({ kind: "create", label: query, loai });
        }
      }
    }
    return items;
  }, [mode, query, exactMatch, suggestions, existingTagIds, loaiFilter]);

  /* ── Pick handlers ───────────────────────────────────────────────── */
  const pickUser = useCallback(
    (u: SearchUser) => {
      onPick({
        kind: "user",
        user: {
          idNguoiDung: u.id,
          slug: u.slug,
          tenHienThi: u.ten_hien_thi || u.slug,
          avatarId: u.avatar_id,
          vaiTro: "",
        },
      });
    },
    [onPick],
  );

  const pickExistingTag = useCallback(
    (tag: TagDedupMatch) => {
      onPick({
        kind: "tag",
        tag: {
          id: tag.id,
          slug: "",
          tieu_de: tag.tieu_de,
          loai_bai_viet: tag.loai_bai_viet,
          da_verify: tag.da_verify,
        },
      });
    },
    [onPick],
  );

  const createTag = useCallback(
    async (loai: CreatableTagLoai) => {
      if (!query || creating) return;
      setCreating(true);
      try {
        const res = await fetch("/api/tag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ten: query, loai }),
        });
        const json = (await res.json().catch(() => null)) as
          | { id?: string; error?: string }
          | null;
        if (!res.ok || !json?.id) return;
        onPick({
          kind: "tag",
          tag: {
            id: json.id,
            slug: "",
            tieu_de: query,
            loai_bai_viet: loai,
            da_verify: false,
          },
        });
      } finally {
        setCreating(false);
      }
    },
    [query, creating, onPick],
  );

  const pickTagMenuItem = useCallback(
    (item: TagMenuItem) => {
      if (item.kind === "suggestion") pickExistingTag(item.tag);
      else void createTag(item.loai);
    },
    [pickExistingTag, createTag],
  );

  /* ── Keyboard nav ────────────────────────────────────────────────── */
  const navLength =
    mode === "user"
      ? userItems.length
      : (exactVisible ? 1 : 0) + tagMenuItems.length;

  useEffect(() => {
    if (activeIndex >= navLength) {
      setActiveIndex(Math.max(0, navLength - 1));
    }
  }, [activeIndex, navLength]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (navLength === 0) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, navLength - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (mode === "user") {
          const u = userItems[activeIndex];
          if (u) pickUser(u);
          return;
        }
        if (exactVisible && exactMatch && activeIndex === 0) {
          pickExistingTag(exactMatch);
          return;
        }
        const item = tagMenuItems[exactVisible ? activeIndex - 1 : activeIndex];
        if (item) pickTagMenuItem(item);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [
    mode,
    navLength,
    activeIndex,
    userItems,
    tagMenuItems,
    exactVisible,
    exactMatch,
    onClose,
    pickUser,
    pickExistingTag,
    pickTagMenuItem,
  ]);

  /* ── Render: @ mode ──────────────────────────────────────────────── */
  if (mode === "user") {
    return createPortal(
      <div
        ref={menuRef}
        id={listId}
        className="ed-editor-tag-menu"
        role="listbox"
        aria-label="Gắn cộng sự"
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          width: USER_MENU_W,
          maxHeight: MENU_H,
          zIndex: 10200,
        }}
      >
        {loading ? (
          <p className="ed-editor-tag-menu-hint">Đang tìm…</p>
        ) : userItems.length === 0 ? (
          <p className="ed-editor-tag-menu-hint">
            {trigger.query
              ? "Không tìm thấy bạn bè phù hợp."
              : "Kết bạn với người dùng khác để tag họ vào bài."}
          </p>
        ) : (
          userItems.map((u, i) => {
            const name = u.ten_hien_thi?.trim() || u.slug;
            const avatarUrl = getAvatarUrl(u.avatar_id);
            return (
              <button
                key={u.id}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                className={
                  "ed-editor-tag-menu-item" +
                  (i === activeIndex ? " is-active" : "")
                }
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => pickUser(u)}
              >
                <span className="ed-editor-tag-menu-avatar">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" />
                  ) : (
                    name.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="ed-editor-tag-menu-copy">
                  <strong>{name}</strong>
                  <small>@{u.slug}</small>
                </span>
              </button>
            );
          })
        )}
      </div>,
      document.body,
    );
  }

  /* ── Render: # mode (giống TagInput) ─────────────────────────────── */
  const hasResultPreview = Boolean(exactVisible || tagMenuItems.length > 0);

  return createPortal(
    <div
      ref={menuRef}
      id={listId}
      className="tag-input-menu is-portal"
      role="listbox"
      aria-label="Gắn thẻ bài viết"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: TAG_MENU_W,
        zIndex: 10200,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="tag-input-filters" role="group" aria-label="Lọc loại thẻ">
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

      {!query ? (
        <div className="tag-input-empty">
          Gõ để tìm khái niệm, phần mềm, môn học, ngành, nghề…
        </div>
      ) : loading && !hasResultPreview ? (
        <div className="tag-input-loading">
          <Loader2 size={14} className="ed-spin" aria-hidden /> Đang tìm…
        </div>
      ) : (
        <>
          {loading ? (
            <div
              className="tag-input-loading tag-input-loading--inline"
              aria-live="polite"
            >
              <Loader2 size={14} className="ed-spin" aria-hidden /> Đang tìm…
            </div>
          ) : null}

          {exactVisible && exactMatch ? (
            <button
              type="button"
              className={`tag-input-item${activeIndex === 0 ? " is-active" : ""}`}
              role="option"
              aria-selected={activeIndex === 0}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(0)}
              onClick={() => pickExistingTag(exactMatch)}
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
              <TagSuggestionMeta
                loai={exactMatch.loai_bai_viet}
                linhVucTen={exactMatch.linh_vuc_ten}
              />
            </button>
          ) : (
            <>
              {!loading && tagMenuItems.length === 0 ? (
                <div className="tag-input-empty">
                  Không thấy kết quả
                  {loaiFilter !== "all"
                    ? ` trong mục ${LOAI_FILTER_OPTIONS.find((o) => o.id === loaiFilter)?.label ?? ""}`
                    : ""}
                  .
                </div>
              ) : null}
              {tagMenuItems.map((item, idx) => {
                const navIdx = exactVisible ? idx + 1 : idx;
                return item.kind === "suggestion" ? (
                  <button
                    key={item.tag.id}
                    type="button"
                    className={`tag-input-item${navIdx === activeIndex ? " is-active" : ""}`}
                    role="option"
                    aria-selected={navIdx === activeIndex}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(navIdx)}
                    onClick={() => pickTagMenuItem(item)}
                  >
                    {item.tag.da_verify ? (
                      <BadgeCheck
                        className="tag-input-item-verified"
                        size={16}
                        strokeWidth={2}
                        aria-hidden
                      />
                    ) : null}
                    <span className="tag-input-item-label">
                      {item.tag.tieu_de}
                    </span>
                    <TagSuggestionMeta
                      loai={item.tag.loai_bai_viet}
                      linhVucTen={item.tag.linh_vuc_ten}
                    />
                  </button>
                ) : (
                  <button
                    key={`create-${item.loai}`}
                    type="button"
                    className={`tag-input-item tag-input-create${navIdx === activeIndex ? " is-active" : ""}`}
                    role="option"
                    aria-selected={navIdx === activeIndex}
                    disabled={creating}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActiveIndex(navIdx)}
                    onClick={() => pickTagMenuItem(item)}
                  >
                    <Plus size={16} strokeWidth={2} aria-hidden />
                    <span className="tag-input-item-label">
                      Tạo {CREATE_LOAI_LABEL[item.loai]} &ldquo;{item.label}&rdquo;
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </>
      )}
    </div>,
    document.body,
  );
}
