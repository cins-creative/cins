import "server-only";

import { loadCongDongStatsByOrgIds } from "@/lib/cong-dong/stats";
import { getAvatarUrl, getProfileCoverUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { commentVaiTroLabel } from "@/lib/social/comments/vai-tro-label";
import { truongRootPath } from "@/lib/truong/truong-routes";

export type UserOrgMembershipItem = {
  id: string;
  vaiTro: string;
  vaiTroLabel: string;
  tuNgay: string;
  org: {
    id: string;
    slug: string;
    ten: string;
    loaiToChuc: string;
    loaiLabel: string;
    avatarUrl: string | null;
    coverUrl: string | null;
    moTa: string | null;
    memberCount?: number;
    postCount?: number;
    href: string | null;
  };
};

export type UserOrganizationsPageResult = {
  memberships: UserOrgMembershipItem[];
  totalCount: number;
};

const LOAI_TO_CHUC_LABEL: Record<string, string> = {
  truong_dai_hoc: "Trường đại học",
  co_so_dao_tao: "Cơ sở đào tạo",
  studio: "Studio",
  cong_dong: "Cộng đồng",
  doanh_nghiep: "Doanh nghiệp",
};

type MembershipRow = {
  id: string;
  vai_tro: string;
  tu_ngay: string;
  org_to_chuc:
    | {
        id: string;
        slug: string;
        ten: string;
        loai_to_chuc: string;
        avatar_id: string | null;
        cover_id: string | null;
        mo_ta: string | null;
        trang_thai_hoat_dong: string;
      }
    | {
        id: string;
        slug: string;
        ten: string;
        loai_to_chuc: string;
        avatar_id: string | null;
        cover_id: string | null;
        mo_ta: string | null;
        trang_thai_hoat_dong: string;
      }[]
    | null;
};

function orgPublicHref(org: {
  slug: string;
  loai_to_chuc: string;
}): string | null {
  if (org.loai_to_chuc === "cong_dong") {
    return `/cong-dong/${encodeURIComponent(org.slug)}`;
  }
  if (org.loai_to_chuc === "co_so_dao_tao") {
    return `/co-so/${encodeURIComponent(org.slug)}`;
  }
  if (org.loai_to_chuc === "truong_dai_hoc") {
    return truongRootPath(org.slug);
  }
  return null;
}

function loaiToChucLabel(loai: string): string {
  return LOAI_TO_CHUC_LABEL[loai] ?? loai.replace(/_/g, " ");
}

function mapMembershipRow(row: MembershipRow): UserOrgMembershipItem | null {
  const orgRaw = row.org_to_chuc;
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
  if (!org?.slug || org.trang_thai_hoat_dong !== "dang_hoat_dong") return null;

  return {
    id: row.id,
    vaiTro: row.vai_tro,
    vaiTroLabel: commentVaiTroLabel(row.vai_tro),
    tuNgay: row.tu_ngay,
    org: {
      id: org.id,
      slug: org.slug,
      ten: org.ten,
      loaiToChuc: org.loai_to_chuc,
      loaiLabel: loaiToChucLabel(org.loai_to_chuc),
      avatarUrl: getAvatarUrl(org.avatar_id),
      coverUrl: getProfileCoverUrl(org.cover_id) ?? null,
      moTa: org.mo_ta?.trim() || null,
      href: orgPublicHref(org),
    },
  };
}

function attachCongDongStats(
  memberships: UserOrgMembershipItem[],
  stats: Map<string, { memberCount: number; postCount: number }>,
): UserOrgMembershipItem[] {
  return memberships.map((item) => {
    if (item.org.loaiToChuc !== "cong_dong") return item;
    const orgStats = stats.get(item.org.id);
    if (!orgStats) return item;
    return {
      ...item,
      org: {
        ...item.org,
        memberCount: orgStats.memberCount,
        postCount: orgStats.postCount,
      },
    };
  });
}

export async function countUserOrganizations(userId: string): Promise<number> {
  const page = await fetchUserOrganizationsPage(userId);
  return page.totalCount;
}

export async function fetchUserOrganizationsPage(
  userId: string,
): Promise<UserOrganizationsPageResult> {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_thanh_vien_to_chuc")
    .select(
      "id, vai_tro, tu_ngay, org_to_chuc: id_to_chuc ( id, slug, ten, loai_to_chuc, avatar_id, cover_id, mo_ta, trang_thai_hoat_dong )",
    )
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "active")
    .order("tu_ngay", { ascending: false })
    .returns<MembershipRow[]>();

  if (error) {
    return { memberships: [], totalCount: 0 };
  }

  const memberships = (data ?? [])
    .map(mapMembershipRow)
    .filter((item): item is UserOrgMembershipItem => item !== null);

  const congDongOrgIds = memberships
    .filter((item) => item.org.loaiToChuc === "cong_dong")
    .map((item) => item.org.id);
  const congDongStats = await loadCongDongStatsByOrgIds(congDongOrgIds);
  const enriched = attachCongDongStats(memberships, congDongStats);

  return {
    memberships: enriched,
    totalCount: enriched.length,
  };
}
