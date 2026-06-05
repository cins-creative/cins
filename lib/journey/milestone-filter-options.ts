import type {
  MilestoneType,
  MilestoneVariant,
} from "@/components/journey/milestone-types";
import type { FilterGroup } from "@/components/journey/JourneyTimelineBar";
import type { MilestoneFilterCounts } from "@/lib/journey/milestones-page-fetch";

export type FilterableMilestone = {
  type: MilestoneType;
  variant: MilestoneVariant;
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
  };
  for (const item of items) {
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
  return [
    { group: "all" as const, label: "Tất cả", count: counts.all, section: "type" as const },
    { group: "hoc" as const, label: "Học tập", count: counts.hoc, section: "type" as const },
    { group: "lam" as const, label: "Công việc", count: counts.lam, section: "type" as const },
    { group: "du-an" as const, label: "Dự án", count: counts["du-an"], section: "type" as const },
    { group: "su-kien" as const, label: "Sự kiện", count: counts["su-kien"], section: "type" as const },
    {
      group: "thanh-tuu" as const,
      label: "Thành tựu",
      count: counts["thanh-tuu"],
      section: "type" as const,
    },
    { group: "ca-nhan" as const, label: "Cá nhân", count: counts["ca-nhan"], section: "type" as const },
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
    modifier?: "verified" | "bookmark";
  }>;
}

export function filterByGroup<T extends FilterableMilestone>(
  items: ReadonlyArray<T>,
  filter: FilterGroup,
): T[] {
  if (filter === "all") return [...items];
  if (filter === "verified") return items.filter((m) => m.variant === "verified");
  if (filter === "bookmark") return items.filter((m) => m.variant === "bookmark");
  return items.filter((m) => m.type === filter);
}
