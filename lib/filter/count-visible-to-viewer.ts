import "server-only";

import { loadPersonalFilterSlugsForCotMocs } from "@/lib/filter/gan";
import { listVisibleTimelineCotMocIds } from "@/lib/journey/milestones-page-fetch";

/** Đếm nhãn theo slug — chỉ cột mốc visitor được xem trên timeline. */
export async function countPersonalFilterSlugsVisibleToViewer(
  ownerUserId: string,
  viewerId: string | null,
): Promise<Map<string, number>> {
  const cotMocIds = await listVisibleTimelineCotMocIds(ownerUserId, viewerId);
  if (cotMocIds.length === 0) return new Map();

  const slugMap = await loadPersonalFilterSlugsForCotMocs(cotMocIds);
  const counts = new Map<string, number>();
  for (const slugs of slugMap.values()) {
    for (const slug of slugs) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }
  return counts;
}
