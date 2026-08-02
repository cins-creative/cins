"use client";

import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import "@/app/cins-truong-inline-edit.css";

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
  /**
   * CSS selector portal thay `document.body` (vd. `.cso-ql-body`).
   * Không tìm thấy → fallback body.
   */
  portalSelector?: string;
  /**
   * Backdrop/modal fill container host (position absolute inset 0).
   * Dùng với `portalSelector` — host cần `position: relative`.
   */
  fillHost?: boolean;
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
  portalSelector,
  fillHost = false,
}: Props) {
  const [portalNode, setPortalNode] = useState<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    if (fillHost) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, fillHost]);

  useEffect(() => {
    if (!open) {
      setPortalNode(null);
      return;
    }
    if (portalSelector) {
      const el = document.querySelector(portalSelector);
      setPortalNode(el ?? document.body);
      return;
    }
    setPortalNode(document.body);
  }, [open, portalSelector]);

  useEffect(() => {
    if (!open || !fillHost || !portalNode || !(portalNode instanceof HTMLElement)) {
      return;
    }
    portalNode.classList.add("tdh-fill-host-open");
    return () => {
      portalNode.classList.remove("tdh-fill-host-open");
    };
  }, [open, fillHost, portalNode]);

  if (!open || !portalNode) return null;

  const modalClass = [
    "tdh-inline-modal",
    className,
    fillHost ? "tdh-inline-modal--fill-host" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const backdropClass = [
    "tdh-inline-modal-backdrop",
    fillHost ? "tdh-inline-modal-backdrop--fill-host" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div
      className={backdropClass}
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
    portalNode,
  );
}
