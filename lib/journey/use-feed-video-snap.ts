"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SNAP_VISIBLE_PX = 72;
const SNAP_HYSTERESIS_PX = 48;

const nodes = new Map<string, HTMLElement>();
const listeners = new Set<() => void>();
let snappedId: string | null = null;
let pinnedId: string | null = null;
let reduceMotion = false;
let started = false;
let raf = 0;

function pickSnappedId(): string | null {
  const vh = window.innerHeight;
  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const [id, el] of nodes) {
    const r = el.getBoundingClientRect();
    const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    if (visible < SNAP_VISIBLE_PX) continue;
    const dist = Math.abs(r.bottom - vh);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = id;
    }
  }
  if (snappedId && snappedId === bestId) return snappedId;
  if (snappedId && bestId && snappedId !== bestId) {
    const currentEl = nodes.get(snappedId);
    if (currentEl) {
      const r = currentEl.getBoundingClientRect();
      const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      const currentDist = Math.abs(r.bottom - vh);
      if (visible >= SNAP_VISIBLE_PX && currentDist <= bestDist + SNAP_HYSTERESIS_PX) {
        return snappedId;
      }
    }
  }
  return bestId;
}

function playingId(): string | null {
  if (reduceMotion) return pinnedId;
  return pinnedId ?? snappedId;
}

function emit() {
  for (const fn of listeners) fn();
}

function syncSnap() {
  const next = pickSnappedId();
  if (next !== snappedId) {
    snappedId = next;
    pinnedId = null;
  }
  emit();
}

function scheduleSync() {
  if (raf) return;
  raf = window.requestAnimationFrame(() => {
    raf = 0;
    syncSnap();
  });
}

function ensureListeners() {
  if (started || typeof window === "undefined") return;
  started = true;
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const syncMq = () => {
    reduceMotion = mq.matches;
    emit();
  };
  syncMq();
  mq.addEventListener("change", syncMq);
  window.addEventListener("scroll", scheduleSync, { passive: true, capture: true });
  window.addEventListener("resize", scheduleSync);
}

/**
 * Video trên timeline: clip có đáy khung gần đáy viewport được autoplay.
 * Chỉ một clip active tại một thời điểm.
 */
export function useFeedVideoSnap(id: string, enabled: boolean): {
  bindEl: (el: HTMLElement | null) => void;
  active: boolean;
  pin: () => void;
} {
  const [active, setActive] = useState(false);
  const idRef = useRef(id);
  idRef.current = id;

  useEffect(() => {
    if (!enabled) {
      setActive(false);
      return;
    }
    ensureListeners();
    const onChange = () => {
      setActive(playingId() === idRef.current);
    };
    listeners.add(onChange);
    onChange();
    scheduleSync();
    return () => {
      listeners.delete(onChange);
    };
  }, [enabled, id]);

  const bindEl = useCallback(
    (el: HTMLElement | null) => {
      const prev = nodes.get(id);
      if (prev && prev !== el) nodes.delete(id);
      if (el && enabled) nodes.set(id, el);
      else nodes.delete(id);
      scheduleSync();
    },
    [enabled, id],
  );

  useEffect(() => {
    return () => {
      nodes.delete(id);
      if (pinnedId === id) pinnedId = null;
      if (snappedId === id) snappedId = null;
      scheduleSync();
    };
  }, [id]);

  const pin = useCallback(() => {
    pinnedId = id;
    emit();
  }, [id]);

  return { bindEl, active, pin };
}
