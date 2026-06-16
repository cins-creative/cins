"use client";

import { Construction, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function TaoToChucDevNoticeModal({ open, onClose }: Props) {
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
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="ttc-notice-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="ttc-notice-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ttc-notice-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="ttc-notice-close"
          aria-label="Đóng"
          onClick={onClose}
        >
          <X size={16} aria-hidden />
        </button>

        <span className="ttc-notice-icon" aria-hidden>
          <Construction size={20} strokeWidth={1.9} />
        </span>

        <h2 id="ttc-notice-title">Chức năng đang phát triển</h2>
        <p>
          Luồng tạo Studio / Doanh nghiệp đang được hoàn thiện. Bạn có thể tạo
          Cơ sở đào tạo hoặc quay lại sau.
        </p>

        <button type="button" className="ttc-btn ttc-btn-primary ttc-notice-back" onClick={onClose}>
          Quay lại
        </button>
      </div>
    </div>,
    document.body,
  );
}
