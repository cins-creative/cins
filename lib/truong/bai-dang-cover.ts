import { getCoverUrl } from "@/lib/articles/cover";
import type { Block } from "@/lib/editor/types";
import {
  extractImagesFromImgsBlock,
  gridThumbSrc,
} from "@/lib/journey/image-grid";
import { getCfImageUrlWithFallbacks } from "@/lib/truong/images";
import type { TruongBaiDang } from "@/lib/truong/types";

/** URL hiển thị banner bài đăng — ưu tiên `cover_src` từ server. */
export function baiDangCoverDisplayUrl(
  post: Pick<TruongBaiDang, "cover_id" | "cover_src">,
): string | null {
  const src = post.cover_src?.trim();
  if (src) return src;

  const id = post.cover_id?.trim();
  if (!id) return null;
  if (/^https?:\/\//i.test(id)) return id;

  return (
    getCfImageUrlWithFallbacks(id, ["public", "cover", "medium"]) ??
    getCoverUrl(id, "public")
  );
}

/** Ảnh đầu tiên trong `noi_dung_blocks` — preview card khi chưa có cover. */
export function baiDangFirstBlockImageUrl(
  blocks: ReadonlyArray<Block> | null | undefined,
): string | null {
  if (!blocks?.length) return null;
  for (const block of blocks) {
    if (block.loai !== "imgs") continue;
    const images = extractImagesFromImgsBlock(block);
    const first = images[0];
    if (!first) continue;
    const src = gridThumbSrc(first).trim();
    return src || null;
  }
  return null;
}

/** URL preview timeline — cover DB hoặc ảnh đầu trong blocks. */
export function baiDangTimelinePreviewUrl(
  post: Pick<TruongBaiDang, "cover_id" | "cover_src" | "noiDungBlocks">,
): string | null {
  return (
    baiDangCoverDisplayUrl(post) ??
    baiDangFirstBlockImageUrl(post.noiDungBlocks)
  );
}
