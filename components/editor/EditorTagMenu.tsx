"use client";

import { Loader2, Plus } from "lucide-react";
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
  COMPOSE_VISIBLE_TAG_LOAI_SET,
} from "@/lib/tag/tag-loai";

import { TagSuggestionLabel } from "@/components/tag/TagSuggestionLabel";
import { TagSuggestionMeta } from "@/components/tag/TagSuggestionMeta";
import {
  useTagSuggestSearch,
  type TagSuggestRow,
} from "@/components/tag/useTagSuggestSearch";
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

type TagMenuItem =
  | { kind: "suggestion"; tag: TagSuggestRow }
  | { kind: "create"; label: string };

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
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const creatingRef = useRef(false);
  const [pos, setPos] = useState<{ top: number; left: number }>(() =>
    computeCaretMenuPosition(anchorRect, menuWidth, MENU_H),
  );

  const query = trigger.query.trim();

  const {
    exactMatch,
    suggestions,
    browse,
    refining,
    loading: tagLoading,
    hasExactSuggestion,
    ensureIndex,
  } = useTagSuggestSearch({
    enabled: mode === "tag",
    query: trigger.query,
    loaiFilter: "all",
    allowLoai: COMPOSE_VISIBLE_TAG_LOAI_SET,
    excludeIds: existingTagIds,
  });

  useEffect(() => {
    if (mode === "tag") ensureIndex();
  }, [mode, ensureIndex]);

  useEffect(() => {
    if (mode === "tag") {
      setActiveIndex(0);
      setCreateError(null);
    }
  }, [mode, query]);

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
  }, [
    updatePos,
    loading,
    users,
    suggestions,
    browse,
    exactMatch,
    query,
    tagLoading,
  ]);

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
        const json = (await res.json()) as { users?: SearchUser[] };
        if (cancelled) return;
        setUsers(json.users ?? []);
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

  /* ── Click ngoài → đóng ──────────────────────────────────────────── */
  useEffect(() => {
    const onDocDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      // Portal + overlay: fallback khi target không còn trong cây menuRef.
      if (
        target instanceof Element &&
        target.closest("[data-editor-tag-menu], .tag-input-menu, .ed-editor-tag-menu")
      ) {
        return;
      }
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
    Boolean(query) &&
    exactMatch &&
    !existingTagIds.has(exactMatch.id) &&
    COMPOSE_VISIBLE_TAG_LOAI_SET.has(exactMatch.loai_bai_viet);

  const tagMenuItems = useMemo((): TagMenuItem[] => {
    if (mode !== "tag") return [];
    if (!query) {
      return browse.map((tag) => ({ kind: "suggestion" as const, tag }));
    }
    if (exactMatch) return [];
    const items: TagMenuItem[] = suggestions.map((tag) => ({
      kind: "suggestion" as const,
      tag,
    }));
    if (!hasExactSuggestion) {
      items.push({ kind: "create", label: query });
    }
    return items;
  }, [mode, query, exactMatch, suggestions, browse, hasExactSuggestion]);

  const suggestionItems = useMemo(
    () => tagMenuItems.filter((item) => item.kind === "suggestion"),
    [tagMenuItems],
  );
  const createItem = useMemo(
    () => tagMenuItems.find((item) => item.kind === "create") ?? null,
    [tagMenuItems],
  );

  const commitFromPointer = useCallback(
    (
      event: { preventDefault: () => void; stopPropagation: () => void },
      fn: () => void,
    ) => {
      event.preventDefault();
      event.stopPropagation();
      fn();
    },
    [],
  );

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
    (tag: TagSuggestRow) => {
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

  const createTag = useCallback(async () => {
    if (!query || creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ten: query, loai: "keyword" }),
      });
      const json = (await res.json().catch(() => null)) as
        | { id?: string; error?: string }
        | null;
      if (!res.ok || !json?.id) {
        setCreateError(
          json?.error?.trim() ||
            (res.status === 401
              ? "Cần đăng nhập để tạo thẻ."
              : "Không tạo được thẻ. Thử lại."),
        );
        return;
      }
      onPick({
        kind: "tag",
        tag: {
          id: json.id,
          slug: "",
          tieu_de: query,
          loai_bai_viet: "keyword",
          da_verify: false,
        },
      });
    } catch {
      setCreateError("Không tạo được thẻ. Thử lại.");
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  }, [query, onPick]);

  const pickTagMenuItem = useCallback(
    (item: TagMenuItem) => {
      if (item.kind === "suggestion") pickExistingTag(item.tag);
      else void createTag();
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
                onMouseDown={(e) => commitFromPointer(e, () => pickUser(u))}
                onMouseEnter={() => setActiveIndex(i)}
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
  const showTagLoading = tagLoading && !hasResultPreview;

  return createPortal(
    <div
      ref={menuRef}
      id={listId}
      className="tag-input-menu is-portal"
      data-editor-tag-menu=""
      role="listbox"
      aria-label="Gắn thẻ bài viết"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: TAG_MENU_W,
        zIndex: 13000,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {showTagLoading ? (
        <div className="tag-input-loading">
          <Loader2 size={14} className="ed-spin" aria-hidden /> Đang tìm…
        </div>
      ) : (
        <>
          {refining ? (
            <div
              className="tag-input-loading tag-input-loading--inline"
              aria-live="polite"
            >
              <Loader2 size={14} className="ed-spin" aria-hidden /> Đang tinh chỉnh…
            </div>
          ) : null}

          {createError ? (
            <p className="tag-input-create-error" role="alert">
              {createError}
            </p>
          ) : null}

          <div className="tag-input-menu-body">
            {exactVisible && exactMatch ? (
              <button
                type="button"
                className={`tag-input-item${activeIndex === 0 ? " is-active" : ""}`}
                role="option"
                aria-selected={activeIndex === 0}
                onMouseDown={(e) =>
                  commitFromPointer(e, () => pickExistingTag(exactMatch))
                }
                onMouseEnter={() => setActiveIndex(0)}
              >
                <TagSuggestionLabel tieu_de={exactMatch.tieu_de} />
                <TagSuggestionMeta
                  compose
                  loai={exactMatch.loai_bai_viet}
                  soNguoiTagged={exactMatch.so_nguoi_tagged}
                  soGan={exactMatch.so_gan}
                />
              </button>
            ) : null}

            {!showTagLoading && tagMenuItems.length === 0 && !exactVisible ? (
              <div className="tag-input-empty">
                {query ? "Không thấy kết quả." : "Chưa có thẻ."}
              </div>
            ) : null}

            {suggestionItems.map((item, idx) => {
              const navIdx = exactVisible ? idx + 1 : idx;
              return (
                <button
                  key={item.tag.id}
                  type="button"
                  className={`tag-input-item${navIdx === activeIndex ? " is-active" : ""}`}
                  role="option"
                  aria-selected={navIdx === activeIndex}
                  onMouseDown={(e) =>
                    commitFromPointer(e, () => pickTagMenuItem(item))
                  }
                  onMouseEnter={() => setActiveIndex(navIdx)}
                >
                  <TagSuggestionLabel tieu_de={item.tag.tieu_de} />
                  <TagSuggestionMeta
                    compose
                    loai={item.tag.loai_bai_viet}
                    soNguoiTagged={item.tag.so_nguoi_tagged}
                    soGan={item.tag.so_gan}
                  />
                </button>
              );
            })}
          </div>

          {createItem ? (
            <button
              type="button"
              className={`tag-input-item tag-input-create is-sticky${
                (exactVisible
                  ? suggestionItems.length + 1
                  : suggestionItems.length) === activeIndex
                  ? " is-active"
                  : ""
              }`}
              role="option"
              aria-selected={
                (exactVisible
                  ? suggestionItems.length + 1
                  : suggestionItems.length) === activeIndex
              }
              disabled={creating}
              onMouseDown={(e) =>
                commitFromPointer(e, () => pickTagMenuItem(createItem))
              }
              onMouseEnter={() =>
                setActiveIndex(
                  exactVisible
                    ? suggestionItems.length + 1
                    : suggestionItems.length,
                )
              }
            >
              <Plus size={16} strokeWidth={2} aria-hidden />
              <span className="tag-input-item-label">
                Tạo thẻ mới &ldquo;{createItem.label}&rdquo;
              </span>
            </button>
          ) : null}
        </>
      )}
    </div>,
    document.body,
  );
}
