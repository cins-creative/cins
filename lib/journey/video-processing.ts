import "server-only";

import type { Block } from "@/lib/editor/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { extractVideoProcessingMeta } from "@/lib/journey/video-processing-meta";

export type { VideoProcessingMeta } from "@/lib/journey/video-processing-meta";
export {
  clearVideoProcessingInBlocks,
  extractVideoProcessingMeta,
} from "@/lib/journey/video-processing-meta";

export type ProcessingVideoPost = {
  tacPhamId: string;
  postSlug: string | null;
  postTitle: string;
  bunnyVideoId: string;
};

export async function listProcessingVideoPosts(
  userId: string,
): Promise<ProcessingVideoPost[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_tac_pham")
    .select("id, slug, tieu_de, noi_dung_blocks")
    .eq("id_nguoi_dung", userId)
    .order("tao_luc", { ascending: false })
    .limit(40);

  const items: ProcessingVideoPost[] = [];
  for (const row of data ?? []) {
    const blocks = row.noi_dung_blocks as Block[] | null;
    const meta = extractVideoProcessingMeta(blocks);
    if (!meta?.processing || !meta.bunnyVideoId) continue;
    items.push({
      tacPhamId: row.id as string,
      postSlug: (row.slug as string | null) ?? null,
      postTitle: (row.tieu_de as string | null) || "Video mới",
      bunnyVideoId: meta.bunnyVideoId,
    });
  }
  return items;
}
