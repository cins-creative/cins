import "server-only";

import type {
  MilestoneItem,
  MilestoneType,
} from "@/components/journey/milestone-types";
import { milestonePreviewMedia } from "@/lib/journey/milestone-preview-media";
import { parseServerBlocks } from "@/lib/journey/parse-server-blocks";
import { normalizeBookmarkPrivateNote } from "@/lib/journey/bookmark-private-note";
import { mapOrgLoaiToBookmarkFrameKind } from "@/lib/journey/bookmark-source-theme";
import { compareTimelineOrder } from "@/lib/journey/timeline-sort";
import { parseBaiDangBlocks } from "@/lib/truong/bai-dang-blocks";
import { SOCIAL_LOAI_ORG_BAI_DANG } from "@/lib/truong/social-constants";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { truongRootPath } from "@/lib/truong/truong-routes";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type OrgBaiDangBookmarkSocial = {
  bookmarked: boolean;
  bookmarkCount: number;
};

export function orgLoaiToMilestoneType(
  loai: string | null | undefined,
): MilestoneType {
  if (loai === "su_kien") return "su-kien";
  if (loai === "tuyen_sinh" || loai === "hoc_bong") return "hoc";
  return "ca-nhan";
}

export async function saveOrgBaiDangBookmark(params: {
  postId: string;
  viewerId: string;
  visibility?: string;
  ghiChuRieng?: string | null;
}): Promise<
  | { ok: true; bookmarked: true; count: number; visibility: "public" | "private" }
  | { ok: false; error: string; status: number }
> {
  const admin = createServiceRoleClient();
  const { data: post } = await admin
    .from("org_bai_dang")
    .select("id, trang_thai")
    .eq("id", params.postId)
    .maybeSingle<{ id: string; trang_thai: string }>();

  if (!post || post.trang_thai !== "da_dang") {
    return { ok: false, error: "Bài đăng không tồn tại.", status: 404 };
  }

  const visibility = params.visibility === "private" ? "private" : "public";
  const ghiChuRieng = normalizeBookmarkPrivateNote(params.ghiChuRieng);

  await admin
    .from("social_luu")
    .delete()
    .eq("id_nguoi_dung", params.viewerId)
    .eq("loai_doi_tuong", SOCIAL_LOAI_ORG_BAI_DANG)
    .eq("id_doi_tuong", params.postId);

  const { error } = await admin.from("social_luu").upsert(
    {
      id_nguoi_dung: params.viewerId,
      loai_doi_tuong: SOCIAL_LOAI_ORG_BAI_DANG,
      id_doi_tuong: params.postId,
      che_do_hien_thi: visibility,
      ghi_chu_rieng: ghiChuRieng,
    },
    { onConflict: "id_nguoi_dung,loai_doi_tuong,id_doi_tuong" },
  );

  if (error) {
    return { ok: false, error: error.message, status: 400 };
  }

  const { count } = await admin
    .from("social_luu")
    .select("id", { count: "exact", head: true })
    .eq("loai_doi_tuong", SOCIAL_LOAI_ORG_BAI_DANG)
    .eq("id_doi_tuong", params.postId);

  return {
    ok: true,
    bookmarked: true,
    count: count ?? 0,
    visibility,
  };
}

export async function loadViewerBookmarkedOrgBaiDang(
  postIds: string[],
  viewerId: string | null,
): Promise<Set<string>> {
  const out = new Set<string>();
  if (!viewerId || postIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("social_luu")
    .select("id_doi_tuong")
    .eq("id_nguoi_dung", viewerId)
    .eq("loai_doi_tuong", SOCIAL_LOAI_ORG_BAI_DANG)
    .in("id_doi_tuong", postIds)
    .returns<Array<{ id_doi_tuong: string }>>();

  for (const row of rows ?? []) {
    out.add(row.id_doi_tuong);
  }
  return out;
}

/** Bookmark count + viewer đã lưu — hydrate client (ngoài cache payload trường). */
export async function loadOrgBaiDangBookmarkSocial(
  postIds: string[],
  viewerId: string | null,
): Promise<Record<string, OrgBaiDangBookmarkSocial>> {
  const out: Record<string, OrgBaiDangBookmarkSocial> = {};
  for (const id of postIds) {
    out[id] = { bookmarked: false, bookmarkCount: 0 };
  }
  if (postIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("social_luu")
    .select("id_doi_tuong")
    .eq("loai_doi_tuong", SOCIAL_LOAI_ORG_BAI_DANG)
    .in("id_doi_tuong", postIds)
    .returns<Array<{ id_doi_tuong: string }>>();

  for (const row of rows ?? []) {
    const id = row.id_doi_tuong;
    if (!out[id]) continue;
    out[id].bookmarkCount += 1;
  }

  if (viewerId) {
    const saved = await loadViewerBookmarkedOrgBaiDang(postIds, viewerId);
    for (const id of saved) {
      if (out[id]) out[id].bookmarked = true;
    }
  }

  return out;
}

type OrgEmbed = {
  slug: string;
  ten: string;
  loai_to_chuc: string | null;
  avatar_id: string | null;
  logo_id: string | null;
};

type OrgBaiDangBookmarkRow = {
  id: string;
  tieu_de: string;
  tom_tat: string | null;
  noi_dung_blocks: unknown;
  cover_id: string | null;
  tao_luc: string;
  loai_bai_dang: string | null;
  id_to_chuc: string;
  org_to_chuc: OrgEmbed | OrgEmbed[] | null;
};

function pickOrgEmbed(raw: OrgEmbed | OrgEmbed[] | null | undefined): OrgEmbed | null {
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

/** Cột mốc «Lưu về» trên Journey user — từ `social_luu` + `org_bai_dang`. */
export async function fetchBookmarkedOrgBaiDangMilestones(params: {
  userId: string;
  admin: ReturnType<typeof createServiceRoleClient>;
}): Promise<MilestoneItem[]> {
  const { userId, admin } = params;
  const { data: savedRows } = await admin
    .from("social_luu")
    .select("id_doi_tuong, tao_luc, che_do_hien_thi")
    .eq("id_nguoi_dung", userId)
    .eq("loai_doi_tuong", SOCIAL_LOAI_ORG_BAI_DANG)
    .returns<
      Array<{
        id_doi_tuong: string;
        tao_luc: string;
        che_do_hien_thi: string | null;
      }>
    >();

  const savedAtByPost = new Map(
    (savedRows ?? []).map((row) => [row.id_doi_tuong, row.tao_luc]),
  );
  const postIds = [...savedAtByPost.keys()];
  if (postIds.length === 0) return [];

  try {
    const { publishDueOrgBaiDang } = await import(
      "@/lib/truong/publish-due-org-bai-dang"
    );
    await publishDueOrgBaiDang();
  } catch {
    /* bookmark feed vẫn load nếu lazy publish lỗi */
  }

  const { data: posts } = await admin
    .from("org_bai_dang")
    .select(
      `
      id,
      tieu_de,
      tom_tat,
      noi_dung_blocks,
      cover_id,
      tao_luc,
      loai_bai_dang,
      id_to_chuc,
      org_to_chuc!inner ( slug, ten, loai_to_chuc, avatar_id, logo_id )
    `,
    )
    .in("id", postIds)
    .eq("trang_thai", "da_dang")
    .returns<OrgBaiDangBookmarkRow[]>();

  const items: MilestoneItem[] = [];
  for (const post of posts ?? []) {
    const org = pickOrgEmbed(post.org_to_chuc);
    if (!org?.slug?.trim() || !org.ten?.trim()) continue;

    const blocks = parseBaiDangBlocks(post.noi_dung_blocks);
    const dateIso = post.tao_luc;
    const dateObj = new Date(dateIso);
    if (Number.isNaN(dateObj.getTime())) continue;

    const avatarId = org.avatar_id ?? org.logo_id;
    const avatarUrl = avatarId
      ? resolveTruongImageSrcSync(avatarId, ["public", "avatar"])
      : null;
    const previewItems = milestonePreviewMedia(
      post.cover_id,
      parseServerBlocks(post.noi_dung_blocks),
      post.tieu_de,
    );

    items.push({
      id: `bookmark:org:${post.id}`,
      cotMocId: post.id,
      variant: "bookmark",
      type: orgLoaiToMilestoneType(post.loai_bai_dang),
      visibility: "public",
      year: dateObj.getUTCFullYear(),
      month: dateObj.getUTCMonth() + 1,
      day: dateObj.getUTCDate(),
      createdAt: savedAtByPost.get(post.id) ?? dateIso,
      bookmarkSavedAt: savedAtByPost.get(post.id) ?? null,
      title: post.tieu_de,
      body: post.tom_tat?.trim() || null,
      media: previewItems,
      noiDungBlocks: blocks,
      orgBaiDangRef: {
        postId: post.id,
        orgSlug: org.slug.trim(),
        orgName: org.ten.trim(),
      },
      bookmark: {
        name: org.ten.trim(),
        domain: org.slug.trim(),
        url: truongRootPath(org.slug.trim()),
        initial: org.ten.trim().slice(0, 1).toUpperCase(),
        avatarUrl,
        sourceKind: mapOrgLoaiToBookmarkFrameKind(org.loai_to_chuc),
      },
      social: {
        viewerLiked: false,
        viewerBookmarked: true,
        likeCount: 0,
        bookmarkCount: 0,
        showCounts: false,
      },
    });
  }

  return items.sort(compareTimelineOrder);
}
