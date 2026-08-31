/**
 * Helpers UI chung cho Stream reel / listing player.
 * Play/pause/seek vẫn qua `lib/cloudflare/stream-player-sdk`.
 */

import { buildStreamIframeUrl } from "@/lib/cloudflare/stream-embed";

export function formatReelTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Src cố định — play/pause/loop qua Stream SDK. Đổi query khi snap sẽ reload iframe. */
export function streamPlayerIframeSrc(uid: string): string {
  const params = new URLSearchParams({
    autoplay: "false",
    muted: "true",
    controls: "false",
    preload: "auto",
    loop: "false",
  });
  return `${buildStreamIframeUrl(uid)}?${params.toString()}`;
}

export function postStreamEvent(
  iframe: HTMLIFrameElement | null,
  event: "play" | "pause",
) {
  try {
    iframe?.contentWindow?.postMessage(JSON.stringify({ event }), "*");
  } catch {
    /* ignore */
  }
}

export async function toggleElementFullscreen(
  el: HTMLElement | null,
): Promise<void> {
  if (!el) return;
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
    webkitFullscreenElement?: Element | null;
  };
  const anyEl = el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  const current = document.fullscreenElement ?? doc.webkitFullscreenElement;
  if (current) {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      return;
    }
    await doc.webkitExitFullscreen?.();
    return;
  }
  if (el.requestFullscreen) {
    await el.requestFullscreen();
    return;
  }
  await anyEl.webkitRequestFullscreen?.();
}

export async function tryLockLandscape(): Promise<void> {
  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (o: string) => Promise<void>;
    };
    await orientation.lock?.("landscape");
  } catch {
    /* iOS / unsupported */
  }
}

export function tryUnlockOrientation(): void {
  try {
    screen.orientation?.unlock?.();
  } catch {
    /* ignore */
  }
}

export function connectionSaveData(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  const t = conn.effectiveType ?? "";
  return t === "slow-2g" || t === "2g" || t === "3g";
}

/** Số iframe warm phía trước — giảm trên mạng chậm / Save-Data. */
export function reelIframePreloadCount(defaultCount = 2): number {
  return connectionSaveData() ? 1 : defaultCount;
}
