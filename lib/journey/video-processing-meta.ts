import type { Block } from "@/lib/editor/types";
import { classifyStreamVideoUrl } from "@/lib/cloudflare/stream-embed";

export type VideoProcessingMeta = {
  url: string;
  /** Stream uid (hoặc id từ config legacy). */
  videoId: string | null;
  processing: boolean;
};

/** Id video của block embed — `videoId`/`bunnyVideoId` cấu hình hoặc suy từ URL. */
function blockVideoId(block: Block): string | null {
  const cfg = block.config ?? {};
  if (typeof cfg.videoId === "string" && cfg.videoId.trim()) {
    return cfg.videoId.trim();
  }
  if (typeof cfg.bunnyVideoId === "string" && cfg.bunnyVideoId.trim()) {
    return cfg.bunnyVideoId.trim();
  }
  const url = typeof cfg.url === "string" ? cfg.url.trim() : "";
  if (!url) return null;
  return classifyStreamVideoUrl(url)?.uid ?? null;
}

export function isVideoProcessingInBlocks(
  blocks: ReadonlyArray<Block> | null | undefined,
): boolean {
  return extractVideoProcessingMeta(blocks)?.processing === true;
}

/** Ẩn milestone/video khỏi viewer khi encode chưa xong — trừ chủ bài. */
export function hideProcessingVideoFromViewer(
  blocks: ReadonlyArray<Block> | null | undefined,
  viewerId: string | null | undefined,
  ownerId: string | null | undefined,
): boolean {
  if (!isVideoProcessingInBlocks(blocks)) return false;
  if (viewerId && ownerId && viewerId === ownerId) return false;
  return true;
}

export function extractVideoProcessingMeta(
  blocks: ReadonlyArray<Block> | null | undefined,
): VideoProcessingMeta | null {
  if (!blocks) return null;
  for (const block of blocks) {
    if (block.loai !== "embed") continue;
    const url =
      typeof block.config?.url === "string" ? block.config.url.trim() : "";
    if (!url) continue;
    return {
      url,
      videoId: blockVideoId(block),
      processing: block.config?.videoProcessing === true,
    };
  }
  return null;
}

export function clearVideoProcessingInBlocks(
  blocks: ReadonlyArray<Block>,
  videoId: string,
): Block[] {
  return blocks.map((block) => {
    if (block.loai !== "embed") return block;
    if (blockVideoId(block) !== videoId || !block.config) return block;
    const nextConfig = { ...block.config };
    delete nextConfig.videoProcessing;
    return { ...block, config: nextConfig };
  });
}
