import type {
  MilestoneItem,
  MilestoneType,
  MilestoneVisibility,
  MilestoneVisibilityCustom,
} from "@/components/journey/milestone-types";
import type { PersonalFilterRef } from "@/lib/filter/types";

export type MilestoneInlinePatchDetail =
  | {
      milestoneId: string;
      kind: "type";
      value: MilestoneType;
    }
  | {
      milestoneId: string;
      kind: "visibility";
      value: MilestoneVisibility;
      visibilityCustom?: MilestoneVisibilityCustom | null;
    }
  | {
      milestoneId: string;
      kind: "personalFilters";
      value: string[];
      personalFilters?: PersonalFilterRef[];
    }
  | {
      milestoneId: string;
      kind: "journeyPin";
      value: string | null;
    };

export const MILESTONE_INLINE_PATCH_EVENT = "cins:milestone-inline-patch";

export function dispatchMilestoneInlinePatch(detail: MilestoneInlinePatchDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<MilestoneInlinePatchDetail>(MILESTONE_INLINE_PATCH_EVENT, {
      detail,
    }),
  );
}

export function applyMilestoneInlinePatch(
  milestones: ReadonlyArray<MilestoneItem>,
  detail: MilestoneInlinePatchDetail,
): MilestoneItem[] {
  return milestones.map((m) => {
    if (m.id !== detail.milestoneId && m.cotMocId !== detail.milestoneId) {
      return m;
    }
    if (detail.kind === "type") {
      return { ...m, type: detail.value as MilestoneType };
    }
    if (detail.kind === "personalFilters") {
      return {
        ...m,
        personalFilterSlugs: detail.value,
        personalFilters: detail.personalFilters ?? m.personalFilters ?? [],
      };
    }
    if (detail.kind === "journeyPin") {
      return { ...m, journeyGhimLuc: detail.value };
    }
    return {
      ...m,
      visibility: detail.value as MilestoneVisibility,
      visibilityCustom:
        detail.visibilityCustom === undefined
          ? null
          : detail.visibilityCustom,
    };
  });
}

type GalleryInlinePatchItem = {
  cotMocId?: string | null;
  type?: MilestoneType;
  visibility?: MilestoneVisibility | "feature" | "public";
  featured?: boolean;
  personalFilterSlugs?: string[];
  personalFilters?: PersonalFilterRef[];
};

/**
 * Patch gallery card list (client cache + grid local state).
 * Ẩn khỏi Gallery khi đổi sang bạn bè / chỉ mình.
 */
export function applyGalleryMilestoneInlinePatch<T extends GalleryInlinePatchItem>(
  items: ReadonlyArray<T>,
  detail: MilestoneInlinePatchDetail,
): T[] {
  const idx = items.findIndex((it) => it.cotMocId === detail.milestoneId);
  if (idx < 0) return items as T[];

  if (detail.kind === "visibility") {
    if (detail.value !== "feature" && detail.value !== "public") {
      return items.filter((it) => it.cotMocId !== detail.milestoneId) as T[];
    }
    const cur = items[idx]!;
    if (
      cur.visibility === detail.value &&
      cur.featured === (detail.value === "feature")
    ) {
      return items as T[];
    }
    const next = items.slice();
    next[idx] = {
      ...cur,
      visibility: detail.value,
      featured: detail.value === "feature",
    };
    return next;
  }

  if (detail.kind === "type") {
    const cur = items[idx]!;
    if (cur.type === detail.value) return items as T[];
    const next = items.slice();
    next[idx] = { ...cur, type: detail.value };
    return next;
  }

  if (detail.kind === "personalFilters") {
    const cur = items[idx]!;
    const next = items.slice();
    next[idx] = {
      ...cur,
      personalFilterSlugs: detail.value,
      personalFilters: detail.personalFilters ?? cur.personalFilters,
    };
    return next;
  }

  return items as T[];
}
