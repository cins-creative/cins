import "server-only";

import { getProfileCoverUrl } from "@/lib/journey/profile";
import { orgPublicHref } from "@/lib/search/helpers";
import type { OrgFollowSuggestion } from "@/lib/cins/home-adaptive/suggestions-display";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { labelTinhThanh } from "@/lib/truong/contact";

type JobOrgEmbed = {
  id: string;
  slug: string | null;
  ten: string | null;
  loai_to_chuc: string | null;
  avatar_id: string | null;
  logo_id: string | null;
  cover_id: string | null;
  mo_ta: string | null;
  tinh_thanh: string | null;
  trang_thai_hoat_dong: string | null;
};

type JobRow = {
  id: string;
  tao_luc: string | null;
  org_to_chuc: JobOrgEmbed | JobOrgEmbed[] | null;
};

function pickOrg(org: JobRow["org_to_chuc"]): JobOrgEmbed | null {
  if (!org) return null;
  return Array.isArray(org) ? (org[0] ?? null) : org;
}

/**
 * Studio / doanh nghiệp đang có tin tuyển dụng mở — module `goi_y_studio`.
 * Gom theo org, ưu tiên nhiều tin + mới đăng.
 */
export async function loadStudiosDangTuyen(
  limit = 3,
): Promise<OrgFollowSuggestion[]> {
  const admin = createServiceRoleClient();
  try {
    const { data, error } = await admin
      .from("org_tuyen_dung")
      .select(
        "id, tao_luc, org_to_chuc:org_to_chuc!inner(id, slug, ten, loai_to_chuc, avatar_id, logo_id, cover_id, mo_ta, tinh_thanh, trang_thai_hoat_dong)",
      )
      .eq("da_xoa", false)
      .eq("trang_thai", "dang_mo")
      .order("tao_luc", { ascending: false })
      .limit(Math.max(limit * 12, 36))
      .returns<JobRow[]>();

    if (error || !data?.length) return [];

    const byOrg = new Map<
      string,
      { org: JobOrgEmbed; jobCount: number; latestAt: number }
    >();

    for (const row of data) {
      const org = pickOrg(row.org_to_chuc);
      if (!org?.id || !org.slug?.trim() || !org.ten?.trim()) continue;
      if (org.trang_thai_hoat_dong === "da_dong_cua") continue;
      const loai = org.loai_to_chuc ?? "";
      if (loai !== "studio" && loai !== "doanh_nghiep") continue;

      const t = row.tao_luc ? Date.parse(row.tao_luc) : 0;
      const cur = byOrg.get(org.id);
      if (!cur) {
        byOrg.set(org.id, { org, jobCount: 1, latestAt: t || 0 });
      } else {
        cur.jobCount += 1;
        if (t > cur.latestAt) cur.latestAt = t;
      }
    }

    const ranked = [...byOrg.values()].sort(
      (a, b) =>
        b.jobCount - a.jobCount || b.latestAt - a.latestAt || a.org.ten!.localeCompare(b.org.ten!, "vi"),
    );

    return ranked.slice(0, limit).map(({ org, jobCount }) => {
      const slug = org.slug as string;
      const avatarId = org.avatar_id ?? org.logo_id;
      const location = labelTinhThanh(org.tinh_thanh) || null;
      return {
        id: org.id,
        slug,
        name: (org.ten as string).trim(),
        avatarUrl: avatarId
          ? resolveTruongImageSrcSync(avatarId, ["public", "avatar"])
          : null,
        coverUrl: getProfileCoverUrl(org.cover_id),
        bio: null,
        location,
        loaiToChuc: org.loai_to_chuc ?? "studio",
        href: orgPublicHref(org.loai_to_chuc ?? "studio", slug),
        mutualCount: 0,
        reason:
          jobCount === 1
            ? "1 tin đang mở"
            : `${jobCount} tin đang mở`,
      };
    });
  } catch {
    return [];
  }
}
