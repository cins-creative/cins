import type { CoAuthorCredit, MilestoneItem } from "@/components/journey/milestone-types";

export const MILESTONE_CREDITS_UPDATED_EVENT = "cins:milestone-credits-updated";

export type MilestoneCreditsUpdatedDetail = {
  tacPhamId: string;
  coAuthorCredits: CoAuthorCredit[];
};

export function dispatchMilestoneCreditsUpdated(
  detail: MilestoneCreditsUpdatedDetail,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<MilestoneCreditsUpdatedDetail>(
      MILESTONE_CREDITS_UPDATED_EVENT,
      { detail },
    ),
  );
}

export function applyMilestoneCreditsUpdate(
  milestones: ReadonlyArray<MilestoneItem>,
  detail: MilestoneCreditsUpdatedDetail,
): MilestoneItem[] {
  return milestones.map((m) =>
    m.tacPhamId === detail.tacPhamId
      ? { ...m, coAuthorCredits: detail.coAuthorCredits }
      : m,
  );
}
