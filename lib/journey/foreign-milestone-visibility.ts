import type { MilestoneVisibility } from "@/components/journey/milestone-types";
import type { Visibility } from "@/lib/editor/types";

/** Giá trị lưu trên `che_do_hien_thi_journey` (tagged / bookmark). */
export type ForeignJourneyVisibility = Extract<
  Visibility,
  "feature" | "public" | "chi_minh"
>;

export const FOREIGN_JOURNEY_VISIBILITY_VALUES: ReadonlyArray<ForeignJourneyVisibility> =
  ["feature", "public", "chi_minh"];

export function mapForeignJourneyVisibilityToUi(
  value: string | null | undefined,
): MilestoneVisibility {
  if (value === "feature") return "feature";
  if (value === "chi_minh") return "private";
  return "public";
}

export function mapUiVisibilityToForeignJourney(
  ui: MilestoneVisibility,
): ForeignJourneyVisibility {
  if (ui === "feature") return "feature";
  if (ui === "private" || ui === "unlisted") return "chi_minh";
  return "public";
}

export function isHiddenOnForeignJourney(
  journeyVisibility: string | null | undefined,
): boolean {
  return journeyVisibility === "chi_minh";
}
