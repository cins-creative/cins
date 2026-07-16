"use client";

import { MoTaMarkdown } from "@/components/editor/compose/MoTaMarkdown";
import { GalleryVideoPlayBadge } from "@/components/journey/GalleryItemVisual";
import { orgBaiDangPostsToGridItems } from "@/lib/truong/bai-dang-grid";
import type { TruongBaiDang } from "@/lib/truong/types";

type Props = {
  posts: TruongBaiDang[];
  /** Mở bài đăng → overlay chi tiết (kiểu PostModalShell). */
  onOpenPost: (postId: string) => void;
  /** `masonry` = Showcase mặc định; `card` = thẻ trắng như Journey gallery. */
  layout?: "card" | "masonry";
};

/**
 * Lưới bài đăng org — đồng bộ markup Journey Gallery
 * (`--card` hoặc `--masonry`).
 */
export function OrgBaiDangGridView({
  posts,
  onOpenPost,
  layout = "card",
}: Props) {
  const items = orgBaiDangPostsToGridItems(posts);

  if (items.length === 0) {
    return (
      <p className="tdh-placeholder">Không có bài đăng thuộc nhóm lọc này.</p>
    );
  }

  const gridClass =
    layout === "masonry"
      ? "j-main-gallery-grid j-main-gallery-grid--masonry org-baidang-grid"
      : "j-main-gallery-grid j-main-gallery-grid--card org-baidang-grid";

  return (
    <div className={gridClass} role="list" aria-label="Lưới bài đăng">
      {items.map((it) => {
        const meta = it.excerpt?.trim() || it.loaiLabel;
        return (
          <button
            key={it.id}
            type="button"
            role="listitem"
            className={`j-main-gallery-item${it.thumbSrc ? "" : " is-text"}`}
            onClick={() => onOpenPost(it.id)}
            aria-label={`Mở bài đăng: ${it.title}`}
          >
            <div className="j-main-gallery-thumb">
              {it.thumbSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.thumbSrc}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              ) : null}
              {it.isVideo ? <GalleryVideoPlayBadge /> : null}
            </div>
            {layout === "card" ? (
              <span className="j-main-gallery-info-panel">
                <strong className="j-main-gallery-info-title">{it.title}</strong>
                {meta ? (
                  <MoTaMarkdown
                    text={meta}
                    as="small"
                    className="j-main-gallery-info-excerpt"
                    linkify={false}
                  />
                ) : null}
              </span>
            ) : (
              <span className="j-main-gallery-overlay" aria-hidden>
                <span className="j-main-gallery-overlay-title">{it.title}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
