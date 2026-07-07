import { buildBunnyVideoMp4Url } from "@/lib/bunny/embed";

export type BunnyMp4Quality = "360p" | "480p" | "720p" | "1080p";

export const BUNNY_FEED_QUALITY: BunnyMp4Quality = "480p";

/** ~2.5MB — khoảng 8–12s video 480p cho prefetch feed. */
export const BUNNY_PREFETCH_MAX_BYTES = 2_621_440;

const MAX_CONCURRENT_PREFETCH = 3;
const PLAYBACK_KEY_PREFIX = "cins-bunny-playback:";
const PLAYBACK_TTL_MS = 30 * 60 * 1000;

const activePrefetches = new Map<string, AbortController>();
const prefetchOrder: string[] = [];

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
};

function navigatorConnection(): NetworkInformationLike | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as Navigator & { connection?: NetworkInformationLike })
    .connection;
}

/** Chất lượng detail — 1080p khi Wi‑Fi/4G tốt, tiết kiệm trên mạng yếu. */
export function pickDetailQuality(): BunnyMp4Quality {
  const conn = navigatorConnection();
  if (!conn) return "720p";
  if (conn.saveData) return "480p";
  const type = conn.effectiveType ?? "";
  if (type === "slow-2g" || type === "2g" || type === "3g") return "480p";
  if (type === "4g" && (conn.downlink ?? 0) >= 5) return "1080p";
  return "720p";
}

const DETAIL_FALLBACK_ORDER: BunnyMp4Quality[] = [
  "1080p",
  "720p",
  "480p",
  "360p",
];

/** URL MP4 theo thứ tự ưu tiên — fallback khi CDN chưa có bản encode. */
export function bunnyMp4Candidates(
  videoId: string,
  preferredQuality: BunnyMp4Quality,
): string[] {
  const trimmed = videoId.trim();
  if (!trimmed) return [];

  const order = [
    preferredQuality,
    ...DETAIL_FALLBACK_ORDER.filter((q) => q !== preferredQuality),
  ];
  const out: string[] = [];
  for (const quality of order) {
    const url = buildBunnyVideoMp4Url(trimmed, quality);
    if (url && !out.includes(url)) out.push(url);
  }

  const cdn = process.env.NEXT_PUBLIC_BUNNY_CDN_HOSTNAME?.trim();
  if (cdn) {
    const generic = `https://${cdn}/${trimmed}/play.mp4`;
    if (!out.includes(generic)) out.push(generic);
  }

  return out;
}

function trimPrefetchQueue(): void {
  while (activePrefetches.size >= MAX_CONCURRENT_PREFETCH && prefetchOrder.length > 0) {
    const oldest = prefetchOrder.shift();
    if (!oldest) break;
    const controller = activePrefetches.get(oldest);
    if (controller) {
      controller.abort();
      activePrefetches.delete(oldest);
    }
  }
}

/** Prefetch byte-range đầu MP4 — browser cache dùng lại khi `<video>` play. */
export function prefetchBunnyMp4(url: string): void {
  const trimmed = url.trim();
  if (!trimmed || typeof fetch === "undefined") return;
  if (activePrefetches.has(trimmed)) return;

  trimPrefetchQueue();

  const controller = new AbortController();
  activePrefetches.set(trimmed, controller);
  prefetchOrder.push(trimmed);

  void fetch(trimmed, {
    signal: controller.signal,
    headers: { Range: `bytes=0-${BUNNY_PREFETCH_MAX_BYTES - 1}` },
    mode: "cors",
    credentials: "omit",
  })
    .catch(() => {
      /* Prefetch best-effort — lỗi CORS/network bỏ qua. */
    })
    .finally(() => {
      activePrefetches.delete(trimmed);
      const idx = prefetchOrder.indexOf(trimmed);
      if (idx >= 0) prefetchOrder.splice(idx, 1);
    });
}

export function cancelBunnyPrefetch(url: string): void {
  const trimmed = url.trim();
  const controller = activePrefetches.get(trimmed);
  if (!controller) return;
  controller.abort();
  activePrefetches.delete(trimmed);
  const idx = prefetchOrder.indexOf(trimmed);
  if (idx >= 0) prefetchOrder.splice(idx, 1);
}

export function saveBunnyPlaybackState(
  videoId: string,
  currentTime: number,
): void {
  if (typeof sessionStorage === "undefined") return;
  const id = videoId.trim();
  if (!id || !Number.isFinite(currentTime) || currentTime <= 0) return;
  try {
    sessionStorage.setItem(
      `${PLAYBACK_KEY_PREFIX}${id}`,
      JSON.stringify({ currentTime, updatedAt: Date.now() }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function readBunnyPlaybackState(videoId: string): number | null {
  if (typeof sessionStorage === "undefined") return null;
  const id = videoId.trim();
  if (!id) return null;
  try {
    const raw = sessionStorage.getItem(`${PLAYBACK_KEY_PREFIX}${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      currentTime?: number;
      updatedAt?: number;
    };
    if (
      typeof parsed.currentTime !== "number" ||
      typeof parsed.updatedAt !== "number" ||
      Date.now() - parsed.updatedAt > PLAYBACK_TTL_MS
    ) {
      return null;
    }
    return parsed.currentTime;
  } catch {
    return null;
  }
}
