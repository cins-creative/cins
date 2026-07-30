import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { deleteBunnyStreamVideo } from "@/lib/bunny/stream";
import { deleteCloudflareImage } from "@/lib/cloudflare/delete-image";
import { deleteStreamVideo } from "@/lib/cloudflare/stream";
import {
  classifyStreamVideoUrl,
  isStreamUid,
} from "@/lib/cloudflare/stream-embed";
import { parseServerBlocks } from "@/lib/journey/parse-server-blocks";
import { extractAllImageIds, extractVideoUrl } from "@/lib/journey/post-media";
import {
  bunnyVideoIdFromBlocks,
  videoHintsFromBlocks,
} from "@/lib/journey/video-embed";
import { isCfImageUuid } from "@/lib/truong/image-ref";

type TacPhamHostingRow = {
  id: string;
  cover_id: string | null;
  noi_dung_blocks: unknown;
};

export function collectHostingAssetsFromTacPham(
  rows: ReadonlyArray<TacPhamHostingRow>,
  mediaCloudflareIds: ReadonlyArray<string>,
): {
  cloudflareImageIds: string[];
  bunnyVideoIds: string[];
  streamVideoIds: string[];
} {
  const cfSet = new Set<string>();
  const bunnySet = new Set<string>();
  const streamSet = new Set<string>();

  for (const row of rows) {
    const cover = row.cover_id?.trim();
    if (cover && isCfImageUuid(cover)) cfSet.add(cover);

    const blocks = parseServerBlocks(row.noi_dung_blocks);
    if (blocks) {
      for (const id of extractAllImageIds(blocks)) {
        if (isCfImageUuid(id)) cfSet.add(id);
      }
      const bunnyId = bunnyVideoIdFromBlocks(blocks);
      if (bunnyId) bunnySet.add(bunnyId);

      const hints = videoHintsFromBlocks(blocks);
      if (
        hints.videoProvider === "stream" &&
        hints.videoId &&
        isStreamUid(hints.videoId)
      ) {
        streamSet.add(hints.videoId);
      }
      const streamFromUrl = classifyStreamVideoUrl(extractVideoUrl(blocks) ?? "");
      if (streamFromUrl) streamSet.add(streamFromUrl.uid);
    }
  }

  for (const raw of mediaCloudflareIds) {
    const id = raw.trim();
    if (isCfImageUuid(id)) cfSet.add(id);
  }

  return {
    cloudflareImageIds: [...cfSet],
    bunnyVideoIds: [...bunnySet],
    streamVideoIds: [...streamSet],
  };
}

async function isCloudflareImageReferenced(
  admin: SupabaseClient,
  imageId: string,
): Promise<boolean> {
  const [
    coverRefs,
    mediaRefs,
    avatarRefs,
    orgRefs,
    blockRefs,
  ] = await Promise.all([
    admin
      .from("content_tac_pham")
      .select("id", { count: "exact", head: true })
      .eq("cover_id", imageId),
    admin
      .from("content_media")
      .select("id", { count: "exact", head: true })
      .eq("cloudflare_id", imageId),
    admin
      .from("user_nguoi_dung")
      .select("id", { count: "exact", head: true })
      .eq("avatar_id", imageId),
    admin
      .from("org_to_chuc")
      .select("id", { count: "exact", head: true })
      .or(`avatar_id.eq.${imageId},cover_id.eq.${imageId}`),
    admin
      .from("content_tac_pham")
      .select("id", { count: "exact", head: true })
      .ilike("noi_dung_blocks", `%${imageId}%`),
  ]);

  return [coverRefs, mediaRefs, avatarRefs, orgRefs, blockRefs].some(
    (res) => (res.count ?? 0) > 0,
  );
}

async function isVideoReferenced(
  admin: SupabaseClient,
  videoId: string,
): Promise<boolean> {
  const { count } = await admin
    .from("content_tac_pham")
    .select("id", { count: "exact", head: true })
    .ilike("noi_dung_blocks", `%${videoId}%`);
  return (count ?? 0) > 0;
}

/** Dọn ảnh Cloudflare / video Bunny + Cloudflare Stream không còn tham chiếu. */
export async function purgeTacPhamHostingAssets(
  admin: SupabaseClient,
  assets: {
    cloudflareImageIds: ReadonlyArray<string>;
    bunnyVideoIds: ReadonlyArray<string>;
    streamVideoIds?: ReadonlyArray<string>;
  },
): Promise<void> {
  await Promise.all([
    ...assets.bunnyVideoIds.map(async (videoId) => {
      if (await isVideoReferenced(admin, videoId)) return;
      await deleteBunnyStreamVideo(videoId);
    }),
    ...(assets.streamVideoIds ?? []).map(async (uid) => {
      if (await isVideoReferenced(admin, uid)) return;
      await deleteStreamVideo(uid);
    }),
    ...assets.cloudflareImageIds.map(async (imageId) => {
      if (await isCloudflareImageReferenced(admin, imageId)) return;
      await deleteCloudflareImage(imageId);
    }),
  ]);
}
