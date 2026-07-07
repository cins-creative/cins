import "server-only";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import {
  CONG_DONG_CHE_DO,
} from "@/lib/cong-dong/constants";
import type { CongDongCheDo } from "@/lib/cong-dong/constants";
import {
  countThanhVien,
  isCongDongAdmin,
  getViewerVaiTroInOrg,
  isThanhVien,
} from "@/lib/cong-dong/membership";
import { listCongDongFilters } from "@/lib/cong-dong/filters";
import { listCongDongPosts } from "@/lib/cong-dong/posts";
import { loadCongDongCategories } from "@/lib/cong-dong/categories";
import { countCongDongPosts } from "@/lib/cong-dong/stats";
import type {
  CongDongOrg,
  CongDongPageData,
  CongDongTrangThaiTinCay,
} from "@/lib/cong-dong/types";
import { getCinsSystemUserId } from "@/lib/cong-dong/cins-system";
import {
  getOrgFollowSettings,
  ORG_NOTIFY_DEFAULT,
} from "@/lib/social/org-notify";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

function resolveCinsSystemUserId(): string | null {
  try {
    return getCinsSystemUserId();
  } catch {
    return null;
  }
}

function parseCheDo(cauHinh: unknown): CongDongCheDo {
  if (!cauHinh || typeof cauHinh !== "object") return CONG_DONG_CHE_DO.CONG_KHAI;
  const cheDo = (cauHinh as { che_do?: string }).che_do;
  return cheDo === CONG_DONG_CHE_DO.RIENG_TU
    ? CONG_DONG_CHE_DO.RIENG_TU
    : CONG_DONG_CHE_DO.CONG_KHAI;
}

export async function fetchCongDongBySlug(
  slug: string,
): Promise<{
  id: string;
  slug: string;
  ten: string;
  mo_ta: string | null;
  tinh_thanh: string | null;
  avatar_id: string | null;
  cover_id: string | null;
  cau_hinh: unknown;
  trang_thai_tin_cay: CongDongTrangThaiTinCay;
} | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select(
      "id, slug, ten, mo_ta, tinh_thanh, avatar_id, cover_id, cau_hinh, loai_to_chuc, trang_thai_tin_cay",
    )
    .eq("slug", slug.trim())
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{
      id: string;
      slug: string;
      ten: string;
      mo_ta: string | null;
      tinh_thanh: string | null;
      avatar_id: string | null;
      cover_id: string | null;
      cau_hinh: unknown;
      loai_to_chuc: string;
      trang_thai_tin_cay: CongDongTrangThaiTinCay;
    }>();
  if (!data) return null;
  return data;
}

export async function listCongDongOrgs(
  viewerId?: string | null,
): Promise<CongDongOrg[]> {
  const admin = createServiceRoleClient();
  const { data: rows } = await admin
    .from("org_to_chuc")
    .select("id, slug, ten, mo_ta, tinh_thanh, avatar_id, cover_id, cau_hinh")
    .eq("loai_to_chuc", "cong_dong")
    .order("ten", { ascending: true })
    .limit(100);

  if (!rows?.length) return [];

  const orgIds = rows.map((r) => r.id);

  const [{ data: memberRows }, membershipResult] = await Promise.all([
    admin
      .from("user_thanh_vien_to_chuc")
      .select("id_to_chuc")
      .in("id_to_chuc", orgIds),
    viewerId
      ? admin
          .from("user_thanh_vien_to_chuc")
          .select("id_to_chuc")
          .eq("id_nguoi_dung", viewerId)
          .in("id_to_chuc", orgIds)
      : Promise.resolve({ data: [] as { id_to_chuc: string }[] }),
  ]);

  const countMap = new Map<string, number>();
  for (const row of memberRows ?? []) {
    countMap.set(row.id_to_chuc, (countMap.get(row.id_to_chuc) ?? 0) + 1);
  }

  const memberOrgIds = new Set(
    (membershipResult.data ?? []).map((m) => m.id_to_chuc),
  );

  const result: CongDongOrg[] = [];
  for (const row of rows) {
    const cheDo = parseCheDo(row.cau_hinh);
    if (cheDo === CONG_DONG_CHE_DO.RIENG_TU && !memberOrgIds.has(row.id)) {
      continue;
    }
    result.push({
      id: row.id,
      slug: row.slug,
      ten: row.ten,
      moTa: row.mo_ta,
      tinhThanh: row.tinh_thanh,
      avatarId: row.avatar_id,
      coverId: row.cover_id,
      cheDo,
      trangThaiTinCay: "binh_thuong",
      soThanhVien: countMap.get(row.id) ?? 0,
      soBaiViet: 0,
    });
  }
  return result;
}

export async function loadCongDongPageData(params: {
  slug: string;
  viewerId?: string | null;
}): Promise<CongDongPageData | null> {
  const orgRow = await fetchCongDongBySlug(params.slug);
  if (!orgRow) return null;

  const cheDo = parseCheDo(orgRow.cau_hinh);
  const viewerId = params.viewerId ?? null;
  const member = viewerId ? await isThanhVien(viewerId, orgRow.id) : false;
  const viewerVaiTroPromise = viewerId
    ? getViewerVaiTroInOrg(viewerId, orgRow.id)
    : Promise.resolve(null);

  if (cheDo === CONG_DONG_CHE_DO.RIENG_TU && !member) {
    return null;
  }

  const admin = createServiceRoleClient();
  const viewerProfilePromise = viewerId
    ? admin
        .from("user_nguoi_dung")
        .select("slug, ten_hien_thi, avatar_id")
        .eq("id", viewerId)
        .maybeSingle<{
          slug: string;
          ten_hien_thi: string | null;
          avatar_id: string | null;
        }>()
    : Promise.resolve({ data: null });

  const [
    soThanhVien,
    soBaiViet,
    isAdmin,
    isCinsAdmin,
    filters,
    feed,
    categories,
    notifySettings,
    viewerProfileResult,
    viewerVaiTro,
  ] = await Promise.all([
    countThanhVien(orgRow.id),
    countCongDongPosts(orgRow.id),
    viewerId ? isCongDongAdmin(viewerId, orgRow.id) : Promise.resolve(false),
    getCurrentUserIsCinsAdmin(),
    listCongDongFilters(orgRow.id),
    listCongDongPosts({ orgId: orgRow.id, viewerId }),
    loadCongDongCategories(orgRow.id),
    viewerId
      ? getOrgFollowSettings(viewerId, orgRow.id)
      : Promise.resolve({ muc_thong_bao: "tat" as const }),
    viewerProfilePromise,
    viewerVaiTroPromise,
  ]);

  const viewerProfile = viewerProfileResult.data;
  const cinsSystemId = resolveCinsSystemUserId();
  const hideMembershipForOwner =
    viewerVaiTro === "owner" &&
    Boolean(viewerId && cinsSystemId && viewerId === cinsSystemId);

  let notifyLevel = notifySettings.muc_thong_bao;
  if (member && notifyLevel === "tat") {
    notifyLevel = ORG_NOTIFY_DEFAULT;
  }

  return {
    org: {
      id: orgRow.id,
      slug: orgRow.slug,
      ten: orgRow.ten,
      moTa: orgRow.mo_ta,
      tinhThanh: orgRow.tinh_thanh,
      avatarId: orgRow.avatar_id,
      coverId: orgRow.cover_id,
      cheDo,
      trangThaiTinCay: orgRow.trang_thai_tin_cay ?? "binh_thuong",
      soThanhVien,
      soBaiViet,
    },
    isThanhVien: member,
    isAdmin,
    isCinsAdmin,
    viewerVaiTro,
    hideMembershipForOwner,
    notifyLevel,
    viewerId,
    viewerSlug: viewerProfile?.slug ?? null,
    viewerName:
      viewerProfile?.ten_hien_thi?.trim() ||
      viewerProfile?.slug ||
      null,
    viewerAvatarId: viewerProfile?.avatar_id ?? null,
    filters,
    initialPosts: feed.posts,
    nextCursor: feed.nextCursor,
    categories,
  };
}
