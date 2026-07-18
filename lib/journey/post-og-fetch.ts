import "server-only";

import { getCoverOgUrl } from "@/lib/articles/cover";
import { stripMoTaMarkdown } from "@/lib/editor/mo-ta-markdown";
import { getAvatarUrl } from "@/lib/journey/profile";
import { getCachedPostPageCore } from "@/lib/journey/post-page-cache";
import type { PostOgContext } from "@/lib/journey/post-og-card";
import { milestoneCardCaptionForDisplay } from "@/lib/journey/post-media";

function truncate(text: string | null | undefined, max: number): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/**
 * OG context cho bài viết người dùng.
 * Dùng lại `getCachedPostPageCore` → tôn trọng chế độ hiển thị (riêng tư / bạn bè
 * trả `null` với khách chưa đăng nhập nên OG không lộ nội dung).
 */
export async function fetchPostOgContext(
  ownerSlug: string,
  postSlug: string,
): Promise<PostOgContext | null> {
  const owner = ownerSlug.trim();
  const post = postSlug.trim();
  if (!owner || !post) return null;

  try {
    const res = await getCachedPostPageCore(owner, post);
    if (!res.ok) return null;

    const { milestone, owner: author, posts } = res.data;
    const first = posts[0] ?? null;
    const title = milestone.tieuDe?.trim() || first?.tieuDe?.trim() || "Bài viết";
    const caption =
      milestoneCardCaptionForDisplay(
        title,
        milestone.moTa ?? first?.moTa ?? null,
        first?.noiDungBlocks ?? null,
      ) ??
      milestone.moTa ??
      first?.moTa ??
      null;
    const summary = truncate(stripMoTaMarkdown(caption ?? ""), 165);

    return {
      title,
      summary,
      /** Landscape 1200×630 — khớp FB large card (không dùng `/public` vuông). */
      coverUrl: getCoverOgUrl(first?.coverId ?? null),
      authorName: author.tenHienThi?.trim() || author.slug || "Người dùng",
      authorAvatarUrl: getAvatarUrl(author.avatarId),
      dateLabel: formatDate(milestone.thoiDiem),
      ownerSlug: author.slug?.trim() || owner,
      postSlug: first?.slug?.trim() || post,
    };
  } catch {
    return null;
  }
}
