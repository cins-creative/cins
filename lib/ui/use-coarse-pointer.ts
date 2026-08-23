"use client";

import { useEffect, useState } from "react";

/** iPadOS thường `hover: hover` + `pointer: coarse` — không AND với hover:none. */
export const COARSE_POINTER_MQ = "(pointer: coarse)";
/** Cột feed hẹp — cùng layout cung emoji với máy cảm ứng. */
export const NARROW_FEED_MQ = "(max-width: 767.98px)";

export function prefersCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(COARSE_POINTER_MQ).matches;
}

function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);

  return matches;
}

/** Thiết bị cảm ứng chính — tap/long-press thay cho hover + nút số tách. */
export function useCoarsePointer(): boolean {
  return useMatchMedia(COARSE_POINTER_MQ);
}

/** Cung emoji mobile: cảm ứng hoặc viewport hẹp (DevTools / cửa sổ nhỏ). */
export function useArcReactionPicker(): boolean {
  const coarse = useMatchMedia(COARSE_POINTER_MQ);
  const narrow = useMatchMedia(NARROW_FEED_MQ);
  return coarse || narrow;
}
