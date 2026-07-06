"use client";

import { useMemo, useState } from "react";

import { GalleryItemVisual, GalleryVideoPlayBadge } from "@/components/journey/GalleryItemVisual";
import { GalleryMediaFilterDropdown } from "@/components/journey/GalleryMediaFilterDropdown";
import type { GalleryMediaKind } from "@/lib/journey/post-media";
import {
  matchesGalleryMediaFilter,
  type GalleryMediaFilter,
} from "@/lib/journey/post-media";

export type GalleryPinnedBanner = {
  id: string;
  /** URL ảnh nền 16:9. */
  src: string;
  srcSet?: string;
  width?: number;
  height?: number;
  /** Badge nhỏ góc trái-trên (Dự án / Motion / Brand…). */
  pin: string;
  title: string;
  meta: string;
  /** Link ngữ cảnh — VD /{slug}?mid=cins. */
  href?: string;
  mediaKind?: GalleryMediaKind;
  isVideo?: boolean;
  videoProcessing?: boolean;
  videoPreviewSrc?: string | null;
};

export type GalleryGridItem = {
  id: string;
  /** URL ảnh vuông 1:1. */
  src: string;
  srcSet?: string;
  width?: number;
  height?: number;
  label: string;
  /** Có icon ✓ góc phải-trên không. */
  isVerified?: boolean;
  /** Có overlay ▶ giữa thumbnail không. */
  isVideo?: boolean;
  videoProcessing?: boolean;
  videoPreviewSrc?: string | null;
  href?: string;
  mediaKind?: GalleryMediaKind;
};

/** @deprecated Use GalleryMediaFilter from post-media */
export type GalleryAsideFilter = GalleryMediaFilter;

type Props = {
  ownerSlug: string;
  /** Tổng số tác phẩm trong gallery (hiển thị trong title). */
  totalTacPham: number;
  /** Banner ghim nổi bật (0..N). 16:9. */
  pinned?: ReadonlyArray<GalleryPinnedBanner>;
  /** Grid item vuông (0..N). 1:1. */
  items?: ReadonlyArray<GalleryGridItem>;
  /** Timeline — chỉ hiển thị milestone gắn thẻ Nổi bật. */
  featuredOnly?: boolean;
};

/**
 * Gallery cột phải — tổng hợp visual từ cột mốc + tác phẩm.
 */
export function JourneyGalleryAside({
  ownerSlug,
  totalTacPham,
  pinned = [],
  items = [],
  featuredOnly = false,
}: Props) {
  void ownerSlug;

  const [filter, setFilter] = useState<GalleryMediaFilter>("all");

  const filteredPinned = useMemo(
    () => pinned.filter((b) => matchesGalleryMediaFilter(b.mediaKind, filter)),
    [pinned, filter],
  );
  const filteredItems = useMemo(
    () =>
      featuredOnly
        ? []
        : items.filter((it) => matchesGalleryMediaFilter(it.mediaKind, filter)),
    [items, filter, featuredOnly],
  );

  const empty = featuredOnly
    ? pinned.length === 0
    : pinned.length === 0 && items.length === 0;
  const filteredEmpty =
    !empty && filteredPinned.length === 0 && filteredItems.length === 0;
  const titleCount = featuredOnly ? pinned.length : totalTacPham;
  const showFilter = featuredOnly ? pinned.length > 0 : totalTacPham > 0;

  return (
    <aside
      className="j-gallery"
      aria-label={featuredOnly ? "Nội dung nổi bật" : "Tác phẩm gần đây"}
    >
      <div className="j-gallery-head">
        <div className="j-gallery-title">
          {featuredOnly ? "Nội dung nổi bật" : "Tác phẩm"}
          <span className="j-gallery-count">{titleCount}</span>
        </div>

        {showFilter ? (
          <GalleryMediaFilterDropdown filter={filter} onFilterChange={setFilter} />
        ) : null}
      </div>

      {empty ? (
        <div className="j-gallery-empty">
          <span className="j-gallery-empty-ico" aria-hidden>
            {featuredOnly ? "★" : "▢"}
          </span>
          {featuredOnly
            ? "Chưa có bài nổi bật. Gắn thẻ Nổi bật trên milestone để hiển thị ở đây."
            : "Tác phẩm sẽ xuất hiện ở đây khi bạn đăng ảnh hoặc video công khai."}
        </div>
      ) : filteredEmpty ? (
        <div className="j-gallery-empty j-gallery-empty--filter">
          {featuredOnly
            ? "Không có bài nổi bật thuộc loại này."
            : "Không có tác phẩm thuộc loại này."}
        </div>
      ) : (
        <>
          {filteredPinned.length > 0 ? (
            <div className="j-g-pinned">
              {filteredPinned.map((b, index) => (
                <a
                  key={b.id}
                  href={b.href ?? "#"}
                  className="j-g-banner"
                  data-pinned-id={b.id}
                  aria-label={[b.title, b.meta].filter(Boolean).join(" · ") || "Bài nổi bật"}
                >
                  <span className="j-g-banner-bg">
                    <GalleryItemVisual
                      src={b.src}
                      srcSet={b.srcSet}
                      sizes={b.srcSet ? "280px" : undefined}
                      width={b.width}
                      height={b.height}
                      alt=""
                      priority={index === 0}
                      isVideo={b.isVideo || b.mediaKind === "video"}
                      videoProcessing={b.videoProcessing}
                      videoPreviewSrc={b.videoPreviewSrc}
                    />
                  </span>
                  {b.isVideo || b.mediaKind === "video" ? (
                    <GalleryVideoPlayBadge />
                  ) : null}
                </a>
              ))}
            </div>
          ) : null}

          {filteredItems.length > 0 ? (
            <div className="j-gallery-grid">
              {filteredItems.map((it) => (
                <a
                  key={it.id}
                  href={it.href ?? "#"}
                  className={"j-g-item" + (it.isVerified ? " is-verified" : "")}
                  data-item-id={it.id}
                  aria-label={it.label}
                >
                  <span className="j-g-thumb">
                    <GalleryItemVisual
                      src={it.src}
                      srcSet={it.srcSet}
                      sizes={it.srcSet ? "140px" : undefined}
                      width={it.width}
                      height={it.height}
                      alt={it.label}
                      isVideo={it.isVideo || it.mediaKind === "video"}
                      videoProcessing={it.videoProcessing}
                      videoPreviewSrc={it.videoPreviewSrc}
                    />
                  </span>
                  {it.isVideo || it.mediaKind === "video" ? (
                    <GalleryVideoPlayBadge />
                  ) : null}
                  <span className="j-g-overlay">
                    <span className="j-g-label">{it.label}</span>
                  </span>
                </a>
              ))}
            </div>
          ) : null}
        </>
      )}
    </aside>
  );
}
