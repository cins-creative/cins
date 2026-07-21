"use client";

import { Tag } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

import { CongDongFilterChip } from "@/components/cong-dong/CongDongFilterChip";
import type { CongDongFilter, CongDongPost } from "@/lib/cong-dong/types";

type Props = {
  orgId: string;
  post: CongDongPost;
  filters: CongDongFilter[];
  canEdit: boolean;
  onUpdated: (post: CongDongPost) => void;
};

/**
 * Nhãn cộng đồng trên card — click để đổi (owner/admin/QL / tác giả),
 * không cần mở modal sửa bài / Journey.
 */
export function CongDongPostFilterChips({
  orgId,
  post,
  filters,
  canEdit,
  onUpdated,
}: Props) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    post.filters.map((f) => f.id),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedIds(post.filters.map((f) => f.id));
  }, [post.filters]);

  const close = useCallback(() => {
    setOpen(false);
    setError(null);
    setSelectedIds(post.filters.map((f) => f.id));
  }, [post.filters]);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const menuWidth = Math.min(280, window.innerWidth - 16);
    const menuHeight = menuRef.current?.offsetHeight ?? 160;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const openUp = spaceBelow < menuHeight && rect.top > menuHeight + gap;
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      window.innerWidth - menuWidth - 8,
    );
    setMenuStyle({
      position: "fixed",
      top: openUp ? rect.top - menuHeight - gap : rect.bottom + gap,
      left,
      width: menuWidth,
      zIndex: 9200,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(updateMenuPosition);
    const onReflow = () => updateMenuPosition();
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, selectedIds, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const persist = (nextIds: string[]) => {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/cong-dong/${orgId}/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter_ids: nextIds }),
      });
      const json = (await res.json().catch(() => null)) as {
        post?: CongDongPost;
        error?: string;
      } | null;
      if (!res.ok || !json?.post) {
        setError(json?.error ?? "Không lưu được nhãn.");
        setSelectedIds(post.filters.map((f) => f.id));
        return;
      }
      onUpdated(json.post);
    });
  };

  const toggleFilter = (filterId: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId];
      persist(next);
      return next;
    });
  };

  const chips =
    post.filters.length > 0 ? (
      post.filters.map((filter) => (
        <CongDongFilterChip key={filter.id} filter={filter} size="sm" plain />
      ))
    ) : canEdit ? (
      <span className="cd-v4-jcard-filter-empty">
        <Tag size={12} strokeWidth={2} aria-hidden />
        Thêm nhãn
      </span>
    ) : null;

  if (!chips) return null;

  if (!canEdit || filters.length === 0) {
    return <div className="cd-v4-jcard-filter-chips">{chips}</div>;
  }

  const menu =
    open && typeof document !== "undefined" ? (
      <div
        id={menuId}
        ref={menuRef}
        className="cd-v4-role-menu cd-v4-role-menu--portal cd-v4-post-filter-menu"
        style={menuStyle}
        role="listbox"
        aria-multiselectable
        aria-label="Chọn nhãn bài đăng"
      >
        <p className="cd-v4-post-filter-menu-hint">Nhãn cộng đồng</p>
        <div className="cd-v4-post-filter-menu-list">
          {filters.map((filter) => {
            const active = selectedIds.includes(filter.id);
            return (
              <button
                key={filter.id}
                type="button"
                role="option"
                aria-selected={active}
                className={`cd-v4-post-filter-menu-item${active ? " is-active" : ""}`}
                disabled={pending}
                onClick={() => toggleFilter(filter.id)}
              >
                <CongDongFilterChip
                  filter={filter}
                  size="sm"
                  plain
                  active={active}
                />
              </button>
            );
          })}
        </div>
        {error ? <p className="cd-v4-post-menu-err">{error}</p> : null}
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="cd-v4-jcard-filter-edit">
      <button
        ref={triggerRef}
        type="button"
        className={`cd-v4-jcard-filter-trigger${open ? " is-open" : ""}`}
        aria-label="Đổi nhãn bài đăng"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={pending}
        onClick={() => {
          setError(null);
          setSelectedIds(post.filters.map((f) => f.id));
          setOpen((v) => !v);
        }}
      >
        {chips}
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
