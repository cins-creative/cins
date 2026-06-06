"use client";

import { useCallback, useEffect, useState } from "react";

const BODY_CLASS = "post-page-focus-mode";
const PAGE_CLASS = "j-post-page--focus";

export function usePostFocusMode(enabled: boolean) {
  const [focusMode, setFocusMode] = useState(false);

  const toggle = useCallback(() => {
    setFocusMode((v) => !v);
  }, []);

  const exit = useCallback(() => {
    setFocusMode(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const page = document.querySelector(".j-post-page");
    page?.classList.toggle(PAGE_CLASS, focusMode);
    document.body.classList.toggle(BODY_CLASS, focusMode);

    return () => {
      page?.classList.remove(PAGE_CLASS);
      document.body.classList.remove(BODY_CLASS);
    };
  }, [enabled, focusMode]);

  useEffect(() => {
    if (!enabled || !focusMode) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocusMode(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, focusMode]);

  return { focusMode, toggle, exit, setFocusMode };
}
