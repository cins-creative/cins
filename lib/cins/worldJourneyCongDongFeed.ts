import "server-only";

import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  canViewCongDongFeed,
  parseCongDongCheDoFromCauHinh,
  type CongDongCheDo,
} from "@/lib/cong-dong/constants";
import { CHE_DO_MOC_CONG_DONG } from "@/lib/journey/journey-visible-clause";
import {
  attachSocialState,
  buildSelfMilestonesForCotMocs,
} from "@/lib/journey/milestones-fetch";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { WORLD_JOURNEY_CONG_DONG_SUGGEST_LIMIT } from "@/lib/cins/worldJourneyFeedConstants";

const COT_MOC_FEED_SELECT =
  "id, loai_moc, nguon_goc, tieu_de, mo_ta, thoi_diem, che_do_hien_thi, tao_luc, id_nguoi_dung, id_to_chuc";

const QUERY_LIMIT = 80;

type CotMocFeedRow = {
  id: string;
  loai_moc: string;
  nguon_goc: string;
  tieu_de: string;
  mo_ta: string | null;
  thoi_diem: string;
  che_do_hien_thi: string;
  tao_luc: string | null;
  id_nguoi_dung: string;
  id_to_chuc?: string | null;
};

type AuthorRow = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
};

type OrgCheDoRow = {
  id: string;
  cau_hinh: unknown;
};

/** Cộng đồng viewer đang là thành viên active. */
export async function listActiveCongDongOrgIds(
  viewerId: string,
): Promise<string[]> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_thanh_vien_to_chuc")
    .select("id_to_chuc, org_to_chuc!inner(loai_to_chuc)")
    .eq("id_nguoi_dung", viewerId)
    .eq("trang_thai", "active")
    .eq("org_to_chuc.loai_to_chuc", "cong_dong")
    .returns<Array<{ id_to_chuc: string }>>();

  return [...new Set((data ?? []).map((r) => r.id_to_chuc))];
}

async function loadCongDongCheDoMap(
  orgIds: string[],
): Promise<Map<string, CongDongCheDo>> {
  const map = new Map<string, CongDongCheDo>();
  const unique = [...new Set(orgIds.filter(Boolean))];
  if (unique.length === 0) return map;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id, cau_hinh")
    .in("id", unique)
    .eq("loai_to_chuc", "cong_dong")
    .returns<OrgCheDoRow[]>();

  for (const row of data ?? []) {
    map.set(row.id, parseCongDongCheDoFromCauHinh(row.cau_hinh));
  }
  return map;
}

async function loadAuthors(authorIds: string[]): Promise<Map<string, AuthorRow>> {
  const map = new Map<string, AuthorRow>();
  if (authorIds.length === 0) return map;
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", authorIds)
    .returns<AuthorRow[]>();
  for (const row of data ?? []) map.set(row.id, row);
  return map;
}

function applyLensOwners(
  milestones: MilestoneItem[],
  ownerIdByCotMoc: Map<string, string>,
  authors: Map<string, AuthorRow>,
): MilestoneItem[] {
  return milestones.map((m) => {
    const cotMocId = m.cotMocId ?? m.id;
    const ownerId = ownerIdByCotMoc.get(cotMocId) ?? null;
    const author = ownerId ? authors.get(ownerId) : null;
    const slug = author?.slug ?? m.postOwnerSlug ?? null;
    return {
      ...m,
      lensOwnerId: ownerId,
      lensOwnerSlug: slug,
      lensOwnerName: author?.ten_hien_thi?.trim() || slug,
      lensOwnerAvatarUrl: getAvatarUrl(author?.avatar_id ?? null),
      postOwnerSlug: slug ?? m.postOwnerSlug,
      postOwnerId: ownerId ?? m.postOwnerId,
    };
  });
}

async function buildMilestonesFromCotMocs(
  cotMocs: CotMocFeedRow[],
  viewerId: string,
  opts?: { feedSuggestion?: boolean },
): Promise<MilestoneItem[]> {
  if (cotMocs.length === 0) return [];

  const ownerIdByCotMoc = new Map(
    cotMocs.map((cm) => [cm.id, cm.id_nguoi_dung]),
  );
  const authorIds = [...new Set(cotMocs.map((cm) => cm.id_nguoi_dung))];
  const admin = createServiceRoleClient();
  const [built, authors] = await Promise.all([
    buildSelfMilestonesForCotMocs(
      admin,
      cotMocs as Parameters<typeof buildSelfMilestonesForCotMocs>[1],
    ),
    loadAuthors(authorIds),
  ]);

  const withLens = applyLensOwners(built, ownerIdByCotMoc, authors);
  const withSocial = await attachSocialState(admin, withLens, viewerId);
  if (!opts?.feedSuggestion) return withSocial;
  return withSocial.map((m) => ({ ...m, feedSuggestion: true as const }));
}

/**
 * Bài `cong_dong` từ phòng viewer là member, hoặc đang follow (chỉ `cong_khai`
 * nếu chưa member — khớp `canViewCongDongFeed`).
 */
export async function fetchWorldJourneyMemberCongDongMilestones(
  viewerId: string,
  followingOrgIds: string[],
  memberOrgIds?: string[],
): Promise<MilestoneItem[]> {
  const memberIds =
    memberOrgIds ?? (await listActiveCongDongOrgIds(viewerId));
  const memberSet = new Set(memberIds);

  const candidateOrgIds = [...new Set([...memberIds, ...followingOrgIds])];
  if (candidateOrgIds.length === 0) return [];

  const cheDoMap = await loadCongDongCheDoMap(candidateOrgIds);
  const allowedOrgIds = candidateOrgIds.filter((orgId) => {
    const cheDo = cheDoMap.get(orgId);
    if (!cheDo) return false;
    return canViewCongDongFeed(cheDo, memberSet.has(orgId));
  });
  if (allowedOrgIds.length === 0) return [];

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("content_cot_moc")
    .select(COT_MOC_FEED_SELECT)
    .in("id_to_chuc", allowedOrgIds)
    .eq("che_do_hien_thi", CHE_DO_MOC_CONG_DONG)
    .order("tao_luc", { ascending: false })
    .limit(QUERY_LIMIT)
    .returns<CotMocFeedRow[]>();

  return buildMilestonesFromCotMocs(data ?? [], viewerId);
}

/**
 * Gợi ý hoạt động từ cộng đồng `cong_khai` viewer chưa member/follow —
 * để trang chủ thấy “cộng đồng đang sống”. Có nhãn `feedSuggestion`.
 */
export async function fetchWorldJourneySuggestedCongDongMilestones(
  viewerId: string,
  excludeOrgIds: string[],
  limit = WORLD_JOURNEY_CONG_DONG_SUGGEST_LIMIT,
): Promise<MilestoneItem[]> {
  const safeLimit = Math.min(Math.max(1, limit), WORLD_JOURNEY_CONG_DONG_SUGGEST_LIMIT);
  const admin = createServiceRoleClient();
  const exclude = new Set(excludeOrgIds);

  const { data: orgs } = await admin
    .from("org_to_chuc")
    .select("id, cau_hinh")
    .eq("loai_to_chuc", "cong_dong")
    .limit(80)
    .returns<OrgCheDoRow[]>();

  const congKhaiIds = (orgs ?? [])
    .filter((o) => !exclude.has(o.id))
    .filter(
      (o) => parseCongDongCheDoFromCauHinh(o.cau_hinh) === "cong_khai",
    )
    .map((o) => o.id);

  if (congKhaiIds.length === 0) return [];

  const { data } = await admin
    .from("content_cot_moc")
    .select(COT_MOC_FEED_SELECT)
    .in("id_to_chuc", congKhaiIds)
    .eq("che_do_hien_thi", CHE_DO_MOC_CONG_DONG)
    .order("tao_luc", { ascending: false })
    .limit(safeLimit * 3)
    .returns<CotMocFeedRow[]>();

  /* Tối đa 1 bài / phòng trong gợi ý. */
  const picked: CotMocFeedRow[] = [];
  const seenOrg = new Set<string>();
  for (const row of data ?? []) {
    const orgId = row.id_to_chuc;
    if (!orgId || seenOrg.has(orgId)) continue;
    seenOrg.add(orgId);
    picked.push(row);
    if (picked.length >= safeLimit) break;
  }

  return buildMilestonesFromCotMocs(picked, viewerId, { feedSuggestion: true });
}
