"use client";

import { useEffect } from "react";

/** Tắt gradient nền body (theme ambient) — tránh gãy khi trang dài. */
export function MoShopBodyFlat({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add("theme-flat");
    return () => {
      document.body.classList.remove("theme-flat");
    };
  }, []);
  return children;
}
