import "server-only";

import type { MilestoneAttribution } from "@/components/journey/milestone-types";
import { getCoverUrl } from "@/lib/articles/cover";
import { loadCongDongStatsByOrgIds } from "@/lib/cong-dong/stats";
import { getAvatarUrl } from "@/lib/journey/profile";
import { parseMembershipMilestonePayload } from "@/lib/journey/membership-milestone";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { orgPublicHref as buildOrgPublicHref } from "@/lib/search/helpers";

export type VerifiedMilestoneMeta = {
  verifiedBy: string;
  attribution: MilestoneAttribution;
  orgHref: string | null;
};

type VerifyRow = {
  id_cot_moc: string;
  loai_nguoi_xac_nhan: string;
  id_nguoi_xac_nhan: string | null;
  trang_thai: string;
};

type CotMocContextRow = {
  id: string;
  id_to_chuc: string | null;
};

type OrgRow = {
  id: string;
  ten: string;
  slug: string;
  loai_to_chuc: string;
  avatar_id: string | null;
  cover_id: string | null;
};

function orgPublicHref(org: OrgRow): string | null {
  if (
    org.loai_to_chuc === "cong_dong" ||
    org.loai_to_chuc === "co_so_dao_tao" ||
    org.loai_to_chuc === "studio" ||
    org.loai_to_chuc === "truong_dai_hoc" ||
    org.loai_to_chuc === "doanh_nghiep"
  ) {
    return buildOrgPublicHref(org.loai_to_chuc, org.slug);
  }
  return null;
}

export async function loadVerifiedMetaForCotMocs(
  cotMocIds: string[],
  cotMocOrgById?: Map<string, string | null>,
): Promise<Map<string, VerifiedMilestoneMeta>> {
  const out = new Map<string, VerifiedMilestoneMeta>();
  if (cotMocIds.length === 0) return out;

  const admin = createServiceRoleClient();
  const { data: verifyRows } = await admin
    .from("verify_xac_nhan")
    .select("id_cot_moc, loai_nguoi_xac_nhan, id_nguoi_xac_nhan, trang_thai")
    .in("id_cot_moc", cotMocIds)
    .eq("trang_thai", "da_xac_nhan")
    .returns<VerifyRow[]>();

  if (!verifyRows?.length) return out;

  const membershipApprovedIds = new Set<string>();
  const { data: membershipRows } = await admin
    .from("verify_yeu_cau")
    .select("id_cot_moc, noi_dung, trang_thai")
    .in("id_cot_moc", cotMocIds)
    .eq("trang_thai", "da_duyet")
    .returns<Array<{ id_cot_moc: string; noi_dung: string | null }>>();

  for (const row of membershipRows ?? []) {
    if (parseMembershipMilestonePayload(row.noi_dung)) {
      membershipApprovedIds.add(row.id_cot_moc);
    }
  }

  let orgByCotMoc = cotMocOrgById;
  if (!orgByCotMoc) {
    const { data: cotRows } = await admin
      .from("content_cot_moc")
      .select("id, id_to_chuc")
      .in("id", cotMocIds)
      .returns<CotMocContextRow[]>();
    orgByCotMoc = new Map(
      (cotRows ?? []).map((r) => [r.id, r.id_to_chuc]),
    );
  }

  const orgIds = new Set<string>();
  for (const row of verifyRows) {
    const ctxOrg = orgByCotMoc.get(row.id_cot_moc);
    if (ctxOrg) orgIds.add(ctxOrg);
  }

  const orgById = new Map<string, OrgRow>();
  if (orgIds.size > 0) {
    const { data: orgs } = await admin
      .from("org_to_chuc")
      .select("id, ten, slug, loai_to_chuc, avatar_id, cover_id")
      .in("id", [...orgIds])
      .returns<OrgRow[]>();
    for (const org of orgs ?? []) orgById.set(org.id, org);
  }

  const congDongOrgIds = [...orgById.values()]
    .filter((org) => org.loai_to_chuc === "cong_dong")
    .map((org) => org.id);
  const congDongStats = await loadCongDongStatsByOrgIds(congDongOrgIds);

  for (const row of verifyRows) {
    const ctxOrgId = orgByCotMoc.get(row.id_cot_moc);
    const org = ctxOrgId ? orgById.get(ctxOrgId) : undefined;

    if (org?.loai_to_chuc === "cong_dong") {
      const avatarUrl = getAvatarUrl(org.avatar_id);
      const coverUrl = getCoverUrl(org.cover_id);
      const stats = congDongStats.get(org.id);
      out.set(row.id_cot_moc, {
        verifiedBy: `✓ ${org.ten}`,
        attribution: {
          name: org.ten,
          role: "Người tạo cộng đồng",
          avatarUrl,
          coverUrl,
          initial: org.ten.charAt(0).toUpperCase(),
          slug: org.slug,
          isOrg: true,
          orgKind: "cong_dong",
          href: orgPublicHref(org),
          memberCount: stats?.memberCount ?? 0,
          postCount: stats?.postCount ?? 0,
        },
        orgHref: orgPublicHref(org),
      });
      continue;
    }

    if (org?.loai_to_chuc === "co_so_dao_tao") {
      const avatarUrl = getAvatarUrl(org.avatar_id);
      const coverUrl = getCoverUrl(org.cover_id);
      const isMembership = membershipApprovedIds.has(row.id_cot_moc);
      out.set(row.id_cot_moc, {
        verifiedBy: `✓ ${org.ten}`,
        attribution: {
          name: org.ten,
          role: isMembership ? "Xác nhận bởi tổ chức" : "Người tạo cơ sở đào tạo",
          avatarUrl,
          coverUrl: isMembership ? null : coverUrl,
          initial: org.ten.charAt(0).toUpperCase(),
          slug: org.slug,
          isOrg: true,
          orgKind: "co_so_dao_tao",
          href: orgPublicHref(org),
        },
        orgHref: orgPublicHref(org),
      });
      continue;
    }

    if (org?.loai_to_chuc === "studio") {
      const avatarUrl = getAvatarUrl(org.avatar_id);
      const coverUrl = getCoverUrl(org.cover_id);
      const isMembership = membershipApprovedIds.has(row.id_cot_moc);
      out.set(row.id_cot_moc, {
        verifiedBy: `✓ ${org.ten}`,
        attribution: {
          name: org.ten,
          role: isMembership ? "Xác nhận bởi tổ chức" : "Người tạo studio",
          avatarUrl,
          coverUrl: isMembership ? null : coverUrl,
          initial: org.ten.charAt(0).toUpperCase(),
          slug: org.slug,
          isOrg: true,
          orgKind: "studio",
          href: orgPublicHref(org),
        },
        orgHref: orgPublicHref(org),
      });
      continue;
    }

    if (org) {
      const avatarUrl = getAvatarUrl(org.avatar_id);
      out.set(row.id_cot_moc, {
        verifiedBy: `✓ ${org.ten}`,
        attribution: {
          name: org.ten,
          role: "Xác nhận bởi tổ chức",
          avatarUrl,
          initial: org.ten.charAt(0).toUpperCase(),
          slug: org.slug,
          isOrg: true,
          orgKind: org.loai_to_chuc === "truong_dai_hoc" ? "truong" : null,
          href: orgPublicHref(org),
        },
        orgHref: orgPublicHref(org),
      });
    }
  }

  return out;
}

export type VerifySummary = {
  cotMocId: string;
  count: number;
  verifier: {
    name: string;
    avatarUrl: string | null;
    role: string | null;
    href: string | null;
    isOrg: boolean;
  } | null;
};

/** Tóm tắt xác thực cho 1 cột mốc — tooltip badge gallery (ai + avatar + tổng số). */
export async function loadVerifySummaryForCotMoc(
  cotMocId: string,
): Promise<VerifySummary | null> {
  if (!cotMocId) return null;
  const admin = createServiceRoleClient();

  const { count } = await admin
    .from("verify_xac_nhan")
    .select("id", { count: "exact", head: true })
    .eq("id_cot_moc", cotMocId)
    .eq("trang_thai", "da_xac_nhan");

  const total = count ?? 0;
  if (total === 0) return { cotMocId, count: 0, verifier: null };

  const metaMap = await loadVerifiedMetaForCotMocs([cotMocId]);
  const meta = metaMap.get(cotMocId);
  if (!meta) {
    return { cotMocId, count: total, verifier: null };
  }

  return {
    cotMocId,
    count: total,
    verifier: {
      name: meta.attribution.name,
      avatarUrl: meta.attribution.avatarUrl ?? null,
      role: meta.attribution.role ?? null,
      href: meta.orgHref,
      isOrg: meta.attribution.isOrg ?? false,
    },
  };
}

export async function loadVerifiedCotMocIdSet(
  cotMocIds: string[],
): Promise<Set<string>> {
  if (cotMocIds.length === 0) return new Set();
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("verify_xac_nhan")
    .select("id_cot_moc")
    .in("id_cot_moc", cotMocIds)
    .eq("trang_thai", "da_xac_nhan")
    .returns<Array<{ id_cot_moc: string }>>();
  return new Set((data ?? []).map((r) => r.id_cot_moc));
}
