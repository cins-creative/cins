import "server-only";

import type { Persona } from "@/lib/cins/home-adaptive/persona";
import { giaiDoanLabel } from "@/lib/cins/home-adaptive/labels";
import { loadKhoaHocGoiY } from "@/lib/cins/home-adaptive/fetches";
import { SU_KIEN_LOAI_BY_PERSONA } from "@/lib/cins/home-adaptive/persona";
import {
  loadFollowSuggestions,
  loadOrgFollowSuggestions,
  orgFollowSubtitle,
} from "@/lib/cins/home-adaptive/suggestions";
import { NGANH_HOC_HUB_PATH } from "@/lib/cins/hubPaths";
import type { FeedPromoVariant } from "@/lib/cins/worldJourneyFeedPromosTypes";
import { listFollowingOrgIds } from "@/lib/cins/worldJourneyOrgFeed";
import {
  fetchFriendSuggestedSuKienMilestones,
} from "@/lib/cins/worldJourneyOrgSuKienFeed";
import { listNganhArticlesForHub } from "@/lib/nganh/queries";
import { coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import { labelLoaiSuKien } from "@/lib/to-chuc/su-kien-constants";
import { orgPublicHref } from "@/lib/search/helpers";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";
import { listFriends } from "@/lib/social/ket-ban";

export type { FeedPromoCard, FeedPromoVariant } from "@/lib/cins/worldJourneyFeedPromosTypes";

const PROMO_EVENT_MONTHS = [
  "Th1", "Th2", "Th3", "Th4", "Th5", "Th6",
  "Th7", "Th8", "Th9", "Th10", "Th11", "Th12",
];

function promoEventDate(iso: string): { month: string; day: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { month: "", day: "" };
  return {
    month: PROMO_EVENT_MONTHS[d.getMonth()] ?? "",
    day: String(d.getDate()).padStart(2, "0"),
  };
}

function orgSuKienHref(loai: string, slug: string): string {
  if (loai === "co_so_dao_tao") return coSoTabPath(slug, "su-kien");
  return orgPublicHref(loai, slug);
}

type SuKienPromoRow = {
  id: string;
  ten: string;
  cover_id: string | null;
  bat_dau: string;
  loai_su_kien: string | null;
  id_to_chuc: string;
  org_to_chuc: {
    slug: string | null;
    ten: string | null;
    loai_to_chuc: string | null;
    avatar_id?: string | null;
    logo_id?: string | null;
  } | {
    slug: string | null;
    ten: string | null;
    loai_to_chuc: string | null;
    avatar_id?: string | null;
    logo_id?: string | null;
  }[] | null;
};

async function queryUpcomingSuKienPromoRows(
  orgIds: string[] | null,
  loaiFilter: string[],
  limit: number,
  excludeIds: Set<string> = new Set(),
): Promise<SuKienPromoRow[]> {
  const admin = createServiceRoleClient();
  const now = new Date().toISOString();

  let query = admin
    .from("org_su_kien")
    .select(
      "id, ten, cover_id, bat_dau, loai_su_kien, id_to_chuc, org_to_chuc!inner ( slug, ten, loai_to_chuc, avatar_id, logo_id )",
    )
    .or(`ket_thuc.is.null,ket_thuc.gte.${now}`)
    .order("bat_dau", { ascending: true })
    .limit(limit + excludeIds.size + 4);

  if (orgIds && orgIds.length > 0) {
    query = query.in("id_to_chuc", orgIds);
  }
  if (loaiFilter.length > 0) {
    query = query.in("loai_su_kien", loaiFilter);
  }

  const { data } = await query.returns<SuKienPromoRow[]>();
  const out: SuKienPromoRow[] = [];
  for (const row of data ?? []) {
    if (excludeIds.has(row.id)) continue;
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

/** Sự kiện sắp diễn ra — ưu tiên org đang theo dõi, lọc loại theo persona. */
async function loadFeedPromoEvents(
  viewerId: string,
  persona: Persona,
  limit = 8,
): Promise<FeedPromoVariant | null> {
  const loaiFilter = SU_KIEN_LOAI_BY_PERSONA[persona];
  const followedIds = await listFollowingOrgIds(viewerId);

  const followedRows =
    followedIds.length > 0
      ? await queryUpcomingSuKienPromoRows(followedIds, loaiFilter, limit)
      : [];

  const seen = new Set(followedRows.map((r) => r.id));
  const need = limit - followedRows.length;
  const globalRows =
    need > 0
      ? await queryUpcomingSuKienPromoRows(null, loaiFilter, need, seen)
      : [];

  const rows = [...followedRows, ...globalRows];
  if (rows.length === 0) return null;

  return {
    kind: "events",
    title: "Sự kiện sắp diễn ra",
    moreHref: "/",
    moreLabel: "Khám phá thêm",
    items: rows.map((row) => {
      const orgRaw = row.org_to_chuc;
      const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
      const orgSlug = org?.slug?.trim() ?? "";
      const orgTen = org?.ten?.trim() ?? "Tổ chức";
      const orgLoai = org?.loai_to_chuc?.trim() ?? "co_so_dao_tao";
      const loaiLabel = labelLoaiSuKien(row.loai_su_kien);
      const href = orgSlug ? orgSuKienHref(orgLoai, orgSlug) : "/";
      const coverSrc = row.cover_id
        ? resolveTruongImageSrcSync(row.cover_id, ["public", "cover", "medium"])
        : null;
      const orgAvatarId = org?.avatar_id ?? org?.logo_id;
      const orgLogoUrl = orgAvatarId
        ? resolveTruongImageSrcSync(orgAvatarId, ["public", "avatar"])
        : null;

      return {
        id: row.id,
        title: row.ten?.trim() || "Sự kiện",
        sub: `${orgTen} · ${loaiLabel}`,
        href,
        imageUrl: coverSrc,
        orgLogoUrl,
        dateBadge: promoEventDate(row.bat_dau),
      };
    }),
  };
}

function mapCourses(
  courses: Awaited<ReturnType<typeof loadKhoaHocGoiY>>,
  title: string,
): FeedPromoVariant | null {
  if (courses.length === 0) return null;
  return {
    kind: "courses",
    title,
    moreHref: "/co-so-dao-tao",
    items: courses.map((k) => ({
      id: k.id,
      title: k.ten,
      sub: `${k.orgTen} · ${k.sub}`,
      href: `/co-so/${k.orgSlug}/khoa-hoc/${k.slug}`,
      imageUrl: k.thumbnailUrl,
      orgLogoUrl: k.orgAvatarUrl,
    })),
  };
}

function mapCareers(
  items: Awaited<ReturnType<typeof listNganhArticlesForHub>>["items"],
): FeedPromoVariant | null {
  if (items.length === 0) return null;
  return {
    kind: "careers",
    title: "Ngành học gợi ý",
    moreHref: NGANH_HOC_HUB_PATH,
    items: items.map((n) => ({
      id: n.id,
      title: (n.titleVi ?? n.title).trim(),
      sub:
        n.short_description?.trim().slice(0, 72) ||
        "Khám phá lộ trình ngành",
      href: `/nganh-hoc/${n.slug}`,
      imageUrl: n.cover_src ?? null,
    })),
  };
}

function mapPeople(
  people: Awaited<ReturnType<typeof loadFollowSuggestions>>,
): FeedPromoVariant | null {
  if (people.length === 0) return null;
  return {
    kind: "people",
    title: "Người nên theo dõi",
    moreHref: "/",
    moreLabel: "Khám phá thêm",
    items: people.map((p) => ({
      id: p.id,
      title: p.name,
      sub:
        p.mutualCount > 0
          ? `${p.mutualCount} bạn chung`
          : giaiDoanLabel(p.giaiDoan),
      href: `/${p.slug}`,
      imageUrl: p.avatarUrl,
      coverUrl: p.coverUrl,
      giaiDoan: giaiDoanLabel(p.giaiDoan),
      bio: p.bio,
    })),
  };
}

/** Rail gợi ý — sự kiện nhiều bạn bè đang tham gia. */
async function loadFriendParticipationEventPromo(
  viewerId: string,
  limit = 8,
): Promise<FeedPromoVariant | null> {
  const friendIds = await listFriends(viewerId);
  if (friendIds.length === 0) return null;

  const milestones = await fetchFriendSuggestedSuKienMilestones(
    friendIds,
    new Set(),
    limit,
  );
  if (milestones.length === 0) return null;

  return {
    kind: "events",
    title: "Bạn bè đang tham gia",
    moreHref: "/su-kien",
    moreLabel: "Xem thêm",
    items: milestones.map((m) => {
      const ref = m.orgSuKienRef!;
      const orgName = ref.orgName;
      const loaiLabel = labelLoaiSuKien(ref.loaiSuKien);
      const friendHint = m.feedSocialHint?.trim();
      const coverSrc = m.media?.[0]?.src ?? null;
      const orgLogoUrl = m.lensOwnerAvatarUrl ?? m.attribution?.avatarUrl ?? null;
      const d = new Date(ref.batDau);
      const dateBadge =
        Number.isNaN(d.getTime())
          ? undefined
          : {
              month: PROMO_EVENT_MONTHS[d.getMonth()] ?? "",
              day: String(d.getDate()).padStart(2, "0"),
            };

      return {
        id: ref.suKienId,
        title: m.title,
        sub: friendHint
          ? `${friendHint} · ${orgName}`
          : `${orgName} · ${loaiLabel}`,
        href: ref.href,
        imageUrl: coverSrc,
        orgLogoUrl,
        dateBadge,
      };
    }),
  };
}

/** Gợi ý xen kẽ feed timeline — theo persona (không render ở Gallery). */
export async function loadFeedInlinePromos(
  viewerId: string,
  persona: Persona,
): Promise<FeedPromoVariant[]> {
  const friendEventsPromo = await loadFriendParticipationEventPromo(viewerId, 8);

  if (persona === "hoc") {
    const [courses, nganhResult, people, events] = await Promise.all([
      loadKhoaHocGoiY(8),
      listNganhArticlesForHub({ limit: 8 }),
      loadFollowSuggestions(viewerId, 8),
      loadFeedPromoEvents(viewerId, persona, 8),
    ]);

    /* Xen kẽ: khóa học → sự kiện bạn bè → sự kiện → ngành → người. */
    return [
      mapCourses(courses, "Khóa học gợi ý"),
      friendEventsPromo,
      events,
      mapCareers(nganhResult.ok ? nganhResult.items : []),
      mapPeople(people),
    ].filter((v): v is FeedPromoVariant => v != null);
  }

  if (persona === "lam") {
    const [studios, people, events] = await Promise.all([
      loadOrgFollowSuggestions(viewerId, 8, {
        loaiToChuc: ["studio", "doanh_nghiep"],
      }),
      loadFollowSuggestions(viewerId, 8),
      loadFeedPromoEvents(viewerId, persona, 8),
    ]);

    return [
      studios.length > 0
        ? {
            kind: "studios" as const,
            title: "Studio & doanh nghiệp",
            moreHref: "/studio",
            items: studios.map((o) => ({
              id: o.id,
              title: o.name,
              sub: orgFollowSubtitle(o.loaiToChuc, o.reason),
              href: o.href,
              imageUrl: o.avatarUrl,
            })),
          }
        : null,
      friendEventsPromo,
      events,
      mapPeople(people),
    ].filter((v): v is FeedPromoVariant => v != null);
  }

  /* DẠY */
  const [courses, nganhResult, people, events] = await Promise.all([
    loadKhoaHocGoiY(8),
    listNganhArticlesForHub({ limit: 8 }),
    loadFollowSuggestions(viewerId, 8),
    loadFeedPromoEvents(viewerId, persona, 8),
  ]);

  return [
    mapCourses(courses, "Khóa học đang mở"),
    friendEventsPromo,
    events,
    mapCareers(nganhResult.ok ? nganhResult.items : []),
    mapPeople(people),
  ].filter((v): v is FeedPromoVariant => v != null);
}
