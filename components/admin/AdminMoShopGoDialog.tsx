"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useEffect } from "react";

type Props = {
  open: boolean;
  tenShop: string;
  confirming?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function AdminMoShopGoDialog({
  open,
  tenShop,
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
        aria-labelledby="admin-go-mo-shop-title"
        aria-describedby="admin-go-mo-shop-desc"
      >
        <div className="admin-confirm-dialog__header">
          <span className="admin-confirm-dialog__icon" aria-hidden>
            <AlertTriangle size={18} strokeWidth={2.2} />
          </span>
          <h2 id="admin-go-mo-shop-title" className="admin-confirm-dialog__title">
            Gỡ lead khỏi danh sách?
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
          <p id="admin-go-mo-shop-desc" className="admin-confirm-dialog__lead">
            Lead <strong>{tenShop}</strong> sẽ bị gỡ khỏi hàng đợi mở shop. Hành
            động không hoàn tác.
          </p>

          <div className="admin-delete-warn admin-delete-warn--block admin-delete-warn--row">
            <ShieldAlert size={15} strokeWidth={2.2} aria-hidden />
            <span>
              Không xóa shop thật. Slot concierge được trả. Chỉ mất dòng lead
              trong danh sách này.
            </span>
          </div>

          {error ? (
            <p
              className="admin-edit-form__msg admin-edit-form__msg--err"
              role="alert"
            >
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
            {confirming ? "Đang gỡ…" : "Gỡ lead"}
          </button>
        </div>
      </div>
    </div>
  );
}
