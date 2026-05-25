import { getCoverUrl } from "@/lib/articles/cover";
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
