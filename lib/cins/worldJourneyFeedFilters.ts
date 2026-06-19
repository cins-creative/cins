import type { LinhVucRow } from "@/lib/career/types";
import { NGHE_NGHIEP_HUB_PATH } from "@/lib/cins/hubPaths";

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
      id: "comic";
      label: "Comic";
      icon: "book-open";
      kind: "linh_vuc";
      slugCandidates: string[];
    }
  | {
      id: "ui";
      label: "UI";
      icon: "smartphone";
      kind: "linh_vuc";
      slugCandidates: string[];
    }
  | {
      id: "3d";
      label: "3D";
      icon: "boxes";
      kind: "linh_vuc";
      slugCandidates: string[];
    }
  | {
      id: "audio";
      label: "Audio";
      icon: "audio-lines";
      kind: "linh_vuc";
      slugCandidates: string[];
    }
  | {
      id: "article";
      label: "Bài viết";
      icon: "file-text";
      kind: "media";
      media: "article";
    };

/** Thứ tự chip filter bar — domain chip map sang `linh_vuc.slug` như career hub. */
const WORLD_JOURNEY_FILTER_CHIP_SPECS: ChipSpec[] = [
  { id: "all", label: "Tất cả", icon: "sparkles", kind: "all" },
  { id: "image", label: "Ảnh", icon: "image", kind: "media", media: "photo" },
  { id: "video", label: "Video", icon: "video", kind: "media", media: "video" },
  {
    id: "comic",
    label: "Comic",
    icon: "book-open",
    kind: "linh_vuc",
    slugCandidates: ["hoat-hinh", "phim-hoat-hinh", "lv-phim-hoat-hinh"],
  },
  {
    id: "ui",
    label: "UI",
    icon: "smartphone",
    kind: "linh_vuc",
    slugCandidates: ["ui-ux", "lv-ui-ux", "thiet-ke-do-hoa", "lv-thiet-ke-do-hoa"],
  },
  {
    id: "3d",
    label: "3D",
    icon: "boxes",
    kind: "linh_vuc",
    slugCandidates: ["game", "lv-game"],
  },
  {
    id: "audio",
    label: "Audio",
    icon: "audio-lines",
    kind: "linh_vuc",
    slugCandidates: ["am-thanh", "lv-am-thanh", "audio"],
  },
  {
    id: "article",
    label: "Bài viết",
    icon: "file-text",
    kind: "media",
    media: "article",
  },
];

function linhVucLabel(row: LinhVucRow): string {
  return (row.ten_vi ?? row.ten ?? row.ten_en ?? row.slug ?? "").trim();
}

function slugMatches(row: LinhVucRow, candidate: string): boolean {
  const slug = (row.slug ?? "").trim().toLowerCase();
  const c = candidate.trim().toLowerCase();
  if (!slug || !c) return false;
  return slug === c || slug.endsWith(c) || slug.includes(c);
}

export function resolveLinhVucForFilter(
  linhVucs: ReadonlyArray<LinhVucRow>,
  slugCandidates: string[],
): LinhVucRow | null {
  for (const candidate of slugCandidates) {
    const hit = linhVucs.find((row) => slugMatches(row, candidate));
    if (hit?.slug) return hit;
  }
  return null;
}

export function buildWorldJourneyFilterChips(
  linhVucs: ReadonlyArray<LinhVucRow> = [],
): WjFilterChip[] {
  return WORLD_JOURNEY_FILTER_CHIP_SPECS.map((spec) => {
    if (spec.kind === "all") {
      return {
        id: "all",
        label: spec.label,
        kind: "all",
        icon: spec.icon,
      };
    }
    if (spec.kind === "media") {
      return {
        id: spec.id,
        label: spec.label,
        kind: "media",
        media: spec.media,
        icon: spec.icon,
      };
    }

    const lv = resolveLinhVucForFilter(linhVucs, spec.slugCandidates);
    const slug = lv?.slug?.trim() ?? spec.slugCandidates[0] ?? spec.id;
    const label = lv ? linhVucLabel(lv) : spec.label;

    return {
      id: `linh_vuc:${slug}`,
      label,
      kind: "linh_vuc",
      linhVucSlug: slug,
      careerHubHref: `${NGHE_NGHIEP_HUB_PATH}?linh_vuc=${encodeURIComponent(slug)}`,
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

export type WjPostFilterMeta = {
  feedMediaKind?: WjFeedMediaKind;
  linhVucSlugs?: string[];
};

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
