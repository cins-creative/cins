import { WORLD_JOURNEY_VIDEO_RAIL_SIZE } from "@/lib/cins/worldJourneyFeedConstants";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";

/**
 * Lấy `count` video từ pool với wrap-around — không lặp id trong cùng rail.
 * Trả về slice + cursor kế tiếp (modulo pool length).
 */
export function takeVideoRailSlice(
  pool: ReadonlyArray<GalleryMainItem>,
  offset: number,
  count = WORLD_JOURNEY_VIDEO_RAIL_SIZE,
): { items: GalleryMainItem[]; nextOffset: number } {
  if (pool.length === 0 || count <= 0) {
    return { items: [], nextOffset: 0 };
  }

  const items: GalleryMainItem[] = [];
  const start = ((offset % pool.length) + pool.length) % pool.length;
  let i = 0;
  while (items.length < count && i < pool.length) {
    const card = pool[(start + i) % pool.length];
    i += 1;
    if (!card) break;
    if (items.some((x) => x.id === card.id)) break;
    items.push(card);
  }

  const nextOffset = (start + items.length) % pool.length;
  return { items, nextOffset };
}
