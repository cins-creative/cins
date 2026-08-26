/**
 * Warm browser cache + đo natural size cho ảnh feed.
 * Gọi khi danh sách milestone cập nhật (SSR seed + load-more).
 * Dimension ghi vào `image-dimension-cache` → ImageGrid layout ngay, bỏ pha khung đo.
 */

import type { MilestoneItem } from "@/components/journey/milestone-types";
import {
  rememberImageDimensions,
} from "@/lib/journey/image-dimension-cache";
import {
  gridThumbSrc,
  hasGridImageDimensions,
} from "@/lib/journey/image-grid";
import { milestoneCardPhotoGrid } from "@/lib/journey/milestone-card-kind";

const warmed = new Set<string>();

function warmSrc(key: string, src: string): void {
  const trimmed = src.trim();
  if (!trimmed || warmed.has(trimmed)) return;
  warmed.add(trimmed);
  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      rememberImageDimensions(key, img.naturalWidth, img.naturalHeight);
      rememberImageDimensions(trimmed, img.naturalWidth, img.naturalHeight);
    }
  };
  img.src = trimmed;
}

export function warmFeedMediaUrls(
  milestones: ReadonlyArray<
    Pick<MilestoneItem, "media" | "noiDungBlocks" | "body">
  >,
): void {
  if (typeof window === "undefined") return;

  for (const m of milestones) {
    const cover = m.media?.[0]?.src?.trim();
    if (cover) {
      warmSrc(cover, cover);
    }

    const hasCover = Boolean(cover);
    const grid = milestoneCardPhotoGrid(
      m.noiDungBlocks,
      hasCover,
      m.body,
    );
    if (!grid?.length) continue;

    for (const cell of grid) {
      if (hasGridImageDimensions(cell)) {
        rememberImageDimensions(cell.id, cell.width, cell.height);
        continue;
      }
      const src = gridThumbSrc(cell);
      if (!src) continue;
      warmSrc(cell.id, src);
    }
  }
}
