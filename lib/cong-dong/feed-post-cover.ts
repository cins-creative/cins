import { congDongBannerImageUrl, congDongImageUrl } from "@/lib/cong-dong/images";
import { congDongMirrorPhotoGrid } from "@/lib/cong-dong/feed-post-media";
import type { CongDongPost } from "@/lib/cong-dong/types";
import { gridThumbSrc } from "@/lib/journey/image-grid";
import { detectMediaPostKind } from "@/lib/journey/post-media";

/** Ảnh thumbnail cho grid view / OG — ưu tiên mirror Journey. */
export function congDongFeedPostCoverUrl(post: CongDongPost): string | null {
  const mirror = post.journeyMirror;
  if (mirror) {
    const kind = detectMediaPostKind(mirror.noiDungBlocks);
    if (kind === "photo") {
      const extraIds = post.media.map((m) => m.cloudflareId);
      const imgs = congDongMirrorPhotoGrid(mirror.noiDungBlocks, extraIds);
      const first = imgs?.[0];
      if (first) return gridThumbSrc(first);
    }
    if (mirror.coverId) {
      return congDongBannerImageUrl(mirror.coverId);
    }
  }

  const coverMedia = post.media[0];
  return coverMedia ? congDongImageUrl(coverMedia.cloudflareId) : null;
}
