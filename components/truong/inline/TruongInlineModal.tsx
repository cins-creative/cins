"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  /**
   * Cho phép đóng khi bấm ra nền (backdrop). MẶC ĐỊNH `false` để tránh mất nội
   * dung đang soạn khi lỡ tay bấm ra ngoài — người dùng phải chủ động bấm nút
   * đóng (góc trên phải) hoặc nút Hủy/Đóng trong form.
   */
  closeOnBackdrop?: boolean;
  /**
   * Hiện nút đóng (X) góc trên phải do wrapper dựng sẵn. MẶC ĐỊNH `true`.
   * Đặt `false` cho các modal đã tự render nút đóng riêng ở header (tránh 2 nút).
   */
  showClose?: boolean;
  /** Nhãn a11y cho nút đóng dựng sẵn. */
  closeLabel?: string;
};

export function TruongInlineModal({
  open,
  onClose,
  children,
  className,
  labelledBy,
  closeOnBackdrop = false,
  showClose = true,
  closeLabel = "Đóng",
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const modalClass = className
    ? `tdh-inline-modal ${className}`
    : "tdh-inline-modal";

  return createPortal(
    <div
      className="tdh-inline-modal-backdrop"
      role="presentation"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={modalClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        {showClose ? (
          <div className="tdh-inline-modal-close-slot">
            <button
              type="button"
              className="tdh-inline-modal-close"
              onClick={onClose}
              aria-label={closeLabel}
              title={closeLabel}
            >
              <X size={18} strokeWidth={2.2} aria-hidden />
            </button>
          </div>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}
