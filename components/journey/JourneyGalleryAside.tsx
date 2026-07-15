"use client";

import { GripVertical } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { GalleryItemVisual, GalleryEmbedPlatformBadge, GalleryVideoPlayBadge } from "@/components/journey/GalleryItemVisual";
import { GalleryMainHoverOverlay } from "@/components/journey/GalleryMainHoverOverlay";
import { GalleryMediaFilterDropdown } from "@/components/journey/GalleryMediaFilterDropdown";
import { useJourneyPostOverlay } from "@/components/journey/useJourneyPostOverlay";
import type { GalleryMediaKind } from "@/lib/journey/post-media";
import type { EmbedProviderId } from "@/lib/editor/embed-providers";
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
  authorName?: string | null;
  authorAvatarUrl?: string | null;
  /** Link ngữ cảnh — VD /{slug}/p/{postSlug}. */
  href?: string;
  /** Cột mốc — mở modal bài viết client-side. */
  cotMocId?: string;
  mediaKind?: GalleryMediaKind;
  embedProvider?: EmbedProviderId | null;
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
  /** Cột mốc — mở modal bài viết client-side. */
  cotMocId?: string;
  mediaKind?: GalleryMediaKind;
  embedProvider?: EmbedProviderId | null;
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
  /** Chủ Journey — cho phép kéo sắp cột nổi bật. */
  canReorder?: boolean;
  /** Persist thứ tự sau kéo thả (mảng cotMocId). */
  onReorderPinned?: (cotMocIds: string[]) => Promise<void> | void;
};

function asideCotMocId(item: { id: string; cotMocId?: string }): string | null {
  const direct = item.cotMocId?.trim();
  if (direct) return direct;
  const m = item.id.match(/^(?:pin|grid)-(.+)-\d+$/);
  return m?.[1]?.trim() || null;
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to > list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to > from ? to - 1 : to, 0, item);
  return next;
}

/**
 * Gallery cột phải — tổng hợp visual từ cột mốc + tác phẩm.
 */
export function JourneyGalleryAside({
  ownerSlug,
  totalTacPham,
  pinned = [],
  items = [],
  featuredOnly = false,
  canReorder = false,
  onReorderPinned,
}: Props) {
  void ownerSlug;
  const { openPost, overlay } = useJourneyPostOverlay();

  const [filter, setFilter] = useState<GalleryMediaFilter>("all");
  const [orderedPinned, setOrderedPinned] = useState<GalleryPinnedBanner[]>(() => [
    ...pinned,
  ]);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const dragMovedRef = useRef(false);

  useEffect(() => {
    setOrderedPinned([...pinned]);
  }, [pinned]);

  const reorderEnabled =
    canReorder && featuredOnly && filter === "all" && !saving;

  const filteredPinned = useMemo(
    () =>
      orderedPinned.filter((b) => matchesGalleryMediaFilter(b.mediaKind, filter)),
    [orderedPinned, filter],
  );
  const filteredItems = useMemo(
    () =>
      featuredOnly
        ? []
        : items.filter((it) => matchesGalleryMediaFilter(it.mediaKind, filter)),
    [items, filter, featuredOnly],
  );

  const empty = featuredOnly
    ? orderedPinned.length === 0
    : orderedPinned.length === 0 && items.length === 0;
  const filteredEmpty =
    !empty && filteredPinned.length === 0 && filteredItems.length === 0;
  const showFilter = featuredOnly ? orderedPinned.length > 0 : totalTacPham > 0;

  const clearDrag = () => {
    setDragFrom(null);
    setDropAt(null);
  };

  const commitReorder = async (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const previous = orderedPinned;
    const next = moveItem(previous, from, to);
    if (next === previous) return;

    const cotMocIds = next
      .map((b) => asideCotMocId(b))
      .filter((id): id is string => Boolean(id));
    if (cotMocIds.length !== next.length) return;

    setOrderedPinned(next);
    if (!onReorderPinned) return;

    setSaving(true);
    try {
      await onReorderPinned(cotMocIds);
    } catch {
      setOrderedPinned(previous);
    } finally {
      setSaving(false);
    }
  };

  const useMasonry = filteredPinned.length > 8;

  return (
    <aside
      className="j-gallery"
      aria-label={featuredOnly ? "Nội dung nổi bật" : "Tác phẩm gần đây"}
    >
      <div className="j-gallery-head">
        <div className="j-gallery-title">
          {featuredOnly ? "Nội dung nổi bật" : "Tác phẩm"}
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
            <div
              className={[
                "j-g-pinned",
                useMasonry ? "j-g-pinned--masonry" : "",
                reorderEnabled ? "j-g-pinned--reorder" : "",
                saving ? "is-saving" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {filteredPinned.map((b, index) => {
                const cotMocId = asideCotMocId(b);
                const label =
                  [b.title, b.meta].filter(Boolean).join(" · ") || "Bài nổi bật";
                const showInsertBefore =
                  reorderEnabled &&
                  dragFrom != null &&
                  dropAt === index &&
                  dropAt !== dragFrom &&
                  dropAt !== dragFrom + 1;

                return (
                  <div key={b.id} className="j-g-banner-slot">
                    {showInsertBefore ? (
                      <div className="j-g-banner-insert" aria-hidden />
                    ) : null}
                    <div
                      className={[
                        "j-g-banner-wrap",
                        dragFrom === index ? "is-dragging" : "",
                        dropAt === index && dragFrom != null && dropAt !== dragFrom
                          ? "is-drop-target"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onDragOver={
                        reorderEnabled
                          ? (e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              const rect = e.currentTarget.getBoundingClientRect();
                              const before =
                                e.clientY < rect.top + rect.height / 2;
                              const gap = before ? index : index + 1;
                              if (dropAt !== gap) setDropAt(gap);
                            }
                          : undefined
                      }
                      onDrop={
                        reorderEnabled
                          ? (e) => {
                              e.preventDefault();
                              const from =
                                dragFrom ??
                                Number.parseInt(
                                  e.dataTransfer.getData("text/plain"),
                                  10,
                                );
                              const gap = dropAt ?? index;
                              clearDrag();
                              if (!Number.isNaN(from)) {
                                void commitReorder(from, gap);
                              }
                            }
                          : undefined
                      }
                    >
                      {reorderEnabled ? (
                        <button
                          type="button"
                          className="j-g-banner-drag"
                          draggable
                          aria-label={`Kéo để đổi vị trí: ${b.title || "bài nổi bật"}`}
                          title="Kéo để đổi vị trí"
                          disabled={saving}
                          onClick={(e) => e.stopPropagation()}
                          onDragStart={(e) => {
                            dragMovedRef.current = false;
                            setDragFrom(index);
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", String(index));
                          }}
                          onDrag={(e) => {
                            if (
                              !dragMovedRef.current &&
                              (Math.abs(e.movementX) > 2 ||
                                Math.abs(e.movementY) > 2)
                            ) {
                              dragMovedRef.current = true;
                            }
                          }}
                          onDragEnd={clearDrag}
                        >
                          <GripVertical size={16} strokeWidth={2} aria-hidden />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="j-g-banner"
                        data-pinned-id={b.id}
                        aria-label={label}
                        disabled={!cotMocId || saving}
                        onClick={() => {
                          if (dragMovedRef.current) {
                            dragMovedRef.current = false;
                            return;
                          }
                          openPost(cotMocId);
                        }}
                      >
                        <span className="j-g-banner-bg">
                          <GalleryItemVisual
                            src={b.src}
                            srcSet={b.srcSet}
                            sizes={b.srcSet ? "340px" : undefined}
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
                        {b.mediaKind === "embed" && b.embedProvider ? (
                          <GalleryEmbedPlatformBadge provider={b.embedProvider} />
                        ) : null}
                        <GalleryMainHoverOverlay
                          label={b.title}
                          meta={b.meta}
                          authorName={b.authorName}
                          authorAvatarUrl={b.authorAvatarUrl}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
              {reorderEnabled && dragFrom != null ? (
                <div
                  className={
                    dropAt === filteredPinned.length &&
                    dropAt !== dragFrom
                      ? "j-g-banner-insert is-active"
                      : "j-g-banner-insert-hit"
                  }
                  aria-hidden
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dropAt !== filteredPinned.length) {
                      setDropAt(filteredPinned.length);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from =
                      dragFrom ??
                      Number.parseInt(e.dataTransfer.getData("text/plain"), 10);
                    clearDrag();
                    if (!Number.isNaN(from)) {
                      void commitReorder(from, filteredPinned.length);
                    }
                  }}
                />
              ) : null}
            </div>
          ) : null}

          {filteredItems.length > 0 ? (
            <div className="j-gallery-grid">
              {filteredItems.map((it) => {
                const cotMocId = asideCotMocId(it);
                return (
                  <button
                    key={it.id}
                    type="button"
                    className={"j-g-item" + (it.isVerified ? " is-verified" : "")}
                    data-item-id={it.id}
                    aria-label={it.label}
                    disabled={!cotMocId}
                    onClick={() => openPost(cotMocId)}
                  >
                    <span className="j-g-thumb">
                      <GalleryItemVisual
                        src={it.src}
                        srcSet={it.srcSet}
                        sizes={it.srcSet ? "170px" : undefined}
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
                    {it.mediaKind === "embed" && it.embedProvider ? (
                      <GalleryEmbedPlatformBadge provider={it.embedProvider} />
                    ) : null}
                    <span className="j-g-overlay">
                      <span className="j-g-label">{it.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </>
      )}
      {overlay}
    </aside>
  );
}
