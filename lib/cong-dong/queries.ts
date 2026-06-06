import "server-only";

import {
  CONG_DONG_CHE_DO,
} from "@/lib/cong-dong/constants";
import type { CongDongCheDo } from "@/lib/cong-dong/constants";
import {
  countThanhVien,
  isCongDongAdmin,
  isThanhVien,
} from "@/lib/cong-dong/membership";
import { listCongDongFilters } from "@/lib/cong-dong/filters";
import { listCongDongPosts } from "@/lib/cong-dong/posts";
import type { CongDongOrg, CongDongPageData } from "@/lib/cong-dong/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

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
} | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select(
      "id, slug, ten, mo_ta, tinh_thanh, avatar_id, cover_id, cau_hinh, loai_to_chuc",
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
      soThanhVien: countMap.get(row.id) ?? 0,
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

  if (cheDo === CONG_DONG_CHE_DO.RIENG_TU && !member) {
    return null;
  }

  const [soThanhVien, isAdmin, filters, feed] = await Promise.all([
    countThanhVien(orgRow.id),
    viewerId ? isCongDongAdmin(viewerId, orgRow.id) : Promise.resolve(false),
    listCongDongFilters(orgRow.id),
    listCongDongPosts({ orgId: orgRow.id, viewerId }),
  ]);

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
      soThanhVien,
    },
    isThanhVien: member,
    isAdmin,
    viewerId,
    filters,
    initialPosts: feed.posts,
    nextCursor: feed.nextCursor,
  };
}
