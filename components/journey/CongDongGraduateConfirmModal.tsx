"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type CongDongGraduateOrgPreview = {
  name: string;
  postTitle?: string | null;
  slug?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  initial?: string | null;
};

type Props = {
  open: boolean;
  org?: CongDongGraduateOrgPreview | null;
  pending?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function CongDongGraduateConfirmModal({
  open,
  org,
  pending = false,
  error = null,
  onCancel,
  onConfirm,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onCancel();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, pending, onCancel]);

  if (!open || !mounted) return null;

  const orgName = org?.name?.trim() || "Cộng đồng";
  const postTitle = org?.postTitle?.trim() || null;
  const initial = (org?.initial || orgName.charAt(0) || "?").toUpperCase();
  const hasCover = Boolean(org?.coverUrl);

  return createPortal(
    <div
      className="j-cd-graduate-backdrop"
      role="presentation"
      onClick={() => {
        if (!pending) onCancel();
      }}
    >
      <div
        className="j-cd-graduate-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="j-cong-dong-graduate-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="j-cd-graduate-close"
          aria-label="Đóng"
          disabled={pending}
          onClick={onCancel}
        >
          <X size={16} aria-hidden />
        </button>

        <div className="j-cd-graduate-hero">
          <div
            className={`j-cd-graduate-cover${hasCover ? " has-img" : ""}`}
            aria-hidden
          >
            {hasCover ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={org!.coverUrl!} alt="" />
            ) : null}
          </div>
          <div className="j-cd-graduate-avatar-wrap" aria-hidden>
            {org?.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={org.avatarUrl} alt="" className="j-cd-graduate-avatar" />
            ) : (
              <span className="j-cd-graduate-avatar j-cd-graduate-avatar--fallback">
                {initial}
              </span>
            )}
          </div>
        </div>

        <div className="j-cd-graduate-body">
          <p className="j-cd-graduate-org">{orgName}</p>

          <div className="j-cd-graduate-warn" role="alert">
            <span className="j-cd-graduate-warn-icon" aria-hidden>
              <AlertTriangle size={20} strokeWidth={2} />
            </span>
            <div className="j-cd-graduate-warn-copy">
              <h2 id="j-cong-dong-graduate-title">Gỡ khỏi cộng đồng?</h2>
              <p>
                {postTitle ? (
                  <>
                    Bài viết <strong>{postTitle}</strong> sẽ bị xóa khỏi feed cộng
                    đồng <strong>{orgName}</strong> này và trở thành Bài viết
                    thường.
                  </>
                ) : (
                  <>
                    Bài viết sẽ bị xóa khỏi feed cộng đồng{" "}
                    <strong>{orgName}</strong> này và trở thành Bài viết thường.
                  </>
                )}
              </p>
            </div>
          </div>

          <p className="j-cd-graduate-note">
            Bình luận và tương tác trên bài vẫn được giữ.
          </p>

          {error ? (
            <p className="j-cd-graduate-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="j-cd-graduate-actions">
            <button type="button" disabled={pending} onClick={onCancel}>
              Hủy
            </button>
            <button
              type="button"
              className="is-danger"
              disabled={pending}
              onClick={onConfirm}
            >
              {pending ? "Đang xử lý…" : "Gỡ bài viết khỏi cộng đồng"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
