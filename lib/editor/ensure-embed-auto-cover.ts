/**
 * Auto cover cho bài embed khi publish/edit không có cover_id user.
 * Resolve thumbnail → upload Cloudflare → gắn thumbnailUrl lên block.
 */

import {
  attachEmbedThumbnailUrlToBlocks,
  findFirstGalleryEmbed,
} from "@/lib/editor/embed-thumbnail";
import { fetchEmbedThumbnailUrlForGalleryEmbed } from "@/lib/editor/resolve-embed-thumbnail-server";
import type { Block } from "@/lib/editor/types";
import { uploadCloudflareImageFromUrl } from "@/lib/cloudflare/upload-image-from-url";
import { isPersistedImageSeed } from "@/lib/truong/image-ref";

export type EmbedAutoCoverResult = {
  coverId: string | null;
  blocks: Block[];
};

/**
 * Nếu đã có cover user → giữ nguyên.
 * Nếu chưa → thử fetch thumb provider/OG, upload CF, gắn vào block.
 * File .riv/.lottie bỏ qua ở đây (capture canvas phía client).
 */
export async function ensureEmbedAutoCover(params: {
  coverId: string | null | undefined;
  blocks: Block[];
}): Promise<EmbedAutoCoverResult> {
  const coverTrimmed = params.coverId?.trim() || null;
  const hasUserCover = Boolean(
    coverTrimmed && isPersistedImageSeed(coverTrimmed),
  );
  if (hasUserCover) {
    return { coverId: coverTrimmed, blocks: params.blocks };
  }

  const first = findFirstGalleryEmbed(params.blocks);
  if (!first) {
    return { coverId: coverTrimmed, blocks: params.blocks };
  }

  /* Capture canvas — không scrape URL. */
  if (first.provider === "rive-file" || first.provider === "lottie-file") {
    return { coverId: coverTrimmed, blocks: params.blocks };
  }

  const thumbUrl = await fetchEmbedThumbnailUrlForGalleryEmbed(first);
  if (!thumbUrl) {
    return { coverId: coverTrimmed, blocks: params.blocks };
  }

  const blocksWithThumb = attachEmbedThumbnailUrlToBlocks(
    params.blocks,
    first.url,
    thumbUrl,
  );

  const uploaded = await uploadCloudflareImageFromUrl(thumbUrl);
  return {
    coverId: uploaded?.imageId ?? coverTrimmed,
    blocks: blocksWithThumb,
  };
}
