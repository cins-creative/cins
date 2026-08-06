import {
  buildStreamIframeUrl,
  buildStreamMp4Url,
  buildStreamThumbnailUrl,
  classifyStreamVideoUrl,
  isStreamUid,
} from "@/lib/cloudflare/stream-embed";
import type { Block } from "@/lib/editor/types";
import { extractVideoUrl } from "@/lib/journey/post-media";
import { getYoutubeId } from "@/lib/youtube";

function extractVimeoId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (!u.hostname.replace(/^www\./, "").includes("vimeo.com")) return null;
  const m = u.pathname.match(/\/(\d+)/);
  return m?.[1] ?? null;
}

/** `videoId` từ block embed — fallback khi URL chưa classify được. */
export function videoIdFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null {
  if (!blocks) return null;
  for (const block of blocks) {
    if (block.loai !== "embed") continue;
    const cfg = block.config ?? {};
    const fromVideoId =
      typeof cfg.videoId === "string" ? cfg.videoId.trim() : "";
    if (fromVideoId) return fromVideoId;
    // Legacy field name — vẫn đọc để tương thích dữ liệu cũ.
    const fromLegacy =
      typeof cfg.bunnyVideoId === "string" ? cfg.bunnyVideoId.trim() : "";
    if (fromLegacy) return fromLegacy;
  }
  return null;
}

/** @deprecated Dùng `videoIdFromBlocks`. */
export const bunnyVideoIdFromBlocks = videoIdFromBlocks;

export type VideoBlockHints = {
  videoProvider?: string | null;
  videoId?: string | null;
};

/** Hint provider/id từ block embed đầu tiên (Cloudflare Stream). */
export function videoHintsFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): VideoBlockHints {
  if (!blocks) return {};
  for (const block of blocks) {
    if (block.loai !== "embed") continue;
    const cfg = block.config ?? {};
    const videoProvider =
      typeof cfg.videoProvider === "string" ? cfg.videoProvider.trim() : null;
    const videoId =
      (typeof cfg.videoId === "string" ? cfg.videoId.trim() : null) ||
      (typeof cfg.bunnyVideoId === "string" ? cfg.bunnyVideoId.trim() : null);
    if (videoProvider || videoId) {
      return { videoProvider, videoId };
    }
  }
  return {};
}

/** Poster video từ blocks — Cloudflare Stream. */
export function resolveVideoThumbnailFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null {
  if (!blocks?.length) return null;
  const url = extractVideoUrl(blocks) ?? "";
  const hints = videoHintsFromBlocks(blocks);

  const streamFromUrl = classifyStreamVideoUrl(url);
  if (streamFromUrl) return buildStreamThumbnailUrl(streamFromUrl.uid);
  if (hints.videoProvider === "stream" && hints.videoId && isStreamUid(hints.videoId)) {
    return buildStreamThumbnailUrl(hints.videoId);
  }
  if (hints.videoId && isStreamUid(hints.videoId)) {
    return buildStreamThumbnailUrl(hints.videoId);
  }

  return null;
}

/** MP4 preview — frame đầu gallery khi thumbnail chưa có / lỗi. */
export function resolveVideoPreviewMp4FromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null {
  if (!blocks?.length) return null;
  const url = extractVideoUrl(blocks) ?? "";
  const hints = videoHintsFromBlocks(blocks);
  const uid =
    classifyStreamVideoUrl(url)?.uid ??
    (hints.videoId && isStreamUid(hints.videoId) ? hints.videoId : null);
  return uid ? buildStreamMp4Url(uid) : null;
}

/** @deprecated Dùng `resolveVideoPreviewMp4FromBlocks`. */
export const resolveBunnyVideoPreviewMp4FromBlocks =
  resolveVideoPreviewMp4FromBlocks;

/** URL iframe phát video milestone — Stream / YouTube / Vimeo. */
export function buildVideoIframeSrc(
  url: string,
  options?: {
    autoplay?: boolean;
    videoProvider?: string | null;
    videoId?: string | null;
    /** @deprecated dùng `videoId`. */
    bunnyVideoId?: string | null;
  },
): string | null {
  const autoplay = options?.autoplay === true;
  const sep = (base: string) => (base.includes("?") ? "&" : "?");
  const hintId = options?.videoId ?? options?.bunnyVideoId ?? null;

  const streamUid =
    options?.videoProvider === "stream" &&
    hintId &&
    isStreamUid(hintId)
      ? hintId
      : hintId && isStreamUid(hintId)
        ? hintId
        : (classifyStreamVideoUrl(url)?.uid ?? null);
  if (streamUid) {
    const base = buildStreamIframeUrl(streamUid);
    return autoplay
      ? `${base}${sep(base)}autoplay=true&muted=true`
      : base;
  }

  const youtubeId = getYoutubeId(url);
  if (youtubeId) {
    const base = `https://www.youtube-nocookie.com/embed/${youtubeId}`;
    return autoplay
      ? `${base}${sep(base)}autoplay=1&playsinline=1`
      : base;
  }

  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    const base = `https://player.vimeo.com/video/${vimeoId}`;
    return autoplay ? `${base}${sep(base)}autoplay=1` : base;
  }

  return null;
}
