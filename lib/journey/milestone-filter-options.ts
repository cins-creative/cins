import type {
  MilestoneType,
  MilestoneVariant,
  MilestoneVisibility,
} from "@/components/journey/milestone-types";
import type { FilterGroup } from "@/components/journey/JourneyTimelineBar";
import type { MilestoneFilterCounts } from "@/lib/journey/milestones-page-fetch";
import { JOURNEY_MILESTONE_TYPE_OPTIONS } from "@/lib/journey/milestone-type-options";

export type FilterableMilestone = {
  type: MilestoneType;
  variant: MilestoneVariant;
  visibility?: MilestoneVisibility;
};

export function computeFilterCounts(
  items: ReadonlyArray<FilterableMilestone>,
): MilestoneFilterCounts {
  const c: MilestoneFilterCounts = {
    all: items.length,
    hoc: 0,
    lam: 0,
    "du-an": 0,
    "su-kien": 0,
    "thanh-tuu": 0,
    "ca-nhan": 0,
    bookmark: 0,
    verified: 0,
    "cong-dong": 0,
  };
  for (const item of items) {
    if (item.visibility === "cong-dong") c["cong-dong"] += 1;
    if (item.type === "hoc") c.hoc += 1;
    else if (item.type === "lam") c.lam += 1;
    else if (item.type === "du-an") c["du-an"] += 1;
    else if (item.type === "su-kien") c["su-kien"] += 1;
    else if (item.type === "thanh-tuu") c["thanh-tuu"] += 1;
    else if (item.type === "ca-nhan") c["ca-nhan"] += 1;
    if (item.variant === "verified") c.verified += 1;
    if (item.variant === "bookmark") c.bookmark += 1;
  }
  return c;
}

export function buildFilterOptions(counts: MilestoneFilterCounts) {
  const typeOptions = JOURNEY_MILESTONE_TYPE_OPTIONS.map((opt) => ({
    group: opt.ui as FilterGroup,
    label: opt.label,
    count: counts[opt.ui as keyof MilestoneFilterCounts] as number,
    section: "type" as const,
  }));

  return [
    { group: "all" as const, label: "Tất cả", count: counts.all, section: "type" as const },
    ...typeOptions,
    {
      group: "cong-dong" as const,
      label: "Cộng đồng",
      count: counts["cong-dong"],
      section: "type" as const,
      modifier: "cong-dong" as const,
    },
    {
      group: "verified" as const,
      label: "Verified",
      count: counts.verified,
      section: "status" as const,
      modifier: "verified" as const,
    },
    {
      group: "bookmark" as const,
      label: "Lưu về",
      count: counts.bookmark,
      section: "status" as const,
      modifier: "bookmark" as const,
    },
  ] satisfies ReadonlyArray<{
    group: FilterGroup;
    label: string;
    count: number;
    section: "type" | "status";
    modifier?: "verified" | "bookmark" | "cong-dong";
  }>;
}

export function filterByGroup<T extends FilterableMilestone>(
  items: ReadonlyArray<T>,
  filter: FilterGroup,
): T[] {
  if (filter === "all") return [...items];
  if (filter === "cong-dong") {
    return items.filter((m) => m.visibility === "cong-dong");
  }
  if (filter === "verified") return items.filter((m) => m.variant === "verified");
  if (filter === "bookmark") return items.filter((m) => m.variant === "bookmark");
  return items.filter((m) => m.type === filter);
}
