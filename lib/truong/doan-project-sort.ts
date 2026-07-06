import type { OrgDoanProjectItem } from "@/lib/journey/org-milestone-tag-types";
import type { TagAggSort } from "@/lib/tag/aggregation-types";

export type DoanViewMode = "grid" | "timeline";

export const DOAN_SORT_OPTIONS: { value: TagAggSort; label: string }[] = [
  { value: "moi_nhat", label: "Mới nhất" },
  { value: "nhieu_tuong_tac", label: "Phổ biến" },
  { value: "a_z", label: "A → Z" },
];

export function sortDoanProjects(
  items: OrgDoanProjectItem[],
  sort: TagAggSort,
): OrgDoanProjectItem[] {
  const list = [...items];
  if (sort === "a_z") {
    list.sort((a, b) => a.projectTitle.localeCompare(b.projectTitle, "vi"));
    return list;
  }
  if (sort === "nhieu_tuong_tac") {
    list.sort(
      (a, b) =>
        b.reactionCount - a.reactionCount ||
        b.submittedAt.localeCompare(a.submittedAt),
    );
    return list;
  }
  list.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return list;
}

/** Tab Sản phẩm công khai — điểm org chấm trước, rồi mới nhất. */
export function sortDoanProjectsForPublic(
  items: OrgDoanProjectItem[],
): OrgDoanProjectItem[] {
  return [...items].sort(
    (a, b) =>
      b.diemSapXep - a.diemSapXep ||
      b.submittedAt.localeCompare(a.submittedAt) ||
      a.projectTitle.localeCompare(b.projectTitle, "vi"),
  );
}
