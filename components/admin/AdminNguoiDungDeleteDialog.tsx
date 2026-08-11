"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  tenHienThi: string;
  slug: string;
  email: string | null;
  soNoiDung: number;
  confirming?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function AdminNguoiDungDeleteDialog({
  open,
  tenHienThi,
  slug,
  email,
  soNoiDung,
  confirming = false,
  error = null,
  onClose,
  onConfirm,
}: Props) {
  const [confirmSlug, setConfirmSlug] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirming) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, confirming, onClose]);

  useEffect(() => {
    if (!open) setConfirmSlug("");
  }, [open]);

  if (!open) return null;

  const slugOk = confirmSlug.trim().toLowerCase() === slug.trim().toLowerCase();
  const canConfirm = slugOk && !confirming;

  return (
    <div
      className="admin-confirm-backdrop open"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !confirming) onClose();
      }}
    >
      <div
        className="admin-confirm-dialog admin-confirm-dialog--danger"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-delete-user-title"
        aria-describedby="admin-delete-user-desc"
      >
        <div className="admin-confirm-dialog__header">
          <span className="admin-confirm-dialog__icon" aria-hidden>
            <AlertTriangle size={18} strokeWidth={2.2} />
          </span>
          <h2 id="admin-delete-user-title" className="admin-confirm-dialog__title">
            Xóa user?
          </h2>
          <button
            type="button"
            className="so-close"
            onClick={onClose}
            disabled={confirming}
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <div className="admin-confirm-dialog__body">
          <p id="admin-delete-user-desc" className="admin-confirm-dialog__lead">
            Bạn sắp xóa tài khoản{" "}
            <strong>
              {tenHienThi} (@{slug})
            </strong>
            {email ? (
              <>
                {" "}
                · <span className="admin-nguoi-dung-muted">{email}</span>
              </>
            ) : null}
            .
          </p>

          <div className="admin-delete-warn admin-delete-warn--block admin-delete-warn--row">
            <ShieldAlert size={15} strokeWidth={2.2} aria-hidden />
            <span>
              User sẽ bị đánh dấu <strong>Đã xóa</strong>, không đăng nhập lại được.
              Nội dung / shop / quan hệ vẫn giữ trong DB (soft-delete).{" "}
              {soNoiDung > 0 ? (
                <>
                  Hiện có <strong>{soNoiDung}</strong> bài Journey.
                </>
              ) : null}{" "}
              Hành động không hoàn tác từ UI này.
            </span>
          </div>

          <div className="admin-org-members-pwd admin-delete-pwd">
            <label className="form-label" htmlFor="admin-delete-user-slug">
              Gõ đúng slug để xác nhận
            </label>
            <input
              id="admin-delete-user-slug"
              className="form-input"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder={slug}
              value={confirmSlug}
              onChange={(e) => setConfirmSlug(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canConfirm) onConfirm();
              }}
              disabled={confirming}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            <p className="admin-org-members-pwd-hint">
              Nhập <code>{slug}</code> — chỉ Admin tối cao mới xóa được.
            </p>
          </div>

          {error ? (
            <p className="admin-edit-form__msg admin-edit-form__msg--err" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="admin-confirm-dialog__footer">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={confirming}
          >
            Hủy
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {confirming ? "Đang xóa…" : "Xóa user"}
          </button>
        </div>
      </div>
    </div>
  );
}
