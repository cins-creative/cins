import "server-only";

import { swapCfImageVariant } from "@/lib/cloudflare/cf-variant-url";
import {
  FILTER_GROUP_LABELS,
  galleryFilterSpecFromSearch,
  galleryItemThumbSrc,
  filterGalleryItemsForShare,
  shareFilterVersionToken,
  type JourneyGalleryFilterShareSpec,
  type ShareGallerySourceItem,
} from "@/lib/journey/gallery-filter-share";
import {
  fetchGalleryMainPage,
  fetchGalleryTotalCount,
  type GalleryMainItem,
} from "@/lib/journey/gallery-page-fetch";
import {
  formatTinhThanh,
  getAvatarUrl,
  getGiaiDoanLabel,
  getNameInitials,
  getProfileCoverUrl,
} from "@/lib/journey/profile";
import { fetchOwnerBySlug } from "@/lib/journey/profile-page-fetch";
import type {
  JourneyGalleryCardVariant,
  JourneyJourneyCardVariant,
  JourneyShareProfile,
} from "@/lib/journey/profile-share";
import {
  buildShareOgSnapshotKey,
  parseShareOgThemeState,
  resolveShareOgSnapshotUrl,
  type ShareOgTheme,
} from "@/lib/journey/share-og-theme";
import { journeyImageFields } from "@/lib/journey/images";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type OgShareKind = "journey" | "gallery";

/** Query ảnh hưởng OG trên `/{slug}`. */
export type OgShareSearch = {
  view?: string | null;
  nhom?: string | null;
  filter?: string | null;
};

export type OgShareContext = {
  profile: JourneyShareProfile;
  displayTitle: string;
  description: string;
  theme: ShareOgTheme;
  layout: JourneyJourneyCardVariant | JourneyGalleryCardVariant;
  kind: OgShareKind;
  /** Spec filter gallery đang áp dụng (null = Journey / Portfolio tất cả). */
  filterSpec: JourneyGalleryFilterShareSpec | null;
  /** Token ngắn để bust cache OG theo filter. */
  filterVersion: string | null;
  /**
   * PNG thẻ đã publish lên CF (ưu tiên làm `og:image`).
   * Null → fallback `/{slug}/opengraph-image`.
   */
  ogSnapshotUrl: string | null;
};

function ogImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return swapCfImageVariant(url, "public");
}

function truncateBio(text: string | null | undefined, max = 140): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export function ogKindFromSearch(view: string | null | undefined): OgShareKind {
  return view === "gallery" ? "gallery" : "journey";
}

/** Build query string từ params share (không gồm `v=`). */
export function buildOgShareSearchParams(search: OgShareSearch): URLSearchParams {
  const params = new URLSearchParams();
  if (search.view === "gallery") params.set("view", "gallery");
  const filter = search.filter?.trim();
  const nhom = search.nhom?.trim();
  if (filter) {
    params.set("filter", filter);
  } else if (nhom && nhom !== "all") {
    params.set("nhom", nhom);
  }
  return params;
}

function searchStringFromOgSearch(search: OgShareSearch): string {
  return buildOgShareSearchParams(search).toString();
}

async function resolvePersonalFilterLabel(
  userId: string,
  filterSlug: string,
): Promise<string> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("filter_nhan")
    .select("ten")
    .eq("id_nguoi_dung", userId)
    .eq("slug", filterSlug)
    .maybeSingle<{ ten: string }>();
  return data?.ten?.trim() || filterSlug;
}

async function resolveGalleryFilterSpec(
  userId: string,
  search: OgShareSearch,
): Promise<JourneyGalleryFilterShareSpec> {
  const spec = galleryFilterSpecFromSearch(searchStringFromOgSearch(search));
  if (spec.kind === "personal-label") {
    const label = await resolvePersonalFilterLabel(userId, spec.slug);
    return { ...spec, label };
  }
  if (spec.kind === "group") {
    return {
      ...spec,
      label: FILTER_GROUP_LABELS[spec.group] ?? spec.label,
    };
  }
  return spec;
}

function toShareSources(
  items: ReadonlyArray<GalleryMainItem>,
): ShareGallerySourceItem[] {
  return items.map((item) => ({
    src: item.src,
    type: item.type,
    variant: item.variant,
    visibility: item.visibility,
    personalFilterSlugs: item.personalFilterSlugs,
    videoPreviewSrc: item.videoPreviewSrc,
  }));
}

/** Thumbs bài cộng đồng — gallery public không gồm `cong_dong`. */
async function fetchCongDongOgThumbs(
  userId: string,
  limit = 5,
): Promise<{ thumbs: string[]; count: number }> {
  const admin = createServiceRoleClient();
  const { data: mocRows, count } = await admin
    .from("content_cot_moc")
    .select("id", { count: "exact" })
    .eq("id_nguoi_dung", userId)
    .eq("che_do_hien_thi", "cong_dong")
    .order("thoi_diem", { ascending: false })
    .limit(40);

  const mocIds = (mocRows ?? []).map((r) => r.id as string);
  if (mocIds.length === 0) return { thumbs: [], count: count ?? 0 };

  const { data: linkRows } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select("id_cot_moc, content_tac_pham!inner(cover_id)")
    .in("id_cot_moc", mocIds);

  type LinkRow = {
    id_cot_moc: string;
    content_tac_pham: { cover_id: string | null } | null;
  };

  const coverByMoc = new Map<string, string>();
  for (const row of (linkRows as LinkRow[] | null) ?? []) {
    const coverId = row.content_tac_pham?.cover_id?.trim();
    if (!coverId || coverByMoc.has(row.id_cot_moc)) continue;
    const fields = journeyImageFields(coverId, "gallery-grid");
    const src = fields?.src ? ogImageUrl(fields.src) ?? fields.src : null;
    if (src) coverByMoc.set(row.id_cot_moc, src);
  }

  const thumbs: string[] = [];
  for (const id of mocIds) {
    const src = coverByMoc.get(id);
    if (!src) continue;
    thumbs.push(src);
    if (thumbs.length >= limit) break;
  }

  return { thumbs, count: count ?? thumbs.length };
}

async function fetchFilteredGalleryForOg(
  userId: string,
  ownerSlug: string,
  spec: JourneyGalleryFilterShareSpec,
): Promise<{ thumbs: string[]; count: number }> {
  if (spec.kind === "group" && spec.group === "cong-dong") {
    return fetchCongDongOgThumbs(userId, 5);
  }

  const collected: GalleryMainItem[] = [];
  let offset = 0;
  let totalCount = 0;
  let filterCountHint: number | null = null;
  const maxPages = 3;

  for (let page = 0; page < maxPages; page += 1) {
    const result = await fetchGalleryMainPage({
      userId,
      ownerSlug,
      offset,
      limit: 48,
    });
    totalCount = result.totalCount;
    if (spec.kind === "group") {
      filterCountHint = result.filterCounts[spec.group] ?? null;
    } else if (spec.kind === "all") {
      filterCountHint = result.totalCount;
    }
    collected.push(...result.items);
    if (!result.hasMore) break;

    const soFar = filterGalleryItemsForShare(toShareSources(collected), spec);
    if (soFar.length >= 5 && spec.kind !== "personal-label") break;
    if (soFar.length >= 5 && spec.kind === "personal-label") {
      /* personal: cố lấy đủ 5; dừng nếu đã đủ */
      break;
    }
    offset = result.nextOffset;
  }

  const filtered = filterGalleryItemsForShare(toShareSources(collected), spec);
  const thumbs = filtered
    .map((item) => ogImageUrl(galleryItemThumbSrc(item)) ?? galleryItemThumbSrc(item))
    .filter(Boolean)
    .slice(0, 5);

  const count =
    filterCountHint != null
      ? filterCountHint
      : spec.kind === "all"
        ? totalCount
        : filtered.length;

  return { thumbs, count };
}

/** Dữ liệu hồ sơ cho OG image + metadata — chỉ profile công khai (`giai_doan` đã set). */
export async function fetchOgShareContext(
  slug: string,
  search: OgShareSearch = {},
): Promise<OgShareContext | null> {
  const { owner, error } = await fetchOwnerBySlug(slug);
  if (error || !owner || owner.giai_doan === null) return null;

  const kind = ogKindFromSearch(search.view);
  const admin = createServiceRoleClient();

  const themeState = parseShareOgThemeState(owner.theme, owner.slug);
  const layout =
    kind === "gallery" ? themeState.layouts.gallery : themeState.layouts.journey;

  const snapshotUrlFor = (filterVersion: string | null) =>
    resolveShareOgSnapshotUrl(
      themeState,
      buildShareOgSnapshotKey({
        kind,
        filterVersion,
        layout,
        theme: themeState.active,
      }),
    );

  const displayName = owner.ten_hien_thi?.trim() || owner.slug;

  if (kind === "journey") {
    const [{ count: cotMoc }, galleryCount] = await Promise.all([
      admin
        .from("content_cot_moc")
        .select("id", { count: "exact", head: true })
        .eq("id_nguoi_dung", owner.id),
      fetchGalleryTotalCount(owner.id),
    ]);

    const bio = truncateBio(owner.bio);
    const profile: JourneyShareProfile = {
      slug: owner.slug,
      displayName,
      initials: getNameInitials(owner.ten_hien_thi, owner.slug),
      avatarUrl: ogImageUrl(getAvatarUrl(owner.avatar_id)),
      coverUrl: ogImageUrl(getProfileCoverUrl(owner.cover_id)),
      bio,
      roleLine: getGiaiDoanLabel(owner.giai_doan),
      locationLine: formatTinhThanh(owner.tinh_thanh),
      stats: {
        cotMoc: cotMoc ?? 0,
        tacPham: galleryCount,
      },
    };

    return {
      profile,
      displayTitle: displayName,
      description:
        bio ?? `Hành trình sáng tạo của ${displayName} trên CINs.`,
      theme: themeState.active,
      layout,
      kind,
      filterSpec: null,
      filterVersion: null,
      ogSnapshotUrl: snapshotUrlFor(null),
    };
  }

  const filterSpec = await resolveGalleryFilterSpec(owner.id, search);
  const [{ count: cotMoc }, galleryTotal, filtered] = await Promise.all([
    admin
      .from("content_cot_moc")
      .select("id", { count: "exact", head: true })
      .eq("id_nguoi_dung", owner.id),
    fetchGalleryTotalCount(owner.id),
    fetchFilteredGalleryForOg(owner.id, slug, filterSpec),
  ]);

  const isFiltered = filterSpec.kind !== "all";
  const tacPhamCount = isFiltered ? filtered.count : galleryTotal;
  const filterLabel = filterSpec.label;

  const profile: JourneyShareProfile = {
    slug: owner.slug,
    displayName,
    initials: getNameInitials(owner.ten_hien_thi, owner.slug),
    avatarUrl: ogImageUrl(getAvatarUrl(owner.avatar_id)),
    coverUrl: ogImageUrl(getProfileCoverUrl(owner.cover_id)),
    bio: truncateBio(owner.bio),
    roleLine: getGiaiDoanLabel(owner.giai_doan),
    locationLine: formatTinhThanh(owner.tinh_thanh),
    stats: {
      cotMoc: cotMoc ?? 0,
      tacPham: tacPhamCount,
    },
    galleryThumbs: filtered.thumbs,
  };

  const displayTitle = isFiltered
    ? `Portfolio · ${filterLabel} · ${displayName}`
    : `Portfolio · ${displayName}`;
  const description = isFiltered
    ? `${tacPhamCount} tác phẩm · ${filterLabel} — ${displayName} trên CINs.`
    : `${galleryTotal} tác phẩm của ${displayName} trên CINs.`;

  const filterVersion = shareFilterVersionToken(
    isFiltered ? filterSpec : null,
  );

  return {
    profile,
    displayTitle,
    description,
    theme: themeState.active,
    layout,
    kind,
    filterSpec: isFiltered ? filterSpec : null,
    filterVersion,
    ogSnapshotUrl: snapshotUrlFor(filterVersion),
  };
}
