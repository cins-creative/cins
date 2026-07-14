import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  isTier1EmbedPlatformId,
  TIER1_EMBED_PLATFORMS,
  type EmbedProviderId,
  type Tier1EmbedPlatformId,
} from "@/lib/editor/embed-providers";
import {
  hasGalleryEmbedContent,
  listGalleryEmbedProviders,
} from "@/lib/journey/post-content-kind";
import {
  milestoneContentKind,
  type GalleryMediaKind,
} from "@/lib/journey/post-media";

export type WjFeedMediaKind = "photo" | "video" | "article";

export type WjFilterChip =
  | {
      id: "all";
      label: string;
      kind: "all";
      icon: string;
    }
  | {
      id: string;
      label: string;
      kind: "media";
      media: WjFeedMediaKind;
      icon: string;
    }
  | {
      id: "embed" | `embed:${string}`;
      label: string;
      kind: "embed";
      /** `null` / rỗng = mọi bài nhúng Tier 1 / file .riv/.lottie */
      platforms: Tier1EmbedPlatformId[] | null;
      icon: string;
    }
  | {
      id: string;
      label: string;
      kind: "linh_vuc";
      linhVucSlug: string;
      careerHubHref: string;
      icon: string;
    };

type ChipSpec =
  | { id: "all"; label: "Tất cả"; icon: "sparkles"; kind: "all" }
  | {
      id: "image";
      label: "Ảnh";
      icon: "image";
      kind: "media";
      media: "photo";
    }
  | {
      id: "video";
      label: "Video";
      icon: "video";
      kind: "media";
      media: "video";
    }
  | {
      id: "article";
      label: "Bài viết";
      icon: "file-text";
      kind: "media";
      media: "article";
    }
  | {
      id: "embed";
      label: "Nhúng";
      icon: "code-2";
      kind: "embed";
      platforms: null;
    };

/** Chip filter bar — loại media; lĩnh vực/nghề nằm ở sidebar trái. */
const WORLD_JOURNEY_FILTER_CHIP_SPECS: ChipSpec[] = [
  { id: "all", label: "Tất cả", icon: "sparkles", kind: "all" },
  { id: "image", label: "Ảnh", icon: "image", kind: "media", media: "photo" },
  { id: "video", label: "Video", icon: "video", kind: "media", media: "video" },
  {
    id: "article",
    label: "Bài viết",
    icon: "file-text",
    kind: "media",
    media: "article",
  },
  {
    id: "embed",
    label: "Nhúng",
    icon: "code-2",
    kind: "embed",
    platforms: null,
  },
];

export function buildWorldJourneyFilterChips(): WjFilterChip[] {
  return WORLD_JOURNEY_FILTER_CHIP_SPECS.map((spec) => {
    if (spec.kind === "all") {
      return {
        id: "all",
        label: spec.label,
        kind: "all",
        icon: spec.icon,
      };
    }
    if (spec.kind === "embed") {
      return {
        id: "embed",
        label: spec.label,
        kind: "embed",
        platforms: null,
        icon: spec.icon,
      };
    }
    return {
      id: spec.id,
      label: spec.label,
      kind: "media",
      media: spec.media,
      icon: spec.icon,
    };
  });
}

/** Parse `embed` / `embed:youtube` / `embed:youtube,vimeo`. */
export function parseWorldJourneyEmbedFilterPlatforms(
  activeFilter: string,
): Tier1EmbedPlatformId[] | null {
  if (activeFilter === "embed") return null;
  if (!activeFilter.startsWith("embed:")) return null;
  const parts = activeFilter
    .slice("embed:".length)
    .split(",")
    .map((s) => s.trim())
    .filter(isTier1EmbedPlatformId);
  if (!parts.length) return null;
  return [...new Set(parts)].sort();
}

export function worldJourneyEmbedFilterId(
  platforms: Tier1EmbedPlatformId | ReadonlyArray<Tier1EmbedPlatformId> | null,
): "embed" | `embed:${string}` {
  if (platforms == null) return "embed";
  const list = (
    Array.isArray(platforms) ? platforms : [platforms]
  ).filter(isTier1EmbedPlatformId);
  const unique = [...new Set(list)].sort();
  if (!unique.length) return "embed";
  return `embed:${unique.join(",")}`;
}

/** Bật/tắt một nền tảng trong filter nhúng (multi-select). */
export function toggleWorldJourneyEmbedFilterPlatform(
  activeFilter: string,
  platform: Tier1EmbedPlatformId,
): "embed" | `embed:${string}` {
  const current =
    activeFilter === "embed" || !activeFilter.startsWith("embed:")
      ? []
      : (parseWorldJourneyEmbedFilterPlatforms(activeFilter) ?? []);
  const next = current.includes(platform)
    ? current.filter((id) => id !== platform)
    : [...current, platform];
  return worldJourneyEmbedFilterId(next.length ? next : null);
}

export function resolveWorldJourneyEmbedFilterChip(
  activeFilter: string,
): Extract<WjFilterChip, { kind: "embed" }> | undefined {
  if (activeFilter === "embed") {
    return {
      id: "embed",
      label: "Nhúng",
      kind: "embed",
      platforms: null,
      icon: "code-2",
    };
  }
  if (!activeFilter.startsWith("embed:")) return undefined;
  const platforms = parseWorldJourneyEmbedFilterPlatforms(activeFilter);
  if (!platforms) return undefined;
  if (platforms.length === 1) {
    const platform = platforms[0]!;
    const meta = TIER1_EMBED_PLATFORMS.find((p) => p.id === platform);
    return {
      id: worldJourneyEmbedFilterId(platforms),
      label: meta?.label ?? platform,
      kind: "embed",
      platforms,
      icon: "code-2",
    };
  }
  return {
    id: worldJourneyEmbedFilterId(platforms),
    label: `Nhúng · ${platforms.length}`,
    kind: "embed",
    platforms,
    icon: "code-2",
  };
}

export function findWorldJourneyFilterChip(
  chips: ReadonlyArray<WjFilterChip>,
  activeFilter: string,
): WjFilterChip | undefined {
  const found = chips.find((chip) => chip.id === activeFilter);
  if (found) return found;
  return resolveWorldJourneyEmbedFilterChip(activeFilter);
}

function slugMatchesLinhVuc(candidate: string, target: string): boolean {
  const c = candidate.toLowerCase();
  const t = target.toLowerCase();
  return c === t || c.includes(t) || t.includes(c);
}

/** Lọc theo lĩnh vực sidebar — tag `linh_vuc` hoặc tag nghề có `id_linh_vuc`. */
export function worldJourneyMilestoneMatchesLinhVuc(
  milestone: MilestoneItem,
  linhVucSlug: string | null | undefined,
): boolean {
  if (!linhVucSlug?.trim()) return true;

  const target = linhVucSlug.trim();

  for (const tag of milestone.articleTags ?? []) {
    if (
      tag.loai_bai_viet === "linh_vuc" &&
      tag.slug &&
      slugMatchesLinhVuc(tag.slug, target)
    ) {
      return true;
    }

    const lvSlug = tag.linh_vuc_slug?.trim();
    if (lvSlug && slugMatchesLinhVuc(lvSlug, target)) {
      return true;
    }
  }

  return false;
}

export type WjPostFilterMeta = {
  feedMediaKind?: WjFeedMediaKind;
  linhVucSlugs?: string[];
  hasEmbed?: boolean;
  embedProvider?: EmbedProviderId | null;
};

/** Rive/Lottie host CINs dùng provider `*-file` — khớp khi lọc platform iframe cùng họ. */
export function galleryEmbedMatchesPlatform(
  provider: EmbedProviderId | null | undefined,
  platform: Tier1EmbedPlatformId | null,
): boolean {
  if (!platform) return true;
  if (!provider) return false;
  if (provider === platform) return true;
  if (platform === "rive" && provider === "rive-file") return true;
  if (platform === "lottie" && provider === "lottie-file") return true;
  return false;
}

export function worldJourneyMilestoneMatchesFilter(
  milestone: MilestoneItem,
  chip: WjFilterChip | undefined,
): boolean {
  if (!chip || chip.kind === "all") return true;

  const blocks = milestone.noiDungBlocks;
  const embedProviders = listGalleryEmbedProviders(blocks);
  const isEmbed = embedProviders.length > 0 || hasGalleryEmbedContent(blocks);

  if (chip.kind === "embed") {
    if (!embedProviders.length) return false;
    if (!chip.platforms?.length) return true;
    /* Khớp nếu *bất kỳ* block nhúng trên bài thuộc một nền tảng đã chọn. */
    return embedProviders.some((provider) =>
      chip.platforms!.some((platform) =>
        galleryEmbedMatchesPlatform(provider, platform),
      ),
    );
  }

  if (chip.kind === "media") {
    /* Nhúng Tier 1 / file .riv/.lottie chỉ hiện dưới filter «Nhúng». */
    if (isEmbed) return false;
    const kind = milestoneContentKind(blocks);
    if (chip.media === "photo") return kind === "photo";
    if (chip.media === "video") return kind === "video";
    return kind === "article";
  }

  return worldJourneyMilestoneMatchesLinhVuc(milestone, chip.linhVucSlug);
}

function postMediaKind(post: WjPostFilterMeta): WjFeedMediaKind | null {
  if (post.feedMediaKind) return post.feedMediaKind;
  return null;
}

export function worldJourneyPostMatchesFilter(
  post: WjPostFilterMeta,
  chip: WjFilterChip | undefined,
): boolean {
  if (!chip || chip.kind === "all") return true;

  if (chip.kind === "embed") {
    if (!post.hasEmbed) return false;
    if (!chip.platforms?.length) return true;
    return chip.platforms.some((platform) =>
      galleryEmbedMatchesPlatform(post.embedProvider, platform),
    );
  }

  if (chip.kind === "media") {
    if (post.hasEmbed) return false;
    return postMediaKind(post) === chip.media;
  }

  const slugs = (post.linhVucSlugs ?? []).map((s) => s.toLowerCase());
  const target = chip.linhVucSlug.toLowerCase();
  return slugs.some(
    (s) => s === target || s.includes(target) || target.includes(s),
  );
}

export function worldJourneyGalleryItemMatchesFilter(
  item: {
    mediaKind?: GalleryMediaKind;
    embedProvider?: EmbedProviderId | null;
  },
  chip: WjFilterChip | undefined,
): boolean {
  if (!chip || chip.kind === "all") return true;

  if (chip.kind === "embed") {
    if (item.mediaKind !== "embed") return false;
    if (!chip.platforms?.length) return true;
    return chip.platforms.some((platform) =>
      galleryEmbedMatchesPlatform(item.embedProvider, platform),
    );
  }

  if (chip.kind === "media") {
    if (item.mediaKind === "embed") return false;
    const kind = item.mediaKind ?? "article";
    if (chip.media === "photo") return kind === "photo";
    if (chip.media === "video") return kind === "video";
    return kind === "article";
  }

  /* Gallery WJ chưa gắn articleTags lĩnh vực — bỏ qua linh_vuc (luôn khớp). */
  return true;
}

export function resolveWorldJourneyFeedFilterChip(
  filterId: string | null | undefined,
): WjFilterChip {
  if (!filterId?.trim() || filterId === "all") {
    return {
      id: "all",
      label: "Tất cả",
      kind: "all",
      icon: "sparkles",
    };
  }
  return (
    findWorldJourneyFilterChip(buildWorldJourneyFilterChips(), filterId) ??
    resolveWorldJourneyEmbedFilterChip(filterId) ?? {
      id: "all",
      label: "Tất cả",
      kind: "all",
      icon: "sparkles",
    }
  );
}

/** Query string cho GET /api/world-journey/feed — filter + nguồn + lĩnh vực. */
export function buildWorldJourneyFeedQuery(params: {
  offset?: number;
  limit?: number;
  filter?: string;
  source?: string;
  linhVuc?: string | null;
}): string {
  const q = new URLSearchParams();
  if (typeof params.offset === "number" && params.offset > 0) {
    q.set("offset", String(params.offset));
  } else if (params.offset === 0) {
    q.set("offset", "0");
  }
  if (typeof params.limit === "number" && params.limit > 0) {
    q.set("limit", String(params.limit));
  }
  if (params.filter && params.filter !== "all") {
    q.set("filter", params.filter);
  }
  if (params.source && params.source !== "all") {
    q.set("source", params.source);
  }
  if (params.linhVuc?.trim()) {
    q.set("linhVuc", params.linhVuc.trim());
  }
  return q.toString();
}

export const WORLD_JOURNEY_SORT_OPTIONS = [
  "Mới nhất",
  "Đang sôi nổi",
  "Theo dõi",
  "Verified",
] as const;
