"use client";

import {
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import Link from "next/link";
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
import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";
import { getCongDongPostMenuPermissions } from "@/lib/cong-dong/post-permissions";
import { congDongPostPermalink } from "@/lib/cong-dong/post-permalink";
import type { CongDongFilter, CongDongPost } from "@/lib/cong-dong/types";
import type { CongDongVaiTro } from "@/lib/cong-dong/vai-tro";

type Props = {
  orgId: string;
  post: CongDongPost;
  filters: CongDongFilter[];
  viewerId: string | null;
  viewerVaiTro: CongDongVaiTro | null;
  onUpdated: (post: CongDongPost) => void;
  onDeleted: (postId: string) => void;
  className?: string;
};

export function CongDongPostMenu({
  orgId,
  post,
  filters,
  viewerId,
  viewerVaiTro,
  onUpdated,
  onDeleted,
  className,
}: Props) {
  const perms = getCongDongPostMenuPermissions(viewerId, viewerVaiTro, post);
  if (!perms.canOpenMenu) return null;

  return (
    <CongDongPostMenuInner
      orgId={orgId}
      post={post}
      filters={filters}
      perms={perms}
      onUpdated={onUpdated}
      onDeleted={onDeleted}
      className={className}
    />
  );
}

function CongDongPostMenuInner({
  orgId,
  post,
  filters,
  perms,
  onUpdated,
  onDeleted,
  className,
}: Omit<Props, "viewerId" | "viewerVaiTro"> & {
  perms: ReturnType<typeof getCongDongPostMenuPermissions>;
}) {
  const postPermalink = congDongPostPermalink(post);
  const journeyOwnerSlug = post.journeyMirror?.ownerSlug || post.author.slug;
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { openCompose, canCompose } = useJourneyCompose();

  const close = useCallback(() => {
    setOpen(false);
    setConfirmDelete(false);
    setError(null);
  }, []);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 6;
    const menuWidth = 220;
    const menuHeight = menuRef.current?.offsetHeight ?? 180;
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
  }, [open, confirmDelete, updateMenuPosition]);

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

  const runPatch = (
    body: Record<string, unknown>,
    opts?: { closeMenu?: boolean; closeEdit?: boolean },
  ) => {
    startTransition(async () => {
      setError(null);
      setEditError(null);
      const res = await fetch(`/api/cong-dong/${orgId}/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        post?: CongDongPost;
        error?: string;
      } | null;
      if (!res.ok || !json?.post) {
        const message = json?.error ?? "Không thực hiện được.";
        if (opts?.closeEdit) setEditError(message);
        else setError(message);
        return;
      }
      onUpdated(json.post);
      if (opts?.closeEdit) setEditOpen(false);
      if (opts?.closeMenu !== false) close();
    });
  };

  const handlePin = (ghim: boolean) => {
    runPatch({ ghim });
  };

  const handleDelete = () => {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/cong-dong/${orgId}/posts/${post.id}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error ?? "Không xóa được bài.");
        return;
      }
      onDeleted(post.id);
      close();
    });
  };

  const menu =
    open && typeof document !== "undefined" ? (
      <div
        id={menuId}
        ref={menuRef}
        className="cd-v4-role-menu cd-v4-role-menu--portal cd-v4-post-menu"
        style={menuStyle}
        role="menu"
        aria-label="Tuỳ chọn bài đăng"
      >
        {confirmDelete ? (
          <>
            <p className="cd-v4-post-menu-confirm">
              {perms.isModerator && !perms.isAuthor
                ? "Gỡ bài này khỏi feed cộng đồng?"
                : "Xóa bài đăng khỏi cộng đồng?"}
            </p>
            <div className="cd-v4-post-menu-confirm-actions">
              <button
                type="button"
                className="cd-v4-role-menu-btn"
                onClick={() => setConfirmDelete(false)}
                disabled={pending}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="cd-v4-role-menu-btn cd-v4-role-menu-btn--danger"
                onClick={handleDelete}
                disabled={pending}
              >
                {pending ? "Đang xóa…" : "Xóa"}
              </button>
            </div>
          </>
        ) : (
          <>
            {perms.canPin ? (
              <button
                type="button"
                className="cd-v4-role-menu-btn"
                role="menuitem"
                onClick={() => handlePin(true)}
                disabled={pending}
              >
                <Pin size={15} strokeWidth={2} aria-hidden />
                <span>Ghim bài</span>
              </button>
            ) : null}
            {perms.canUnpin ? (
              <button
                type="button"
                className="cd-v4-role-menu-btn"
                role="menuitem"
                onClick={() => handlePin(false)}
                disabled={pending}
              >
                <PinOff size={15} strokeWidth={2} aria-hidden />
                <span>Bỏ ghim</span>
              </button>
            ) : null}
            {perms.canEditNative ? (
              <button
                type="button"
                className="cd-v4-role-menu-btn"
                role="menuitem"
                onClick={() => {
                  setEditError(null);
                  setEditOpen(true);
                  close();
                }}
                disabled={pending}
              >
                <Pencil size={15} strokeWidth={2} aria-hidden />
                <span>Sửa bài</span>
              </button>
            ) : null}
            {perms.canEditJourney && post.journeyMirror ? (
              canCompose ? (
                <button
                  type="button"
                  className="cd-v4-role-menu-btn"
                  role="menuitem"
                  onClick={() => {
                    close();
                    openCompose({
                      kind: "edit",
                      postSlug: post.journeyMirror!.postSlug,
                    });
                  }}
                >
                  <Pencil size={15} strokeWidth={2} aria-hidden />
                  <span>Sửa bài viết</span>
                </button>
              ) : (
                <Link
                  href={`/${journeyOwnerSlug}/p/${post.journeyMirror.postSlug}/edit`}
                  className="cd-v4-role-menu-btn"
                  role="menuitem"
                  onClick={close}
                >
                  <Pencil size={15} strokeWidth={2} aria-hidden />
                  <span>Sửa bài viết</span>
                </Link>
              )
            ) : null}
            {perms.canViewJourney && postPermalink ? (
              <Link
                href={postPermalink}
                className="cd-v4-role-menu-btn"
                role="menuitem"
                onClick={close}
              >
                <ExternalLink size={15} strokeWidth={2} aria-hidden />
                <span>Xem trên Journey</span>
              </Link>
            ) : null}
            {perms.canDelete ? (
              <button
                type="button"
                className="cd-v4-role-menu-btn cd-v4-role-menu-btn--danger"
                role="menuitem"
                onClick={() => setConfirmDelete(true)}
                disabled={pending}
              >
                <Trash2 size={15} strokeWidth={2} aria-hidden />
                <span>
                  {perms.isModerator && !perms.isAuthor
                    ? "Gỡ khỏi feed"
                    : "Xóa bài"}
                </span>
              </button>
            ) : null}
          </>
        )}
        {error ? <p className="cd-v4-post-menu-err">{error}</p> : null}
      </div>
    ) : null;

  return (
    <>
      <div
        ref={rootRef}
        className={`cd-v4-post-menu-wrap${className ? ` ${className}` : ""}`}
      >
        <button
          ref={triggerRef}
          type="button"
          className="cd-v4-jcard-menu"
          aria-label="Tuỳ chọn"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((v) => !v)}
        >
          <MoreHorizontal size={18} strokeWidth={2} aria-hidden />
        </button>
        {menu ? createPortal(menu, document.body) : null}
      </div>

      {editOpen ? (
        <CongDongPostEditModal
          post={post}
          filters={filters}
          pending={pending}
          error={editError}
          onClose={() => {
            setEditOpen(false);
            setEditError(null);
          }}
          onSave={(body) =>
            runPatch(body, { closeMenu: false, closeEdit: true })
          }
        />
      ) : null}
    </>
  );
}

function CongDongPostEditModal({
  post,
  filters,
  pending,
  error,
  onClose,
  onSave,
}: {
  post: CongDongPost;
  filters: CongDongFilter[];
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (body: {
    noi_dung: string;
    tieu_de?: string | null;
    filter_ids: string[];
  }) => void;
}) {
  const [noiDung, setNoiDung] = useState(post.noiDung);
  const [tieuDe, setTieuDe] = useState(post.tieuDe ?? "");
  const [selectedFilterIds, setSelectedFilterIds] = useState<string[]>(
    () => post.filters.map((f) => f.id),
  );

  const toggleFilter = (filterId: string) => {
    setSelectedFilterIds((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId],
    );
  };

  return (
    <div className="cd-filter-admin-backdrop" role="presentation" onClick={onClose}>
      <div
        className="cd-filter-admin-modal cd-v4-post-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cd-post-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cd-filter-admin-modal-head">
          <div className="cd-filter-admin-modal-title-wrap">
            <h2 id="cd-post-edit-title" className="cd-filter-admin-modal-title">
              Sửa bài đăng
            </h2>
          </div>
          <button
            type="button"
            className="cd-filter-admin-modal-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form
          className="cd-v4-post-edit-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              noi_dung: noiDung,
              tieu_de: tieuDe.trim() || null,
              filter_ids: selectedFilterIds,
            });
          }}
        >
          {post.tieuDe !== null || tieuDe ? (
            <label className="cd-v4-post-edit-field">
              <span>Tiêu đề</span>
              <input
                value={tieuDe}
                onChange={(e) => setTieuDe(e.target.value)}
                maxLength={200}
                placeholder="Tiêu đề (tuỳ chọn)"
              />
            </label>
          ) : null}
          <label className="cd-v4-post-edit-field">
            <span>Nội dung</span>
            <textarea
              value={noiDung}
              onChange={(e) => setNoiDung(e.target.value)}
              maxLength={8000}
              rows={5}
              required
            />
          </label>
          {filters.length > 0 ? (
            <div className="cd-v4-post-edit-field">
              <span>Nhãn</span>
              <div className="cd-v4-post-edit-filters">
                {filters.map((filter) => {
                  const active = selectedFilterIds.includes(filter.id);
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      className={`cd-v4-post-edit-filter${active ? " is-active" : ""}`}
                      aria-pressed={active}
                      onClick={() => toggleFilter(filter.id)}
                    >
                      <CongDongFilterChip filter={filter} size="sm" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {error ? <p className="cd-v4-post-menu-err">{error}</p> : null}
          <div className="cd-v4-post-edit-actions">
            <button type="button" className="cd-v4-btn cd-v4-btn--ghost" onClick={onClose}>
              Huỷ
            </button>
            <button
              type="submit"
              className="cd-v4-btn cd-v4-btn--primary"
              disabled={pending || !noiDung.trim()}
            >
              {pending ? "Đang lưu…" : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
