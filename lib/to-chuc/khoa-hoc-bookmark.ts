import "server-only";

import type {
  MilestoneItem,
  MilestoneVariant,
} from "@/components/journey/milestone-types";
import { buildKhoaHocBookmarkListing } from "@/lib/journey/bookmark-listing-builders";
import { mapOrgLoaiToBookmarkFrameKind } from "@/lib/journey/bookmark-source-theme";
import { normalizeBookmarkPrivateNote } from "@/lib/journey/bookmark-private-note";
import { compareTimelineOrder } from "@/lib/journey/timeline-sort";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const SOCIAL_LOAI_ORG_KHOA_HOC = "org_khoa_hoc";

/** Lưu khóa học về Journey (`social_luu`). */
export async function saveOrgKhoaHocBookmark(params: {
  khoaHocId: string;
  viewerId: string;
  visibility?: string;
  ghiChuRieng?: string | null;
}): Promise<
  | { ok: true; bookmarked: true; count: number; visibility: "public" | "private" }
  | { ok: false; error: string; status: number }
> {
  const admin = createServiceRoleClient();
  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id, trang_thai_khoa_hoc")
    .eq("id", params.khoaHocId)
    .maybeSingle<{ id: string; trang_thai_khoa_hoc: string | null }>();

  if (!khoa) {
    return { ok: false, error: "Khóa học không tồn tại.", status: 404 };
  }

  const visibility = params.visibility === "private" ? "private" : "public";
  const ghiChuRieng = normalizeBookmarkPrivateNote(params.ghiChuRieng);

  const { error } = await admin.from("social_luu").upsert(
    {
      id_nguoi_dung: params.viewerId,
      loai_doi_tuong: SOCIAL_LOAI_ORG_KHOA_HOC,
      id_doi_tuong: params.khoaHocId,
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
    .eq("loai_doi_tuong", SOCIAL_LOAI_ORG_KHOA_HOC)
    .eq("id_doi_tuong", params.khoaHocId);

  return { ok: true, bookmarked: true, count: count ?? 0, visibility };
}

type OrgEmbed = {
  slug: string;
  ten: string;
  loai_to_chuc: string | null;
  avatar_id: string | null;
  logo_id: string | null;
};

type KhoaBookmarkRow = {
  id: string;
  slug: string;
  ten_khoa_hoc: string;
  mo_ta: string | null;
  trinh_do_dau_vao: string | null;
  hoc_phi: number | null;
  avatar_id: string | null;
  cover_id: string | null;
  org_to_chuc: OrgEmbed | OrgEmbed[] | null;
};

function pickOrgEmbed(raw: OrgEmbed | OrgEmbed[] | null | undefined): OrgEmbed | null {
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

/** Cột mốc «Lưu về» — khóa học đã lưu. */
export async function fetchBookmarkedOrgKhoaHocMilestones(params: {
  userId: string;
  admin: ReturnType<typeof createServiceRoleClient>;
}): Promise<MilestoneItem[]> {
  const { userId, admin } = params;

  const { data: savedRows } = await admin
    .from("social_luu")
    .select("id_doi_tuong, tao_luc")
    .eq("id_nguoi_dung", userId)
    .eq("loai_doi_tuong", SOCIAL_LOAI_ORG_KHOA_HOC)
    .returns<Array<{ id_doi_tuong: string; tao_luc: string }>>();

  const savedAtByKhoa = new Map(
    (savedRows ?? []).map((row) => [row.id_doi_tuong, row.tao_luc]),
  );
  const khoaIds = [...savedAtByKhoa.keys()];
  if (khoaIds.length === 0) return [];

  const { data: rows } = await admin
    .from("org_khoa_hoc")
    .select(
      `
      id,
      slug,
      ten_khoa_hoc,
      mo_ta,
      trinh_do_dau_vao,
      hoc_phi,
      avatar_id,
      cover_id,
      org_to_chuc:id_to_chuc ( slug, ten, loai_to_chuc, avatar_id, logo_id )
    `,
    )
    .in("id", khoaIds)
    .returns<KhoaBookmarkRow[]>();

  const items: MilestoneItem[] = [];
  for (const row of rows ?? []) {
    const org = pickOrgEmbed(row.org_to_chuc);
    if (!org?.slug?.trim() || !org.ten?.trim()) continue;

    const savedAt = savedAtByKhoa.get(row.id) ?? null;
    const dateIso = savedAt ?? new Date().toISOString();
    const dateObj = new Date(dateIso);
    if (Number.isNaN(dateObj.getTime())) continue;

    const avatarId = org.avatar_id ?? org.logo_id;
    const avatarUrl = avatarId
      ? resolveTruongImageSrcSync(avatarId, ["public", "avatar"])
      : null;
    const orgSlug = org.slug.trim();
    const bookmarkListing = buildKhoaHocBookmarkListing({
      ...row,
      org_to_chuc: org,
    });
    const href = bookmarkListing?.href ?? `/co-so-dao-tao/${orgSlug}/khoa-hoc/${row.slug}`;

    items.push({
      id: `bookmark:khoa-hoc:${row.id}`,
      variant: "bookmark" as MilestoneVariant,
      type: "hoc",
      visibility: "public",
      year: dateObj.getUTCFullYear(),
      month: dateObj.getUTCMonth() + 1,
      day: dateObj.getUTCDate(),
      createdAt: savedAt,
      bookmarkSavedAt: savedAt,
      title: row.ten_khoa_hoc,
      body: bookmarkListing?.snippet ?? row.mo_ta?.trim() ?? null,
      bookmarkListing,
      bookmark: {
        name: org.ten.trim(),
        domain: orgSlug,
        url: href,
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
