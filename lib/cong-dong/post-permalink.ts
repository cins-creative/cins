import type { CongDongPost } from "@/lib/cong-dong/types";

/** Permalink Journey cho bài có tác phẩm gắn cột mốc. */
export function congDongPostPermalink(
  post: Pick<CongDongPost, "author" | "journeyMirror">,
): string | null {
  const mirror = post.journeyMirror;
  const postSlug = mirror?.postSlug?.trim();
  if (!postSlug) return null;
  const ownerSlug = (mirror?.ownerSlug || post.author.slug)?.trim();
  if (!ownerSlug) return null;
  return `/${ownerSlug}/p/${postSlug}`;
}
