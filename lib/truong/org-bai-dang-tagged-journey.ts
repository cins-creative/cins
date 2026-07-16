import "server-only";

import type { MilestoneItem } from "@/components/journey/milestone-types";
import { milestonePreviewMedia } from "@/lib/journey/milestone-preview-media";
import { parseServerBlocks } from "@/lib/journey/parse-server-blocks";
import { compareTimelineOrder, resolveTaggedTimelineSortAt } from "@/lib/journey/timeline-sort";
import { mapOrgLoaiToBookmarkFrameKind } from "@/lib/journey/bookmark-source-theme";
import { mapForeignJourneyVisibilityToUi } from "@/lib/journey/foreign-milestone-visibility";
import { orgPublicHref } from "@/lib/search/helpers";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { parseBaiDangBlocks } from "@/lib/truong/bai-dang-blocks";
import { loadOrgBaiDangCoAuthorCredits } from "@/lib/truong/org-bai-dang-coauthor";
import { orgLoaiToMilestoneType } from "@/lib/truong/org-bai-dang-bookmark";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { SOCIAL_LOAI_ORG_BAI_DANG } from "@/lib/truong/social-constants";

type OrgEmbed = {
  slug: string | null;
  ten: string | null;
  loai_to_chuc: string | null;
  avatar_id: string | null;
  logo_id: string | null;
};

type OrgBaiDangTaggedRow = {
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

function mapOrgKind(
  loai: string | null | undefined,
): NonNullable<MilestoneItem["orgBaiDangRef"]>["orgKind"] {
  if (loai === "cong_dong") return "cong_dong";
  if (loai === "co_so_dao_tao") return "co_so_dao_tao";
  if (loai === "studio" || loai === "doanh_nghiep") return "studio";
  return "truong";
}

async function loadOrgBaiDangSocialBatch(
  admin: ReturnType<typeof createServiceRoleClient>,
  postIds: string[],
  viewerId: string | null,
): Promise<Map<string, NonNullable<MilestoneItem["social"]>>> {
  const out = new Map<string, NonNullable<MilestoneItem["social"]>>();
  for (const id of postIds) {
    out.set(id, {
      viewerLiked: false,
      viewerBookmarked: false,
      likeCount: 0,
      bookmarkCount: 0,
      showCounts: true,
    });
  }
  if (postIds.length === 0) return out;

  const [likesRes, viewerLikeRes, bookmarksRes, viewerBookmarkRes] =
    await Promise.all([
      admin
        .from("social_reaction")
        .select("id_doi_tuong")
        .eq("loai_doi_tuong", SOCIAL_LOAI_ORG_BAI_DANG)
        .eq("emoji", "heart")
        .in("id_doi_tuong", postIds),
      viewerId
        ? admin
            .from("social_reaction")
            .select("id_doi_tuong")
            .eq("id_nguoi_dung", viewerId)
            .eq("loai_doi_tuong", SOCIAL_LOAI_ORG_BAI_DANG)
            .eq("emoji", "heart")
            .in("id_doi_tuong", postIds)
        : Promise.resolve({ data: [] }),
      admin
        .from("social_luu")
        .select("id_doi_tuong")
        .eq("loai_doi_tuong", SOCIAL_LOAI_ORG_BAI_DANG)
        .in("id_doi_tuong", postIds),
      viewerId
        ? admin
            .from("social_luu")
            .select("id_doi_tuong")
            .eq("id_nguoi_dung", viewerId)
            .eq("loai_doi_tuong", SOCIAL_LOAI_ORG_BAI_DANG)
            .in("id_doi_tuong", postIds)
        : Promise.resolve({ data: [] }),
    ]);

  const likeCounts = new Map<string, number>();
  for (const row of likesRes.data ?? []) {
    const id = row.id_doi_tuong as string;
    likeCounts.set(id, (likeCounts.get(id) ?? 0) + 1);
  }
  const bookmarkCounts = new Map<string, number>();
  for (const row of bookmarksRes.data ?? []) {
    const id = row.id_doi_tuong as string;
    bookmarkCounts.set(id, (bookmarkCounts.get(id) ?? 0) + 1);
  }
  const viewerLiked = new Set(
    (viewerLikeRes.data ?? []).map((row) => row.id_doi_tuong as string),
  );
  const viewerBookmarked = new Set(
    (viewerBookmarkRes.data ?? []).map((row) => row.id_doi_tuong as string),
  );

  for (const id of postIds) {
    out.set(id, {
      viewerLiked: viewerLiked.has(id),
      viewerBookmarked: viewerBookmarked.has(id),
      likeCount: likeCounts.get(id) ?? 0,
      bookmarkCount: bookmarkCounts.get(id) ?? 0,
      showCounts: true,
    });
  }
  return out;
}

/** Bài `org_bai_dang` viewer là cộng sự đã chấp nhận — hiện trên Journey cá nhân. */
export async function fetchTaggedOrgBaiDangMilestonesForUser(params: {
  userId: string;
  viewerId?: string | null;
  admin: ReturnType<typeof createServiceRoleClient>;
}): Promise<MilestoneItem[]> {
  const { userId, viewerId = null, admin } = params;

  const { data: tagRows } = await admin
    .from("org_bai_dang_tac_gia")
    .select("id_bai_dang, vai_tro, xu_ly_luc, che_do_hien_thi_journey")
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "accepted");

  if (!tagRows?.length) return [];

  const postIds = tagRows.map((r) => r.id_bai_dang as string);
  const roleByPost = new Map(
    tagRows.map((r) => [r.id_bai_dang as string, (r.vai_tro as string) || null]),
  );
  const acceptedAtByPost = new Map(
    tagRows.map((r) => [
      r.id_bai_dang as string,
      (r.xu_ly_luc as string | null) ?? null,
    ]),
  );
  const journeyVisByPost = new Map(
    tagRows.map((r) => [
      r.id_bai_dang as string,
      (r.che_do_hien_thi_journey as string | null) ?? "public",
    ]),
  );

  try {
    const { publishDueOrgBaiDang } = await import(
      "@/lib/truong/publish-due-org-bai-dang"
    );
    await publishDueOrgBaiDang();
  } catch {
    /* không chặn Journey nếu lazy publish lỗi */
  }

  const nowIso = new Date().toISOString();
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
    .lte("tao_luc", nowIso)
    .returns<OrgBaiDangTaggedRow[]>();

  if (!posts?.length) return [];

  const creditsMap = await loadOrgBaiDangCoAuthorCredits(
    posts.map((post) => post.id),
  );
  const socialMap = await loadOrgBaiDangSocialBatch(
    admin,
    posts.map((post) => post.id),
    viewerId,
  );

  const items: MilestoneItem[] = [];
  for (const post of posts) {
    const org = pickOrgEmbed(post.org_to_chuc);
    if (!org?.slug?.trim() || !org.ten?.trim()) continue;

    const dateObj = new Date(post.tao_luc);
    if (Number.isNaN(dateObj.getTime())) continue;

    const orgSlug = org.slug.trim();
    const orgName = org.ten.trim();
    const avatarId = org.avatar_id ?? org.logo_id;
    const avatarUrl = avatarId
      ? resolveTruongImageSrcSync(avatarId, ["public", "avatar"])
      : null;
    const blocks = parseBaiDangBlocks(post.noi_dung_blocks);
    const previewItems = milestonePreviewMedia(
      post.cover_id,
      parseServerBlocks(post.noi_dung_blocks),
      post.tieu_de,
    );
    const href = orgPublicHref(org.loai_to_chuc ?? "truong_dai_hoc", orgSlug);
    const myRole = roleByPost.get(post.id) ?? null;
    const acceptedAt = acceptedAtByPost.get(post.id) ?? null;

    items.push({
      id: `tagged:org:${post.id}`,
      cotMocId: post.id,
      variant: "verified",
      type: orgLoaiToMilestoneType(post.loai_bai_dang),
      visibility: mapForeignJourneyVisibilityToUi(
        journeyVisByPost.get(post.id),
      ),
      year: dateObj.getUTCFullYear(),
      month: dateObj.getUTCMonth() + 1,
      day: dateObj.getUTCDate(),
      createdAt: resolveTaggedTimelineSortAt(acceptedAt, post.tao_luc),
      title: post.tieu_de,
      body: post.tom_tat?.trim() || null,
      media: previewItems,
      noiDungBlocks: blocks,
      verifiedBy: `✓ ${orgName}`,
      orgBaiDangRef: {
        postId: post.id,
        orgId: post.id_to_chuc,
        orgSlug,
        orgName,
        orgKind: mapOrgKind(org.loai_to_chuc),
      },
      bookmark: {
        name: orgName,
        domain: orgSlug,
        url: href,
        initial: orgName.slice(0, 1).toUpperCase(),
        avatarUrl,
        sourceKind: mapOrgLoaiToBookmarkFrameKind(org.loai_to_chuc),
      },
      attribution: {
        name: orgName,
        role: myRole,
        slug: orgSlug,
        avatarUrl,
        initial: orgName.slice(0, 1).toUpperCase(),
        isOrg: true,
        orgKind: mapOrgKind(org.loai_to_chuc),
        href,
      },
      lensOwnerSlug: orgSlug,
      lensOwnerName: orgName,
      lensOwnerAvatarUrl: avatarUrl,
      orgHref: href,
      coAuthorCredits: creditsMap.get(post.id) ?? [],
      social: socialMap.get(post.id),
    });
  }

  return items.sort(compareTimelineOrder);
}

export type TaggedOrgBaiDangStub = {
  id: string;
  cotMocId: string;
  type: MilestoneItem["type"];
  thoiDiem: string;
  taoLuc: string;
  year: number;
  month: number;
  day: number;
};

/** Stub timeline — cùng nguồn với `fetchTaggedOrgBaiDangMilestonesForUser`. */
export async function collectTaggedOrgBaiDangStubs(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
): Promise<TaggedOrgBaiDangStub[]> {
  const { data: tagRows } = await admin
    .from("org_bai_dang_tac_gia")
    .select("id_bai_dang, xu_ly_luc")
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "accepted");

  if (!tagRows?.length) return [];

  const postIds = tagRows.map((r) => r.id_bai_dang as string);
  const acceptedAtByPost = new Map(
    tagRows.map((r) => [
      r.id_bai_dang as string,
      (r.xu_ly_luc as string | null) ?? null,
    ]),
  );

  const nowIso = new Date().toISOString();
  const { data: posts } = await admin
    .from("org_bai_dang")
    .select("id, loai_bai_dang, tao_luc")
    .in("id", postIds)
    .eq("trang_thai", "da_dang")
    .lte("tao_luc", nowIso)
    .returns<
      Array<{
        id: string;
        loai_bai_dang: string | null;
        tao_luc: string;
      }>
    >();

  const stubs: TaggedOrgBaiDangStub[] = [];
  for (const post of posts ?? []) {
    const dateObj = new Date(post.tao_luc);
    if (Number.isNaN(dateObj.getTime())) continue;
    stubs.push({
      id: `tagged:org:${post.id}`,
      cotMocId: post.id,
      type: orgLoaiToMilestoneType(post.loai_bai_dang),
      thoiDiem: post.tao_luc,
      taoLuc:
        resolveTaggedTimelineSortAt(
          acceptedAtByPost.get(post.id) ?? null,
          post.tao_luc,
        ) ?? post.tao_luc,
      year: dateObj.getUTCFullYear(),
      month: dateObj.getUTCMonth() + 1,
      day: dateObj.getUTCDate(),
    });
  }
  return stubs;
}
