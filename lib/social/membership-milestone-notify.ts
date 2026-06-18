import "server-only";

import type { MembershipMilestoneOrgLoai } from "@/lib/journey/membership-milestone-types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { insertSocialThongBao } from "@/lib/social/thong-bao-insert";
import { truongRootPath } from "@/lib/truong/truong-routes";

import type { MembershipMilestoneResolvedNotification } from "@/lib/social/types";

export const MEMBERSHIP_MILESTONE_APPROVED_LOAI =
  "membership_milestone_approved" as const;
export const MEMBERSHIP_MILESTONE_REJECTED_LOAI =
  "membership_milestone_rejected" as const;

type NotifyPayload = {
  orgTen: string;
  orgSlug: string;
  orgLoai: MembershipMilestoneOrgLoai;
  milestoneTitle: string;
  journeyHref: string;
  action: "approved" | "rejected";
};

function orgPublicHref(
  loai: MembershipMilestoneOrgLoai,
  slug: string,
): string | null {
  if (loai === "co_so_dao_tao") return `/co-so/${encodeURIComponent(slug)}`;
  if (loai === "truong_dai_hoc") return truongRootPath(slug);
  if (loai === "studio") return `/studio/${encodeURIComponent(slug)}`;
  return null;
}

function parseNotifyPayload(raw: string | null | undefined): NotifyPayload | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as NotifyPayload;
    if (!parsed?.orgTen || !parsed?.milestoneTitle || !parsed?.journeyHref) {
      return null;
    }
    if (parsed.action !== "approved" && parsed.action !== "rejected") return null;
    return parsed;
  } catch {
    return null;
  }
}

function loaiFromAction(action: NotifyPayload["action"]): string {
  return action === "approved"
    ? MEMBERSHIP_MILESTONE_APPROVED_LOAI
    : MEMBERSHIP_MILESTONE_REJECTED_LOAI;
}

export async function notifyMembershipMilestoneResolved(params: {
  studentId: string;
  studentSlug: string;
  cotMocId: string;
  requestId: string;
  action: "approved" | "rejected";
  orgTen: string;
  orgSlug: string;
  orgLoai: MembershipMilestoneOrgLoai;
  milestoneTitle: string;
}): Promise<void> {
  const admin = createServiceRoleClient();
  const loaiDoiTuong = loaiFromAction(params.action);

  const { data: existing } = await admin
    .from("social_thong_bao")
    .select("id")
    .eq("nguoi_nhan", params.studentId)
    .eq("loai_doi_tuong", loaiDoiTuong)
    .eq("id_doi_tuong", params.cotMocId)
    .maybeSingle();

  if (existing?.id) return;

  const body: NotifyPayload = {
    orgTen: params.orgTen,
    orgSlug: params.orgSlug,
    orgLoai: params.orgLoai,
    milestoneTitle: params.milestoneTitle,
    journeyHref: `/${encodeURIComponent(params.studentSlug)}`,
    action: params.action,
  };

  const result = await insertSocialThongBao(admin, {
    nguoi_nhan: params.studentId,
    loai: "thong_tin",
    noi_dung: JSON.stringify(body),
    loai_doi_tuong: loaiDoiTuong,
    id_doi_tuong: params.cotMocId,
    noi_dung_ai: params.requestId,
  });

  if (!result.ok) {
    console.error("[notifyMembershipMilestoneResolved]", result.error);
  }
}

export async function listMembershipMilestoneResolvedNotifications(
  viewerId: string,
  options: { unreadOnly?: boolean; historyOnly?: boolean; limit?: number } = {},
): Promise<MembershipMilestoneResolvedNotification[]> {
  const rowLimit = options.limit ?? 10;
  const admin = createServiceRoleClient();
  let query = admin
    .from("social_thong_bao")
    .select("id, id_doi_tuong, loai_doi_tuong, noi_dung, tao_luc, da_doc")
    .eq("nguoi_nhan", viewerId)
    .in("loai_doi_tuong", [
      MEMBERSHIP_MILESTONE_APPROVED_LOAI,
      MEMBERSHIP_MILESTONE_REJECTED_LOAI,
    ])
    .order("tao_luc", { ascending: false })
    .limit(rowLimit);

  if (options.unreadOnly) {
    query = query.eq("da_doc", false);
  } else if (options.historyOnly) {
    query = query.eq("da_doc", true);
  }

  const { data: rows } = await query;
  if (!rows?.length) return [];

  const items: MembershipMilestoneResolvedNotification[] = [];
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
      orgHref: orgPublicHref(parsed.orgLoai, parsed.orgSlug),
      milestoneTitle: parsed.milestoneTitle,
      journeyHref: parsed.journeyHref,
      action: parsed.action,
      taoLuc: (row.tao_luc as string | null) ?? undefined,
      daDoc: Boolean(row.da_doc),
    });
  }
  return items;
}
