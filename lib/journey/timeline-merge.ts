import type { MilestoneItem } from "@/components/journey/milestone-types";
import { compareTimelineOrder } from "@/lib/journey/timeline-sort";

function milestoneCotMocKey(item: MilestoneItem): string {
  return item.cotMocId ?? item.id;
}

/** Chèn / cập nhật một milestone vào danh sách timeline (sort giống server). */
export function mergeMilestoneIntoTimeline(
  items: ReadonlyArray<MilestoneItem>,
  incoming: MilestoneItem,
): MilestoneItem[] {
  const existingIdx = items.findIndex(
    (m) => m.id === incoming.id || milestoneCotMocKey(m) === milestoneCotMocKey(incoming),
  );
  const base =
    existingIdx >= 0
      ? items.map((m, i) => (i === existingIdx ? { ...m, ...incoming } : m))
      : [...items, incoming];
  return [...base].sort(compareTimelineOrder);
}

export function removeMilestoneByTacPhamId(
  items: ReadonlyArray<MilestoneItem>,
  tacPhamId: string,
): MilestoneItem[] {
  return items.filter(
    (m) => m.tacPhamId !== tacPhamId && !m.id.endsWith(`:${tacPhamId}`),
  );
}
