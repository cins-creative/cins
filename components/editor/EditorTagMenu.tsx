"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  articleTagLabel,
  articleTagLoaiClass,
  type ArticleTagRef,
} from "@/lib/editor/article-tag";
import type { AtHashTrigger } from "@/lib/editor/use-at-hash-trigger";
import { searchArticlesForTag } from "@/lib/editor/search-articles-action";
import { getAvatarUrl } from "@/lib/journey/profile";
import type { CoAuthorDraft } from "@/lib/social/types";
import { computeFixedMenuPosition } from "@/lib/ui/clamp-fixed-menu-position";

const MENU_W = 320;
const MENU_H = 280;

type SearchUser = {
  id: string;
  slug: string;
  ten_hien_thi: string;
  avatar_id: string | null;
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
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [tags, setTags] = useState<ArticleTagRef[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number }>(() =>
    computeFixedMenuPosition(anchorRect, { width: MENU_W, height: MENU_H }),
  );

  const mode = trigger.char === "@" ? "user" : "tag";
  const items =
    mode === "user"
      ? users.filter((u) => u.id !== ownerId && !existingUserIds.has(u.id))
      : tags.filter((t) => !existingTagIds.has(t.id));

  const updatePos = useCallback(() => {
    const height = menuRef.current?.offsetHeight ?? MENU_H;
    setPos(
      computeFixedMenuPosition(anchorRect, { width: MENU_W, height }),
    );
  }, [anchorRect]);

  useEffect(() => {
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [updatePos]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setActiveIndex(0);

    const run = async () => {
      try {
        if (mode === "user") {
          const qs = new URLSearchParams({
            q: trigger.query,
            mutual_only: "true",
          });
          const res = await fetch(`/api/users/search?${qs.toString()}`);
          const json = await res.json();
          if (cancelled) return;
          setUsers((json.users ?? []) as SearchUser[]);
        } else {
          const rows = await searchArticlesForTag(trigger.query);
          if (cancelled) return;
          setTags(rows);
        }
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

  useEffect(() => {
    if (activeIndex >= items.length) {
      setActiveIndex(Math.max(0, items.length - 1));
    }
  }, [activeIndex, items.length]);

  useEffect(() => {
    const onDocDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [onClose]);

  const pickItem = useCallback(
    (item: SearchUser | ArticleTagRef) => {
      if (mode === "user") {
        const u = item as SearchUser;
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
      } else {
        onPick({ kind: "tag", tag: item as ArticleTagRef });
      }
    },
    [mode, onPick],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (items.length === 0) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (event.key === "Enter") {
        event.preventDefault();
        const item = items[activeIndex];
        if (item) pickItem(item);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeIndex, items, onClose, pickItem]);

  const label =
    mode === "user" ? "Gắn cộng sự" : "Gắn thẻ bài viết";

  return createPortal(
    <div
      ref={menuRef}
      id={listId}
      className="ed-editor-tag-menu"
      role="listbox"
      aria-label={label}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: MENU_W,
        maxHeight: MENU_H,
        zIndex: 10050,
      }}
    >
      {loading ? (
        <p className="ed-editor-tag-menu-hint">Đang tìm…</p>
      ) : items.length === 0 ? (
        <p className="ed-editor-tag-menu-hint">
          {mode === "user"
            ? trigger.query
              ? "Không tìm thấy bạn bè phù hợp."
              : "Follow người dùng khác để tag họ vào bài."
            : trigger.query
              ? "Không có bài viết khớp."
              : "Chưa có bài viết nào."}
        </p>
      ) : mode === "user" ? (
        items.map((user, i) => {
          const u = user as SearchUser;
          const name = u.ten_hien_thi?.trim() || u.slug;
          const avatarUrl = getAvatarUrl(u.avatar_id);
          return (
            <button
              key={u.id}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              className={
                "ed-editor-tag-menu-item" + (i === activeIndex ? " is-active" : "")
              }
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => pickItem(u)}
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
      ) : (
        (items as ArticleTagRef[]).map((tag, i) => {
          const cls = articleTagLoaiClass(tag.loai_bai_viet);
          return (
            <button
              key={tag.id}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              className={
                "ed-editor-tag-menu-item" + (i === activeIndex ? " is-active" : "")
              }
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => pickItem(tag)}
            >
              <span className={`ed-editor-tag-menu-loai ${cls}`}>
                {articleTagLabel(tag.loai_bai_viet)}
              </span>
              <span className="ed-editor-tag-menu-copy">
                <strong>{tag.tieu_de}</strong>
              </span>
            </button>
          );
        })
      )}
    </div>,
    document.body,
  );
}
