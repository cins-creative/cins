import {
  buildBunnyEmbedUrl,
  buildBunnyVideoMp4Url,
  buildBunnyVideoThumbnailUrl,
  classifyBunnyVideoUrl,
  type BunnyVideoEmbed,
} from "@/lib/bunny/embed";
import type { Block } from "@/lib/editor/types";
import { extractVideoUrl } from "@/lib/journey/post-media";
import { getYoutubeId } from "@/lib/youtube";

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/** `bunnyVideoId` từ block embed — fallback khi client thiếu env library id. */
export function bunnyVideoIdFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null {
  if (!blocks) return null;
  for (const block of blocks) {
    if (block.loai !== "embed") continue;
    const fromConfig =
      typeof block.config?.bunnyVideoId === "string"
        ? block.config.bunnyVideoId.trim()
        : "";
    if (fromConfig) return fromConfig;
  }
  return null;
}

export function resolveBunnyEmbed(
  url: string,
  bunnyVideoId?: string | null,
): BunnyVideoEmbed | null {
  const fromUrl = classifyBunnyVideoUrl(url);
  if (fromUrl) return fromUrl;

  const videoId = bunnyVideoId?.trim();
  const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID?.trim();
  if (videoId && libraryId && GUID_RE.test(videoId)) {
    return {
      provider: "bunny",
      libraryId,
      videoId,
      url: buildBunnyEmbedUrl(libraryId, videoId),
    };
  }
  return null;
}

function resolveBunnyFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): BunnyVideoEmbed | null {
  if (!blocks?.length) return null;
  const url = extractVideoUrl(blocks) ?? "";
  return resolveBunnyEmbed(url, bunnyVideoIdFromBlocks(blocks));
}

/** Thumbnail Bunny từ embed block — dùng `bunnyVideoId` khi URL chưa classify được. */
export function resolveBunnyVideoThumbnailFromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null {
  const bunny = resolveBunnyFromBlocks(blocks);
  return bunny ? buildBunnyVideoThumbnailUrl(bunny.videoId) : null;
}

/** MP4 preview — frame đầu gallery khi thumbnail.jpg chưa có / lỗi. */
export function resolveBunnyVideoPreviewMp4FromBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null {
  const bunny = resolveBunnyFromBlocks(blocks);
  return bunny ? buildBunnyVideoMp4Url(bunny.videoId) : null;
}

/** URL iframe phát video milestone — Bunny / YouTube / Vimeo. */
export function buildVideoIframeSrc(
  url: string,
  options?: { autoplay?: boolean; bunnyVideoId?: string | null },
): string | null {
  const autoplay = options?.autoplay === true;
  const sep = (base: string) => (base.includes("?") ? "&" : "?");

  const bunny = resolveBunnyEmbed(url, options?.bunnyVideoId);
  if (bunny) {
    const base = buildBunnyEmbedUrl(bunny.libraryId, bunny.videoId);
    return autoplay
      ? `${base}${sep(base)}autoplay=true&preload=true`
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
