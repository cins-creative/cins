import "server-only";

import type { Block } from "@/lib/editor/types";
import { getStreamVideoStatus } from "@/lib/cloudflare/stream";
import { isStreamUid } from "@/lib/cloudflare/stream-embed";
import {
  parseVideoCanvasRatio,
  resolveVideoCanvasRatio,
} from "@/lib/journey/video-canvas-ratio";

/**
 * Gắn `videoCanvasRatio` vào embed block khi thiếu meta — đọc từ Stream API.
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

      const videoId =
        (typeof block.config?.videoId === "string"
          ? block.config.videoId.trim()
          : "") ||
        (typeof block.config?.bunnyVideoId === "string"
          ? block.config.bunnyVideoId.trim()
          : "");
      if (!videoId || !isStreamUid(videoId)) return block;

      const status = await getStreamVideoStatus(videoId);
      if (!status.ok || !status.width || !status.height) return block;

      changed = true;
      return {
        ...block,
        config: {
          ...block.config,
          videoCanvasRatio: resolveVideoCanvasRatio(
            status.width,
            status.height,
          ),
        },
      };
    }),
  );

  return changed ? out : blocks;
}
