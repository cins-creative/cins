"use client";

import { useEffect, useState } from "react";

export const COARSE_POINTER_MQ = "(hover: none) and (pointer: coarse)";

export function prefersCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(COARSE_POINTER_MQ).matches;
}

/** Thiết bị cảm ứng chính — tap/long-press thay cho hover + nút số tách. */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(COARSE_POINTER_MQ);
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return coarse;
}
