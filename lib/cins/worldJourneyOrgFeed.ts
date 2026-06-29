import "server-only";

import type { MilestoneItem } from "@/components/journey/milestone-types";
import { milestonePreviewMedia } from "@/lib/journey/milestone-preview-media";
import { parseServerBlocks } from "@/lib/journey/parse-server-blocks";
import { mapOrgLoaiToBookmarkFrameKind } from "@/lib/journey/bookmark-source-theme";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { orgLoaiToMilestoneType } from "@/lib/truong/org-bai-dang-bookmark";
import { parseBaiDangBlocks } from "@/lib/truong/bai-dang-blocks";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { truongRootPath } from "@/lib/truong/truong-routes";

type OrgEmbed = {
  slug: string | null;
  ten: string | null;
  loai_to_chuc: string | null;
  avatar_id: string | null;
  logo_id: string | null;
};

type OrgPostRow = {
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

function pickOrg(org: OrgPostRow["org_to_chuc"]): OrgEmbed | null {
  if (!org) return null;
  return Array.isArray(org) ? (org[0] ?? null) : org;
}

function orgPublicHref(org: OrgEmbed): string {
  const slug = org.slug?.trim();
  if (!slug) return "/";
  if (org.loai_to_chuc === "co_so_dao_tao") return `/co-so/${slug}`;
  if (org.loai_to_chuc === "cong_dong") return `/cong-dong/${slug}`;
  return truongRootPath(slug);
}

/** Org đang theo dõi (`loai_doi_tuong='to_chuc'`). */
export async function listFollowingOrgIds(viewerId: string): Promise<string[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_theo_doi")
    .select("id_doi_tuong")
    .eq("id_nguoi_theo_doi", viewerId)
    .eq("loai_doi_tuong", "to_chuc")
    .returns<Array<{ id_doi_tuong: string }>>();

  return (data ?? []).map((row) => row.id_doi_tuong);
}

/** `org_bai_dang` đã đăng từ org đang follow → `MilestoneItem` cho feed giữa. */
export async function fetchFollowedOrgBaiDangMilestones(
  orgIds: string[],
  limit = 30,
): Promise<MilestoneItem[]> {
  if (orgIds.length === 0) return [];

  const admin = createServiceRoleClient();
  const { data } = await admin
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
    .in("id_to_chuc", orgIds)
    .eq("trang_thai", "da_dang")
    .order("tao_luc", { ascending: false })
    .limit(limit)
    .returns<OrgPostRow[]>();

  const items: MilestoneItem[] = [];
  for (const post of data ?? []) {
    const org = pickOrg(post.org_to_chuc);
    if (!org?.slug?.trim() || !org.ten?.trim()) continue;

    const dateObj = new Date(post.tao_luc);
    if (Number.isNaN(dateObj.getTime())) continue;

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
    const orgSlug = org.slug.trim();
    const orgName = org.ten.trim();
    const href = orgPublicHref(org);

    items.push({
      id: `org-post:${post.id}`,
      cotMocId: post.id,
      variant: "tagged",
      type: orgLoaiToMilestoneType(post.loai_bai_dang),
      visibility: "public",
      year: dateObj.getUTCFullYear(),
      month: dateObj.getUTCMonth() + 1,
      day: dateObj.getUTCDate(),
      createdAt: post.tao_luc,
      title: post.tieu_de,
      body: post.tom_tat?.trim() || null,
      media: previewItems,
      noiDungBlocks: blocks,
      orgBaiDangRef: {
        postId: post.id,
        orgSlug,
        orgName,
      },
      attribution: {
        name: orgName,
        role: "Tổ chức",
        avatarUrl,
        initial: orgName.slice(0, 1).toUpperCase(),
        slug: orgSlug,
        isOrg: true,
        orgKind:
          org.loai_to_chuc === "cong_dong"
            ? "cong_dong"
            : org.loai_to_chuc === "co_so_dao_tao"
              ? "co_so_dao_tao"
              : "truong",
        href,
      },
      lensOwnerSlug: orgSlug,
      lensOwnerName: orgName,
      lensOwnerAvatarUrl: avatarUrl,
      orgHref: href,
    });
  }

  return items;
}
