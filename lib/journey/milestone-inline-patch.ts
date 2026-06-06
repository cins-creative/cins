import type {
  MilestoneItem,
  MilestoneType,
  MilestoneVisibility,
} from "@/components/journey/milestone-types";

export type MilestoneInlinePatchDetail = {
  milestoneId: string;
  kind: "type" | "visibility";
  value: MilestoneType | MilestoneVisibility;
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
    return { ...m, visibility: detail.value as MilestoneVisibility };
  });
}
