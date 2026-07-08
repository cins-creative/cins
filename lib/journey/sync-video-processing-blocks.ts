import "server-only";

import { getBunnyVideoStatus } from "@/lib/bunny/stream";
import type { Block } from "@/lib/editor/types";
import {
  clearVideoProcessingInBlocks,
  extractVideoProcessingMeta,
} from "@/lib/journey/video-processing-meta";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Gỡ cờ `videoProcessing` khi Bunny đã encode xong. */
export async function syncVideoProcessingBlocks(
  blocks: Block[] | null,
): Promise<Block[] | null> {
  const meta = extractVideoProcessingMeta(blocks);
  if (!meta?.processing || !meta.bunnyVideoId) return blocks;

  const status = await getBunnyVideoStatus(meta.bunnyVideoId);
  if (!status.ok || !status.ready) return blocks;

  return clearVideoProcessingInBlocks(blocks!, meta.bunnyVideoId);
}

export async function syncOrgBaiDangVideoProcessing(
  postId: string,
  blocks: Block[] | null,
): Promise<Block[] | null> {
  const synced = await syncVideoProcessingBlocks(blocks);
  if (!synced || synced === blocks) return blocks;

  try {
    const admin = createServiceRoleClient();
    await admin
      .from("org_bai_dang")
      .update({ noi_dung_blocks: synced })
      .eq("id", postId);
  } catch {
    /* vẫn trả blocks đã sync để render đúng lần này */
  }

  return synced;
}

export async function syncTacPhamVideoProcessing(
  tacPhamId: string,
  blocks: Block[] | null,
): Promise<Block[] | null> {
  const synced = await syncVideoProcessingBlocks(blocks);
  if (!synced || synced === blocks) return blocks;

  try {
    const admin = createServiceRoleClient();
    await admin
      .from("content_tac_pham")
      .update({ noi_dung_blocks: synced })
      .eq("id", tacPhamId);
  } catch {
    /* best-effort */
  }

  return synced;
}
