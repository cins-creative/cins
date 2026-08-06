import "server-only";

import type { Block } from "@/lib/editor/types";
import { getVideoStatus } from "@/lib/video/status";
import {
  clearVideoProcessingInBlocks,
  extractVideoProcessingMeta,
} from "@/lib/journey/video-processing-meta";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Gỡ cờ `videoProcessing` khi Cloudflare Stream đã encode xong. */
export async function syncVideoProcessingBlocks(
  blocks: Block[] | null,
): Promise<Block[] | null> {
  const meta = extractVideoProcessingMeta(blocks);
  if (!meta?.processing || !meta.videoId) return blocks;

  const status = await getVideoStatus(meta.videoId, "stream");
  if (!status.ok || !status.ready) return blocks;

  return clearVideoProcessingInBlocks(blocks!, meta.videoId);
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
