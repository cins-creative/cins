import "server-only";

import type { Persona } from "@/lib/cins/home-adaptive/persona";
import { giaiDoanLabel } from "@/lib/cins/home-adaptive/labels";
import { loadKhoaHocGoiY } from "@/lib/cins/home-adaptive/fetches";
import { SU_KIEN_LOAI_BY_PERSONA } from "@/lib/cins/home-adaptive/persona";
import {
  CO_SO_DAO_TAO_LOAI,
  loadFollowSuggestions,
  loadOrgFollowSuggestions,
  orgLoaiLabel,
} from "@/lib/cins/home-adaptive/suggestions";
import type {
  FeedPromoKind,
  FeedPromoVariant,
} from "@/lib/cins/worldJourneyFeedPromosTypes";
import { FEED_PROMO_POOL_FETCH } from "@/lib/cins/worldJourneyFeedPromosTypes";
import { listFollowingOrgIds } from "@/lib/cins/worldJourneyOrgFeed";
import { coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import { labelLoaiSuKien } from "@/lib/to-chuc/su-kien-constants";
import { orgPublicHref } from "@/lib/search/helpers";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

export type { FeedPromoCard, FeedPromoVariant } from "@/lib/cins/worldJourneyFeedPromosTypes";

/** Pool gợi ý theo loại — timeline lấy theo chu kỳ S1–S6, không lặp cùng bộ card. */
export type FeedPromoPools = Partial<Record<FeedPromoKind, FeedPromoVariant>>;

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
    .gte("bat_dau", now)
    .order("bat_dau", { ascending: true })
    .limit(limit + excludeIds.size + 8);

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

/** So sánh sự kiện: sắp tới gần nhất trước (`bat_dau` ASC). */
function compareSuKienSoonest(a: SuKienPromoRow, b: SuKienPromoRow): number {
  const aT = Date.parse(a.bat_dau);
  const bT = Date.parse(b.bat_dau);
  const aOk = Number.isNaN(aT) ? Number.POSITIVE_INFINITY : aT;
  const bOk = Number.isNaN(bT) ? Number.POSITIVE_INFINITY : bT;
  return aOk - bOk;
}

/** Sự kiện sắp diễn ra — ưu tiên gần nhất; org đang theo dõi chỉ là nguồn ưu tiên lấy pool. */
async function loadFeedPromoEvents(
  viewerId: string,
  persona: Persona,
  limit: number,
): Promise<FeedPromoVariant | null> {
  const loaiFilter = SU_KIEN_LOAI_BY_PERSONA[persona];
  const followedIds = await listFollowingOrgIds(viewerId);

  /* Lấy dư một chút rồi sort lại theo ngày gần nhất (không để followed đẩy sự kiện xa lên trước). */
  const poolLimit = Math.max(limit * 2, limit + 4);
  const followedRows =
    followedIds.length > 0
      ? await queryUpcomingSuKienPromoRows(followedIds, loaiFilter, poolLimit)
      : [];

  const seen = new Set(followedRows.map((r) => r.id));
  const globalRows = await queryUpcomingSuKienPromoRows(
    null,
    loaiFilter,
    poolLimit,
    seen,
  );

  const rows = [...followedRows, ...globalRows]
    .sort(compareSuKienSoonest)
    .slice(0, limit);
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

function personPromoBio(
  bio: string | null,
  location: string | null,
): string {
  if (bio?.trim()) return bio.trim();
  if (location?.trim()) return location.trim();
  return "Khám phá hành trình trên CINs";
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
      bio: personPromoBio(p.bio, p.location),
      location: p.location,
    })),
  };
}

function mapOrgs(
  orgs: Awaited<ReturnType<typeof loadOrgFollowSuggestions>>,
  kind: "studios" | "schools",
  title: string,
  moreHref: string,
  orgActionKind: "studio" | "co_so_dao_tao",
): FeedPromoVariant | null {
  if (orgs.length === 0) return null;
  return {
    kind,
    title,
    moreHref,
    moreLabel: "Xem tất cả",
    items: orgs.map((o) => ({
      id: o.id,
      title: o.name,
      sub: o.reason,
      href: o.href,
      imageUrl: o.avatarUrl,
      coverUrl: o.coverUrl,
      bio: o.bio,
      typeLabel: orgLoaiLabel(o.loaiToChuc),
      location: o.location,
      orgActionKind,
    })),
  };
}

/**
 * Pool gợi ý xen feed — chu kỳ cố định S1–S6 (không theo persona).
 * Mỗi loại một pool đủ lớn; client cắt theo breakpoint + cursor để tránh lặp.
 */
export async function loadFeedInlinePromos(
  viewerId: string,
  persona: Persona,
): Promise<FeedPromoVariant[]> {
  const [people, events, studios, courses, schools] = await Promise.all([
    loadFollowSuggestions(viewerId, FEED_PROMO_POOL_FETCH.people),
    loadFeedPromoEvents(viewerId, persona, FEED_PROMO_POOL_FETCH.events),
    loadOrgFollowSuggestions(viewerId, FEED_PROMO_POOL_FETCH.studios, {
      loaiToChuc: ["studio", "doanh_nghiep"],
    }),
    loadKhoaHocGoiY(FEED_PROMO_POOL_FETCH.courses),
    loadOrgFollowSuggestions(viewerId, FEED_PROMO_POOL_FETCH.schools, {
      loaiToChuc: [...CO_SO_DAO_TAO_LOAI],
    }),
  ]);

  const pools: FeedPromoPools = {
    people: mapPeople(people) ?? undefined,
    events: events ?? undefined,
    studios:
      mapOrgs(studios, "studios", "Studio gợi ý", "/studio", "studio") ??
      undefined,
    courses: mapCourses(courses, "Khóa học gợi ý") ?? undefined,
    schools:
      mapOrgs(
        schools,
        "schools",
        "Cơ sở đào tạo",
        "/co-so-dao-tao",
        "co_so_dao_tao",
      ) ?? undefined,
  };

  /* Thứ tự ổn định theo chu kỳ — timeline index bằng kind. */
  const ordered: FeedPromoVariant[] = [];
  for (const kind of [
    "people",
    "events",
    "studios",
    "courses",
    "schools",
  ] as const) {
    const v = pools[kind];
    if (v) ordered.push(v);
  }
  return ordered;
}
