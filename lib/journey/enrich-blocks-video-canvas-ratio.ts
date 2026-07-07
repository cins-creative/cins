import "server-only";

import type { Block } from "@/lib/editor/types";
import { getBunnyVideoDimensions } from "@/lib/bunny/stream";
import {
  parseVideoCanvasRatio,
  resolveVideoCanvasRatio,
} from "@/lib/journey/video-canvas-ratio";

/**
 * Gắn `videoCanvasRatio` vào embed block khi thiếu meta — đọc từ Bunny API.
 * Chỉ mutate bản in-memory trả về client; không ghi DB.
 */
export async function enrichBlocksVideoCanvasRatio(
  blocks: Block[] | null,
): Promise<Block[] | null> {
  if (!blocks?.length) return blocks;

  let changed = false;
  const out = await Promise.all(
    blocks.map(async (block) => {
      if (block.loai !== "embed") return block;

      const url =
        typeof block.config?.url === "string" ? block.config.url.trim() : "";
      if (!url) return block;

      if (parseVideoCanvasRatio(block.config?.videoCanvasRatio)) return block;

      const bunnyVideoId =
        typeof block.config?.bunnyVideoId === "string"
          ? block.config.bunnyVideoId.trim()
          : "";
      if (!bunnyVideoId) return block;

      const dims = await getBunnyVideoDimensions(bunnyVideoId);
      if (!dims) return block;

      changed = true;
      return {
        ...block,
        config: {
          ...block.config,
          videoCanvasRatio: resolveVideoCanvasRatio(dims.width, dims.height),
        },
      };
    }),
  );

  return changed ? out : blocks;
}
