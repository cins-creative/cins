"use client";

import { useEffect, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function AdminSlideOver({ open, title, onClose, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`slideover-backdrop${open ? " open" : ""}`}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="slideover" role="dialog" aria-modal="true" aria-labelledby="admin-so-title">
        <div className="so-header">
          <h2 id="admin-so-title" className="so-title">
            {title}
          </h2>
          <button type="button" className="so-close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>
        <div className="so-body">{children}</div>
        {footer ? <div className="so-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
