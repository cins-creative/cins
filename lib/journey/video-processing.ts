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
  kind: "tac_pham";
  tacPhamId: string;
  postSlug: string | null;
  postTitle: string;
  bunnyVideoId: string;
};

export type ProcessingOrgBaiDangPost = {
  kind: "org_bai_dang";
  orgBaiDangId: string;
  orgId: string;
  postTitle: string;
  bunnyVideoId: string;
};

export type ProcessingVideoItem = ProcessingVideoPost | ProcessingOrgBaiDangPost;

const ORG_ADMIN_ROLES = [
  "owner",
  "admin",
  "quan_ly_noi_dung",
  "quan_ly_tuyen_sinh",
] as const;

function pushProcessingFromBlocks(
  blocks: Block[] | null,
  base: Omit<ProcessingVideoPost, "kind" | "bunnyVideoId">,
  items: ProcessingVideoItem[],
) {
  const meta = extractVideoProcessingMeta(blocks);
  if (!meta?.processing || !meta.bunnyVideoId) return;
  items.push({
    kind: "tac_pham",
    ...base,
    bunnyVideoId: meta.bunnyVideoId,
  });
}

function pushOrgProcessingFromBlocks(
  blocks: Block[] | null,
  base: Omit<ProcessingOrgBaiDangPost, "kind" | "bunnyVideoId">,
  items: ProcessingVideoItem[],
) {
  const meta = extractVideoProcessingMeta(blocks);
  if (!meta?.processing || !meta.bunnyVideoId) return;
  items.push({
    kind: "org_bai_dang",
    ...base,
    bunnyVideoId: meta.bunnyVideoId,
  });
}

export async function listProcessingVideoPosts(
  userId: string,
): Promise<ProcessingVideoPost[]> {
  const items = await listProcessingVideoItems(userId);
  return items.filter(
    (item): item is ProcessingVideoPost => item.kind === "tac_pham",
  );
}

/** Bài Journey user + bài đăng org mà user quản trị — đang chờ encode Bunny. */
export async function listProcessingVideoItems(
  userId: string,
): Promise<ProcessingVideoItem[]> {
  const admin = createServiceRoleClient();
  const items: ProcessingVideoItem[] = [];

  const { data: tacRows } = await admin
    .from("content_tac_pham")
    .select("id, slug, tieu_de, noi_dung_blocks")
    .eq("id_nguoi_dung", userId)
    .order("tao_luc", { ascending: false })
    .limit(40);

  for (const row of tacRows ?? []) {
    pushProcessingFromBlocks(
      row.noi_dung_blocks as Block[] | null,
      {
        tacPhamId: row.id as string,
        postSlug: (row.slug as string | null) ?? null,
        postTitle: (row.tieu_de as string | null) || "Video mới",
      },
      items,
    );
  }

  const { data: memberships } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_to_chuc")
    .eq("id_nguoi_dung", userId)
    .in("vai_tro", [...ORG_ADMIN_ROLES]);

  const orgIds = [
    ...new Set(
      (memberships ?? [])
        .map((row) => row.id_to_chuc as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (orgIds.length > 0) {
    const { data: orgRows } = await admin
      .from("org_bai_dang")
      .select("id, id_to_chuc, tieu_de, noi_dung_blocks")
      .in("id_to_chuc", orgIds)
      .order("tao_luc", { ascending: false })
      .limit(60);

    for (const row of orgRows ?? []) {
      pushOrgProcessingFromBlocks(
        row.noi_dung_blocks as Block[] | null,
        {
          orgBaiDangId: row.id as string,
          orgId: row.id_to_chuc as string,
          postTitle: (row.tieu_de as string | null) || "Video mới",
        },
        items,
      );
    }
  }

  return items;
}

export async function listProcessingOrgBaiDangPosts(
  orgId: string,
): Promise<ProcessingOrgBaiDangPost[]> {
  const admin = createServiceRoleClient();
  const items: ProcessingOrgBaiDangPost[] = [];
  const { data } = await admin
    .from("org_bai_dang")
    .select("id, id_to_chuc, tieu_de, noi_dung_blocks")
    .eq("id_to_chuc", orgId)
    .order("tao_luc", { ascending: false })
    .limit(40);

  for (const row of data ?? []) {
    const meta = extractVideoProcessingMeta(row.noi_dung_blocks as Block[] | null);
    if (!meta?.processing || !meta.bunnyVideoId) continue;
    items.push({
      kind: "org_bai_dang",
      orgBaiDangId: row.id as string,
      orgId: row.id_to_chuc as string,
      postTitle: (row.tieu_de as string | null) || "Video mới",
      bunnyVideoId: meta.bunnyVideoId,
    });
  }
  return items;
}
