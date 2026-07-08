"use client";

import { Construction, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export const CINS_COMING_SOON_MESSAGE =
  "Tính năng đang phát triển, bạn quay lại sau nhé";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CinsComingSoonModal({ open, onClose }: Props) {
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
      className="cins-coming-soon-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="cins-coming-soon-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cins-coming-soon-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="cins-coming-soon-close"
          aria-label="Đóng"
          onClick={onClose}
        >
          <X size={16} aria-hidden />
        </button>

        <span className="cins-coming-soon-icon" aria-hidden>
          <Construction size={20} strokeWidth={1.9} />
        </span>

        <p id="cins-coming-soon-title" className="cins-coming-soon-message">
          {CINS_COMING_SOON_MESSAGE}
        </p>

        <button
          type="button"
          className="cins-coming-soon-btn"
          onClick={onClose}
        >
          Đóng
        </button>
      </div>
    </div>,
    document.body,
  );
}
