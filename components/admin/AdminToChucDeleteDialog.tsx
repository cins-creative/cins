"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  orgName: string;
  confirming?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function AdminToChucDeleteDialog({
  open,
  orgName,
  confirming = false,
  error = null,
  onClose,
  onConfirm,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirming) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, confirming, onClose]);

  if (!open) return null;

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
        aria-labelledby="admin-delete-to-chuc-title"
        aria-describedby="admin-delete-to-chuc-desc"
      >
        <div className="admin-confirm-dialog__header">
          <h2 id="admin-delete-to-chuc-title" className="admin-confirm-dialog__title">
            Xóa tổ chức?
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
          <p id="admin-delete-to-chuc-desc" className="admin-confirm-dialog__lead">
            Tổ chức <strong>{orgName}</strong> sẽ được đánh dấu{" "}
            <strong>Đã đóng cửa</strong> và ẩn khỏi danh sách admin. Dữ liệu liên
            kết (bài đăng, milestone…) vẫn giữ trong DB.
          </p>
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
            disabled={confirming}
          >
            {confirming ? "Đang xóa…" : "Xóa tổ chức"}
          </button>
        </div>
      </div>
    </div>
  );
}
