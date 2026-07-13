import "server-only";

import type { OrgMilestoneTagPayload } from "@/lib/journey/org-milestone-tag-types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";
import { orgPublicHref } from "@/lib/search/helpers";

import type { OrgMilestoneTagApprovedNotification } from "@/lib/social/types";

export const ORG_MILESTONE_TAG_APPROVED_LOAI = "org_milestone_tag_approved" as const;

function orgPublicPath(
  loai: OrgMilestoneTagPayload["orgLoai"],
  slug: string,
): string {
  return orgPublicHref(loai, slug);
}

type NotifyPayload = {
  orgTen: string;
  orgSlug: string;
  orgLoai: OrgMilestoneTagPayload["orgLoai"];
  milestoneTitle: string;
  albumHref: string;
};

function parseNotifyPayload(raw: string | null | undefined): NotifyPayload | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as NotifyPayload;
    if (!parsed?.orgTen || !parsed?.milestoneTitle) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function notifyOrgMilestoneTagApproved(params: {
  studentId: string;
  cotMocId: string;
  requestId: string;
  payload: OrgMilestoneTagPayload;
}): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("social_thong_bao")
    .select("id")
    .eq("nguoi_nhan", params.studentId)
    .eq("loai_doi_tuong", ORG_MILESTONE_TAG_APPROVED_LOAI)
    .eq("id_doi_tuong", params.cotMocId)
    .maybeSingle();

  if (existing?.id) return;

  const body: NotifyPayload = {
    orgTen: params.payload.orgTen,
    orgSlug: params.payload.orgSlug,
    orgLoai: params.payload.orgLoai,
    milestoneTitle: params.payload.milestoneTitle,
    albumHref: params.payload.album.href,
  };

  const result = await insertSocialThongBao(admin, {
    nguoi_nhan: params.studentId,
    loai: "thong_tin",
    noi_dung: JSON.stringify(body),
    loai_doi_tuong: ORG_MILESTONE_TAG_APPROVED_LOAI,
    id_doi_tuong: params.cotMocId,
    noi_dung_ai: params.requestId,
  });

  if (!result.ok) {
    console.error("[notifyOrgMilestoneTagApproved]", result.error);
  }
}

export async function listOrgMilestoneTagApprovedNotifications(
  viewerId: string,
  options: { unreadOnly?: boolean; historyOnly?: boolean; limit?: number } = {},
): Promise<OrgMilestoneTagApprovedNotification[]> {
  const rowLimit = options.limit ?? 10;
  const admin = createServiceRoleClient();
  let query = admin
    .from("social_thong_bao")
    .select("id, id_doi_tuong, noi_dung, tao_luc, da_doc")
    .eq("nguoi_nhan", viewerId)
    .eq("loai_doi_tuong", ORG_MILESTONE_TAG_APPROVED_LOAI)
    .order("tao_luc", { ascending: false })
    .limit(rowLimit);

  if (options.unreadOnly) {
    query = query.eq("da_doc", false);
  } else if (options.historyOnly) {
    query = query.eq("da_doc", true);
  }

  const { data: rows } = await query;
  if (!rows?.length) return [];

  const items: OrgMilestoneTagApprovedNotification[] = [];
  for (const row of rows) {
    const cotMocId = row.id_doi_tuong as string | null;
    if (!cotMocId) continue;
    const parsed = parseNotifyPayload(row.noi_dung as string | null);
    if (!parsed) continue;
    items.push({
      notificationId: row.id as string,
      cotMocId,
      orgTen: parsed.orgTen,
      orgSlug: parsed.orgSlug,
      orgLoai: parsed.orgLoai,
      orgHref: orgPublicPath(parsed.orgLoai, parsed.orgSlug),
      milestoneTitle: parsed.milestoneTitle,
      albumHref: parsed.albumHref,
      taoLuc: (row.tao_luc as string | null) ?? undefined,
      daDoc: Boolean(row.da_doc),
    });
  }
  return items;
}
