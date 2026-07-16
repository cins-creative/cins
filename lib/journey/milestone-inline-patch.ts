import type {
  MilestoneItem,
  MilestoneType,
  MilestoneVisibility,
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
    return { ...m, visibility: detail.value as MilestoneVisibility };
  });
}
