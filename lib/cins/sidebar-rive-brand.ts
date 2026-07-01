import type { Rive } from "@rive-app/canvas";

export const RIVE_LOGO_SRC = "/rive/LogoCINs.riv";
export const RIVE_STATE_MACHINE = "State Machine 1";
/** Tên timeline trong LogoCINs.riv (có dấu cách cuối). */
export const RIVE_TRANSITION_ANIM = "Transition ";
/** Khớp thời lượng timeline trong file Rive (~0.5s). */
export const RIVE_TRANSITION_MS = 520;

/** State Machine 1 — State 1: icon thu gọn (sidebar 64px). */
export const RIVE_LOGO_STATE_COLLAPSED = 0;
/** State Machine 1 — State 2: wordmark đầy đủ (sidebar hover mở rộng). */
export const RIVE_LOGO_STATE_EXPANDED = 1;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * LogoCINs.riv: SM `State Machine 1` (State 1 ↔ State 2) + timeline `Transition `.
 * SM không có input — scrub timeline (0 = State 1, 1 = State 2).
 */
function primeLogoTimeline(rive: Rive): void {
  rive.stop(RIVE_STATE_MACHINE);
  rive.stop(RIVE_TRANSITION_ANIM);
  rive.startRendering();
}

export function runLogoSidebarTransition(
  rive: Rive,
  expanded: boolean,
  fromProgress: number,
  onProgress?: (value: number) => void,
): { cancel: () => void } {
  const anim = RIVE_TRANSITION_ANIM;
  const toProgress = expanded
    ? RIVE_LOGO_STATE_EXPANDED
    : RIVE_LOGO_STATE_COLLAPSED;
  let raf = 0;
  let cancelled = false;

  const cancel = () => {
    cancelled = true;
    if (raf) cancelAnimationFrame(raf);
    rive.stop(anim);
  };

  if (Math.abs(fromProgress - toProgress) < 0.001) {
    primeLogoTimeline(rive);
    rive.scrub(anim, toProgress);
    onProgress?.(toProgress);
    return { cancel };
  }

  primeLogoTimeline(rive);
  const start = performance.now();
  const from = fromProgress;

  const step = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - start) / RIVE_TRANSITION_MS);
    const value = from + (toProgress - from) * easeOutCubic(t);
    rive.scrub(anim, value);
    rive.startRendering();
    onProgress?.(value);
    if (t < 1) {
      raf = requestAnimationFrame(step);
    } else {
      onProgress?.(toProgress);
    }
  };

  rive.scrub(anim, from);
  onProgress?.(from);
  raf = requestAnimationFrame(step);

  return { cancel };
}

export function setLogoSidebarProgress(rive: Rive, progress: number): void {
  primeLogoTimeline(rive);
  rive.scrub(RIVE_TRANSITION_ANIM, progress);
}
