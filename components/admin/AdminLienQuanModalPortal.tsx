"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  children: ReactNode;
};

/** Portal modal ra `document.body` — tránh bị slideover (transform) cắt popup. */
export function AdminLienQuanModalPortal({ open, children }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open || typeof document === "undefined") return null;

  return createPortal(children, document.body);
}
