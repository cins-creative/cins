"use client";

import { useMemo, useState } from "react";

import { FeaturedFlagBadge } from "@/components/journey/FeaturedFlagBadge";
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
};

/**
 * Gallery cột phải — tổng hợp visual từ cột mốc + tác phẩm.
 */
export function JourneyGalleryAside({
  ownerSlug,
  totalTacPham,
  pinned = [],
  items = [],
}: Props) {
  void ownerSlug;

  const [filter, setFilter] = useState<GalleryMediaFilter>("all");

  const filteredPinned = useMemo(
    () => pinned.filter((b) => matchesGalleryMediaFilter(b.mediaKind, filter)),
    [pinned, filter],
  );
  const filteredItems = useMemo(
    () => items.filter((it) => matchesGalleryMediaFilter(it.mediaKind, filter)),
    [items, filter],
  );

  const empty = pinned.length === 0 && items.length === 0;
  const filteredEmpty =
    !empty && filteredPinned.length === 0 && filteredItems.length === 0;

  return (
    <aside className="j-gallery" aria-label="Tác phẩm gần đây">
      <div className="j-gallery-head">
        <div className="j-gallery-title">
          Tác phẩm
          <span className="j-gallery-count">{totalTacPham}</span>
        </div>

        {totalTacPham > 0 ? (
          <GalleryMediaFilterDropdown filter={filter} onFilterChange={setFilter} />
        ) : null}
      </div>

      {empty ? (
        <div className="j-gallery-empty">
          <span className="j-gallery-empty-ico" aria-hidden>
            ▢
          </span>
          Tác phẩm sẽ xuất hiện ở đây khi bạn đăng ảnh hoặc video công khai.
        </div>
      ) : filteredEmpty ? (
        <div className="j-gallery-empty j-gallery-empty--filter">
          Không có tác phẩm thuộc loại này.
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
                    />
                  </span>
                  {b.isVideo || b.mediaKind === "video" ? (
                    <GalleryVideoPlayBadge />
                  ) : null}
                  <FeaturedFlagBadge className="j-g-banner-pin" />
                  <span className="j-g-banner-info">
                    <span className="j-g-banner-title">{b.title}</span>
                    <span className="j-g-banner-meta">{b.meta}</span>
                  </span>
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
