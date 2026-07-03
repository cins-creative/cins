import "server-only";

import type {
  FeedFriendAttendee,
  MilestoneItem,
} from "@/components/journey/milestone-types";
import { getAvatarUrl } from "@/lib/journey/profile";
import { labelLoaiSuKien } from "@/lib/to-chuc/su-kien-constants";
import { orgSuKienHref } from "@/lib/to-chuc/su-kien-routes";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { getStepStatus } from "@/lib/truong/timeline";

/** Tối thiểu bạn bè đăng ký "sẽ tham gia" để gợi ý sự kiện trên feed. */
export const MIN_FRIENDS_FOR_EVENT_SUGGESTION = 2;

/** Tối đa bạn bè giữ lại cho popup danh sách (tránh payload phình to). */
const MAX_FRIEND_ATTENDEES = 30;

type UserEmbed = {
  slug: string | null;
  ten_hien_thi: string | null;
  avatar_id: string | null;
};

type OrgEmbed = {
  slug: string | null;
  ten: string | null;
  loai_to_chuc: string | null;
  avatar_id: string | null;
  logo_id: string | null;
};

type SuKienFeedRow = {
  id: string;
  ten: string;
  mo_ta: string | null;
  cover_id: string | null;
  bat_dau: string;
  ket_thuc: string | null;
  loai_su_kien: string | null;
  id_to_chuc: string;
  org_to_chuc: OrgEmbed | OrgEmbed[] | null;
};

const TRANG_THAI_HUY = new Set(["tu_choi", "huy"]);

function pickOrg(org: SuKienFeedRow["org_to_chuc"]): OrgEmbed | null {
  if (!org) return null;
  return Array.isArray(org) ? (org[0] ?? null) : org;
}

function orgKindFromLoai(
  loai: string | null | undefined,
): NonNullable<MilestoneItem["attribution"]>["orgKind"] {
  if (loai === "cong_dong") return "cong_dong";
  if (loai === "co_so_dao_tao") return "co_so_dao_tao";
  if (loai === "studio" || loai === "doanh_nghiep") return "studio";
  return "truong";
}

function calendarParts(iso: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function mapSuKienToMilestone(
  row: SuKienFeedRow,
  options: {
    feedSuggestion?: boolean;
    friends?: FeedFriendAttendee[];
  } = {},
): MilestoneItem | null {
  const org = pickOrg(row.org_to_chuc);
  if (!org?.slug?.trim() || !org.ten?.trim()) return null;

  const status = getStepStatus(row.bat_dau, row.ket_thuc);
  if (status === "done") return null;

  const parts = calendarParts(row.bat_dau);
  if (!parts) return null;

  const orgSlug = org.slug.trim();
  const orgName = org.ten.trim();
  const orgLoai = org.loai_to_chuc?.trim() ?? "co_so_dao_tao";
  const avatarId = org.avatar_id ?? org.logo_id;
  const avatarUrl = avatarId
    ? resolveTruongImageSrcSync(avatarId, ["public", "avatar"])
    : null;
  const href = orgSuKienHref(orgLoai, orgSlug);
  const coverSrc = row.cover_id
    ? resolveTruongImageSrcSync(row.cover_id, ["public", "cover", "medium"])
    : null;

  const friends = options.friends ?? [];
  const friendCount = friends.length;
  let feedSocialHint: string | null = null;
  if (friendCount >= MIN_FRIENDS_FOR_EVENT_SUGGESTION) {
    feedSocialHint = `${friendCount} bạn bè sẽ tham gia`;
  }

  return {
    id: `org-event:${row.id}`,
    cotMocId: row.id,
    variant: "tagged",
    type: "su-kien",
    visibility: "public",
    year: parts.year,
    month: parts.month,
    day: parts.day,
    createdAt: row.bat_dau,
    title: row.ten?.trim() || "Sự kiện",
    body: row.mo_ta?.trim() || null,
    media: coverSrc
      ? [
          {
            src: coverSrc,
            width: 800,
            height: 450,
            label: row.ten?.trim() || null,
          },
        ]
      : undefined,
    orgSuKienRef: {
      suKienId: row.id,
      orgId: row.id_to_chuc,
      orgSlug,
      orgName,
      orgLoai,
      href,
      batDau: row.bat_dau,
      ketThuc: row.ket_thuc,
      loaiSuKien: row.loai_su_kien,
    },
    attribution: {
      name: orgName,
      role: labelLoaiSuKien(row.loai_su_kien),
      avatarUrl,
      initial: orgName.slice(0, 1).toUpperCase(),
      slug: orgSlug,
      isOrg: true,
      orgKind: orgKindFromLoai(orgLoai),
      href,
    },
    lensOwnerSlug: orgSlug,
    lensOwnerName: orgName,
    lensOwnerAvatarUrl: avatarUrl,
    orgHref: href,
    feedSuggestion: options.feedSuggestion === true,
    feedSocialHint,
    feedFriends: friends.length > 0 ? friends : undefined,
  };
}

async function fetchUpcomingSuKienRows(params: {
  orgIds?: string[];
  suKienIds?: string[];
  excludeIds?: Set<string>;
  limit: number;
}): Promise<SuKienFeedRow[]> {
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();
  const excludeIds = params.excludeIds ?? new Set<string>();

  let query = admin
    .from("org_su_kien")
    .select(
      `
      id,
      ten,
      mo_ta,
      cover_id,
      bat_dau,
      ket_thuc,
      loai_su_kien,
      id_to_chuc,
      org_to_chuc!inner ( slug, ten, loai_to_chuc, avatar_id, logo_id )
    `,
    )
    .or(`ket_thuc.is.null,ket_thuc.gte.${now}`)
    .order("bat_dau", { ascending: false })
    .limit(params.limit + excludeIds.size + 6);

  if (params.suKienIds?.length) {
    query = query.in("id", params.suKienIds);
  } else if (params.orgIds?.length) {
    query = query.in("id_to_chuc", params.orgIds);
  }

  const { data } = await query.returns<SuKienFeedRow[]>();
  const out: SuKienFeedRow[] = [];
  for (const row of data ?? []) {
    if (excludeIds.has(row.id)) continue;
    out.push(row);
    if (out.length >= params.limit) break;
  }
  return out;
}

/**
 * Sự kiện sắp diễn ra từ org đang theo dõi → card timeline feed giữa.
 * `friendIds` (tuỳ chọn): đính kèm danh sách bạn bè "sẽ tham gia" cho chip avatar.
 */
export async function fetchFollowedOrgSuKienMilestones(
  orgIds: string[],
  friendIds: string[] = [],
  limit = 20,
): Promise<MilestoneItem[]> {
  if (orgIds.length === 0) return [];

  const rows = await fetchUpcomingSuKienRows({ orgIds, limit });
  const friendMap = await fetchFriendAttendeesBySuKien(
    friendIds,
    rows.map((r) => r.id),
  );

  const items: MilestoneItem[] = [];
  for (const row of rows) {
    const item = mapSuKienToMilestone(row, {
      friends: friendMap.get(row.id),
    });
    if (item) items.push(item);
  }
  return items;
}

/**
 * Bạn bè "sẽ tham gia" từng sự kiện — kèm profile để dựng chip + popup.
 * Fetch 2 bước (đăng ký → profile) rồi join JS: không phụ thuộc FK embed
 * PostgREST giữa `org_dang_ky_su_kien` và `user_nguoi_dung`.
 */
async function fetchFriendAttendeesBySuKien(
  friendIds: string[],
  suKienIds?: string[],
): Promise<Map<string, FeedFriendAttendee[]>> {
  const map = new Map<string, FeedFriendAttendee[]>();
  if (friendIds.length === 0) return map;

  const admin = createServiceRoleClient();
  let regQuery = admin
    .from("org_dang_ky_su_kien")
    .select("id_su_kien, id_nguoi_dung, trang_thai")
    .in("id_nguoi_dung", friendIds)
    .eq("loai_phan_hoi", "se_tham_gia");

  if (suKienIds?.length) {
    regQuery = regQuery.in("id_su_kien", suKienIds);
  }

  const { data: regs } = await regQuery.returns<
    Array<{ id_su_kien: string; id_nguoi_dung: string; trang_thai: string }>
  >();

  const pairs: Array<{ suKienId: string; userId: string }> = [];
  const userIds = new Set<string>();
  for (const row of regs ?? []) {
    if (TRANG_THAI_HUY.has(row.trang_thai)) continue;
    pairs.push({ suKienId: row.id_su_kien, userId: row.id_nguoi_dung });
    userIds.add(row.id_nguoi_dung);
  }
  if (pairs.length === 0) return map;

  const { data: users } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", [...userIds])
    .returns<Array<{ id: string } & UserEmbed>>();

  const byUser = new Map<string, FeedFriendAttendee>();
  for (const u of users ?? []) {
    const slug = u.slug?.trim();
    if (!slug) continue;
    const name = u.ten_hien_thi?.trim() || slug;
    byUser.set(u.id, {
      id: u.id,
      slug,
      name,
      avatarUrl: getAvatarUrl(u.avatar_id),
      initial: name.slice(0, 1).toUpperCase(),
    });
  }

  for (const { suKienId, userId } of pairs) {
    const attendee = byUser.get(userId);
    if (!attendee) continue;
    const arr = map.get(suKienId);
    if (arr) {
      if (arr.length < MAX_FRIEND_ATTENDEES) arr.push(attendee);
    } else {
      map.set(suKienId, [attendee]);
    }
  }
  return map;
}

/**
 * Gợi ý sự kiện khi ≥ `MIN_FRIENDS_FOR_EVENT_SUGGESTION` bạn bè đăng ký tham gia.
 * Bỏ qua sự kiện đã có từ org đang follow (dedupe ở tầng merge).
 */
export async function fetchFriendSuggestedSuKienMilestones(
  friendIds: string[],
  excludeSuKienIds: Set<string> = new Set(),
  limit = 12,
): Promise<MilestoneItem[]> {
  if (friendIds.length === 0) return [];

  const friendMap = await fetchFriendAttendeesBySuKien(friendIds);
  const candidateIds = [...friendMap.entries()]
    .filter(
      ([id, friends]) =>
        friends.length >= MIN_FRIENDS_FOR_EVENT_SUGGESTION &&
        !excludeSuKienIds.has(id),
    )
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, limit + excludeSuKienIds.size)
    .map(([id]) => id);

  if (candidateIds.length === 0) return [];

  const rows = await fetchUpcomingSuKienRows({
    suKienIds: candidateIds,
    limit: candidateIds.length,
  });

  const items: MilestoneItem[] = [];
  for (const row of rows) {
    const friends = friendMap.get(row.id) ?? [];
    if (friends.length < MIN_FRIENDS_FOR_EVENT_SUGGESTION) continue;
    const item = mapSuKienToMilestone(row, {
      feedSuggestion: true,
      friends,
    });
    if (item) items.push(item);
  }

  items.sort(
    (a, b) =>
      (friendMap.get(b.cotMocId ?? "")?.length ?? 0) -
      (friendMap.get(a.cotMocId ?? "")?.length ?? 0),
  );

  return items.slice(0, limit);
}
