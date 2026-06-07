import { congDongBannerImageUrl, congDongImageUrl } from "@/lib/cong-dong/images";
import { milestoneCardContentKind, milestoneCardPhotoGrid } from "@/lib/journey/milestone-card-kind";
import type { CongDongPost } from "@/lib/cong-dong/types";
import { gridThumbSrc } from "@/lib/journey/image-grid";
/** Ảnh thumbnail cho grid view / OG — ưu tiên mirror Journey. */
export function congDongFeedPostCoverUrl(post: CongDongPost): string | null {
  const mirror = post.journeyMirror;
  if (mirror) {
    const kind = milestoneCardContentKind(mirror.noiDungBlocks);
    if (kind === "photo") {
      const first = milestoneCardPhotoGrid(mirror.noiDungBlocks)?.[0];
      if (first) return gridThumbSrc(first);
    }
    if (mirror.coverId) {
      return congDongBannerImageUrl(mirror.coverId);
    }
  }

  const coverMedia = post.media[0];
  return coverMedia ? congDongImageUrl(coverMedia.cloudflareId) : null;
}
