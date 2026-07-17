"use client";

import { GripVertical, Pencil, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { GalleryAuthorCornerBadge } from "@/components/journey/GalleryAuthorCornerBadge";
import { GalleryItemVisual, GalleryEmbedPlatformBadge, GalleryVideoPlayBadge } from "@/components/journey/GalleryItemVisual";
import { GalleryMainHoverOverlay } from "@/components/journey/GalleryMainHoverOverlay";
import { GalleryMediaFilterDropdown } from "@/components/journey/GalleryMediaFilterDropdown";
import { JourneyMilestoneOwnerMenu } from "@/components/journey/JourneyMilestoneOwnerMenu";
import { useJourneyFeaturedAsideFilterOptional } from "@/components/journey/JourneyFeaturedAsideFilterContext";
import { useJourneyPostOverlay } from "@/components/journey/useJourneyPostOverlay";
import type {
  MilestoneType,
  MilestoneVariant,
} from "@/components/journey/milestone-types";
import type { GallerySourcePerson } from "@/lib/journey/gallery-source-author";
import type { GalleryMediaKind } from "@/lib/journey/post-media";
import type { EmbedProviderId } from "@/lib/editor/embed-providers";
import {
  matchesGalleryMediaFilter,
  type GalleryMediaFilter,
} from "@/lib/journey/post-media";
import { setLiveFeaturedPinnedForShare } from "@/lib/journey/gallery-filter-share";

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
  /** Avatar góc — bài từ user/org khác tag hoặc lưu về. */
  showSourceAuthor?: boolean;
  /** Người có vai trò trong dự án (stack avatar). */
  sourcePeople?: GallerySourcePerson[];
  /** Link ngữ cảnh — VD /{slug}/p/{postSlug}. */
  href?: string;
  /**
   * Bài `org_bai_dang` trên Journey (cotMocId = id bài org).
   * Click phải đi permalink org — không mở JourneyPostModal.
   */
  isOrgPost?: boolean;
  /** Cột mốc — mở modal bài viết client-side. */
  cotMocId?: string;
  /** Nhóm nội dung — menu chủ khi sắp Feature. */
  type?: MilestoneType;
  /** Nguồn xuất hiện trên Journey — quyết định foreignJourney menu. */
  variant?: MilestoneVariant;
  /** Tác phẩm — đổi hiển thị tagged/bookmark. */
  tacPhamId?: string | null;
  /** Slug bài — sửa / permalink trong menu. */
  postSlug?: string | null;
  /** Slug chủ bài khi khác profile Journey. */
  postOwnerSlug?: string | null;
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
  /** Bài org — mở permalink, không dùng JourneyPostModal. */
  isOrgPost?: boolean;
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

function openAsideEntry(
  item: {
    id: string;
    cotMocId?: string;
    href?: string;
    isOrgPost?: boolean;
  },
  openPost: (cotMocId: string | null | undefined) => void,
  router: { push: (href: string) => void },
) {
  /* org_bai_dang: cotMocId = id bài org — JourneyPostModal sẽ 404. */
  if (item.isOrgPost) {
    const href = item.href?.trim();
    if (href) router.push(href);
    return;
  }
  openPost(asideCotMocId(item));
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
  const router = useRouter();
  const sharedMediaFilter = useJourneyFeaturedAsideFilterOptional();
  const useSharedMediaFilter = Boolean(featuredOnly && sharedMediaFilter);

  const [localFilter, setLocalFilter] = useState<GalleryMediaFilter>("all");
  const filter = useSharedMediaFilter
    ? sharedMediaFilter!.mediaFilter
    : localFilter;
  const setFilter = useSharedMediaFilter
    ? sharedMediaFilter!.setMediaFilter
    : setLocalFilter;

  const [reorderEditing, setReorderEditing] = useState(false);
  const [orderedPinned, setOrderedPinned] = useState<GalleryPinnedBanner[]>(() => [
    ...pinned,
  ]);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [pendingSave, setPendingSave] = useState(false);
  const dragMovedRef = useRef(false);
  /** Index nguồn — set sync trong dragstart (state React phải trì hoãn, kẻo Chrome hủy drag). */
  const dragFromRef = useRef<number | null>(null);
  const dropAtRef = useRef<number | null>(null);
  const lastGoodPinnedRef = useRef<GalleryPinnedBanner[]>([...pinned]);
  const saveQueueRef = useRef<{
    ids: string[];
    snapshot: GalleryPinnedBanner[];
  } | null>(null);
  const saveFlushingRef = useRef(false);
  const onReorderPinnedRef = useRef(onReorderPinned);
  onReorderPinnedRef.current = onReorderPinned;

  const clearDrag = () => {
    dragMovedRef.current = false;
    dragFromRef.current = null;
    dropAtRef.current = null;
    setDragFrom(null);
    setDropAt(null);
  };

  useEffect(() => {
    /* Đang kéo / đang flush save — đừng ghi đè thứ tự optimistic. */
    if (saveFlushingRef.current || saveQueueRef.current) return;
    setOrderedPinned([...pinned]);
    lastGoodPinnedRef.current = [...pinned];
  }, [pinned]);

  useEffect(() => {
    if (!featuredOnly) return;
    setLiveFeaturedPinnedForShare(orderedPinned);
  }, [featuredOnly, orderedPinned]);

  useEffect(() => {
    if (filter !== "all") {
      setReorderEditing(false);
      clearDrag();
    }
  }, [filter]);

  /* Kéo sắp chỉ khi chủ bật chế độ sửa + lọc Tất cả. */
  const reorderEnabled =
    canReorder && featuredOnly && filter === "all" && reorderEditing;
  const showReorderEditBtn =
    canReorder && featuredOnly && orderedPinned.length > 0;

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
  /* Cột nổi bật: filter media nằm trên `.j-tlb`; head chỉ còn nút sửa. */
  const showLocalMediaFilter =
    !useSharedMediaFilter &&
    (featuredOnly ? orderedPinned.length > 0 : totalTacPham > 0);

  const setDropGap = (gap: number) => {
    if (dropAtRef.current === gap) return;
    dropAtRef.current = gap;
    setDropAt(gap);
  };

  const flushReorderSave = () => {
    if (saveFlushingRef.current) return;
    const persist = onReorderPinnedRef.current;
    if (!persist) return;

    saveFlushingRef.current = true;
    setPendingSave(true);

    void (async () => {
      try {
        while (saveQueueRef.current) {
          const job = saveQueueRef.current;
          saveQueueRef.current = null;
          try {
            await persist(job.ids);
            lastGoodPinnedRef.current = job.snapshot;
          } catch (err) {
            console.error("[JourneyGalleryAside] reorder save failed", err);
            setOrderedPinned(lastGoodPinnedRef.current);
            saveQueueRef.current = null;
            break;
          }
        }
      } finally {
        saveFlushingRef.current = false;
        if (saveQueueRef.current) {
          flushReorderSave();
        } else {
          setPendingSave(false);
        }
      }
    })();
  };

  const commitReorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const next = moveItem(orderedPinned, from, to);
    if (next === orderedPinned) return;

    const cotMocIds = next
      .map((b) => asideCotMocId(b))
      .filter((id): id is string => Boolean(id));
    if (cotMocIds.length !== next.length) return;

    /* Optimistic — UI đổi ngay, PATCH xếp hàng chạy nền. */
    setOrderedPinned(next);
    if (!onReorderPinnedRef.current) {
      lastGoodPinnedRef.current = next;
      return;
    }

    saveQueueRef.current = { ids: cotMocIds, snapshot: next };
    flushReorderSave();
  };

  const syncAsideAfterMenuChange = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("cins:journey-timeline-changed", {
        detail: { ownerSlug },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("cins:journey-gallery-sync", {
        detail: { ownerSlug },
      }),
    );
  };

  const dropPinnedAfterUnfeature = (cotMocId: string) => {
    const id = cotMocId.trim();
    if (!id) return;
    setOrderedPinned((prev) => {
      const next = prev.filter((x) => asideCotMocId(x) !== id);
      if (next.length === prev.length) return prev;
      lastGoodPinnedRef.current = next;
      return next;
    });
    syncAsideAfterMenuChange();
  };

  const useMasonry = filteredPinned.length > 8;
  /* Masonry 2 cột xen kẽ: 1 phải, 2 trái, 3 phải, 4 trái… (không dùng CSS columns dọc). */
  const masonryRight = useMasonry
    ? filteredPinned
        .map((b, index) => ({ b, index }))
        .filter(({ index }) => index % 2 === 0)
    : [];
  const masonryLeft = useMasonry
    ? filteredPinned
        .map((b, index) => ({ b, index }))
        .filter(({ index }) => index % 2 === 1)
    : [];

  const renderPinnedSlot = (b: GalleryPinnedBanner, index: number) => {
    const cotMocId = asideCotMocId(b);
    const label =
      [b.title, b.meta].filter(Boolean).join(" · ") || "Bài nổi bật";
    /* Gap no-op: tại / ngay sau nguồn — không vẽ vạch. Layout không đổi khi kéo. */
    const gapMeaningful =
      reorderEnabled &&
      dragFrom != null &&
      dropAt != null &&
      dropAt !== dragFrom &&
      dropAt !== dragFrom + 1;
    const showDropBefore = gapMeaningful && dropAt === index;
    const showDropAfter = gapMeaningful && dropAt === index + 1;

    const menuOwnerSlug =
      ownerSlug.trim() || b.postOwnerSlug?.trim() || null;
    const foreignJourney =
      reorderEnabled && cotMocId
        ? b.isOrgPost
          ? { variant: "org_tagged" as const, cotMocId }
          : b.variant === "tagged" && b.tacPhamId
            ? {
                variant: "tagged" as const,
                cotMocId,
                tacPhamId: b.tacPhamId,
              }
            : b.variant === "bookmark" && b.tacPhamId
              ? {
                  variant: "bookmark" as const,
                  cotMocId,
                  tacPhamId: b.tacPhamId,
                }
              : undefined
        : undefined;
    const ownerMenu =
      reorderEnabled && menuOwnerSlug && cotMocId ? (
        <JourneyMilestoneOwnerMenu
          milestoneId={cotMocId}
          ownerSlug={menuOwnerSlug}
          permalinkOwnerSlug={b.postOwnerSlug ?? menuOwnerSlug}
          currentType={b.type ?? "du-an"}
          currentVisibility="feature"
          postSlug={b.isOrgPost ? null : (b.postSlug ?? null)}
          foreignJourney={foreignJourney}
          hideEdit={Boolean(foreignJourney)}
          hideDelete={
            foreignJourney?.variant === "tagged" ||
            foreignJourney?.variant === "org_tagged"
          }
          hideTypeChange={Boolean(foreignJourney)}
          className="j-g-banner-owner-menu"
          onVisibilityChange={(visibility) => {
            if (visibility === "feature") return;
            dropPinnedAfterUnfeature(cotMocId);
          }}
        />
      ) : null;

    const bannerVisual = (
      <>
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
        {b.showSourceAuthor ? (
          <GalleryAuthorCornerBadge
            people={b.sourcePeople}
            name={b.authorName}
            avatarUrl={b.authorAvatarUrl}
          />
        ) : null}
        <GalleryMainHoverOverlay
          label={b.title}
          meta={b.meta}
          authorName={b.authorName}
          authorAvatarUrl={b.authorAvatarUrl}
        />
      </>
    );

    const openBanner = () => {
      if (dragMovedRef.current) {
        dragMovedRef.current = false;
        return;
      }
      openAsideEntry(b, openPost, router);
    };

    return (
      <div key={b.id} className="j-g-banner-slot">
        <div
          className={[
            "j-g-banner-wrap",
            reorderEnabled ? "is-reorderable" : "",
            dragFrom === index ? "is-dragging" : "",
            showDropBefore ? "is-drop-before" : "",
            showDropAfter ? "is-drop-after" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          draggable={reorderEnabled}
          onDragStart={
            reorderEnabled
              ? (e) => {
                  const target = e.target as HTMLElement | null;
                  /* Menu ⋯ không phải nguồn kéo. */
                  if (target?.closest(".j-g-banner-owner-menu")) {
                    e.preventDefault();
                    return;
                  }
                  e.stopPropagation();
                  dragMovedRef.current = false;
                  dragFromRef.current = index;
                  dropAtRef.current = null;
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(index));
                  try {
                    e.dataTransfer.setDragImage(e.currentTarget, 24, 24);
                  } catch {
                    /* một số trình duyệt không hỗ trợ setDragImage */
                  }
                  /* Trì hoãn setState — sync re-render trong dragstart = Chrome hủy drag. */
                  window.setTimeout(() => {
                    if (dragFromRef.current !== index) return;
                    setDropAt(null);
                    setDragFrom(index);
                  }, 0);
                }
              : undefined
          }
          onDrag={
            reorderEnabled
              ? (e) => {
                  if (
                    !dragMovedRef.current &&
                    (Math.abs(e.movementX) > 2 || Math.abs(e.movementY) > 2)
                  ) {
                    dragMovedRef.current = true;
                  }
                }
              : undefined
          }
          onDragEnd={reorderEnabled ? clearDrag : undefined}
          onDragOver={
            reorderEnabled
              ? (e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  const rect = e.currentTarget.getBoundingClientRect();
                  const before = e.clientY < rect.top + rect.height / 2;
                  setDropGap(before ? index : index + 1);
                }
              : undefined
          }
          onDrop={
            reorderEnabled
              ? (e) => {
                  e.preventDefault();
                  const fromRaw =
                    dragFromRef.current ??
                    dragFrom ??
                    Number.parseInt(e.dataTransfer.getData("text/plain"), 10);
                  const gap = dropAtRef.current ?? index;
                  clearDrag();
                  if (!Number.isNaN(fromRaw) && fromRaw != null) {
                    commitReorder(fromRaw, gap);
                  }
                }
              : undefined
          }
        >
          {/* Reorder: div thay button — button chặn HTML5 drag của parent. */}
          {reorderEnabled ? (
            <div
              role="button"
              tabIndex={0}
              className="j-g-banner"
              data-pinned-id={b.id}
              aria-label={`${label}. Kéo để đổi vị trí ${index + 1}`}
              onClick={openBanner}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                openBanner();
              }}
            >
              {bannerVisual}
            </div>
          ) : (
            <button
              type="button"
              className="j-g-banner"
              data-pinned-id={b.id}
              aria-label={label}
              disabled={b.isOrgPost ? !b.href?.trim() : !cotMocId}
              onClick={openBanner}
            >
              {bannerVisual}
            </button>
          )}
          {ownerMenu}
          {reorderEnabled ? (
            <>
              <div
                className={
                  "j-g-banner-rank" + (index === 0 ? " is-first" : "")
                }
                aria-hidden
                title={`Thứ tự Feature ${index + 1}`}
              >
                {index + 1}
              </div>
              <div
                className="j-g-banner-drag"
                aria-hidden
                title={`Kéo để đổi vị trí ${index + 1}`}
              >
                <GripVertical size={14} strokeWidth={2} aria-hidden />
              </div>
            </>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <aside
      className="j-gallery"
      aria-label={featuredOnly ? "Feature" : "Tác phẩm gần đây"}
    >
      <div className="j-gallery-head">
        <div className="j-gallery-title">
          {featuredOnly ? (
            <span className="j-feature-label">
              <Star size={15} strokeWidth={1.9} fill="currentColor" aria-hidden />
              Feature
            </span>
          ) : (
            "Tác phẩm"
          )}
        </div>

        {showReorderEditBtn ? (
          <button
            type="button"
            className={
              "j-gallery-edit-btn" + (reorderEditing ? " is-active" : "")
            }
            aria-pressed={reorderEditing}
            aria-label={
              reorderEditing
                ? "Xong sắp xếp vị trí"
                : "Sắp xếp vị trí bài nổi bật"
            }
            title={
              filter !== "all"
                ? "Chọn «Tất cả» loại nội dung trên thanh bộ lọc để sắp xếp"
                : reorderEditing
                  ? "Xong"
                  : "Sắp xếp vị trí Feature"
            }
            disabled={filter !== "all"}
            onClick={() => {
              setReorderEditing((v) => {
                if (v) clearDrag();
                return !v;
              });
            }}
          >
            <Pencil size={14} strokeWidth={2} aria-hidden />
            {reorderEditing ? <span className="j-gallery-edit-btn-label">Xong</span> : null}
          </button>
        ) : showLocalMediaFilter ? (
          <GalleryMediaFilterDropdown
            filter={filter}
            onFilterChange={setFilter}
          />
        ) : null}
      </div>

      {reorderEnabled ? (
        <p className="j-gallery-reorder-hint">
          Số thứ tự giúp xếp Feature đẹp nhất — <strong>1</strong> hiện trước.
          Kéo thẻ để đổi vị trí.
        </p>
      ) : null}

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
                pendingSave ? "is-pending-save" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-busy={pendingSave || undefined}
            >
              {useMasonry ? (
                <>
                  <div className="j-g-pinned-col">
                    {masonryLeft.map(({ b, index }) =>
                      renderPinnedSlot(b, index),
                    )}
                  </div>
                  <div className="j-g-pinned-col">
                    {masonryRight.map(({ b, index }) =>
                      renderPinnedSlot(b, index),
                    )}
                  </div>
                </>
              ) : (
                filteredPinned.map((b, index) => renderPinnedSlot(b, index))
              )}
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
                    disabled={
                      it.isOrgPost ? !it.href?.trim() : !cotMocId
                    }
                    onClick={() => openAsideEntry(it, openPost, router)}
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
