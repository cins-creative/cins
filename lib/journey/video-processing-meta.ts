import type { Block } from "@/lib/editor/types";
import { classifyBunnyVideoUrl } from "@/lib/bunny/embed";

export type VideoProcessingMeta = {
  url: string;
  bunnyVideoId: string | null;
  processing: boolean;
};

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
    const bunnyVideoId =
      typeof block.config?.bunnyVideoId === "string"
        ? block.config.bunnyVideoId
        : (classifyBunnyVideoUrl(url)?.videoId ?? null);
    return {
      url,
      bunnyVideoId,
      processing: block.config?.videoProcessing === true,
    };
  }
  return null;
}

export function clearVideoProcessingInBlocks(
  blocks: ReadonlyArray<Block>,
  bunnyVideoId: string,
): Block[] {
  return blocks.map((block) => {
    if (block.loai !== "embed") return block;
    const url =
      typeof block.config?.url === "string" ? block.config.url.trim() : "";
    const id =
      typeof block.config?.bunnyVideoId === "string"
        ? block.config.bunnyVideoId
        : (classifyBunnyVideoUrl(url)?.videoId ?? null);
    if (id !== bunnyVideoId || !block.config) return block;
    const nextConfig = { ...block.config };
    delete nextConfig.videoProcessing;
    return { ...block, config: nextConfig };
  });
}
