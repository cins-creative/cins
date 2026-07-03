"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  orgName: string;
  confirming?: boolean;
  error?: string | null;
  onClose: () => void;
  /** Nhận mật khẩu ủy quyền đã nhập để gửi kèm request xóa. */
  onConfirm: (delegationPassword: string) => void;
};

export function AdminToChucDeleteDialog({
  open,
  orgName,
  confirming = false,
  error = null,
  onClose,
  onConfirm,
}: Props) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirming) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, confirming, onClose]);

  // Reset mật khẩu mỗi khi mở/đóng để không giữ lại giá trị cũ.
  useEffect(() => {
    if (!open) setPassword("");
  }, [open]);

  if (!open) return null;

  const canConfirm = password.trim().length > 0 && !confirming;

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
          <span className="admin-confirm-dialog__icon" aria-hidden>
            <AlertTriangle size={18} strokeWidth={2.2} />
          </span>
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

          <div className="admin-delete-warn admin-delete-warn--block admin-delete-warn--row">
            <ShieldAlert size={15} strokeWidth={2.2} aria-hidden />
            <span>
              Thao tác nhạy cảm — bắt buộc nhập <strong>mật khẩu ủy quyền</strong>{" "}
              để xác nhận.
            </span>
          </div>

          <div className="admin-org-members-pwd admin-delete-pwd">
            <label className="form-label" htmlFor="admin-delete-to-chuc-pwd">
              Mật khẩu ủy quyền
            </label>
            <input
              id="admin-delete-to-chuc-pwd"
              className="form-input"
              type="password"
              autoComplete="off"
              placeholder="Nhập CINS_ORG_DELEGATION_PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canConfirm) onConfirm(password);
              }}
              disabled={confirming}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            <p className="admin-org-members-pwd-hint">
              Chỉ Admin tối cao biết mật khẩu này — đăng nhập admin không thay thế.
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
            onClick={() => onConfirm(password)}
            disabled={!canConfirm}
          >
            {confirming ? "Đang xóa…" : "Xóa tổ chức"}
          </button>
        </div>
      </div>
    </div>
  );
}
