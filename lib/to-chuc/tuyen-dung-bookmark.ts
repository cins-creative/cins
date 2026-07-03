import "server-only";

import type {
  MilestoneItem,
  MilestoneVariant,
} from "@/components/journey/milestone-types";
import { mapOrgLoaiToBookmarkFrameKind } from "@/lib/journey/bookmark-source-theme";
import { normalizeBookmarkPrivateNote } from "@/lib/journey/bookmark-private-note";
import { compareTimelineOrder } from "@/lib/journey/timeline-sort";
import { orgJobPath } from "@/lib/to-chuc/tuyen-dung-href";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const SOCIAL_LOAI_ORG_TUYEN_DUNG = "org_tuyen_dung";

/** Lưu 1 tin tuyển dụng về Journey (`social_luu`). */
export async function saveOrgTuyenDungBookmark(params: {
  jobId: string;
  viewerId: string;
  visibility?: string;
  ghiChuRieng?: string | null;
}): Promise<
  | { ok: true; bookmarked: true; count: number; visibility: "public" | "private" }
  | { ok: false; error: string; status: number }
> {
  const admin = createServiceRoleClient();
  const { data: job } = await admin
    .from("org_tuyen_dung")
    .select("id, trang_thai, da_xoa")
    .eq("id", params.jobId)
    .maybeSingle<{ id: string; trang_thai: string; da_xoa: boolean }>();

  if (!job || job.da_xoa) {
    return { ok: false, error: "Tin tuyển dụng không tồn tại.", status: 404 };
  }

  const visibility = params.visibility === "private" ? "private" : "public";
  const ghiChuRieng = normalizeBookmarkPrivateNote(params.ghiChuRieng);

  const { error } = await admin.from("social_luu").upsert(
    {
      id_nguoi_dung: params.viewerId,
      loai_doi_tuong: SOCIAL_LOAI_ORG_TUYEN_DUNG,
      id_doi_tuong: params.jobId,
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
    .eq("loai_doi_tuong", SOCIAL_LOAI_ORG_TUYEN_DUNG)
    .eq("id_doi_tuong", params.jobId);

  return { ok: true, bookmarked: true, count: count ?? 0, visibility };
}

type OrgEmbed = {
  slug: string;
  ten: string;
  loai_to_chuc: string | null;
  avatar_id: string | null;
  logo_id: string | null;
};

type JobBookmarkRow = {
  id: string;
  tieu_de: string;
  mo_ta_ngan: string | null;
  mo_ta: string | null;
  tao_luc: string | null;
  trang_thai: string | null;
  da_xoa: boolean | null;
  org_to_chuc: OrgEmbed | OrgEmbed[] | null;
};

function pickOrgEmbed(raw: OrgEmbed | OrgEmbed[] | null | undefined): OrgEmbed | null {
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

/** Cột mốc «Lưu về» trên Journey — tin tuyển dụng đã lưu (`social_luu`). */
export async function fetchBookmarkedOrgTuyenDungMilestones(params: {
  userId: string;
  admin: ReturnType<typeof createServiceRoleClient>;
}): Promise<MilestoneItem[]> {
  const { userId, admin } = params;

  const { data: savedRows } = await admin
    .from("social_luu")
    .select("id_doi_tuong, tao_luc")
    .eq("id_nguoi_dung", userId)
    .eq("loai_doi_tuong", SOCIAL_LOAI_ORG_TUYEN_DUNG)
    .returns<Array<{ id_doi_tuong: string; tao_luc: string }>>();

  const savedAtByJob = new Map(
    (savedRows ?? []).map((row) => [row.id_doi_tuong, row.tao_luc]),
  );
  const jobIds = [...savedAtByJob.keys()];
  if (jobIds.length === 0) return [];

  const { data: jobs } = await admin
    .from("org_tuyen_dung")
    .select(
      `
      id,
      tieu_de,
      mo_ta_ngan,
      mo_ta,
      tao_luc,
      trang_thai,
      da_xoa,
      org_to_chuc:id_to_chuc ( slug, ten, loai_to_chuc, avatar_id, logo_id )
    `,
    )
    .in("id", jobIds)
    .returns<JobBookmarkRow[]>();

  const items: MilestoneItem[] = [];
  for (const job of jobs ?? []) {
    if (job.da_xoa) continue;
    const org = pickOrgEmbed(job.org_to_chuc);
    if (!org?.slug?.trim() || !org.ten?.trim()) continue;

    const savedAt = savedAtByJob.get(job.id) ?? job.tao_luc ?? null;
    const dateIso = savedAt ?? new Date().toISOString();
    const dateObj = new Date(dateIso);
    if (Number.isNaN(dateObj.getTime())) continue;

    const avatarId = org.avatar_id ?? org.logo_id;
    const avatarUrl = avatarId
      ? resolveTruongImageSrcSync(avatarId, ["public", "avatar"])
      : null;
    const orgSlug = org.slug.trim();
    const jobHref = orgJobPath(org.loai_to_chuc, orgSlug, job.id);

    items.push({
      id: `bookmark:tuyen-dung:${job.id}`,
      variant: "bookmark" as MilestoneVariant,
      type: "lam",
      visibility: "public",
      year: dateObj.getUTCFullYear(),
      month: dateObj.getUTCMonth() + 1,
      day: dateObj.getUTCDate(),
      createdAt: savedAt,
      bookmarkSavedAt: savedAt,
      title: job.tieu_de,
      body: job.mo_ta_ngan?.trim() || job.mo_ta?.trim() || null,
      bookmark: {
        name: org.ten.trim(),
        domain: orgSlug,
        url: jobHref,
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
