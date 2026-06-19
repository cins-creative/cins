import type { MilestoneItem } from "@/components/journey/milestone-types";
import { milestoneContentKind } from "@/lib/journey/post-media";

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
    return {
      id: spec.id,
      label: spec.label,
      kind: "media",
      media: spec.media,
      icon: spec.icon,
    };
  });
}

export function findWorldJourneyFilterChip(
  chips: ReadonlyArray<WjFilterChip>,
  activeFilter: string,
): WjFilterChip | undefined {
  return chips.find((chip) => chip.id === activeFilter);
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
};

export function worldJourneyMilestoneMatchesFilter(
  milestone: MilestoneItem,
  chip: WjFilterChip | undefined,
): boolean {
  if (!chip || chip.kind === "all") return true;

  if (chip.kind === "media") {
    const kind = milestoneContentKind(milestone.noiDungBlocks);
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

  if (chip.kind === "media") {
    return postMediaKind(post) === chip.media;
  }

  const slugs = (post.linhVucSlugs ?? []).map((s) => s.toLowerCase());
  const target = chip.linhVucSlug.toLowerCase();
  return slugs.some(
    (s) => s === target || s.includes(target) || target.includes(s),
  );
}

export const WORLD_JOURNEY_SORT_OPTIONS = [
  "Mới nhất",
  "Đang sôi nổi",
  "Theo dõi",
  "Verified",
] as const;
