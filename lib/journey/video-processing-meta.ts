import type { Block } from "@/lib/editor/types";
import { classifyBunnyVideoUrl } from "@/lib/bunny/embed";
import { classifyStreamVideoUrl } from "@/lib/cloudflare/stream-embed";

export type VideoProcessingMeta = {
  url: string;
  /** @deprecated dùng `videoId` (provider-agnostic). Giữ tương thích. */
  bunnyVideoId: string | null;
  /** Id chung: Stream uid hoặc Bunny guid. */
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
  return (
    classifyStreamVideoUrl(url)?.uid ??
    classifyBunnyVideoUrl(url)?.videoId ??
    null
  );
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
    const videoId = blockVideoId(block);
    const bunnyVideoId =
      typeof block.config?.bunnyVideoId === "string"
        ? block.config.bunnyVideoId
        : (classifyBunnyVideoUrl(url)?.videoId ?? null);
    return {
      url,
      bunnyVideoId,
      videoId,
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
