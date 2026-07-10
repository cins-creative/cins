"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import "./journey-action-touch.css";

export type JourneyActionSheetItem = {
  id: string;
  label: string;
  icon: ReactNode;
  tone?: "default" | "liked" | "bookmarked" | "comment";
  onSelect: () => void;
};

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  items: JourneyActionSheetItem[];
};

export function JourneyActionTouchSheet({
  open,
  onClose,
  title,
  items,
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="jat-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="jat-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Tùy chọn"}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="jat-handle" aria-hidden />
        {title ? <p className="jat-title">{title}</p> : null}
        <ul className="jat-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={
                  "jat-item" +
                  (item.tone && item.tone !== "default" ? ` is-${item.tone}` : "")
                }
                onClick={() => {
                  onClose();
                  item.onSelect();
                }}
              >
                <span className="jat-item-ico" aria-hidden>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="jat-cancel" onClick={onClose}>
          Đóng
        </button>
      </div>
    </div>,
    document.body,
  );
}
