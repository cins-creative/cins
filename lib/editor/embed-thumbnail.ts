/**
 * Thumbnail tự động cho embed — ưu tiên URL deterministic (YouTube),
 * rồi oEmbed / OG (server), cuối cùng logo platform trên gallery.
 */

import {
  classifyEmbedUrl,
  type EmbedProviderId,
} from "@/lib/editor/embed-providers";
import type { Block } from "@/lib/editor/types";
import { normalizeOgImageUrl } from "@/lib/link/og-preview";
import { getYoutubeId } from "@/lib/youtube";

/** URL ảnh poster lưu trên block embed (OG / oEmbed đã resolve lúc compose). */
export const EMBED_THUMB_CONFIG_KEY = "thumbnailUrl";

function blockEmbedUrl(block: Block): string {
  const cfg = block.config ?? {};
  if (typeof cfg.url === "string" && cfg.url.trim()) return cfg.url.trim();
  if (typeof cfg.embedUrl === "string" && cfg.embedUrl.trim()) {
    return cfg.embedUrl.trim();
  }
  return "";
}

function blockStoredThumbnailUrl(block: Block): string | null {
  const raw = block.config?.[EMBED_THUMB_CONFIG_KEY];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  /* Heal og:image PlayCanvas đã lưu khi chưa decode &#x2F; */
  return normalizeOgImageUrl(trimmed);
}

/** Thumbnail sync — không gọi mạng (YouTube / poster đã lưu trên block). */
export function resolveEmbedThumbnailUrlSync(
  provider: EmbedProviderId | null | undefined,
  embedUrl: string,
): string | null {
  const url = embedUrl.trim();
  if (!url) return null;

  if (!provider) {
    const cls = classifyEmbedUrl(url);
    if (!cls) return null;
    return resolveEmbedThumbnailUrlSync(cls.provider, cls.url);
  }

  if (provider === "youtube") {
    const id = getYoutubeId(url);
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
  }

  return null;
}

export type FirstGalleryEmbed = {
  provider: EmbedProviderId;
  url: string;
  storedThumbnailUrl: string | null;
};

/** Embed gallery đầu tiên trong blocks (iframe Tier1 hoặc file .riv/.lottie). */
export function findFirstGalleryEmbed(
  blocks: ReadonlyArray<Block> | null | undefined,
): FirstGalleryEmbed | null {
  if (!blocks?.length) return null;
  for (const block of blocks) {
    if (block.loai !== "embed") continue;
    const url = blockEmbedUrl(block);
    if (!url) continue;
    const cls = classifyEmbedUrl(url);
    if (!cls) continue;
    if (cls.provider === "behance") continue;
    return {
      provider: cls.provider,
      url: cls.url,
      storedThumbnailUrl: blockStoredThumbnailUrl(block),
    };
  }
  return null;
}

/**
 * Ảnh coverSrc cho gallery khi không có `cover_id`.
 * Thứ tự: thumbnail đã lưu trên block → URL sync (YouTube) → null (caller dùng logo).
 */
export function resolveEmbedGalleryThumbnailSrc(
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null {
  const first = findFirstGalleryEmbed(blocks);
  if (!first) return null;
  if (first.storedThumbnailUrl) return first.storedThumbnailUrl;
  return resolveEmbedThumbnailUrlSync(first.provider, first.url);
}

/** Gắn `thumbnailUrl` vào mọi block embed khớp URL (khi publish resolve xong). */
export function attachEmbedThumbnailUrlToBlocks(
  blocks: Block[],
  embedUrl: string,
  thumbnailUrl: string,
): Block[] {
  const target = embedUrl.trim();
  const thumb = thumbnailUrl.trim();
  if (!target || !thumb) return blocks;
  return blocks.map((block) => {
    if (block.loai !== "embed") return block;
    const url = blockEmbedUrl(block);
    if (url !== target) return block;
    return {
      ...block,
      config: {
        ...(block.config ?? {}),
        [EMBED_THUMB_CONFIG_KEY]: thumb.slice(0, 2048),
      },
    };
  });
}
