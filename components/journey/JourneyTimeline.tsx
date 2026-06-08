"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { JourneyCoAuthorPendingBanner } from "@/components/journey/JourneyCoAuthorPendingBanner";
import { JourneyCreateComposer } from "@/components/journey/JourneyCreateComposer";
import { JourneyTimelineBar } from "@/components/journey/JourneyTimelineBar";
import type { FilterGroup } from "@/components/journey/JourneyTimelineBar";
import {
  JourneyYearBlock,
  timelineExpandKey,
  type TimelineInlineExpandState,
} from "@/components/journey/JourneyYearBlock";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import { prefetchMilestoneDetail } from "@/lib/journey/milestone-detail-cache";
import { milestoneContentKind } from "@/lib/journey/post-media";
import {
  applyMilestoneInlinePatch,
  MILESTONE_INLINE_PATCH_EVENT,
  type MilestoneInlinePatchDetail,
} from "@/lib/journey/milestone-inline-patch";
import {
  applyMilestoneCreditsUpdate,
  MILESTONE_CREDITS_UPDATED_EVENT,
  type MilestoneCreditsUpdatedDetail,
} from "@/lib/journey/coauthor-credits-events";
import type { LoaiMocVisibilityMap } from "@/lib/journey/filter-visibility";
import type { MilestoneFilterCounts } from "@/lib/journey/milestones-page-fetch";
import { buildFilterOptions, computeFilterCounts } from "@/lib/journey/milestone-filter-options";
import {
  COAUTHOR_INVITE_ACCEPTED_EVENT,
  COAUTHOR_INVITE_FAILED_EVENT,
  type CoAuthorInviteAcceptedDetail,
  type CoAuthorInviteFailedDetail,
} from "@/lib/journey/coauthor-invite-events";
import {
  mergeMilestoneIntoTimeline,
  removeMilestoneByTacPhamId,
} from "@/lib/journey/timeline-merge";
import { compareTimelineOrder } from "@/lib/journey/timeline-sort";
import {
  computeScrollSpyFromMarkers,
  JOURNEY_TIMELINE_SPY_ANCHOR_PX,
  timelineScrollSpyFromParts,
  type TimelineScrollSpy,
} from "@/lib/journey/timeline-scroll-spy";
import type { PendingCoAuthorInvite } from "@/lib/social/types";
import { matchesPersonalFilterSlug } from "@/lib/filter/client-utils";
import { CONG_DONG_PERSONAL_FILTER_SLUG } from "@/lib/filter/cong-dong-personal-filter.shared";
import { useJourneyPersonalFilterOptional } from "@/components/journey/JourneyPersonalFilterContext";

type ScrollLoadConfig = {
  ownerSlug: string;
  hasMore: boolean;
  nextOffset: number;
  filterCounts: MilestoneFilterCounts;
  totalCount: number;
};

type Props = {
  isOwner: boolean;
  ownerName: string;
  /** Slug owner — wire CTA "tạo cột mốc" → `/{ownerSlug}/p/new` (chỉ owner). */
  ownerSlug: string;
  ownerProfileId?: string;
  /** Avatar URL owner (Cloudflare delivery) — render trong badge "Cá nhân". */
  ownerAvatarUrl?: string | null;
  /** Milestones trang đầu — append thêm khi user cuộn (scrollLoad). */
  milestones: ReadonlyArray<MilestoneItem>;
  /** Visibility per loai_moc filter row trong dropdown. Owner thấy toggle,
   *  visitor không thấy row nào marked `private`. */
  filterVisibility?: LoaiMocVisibilityMap;
  viewerProfileId?: string | null;
  coAuthorPendingInvites?: ReadonlyArray<PendingCoAuthorInvite>;
  /** Infinite scroll — load trang kế qua API khi sentinel vào viewport. */
  scrollLoad?: ScrollLoadConfig;
};

/**
 * Cột giữa Journey — timeline cốt lõi.
 *
 * Khi `milestones.length === 0`:
 *   - Hiện empty state cho owner (CTA "thêm cột mốc đầu tiên") / guest (Journey trống)
 *   - Filter dropdown disabled
 * Khi có data:
 *   - Group theo năm DESC, milestones trong năm sort theo (month, id) DESC
 *   - Filter dropdown bật, chọn group → filter realtime
 *
 * Scroll-spy: thanh context bar cập nhật năm/tháng theo cột mốc đang xem.
 */
export function JourneyTimeline({
  isOwner,
  ownerName,
  ownerSlug,
  ownerProfileId,
  ownerAvatarUrl,
  milestones: initialMilestones,
  filterVisibility,
  viewerProfileId = null,
  coAuthorPendingInvites = [],
  scrollLoad,
}: Props) {
  const personalFilter = useJourneyPersonalFilterOptional();
  const [filter, setFilter] = useState<FilterGroup>("all");
  const [items, setItems] = useState<MilestoneItem[]>(() => [...initialMilestones]);
  const [hasMore, setHasMore] = useState(scrollLoad?.hasMore ?? false);
  const [nextOffset, setNextOffset] = useState(
    scrollLoad?.nextOffset ?? initialMilestones.length,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [inlineExpand, setInlineExpand] = useState<TimelineInlineExpandState>(null);
  const rootRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    setItems([...initialMilestones]);
    setHasMore(scrollLoad?.hasMore ?? false);
    setNextOffset(scrollLoad?.nextOffset ?? initialMilestones.length);
    setLoadError(false);
  }, [initialMilestones, scrollLoad?.hasMore, scrollLoad?.nextOffset]);

  useEffect(() => {
    if (personalFilter?.activeSlug === CONG_DONG_PERSONAL_FILTER_SLUG) {
      personalFilter.setActiveSlug(null);
      setFilter("cong-dong");
      return;
    }
    if (personalFilter?.activeSlug) setFilter("all");
  }, [personalFilter?.activeSlug, personalFilter]);

  const personalFilterSlug = personalFilter?.activeSlug ?? null;
  const labelFetchSlugRef = useRef<string | null | undefined>(undefined);

  /** Nhãn riêng lọc server-side — visitor chỉ thấy cột mốc công khai. */
  useEffect(() => {
    if (!scrollLoad) return;

    if (!personalFilterSlug) {
      if (labelFetchSlugRef.current) {
        setItems([...initialMilestones]);
        setHasMore(scrollLoad.hasMore ?? false);
        setNextOffset(scrollLoad.nextOffset ?? initialMilestones.length);
        setLoadError(false);
      }
      labelFetchSlugRef.current = null;
      return;
    }

    if (labelFetchSlugRef.current === personalFilterSlug) return;
    labelFetchSlugRef.current = personalFilterSlug;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/journey/${encodeURIComponent(scrollLoad.ownerSlug)}/milestones?offset=0&label=${encodeURIComponent(personalFilterSlug)}`,
        );
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as {
          milestones: MilestoneItem[];
          hasMore: boolean;
          nextOffset: number;
        };
        if (cancelled) return;
        setItems(data.milestones ?? []);
        setHasMore(data.hasMore ?? false);
        setNextOffset(data.nextOffset ?? data.milestones?.length ?? 0);
        setLoadError(false);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [personalFilterSlug, scrollLoad, initialMilestones]);

  useEffect(() => {
    const onAccepted = (event: Event) => {
      const detail = (event as CustomEvent<CoAuthorInviteAcceptedDetail>).detail;
      if (!detail || detail.ownerSlug !== ownerSlug) return;
      setItems((prev) => mergeMilestoneIntoTimeline(prev, detail.milestone));
    };
    const onFailed = (event: Event) => {
      const detail = (event as CustomEvent<CoAuthorInviteFailedDetail>).detail;
      if (!detail || detail.ownerSlug !== ownerSlug) return;
      if (detail.action === "accepted") {
        setItems((prev) => removeMilestoneByTacPhamId(prev, detail.tacPhamId));
      }
    };

    window.addEventListener(COAUTHOR_INVITE_ACCEPTED_EVENT, onAccepted);
    window.addEventListener(COAUTHOR_INVITE_FAILED_EVENT, onFailed);
    return () => {
      window.removeEventListener(COAUTHOR_INVITE_ACCEPTED_EVENT, onAccepted);
      window.removeEventListener(COAUTHOR_INVITE_FAILED_EVENT, onFailed);
    };
  }, [ownerSlug]);

  useEffect(() => {
    const onMilestoneDeleted = (event: Event) => {
      const detail = (event as CustomEvent<{ milestoneId?: string; ownerSlug?: string }>)
        .detail;
      if (!detail?.milestoneId || detail.ownerSlug !== ownerSlug) return;
      setItems((prev) =>
        prev.filter(
          (m) => m.id !== detail.milestoneId && m.cotMocId !== detail.milestoneId,
        ),
      );
      setInlineExpand((open) =>
        open?.key === `mid:${detail.milestoneId}` ||
        open?.key === detail.milestoneId
          ? null
          : open,
      );
    };
    const onMilestonePatch = (event: Event) => {
      const detail = (event as CustomEvent<MilestoneInlinePatchDetail>).detail;
      if (!detail?.milestoneId) return;
      setItems((prev) => applyMilestoneInlinePatch(prev, detail));
    };
    const onCreditsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<MilestoneCreditsUpdatedDetail>).detail;
      if (!detail?.tacPhamId) return;
      setItems((prev) => applyMilestoneCreditsUpdate(prev, detail));
    };
    window.addEventListener("cins:milestone-deleted", onMilestoneDeleted);
    window.addEventListener(MILESTONE_INLINE_PATCH_EVENT, onMilestonePatch);
    window.addEventListener(MILESTONE_CREDITS_UPDATED_EVENT, onCreditsUpdated);
    return () => {
      window.removeEventListener("cins:milestone-deleted", onMilestoneDeleted);
      window.removeEventListener(MILESTONE_INLINE_PATCH_EVENT, onMilestonePatch);
      window.removeEventListener(MILESTONE_CREDITS_UPDATED_EVENT, onCreditsUpdated);
    };
  }, [ownerSlug]);

  const loadMore = useCallback(async () => {
    if (!scrollLoad || loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const labelQ = personalFilter?.activeSlug
        ? `&label=${encodeURIComponent(personalFilter.activeSlug)}`
        : "";
      const res = await fetch(
        `/api/journey/${encodeURIComponent(scrollLoad.ownerSlug)}/milestones?offset=${nextOffset}${labelQ}`,
      );
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as {
        milestones: MilestoneItem[];
        hasMore: boolean;
        nextOffset: number;
      };
      setItems((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const extra = data.milestones.filter((m) => !seen.has(m.id));
        return [...prev, ...extra];
      });
      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
    } catch {
      setLoadError(true);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [scrollLoad, hasMore, nextOffset, personalFilter?.activeSlug]);

  useEffect(() => {
    if (!scrollLoad || !hasMore) return;
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { root: null, rootMargin: "480px 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [scrollLoad, hasMore, loadMore, items.length]);

  const handleToggleContent = useCallback(
    (milestone: MilestoneItem) => {
      if (milestoneContentKind(milestone.noiDungBlocks) !== "article") return;

      const key = timelineExpandKey(milestone, ownerSlug);
      const postOwnerSlug = milestone.postOwnerSlug ?? ownerSlug;
      setInlineExpand((prev) => {
        if (prev?.key === key) {
          if (prev.showContent) return null;
          return { ...prev, showContent: true };
        }
        return {
          key,
          postOwnerSlug,
          showContent: true,
          showComments: false,
        };
      });
    },
    [ownerSlug],
  );

  const handleOpenComments = useCallback(
    (milestone: MilestoneItem) => {
      const key = timelineExpandKey(milestone, ownerSlug);
      const postOwnerSlug = milestone.postOwnerSlug ?? ownerSlug;
      setInlineExpand((prev) => {
        if (prev?.key === key) {
          if (prev.showComments) {
            if (!prev.showContent) return null;
            return { ...prev, showComments: false };
          }
          return { ...prev, showComments: true };
        }
        return {
          key,
          postOwnerSlug,
          showContent: false,
          showComments: true,
        };
      });
    },
    [ownerSlug],
  );

  const handleCloseExpand = useCallback(() => setInlineExpand(null), []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    let lastKey: string | null = null;
    const onPointerOver = (e: Event) => {
      const article = (e.target as Element | null)?.closest<HTMLElement>(
        ".j-milestone[data-mid]",
      );
      if (!article || !el.contains(article)) return;
      const postSlug = article.getAttribute("data-post-slug");
      const postOwnerSlug =
        article.getAttribute("data-post-owner-slug") || ownerSlug;
      const milestoneId = article.getAttribute("data-mid");
      if (!milestoneId) return;
      const contentKind = article.getAttribute("data-content-kind");
      if (contentKind !== "article") return;

      const key = postSlug
        ? `${postOwnerSlug}:${postSlug}`
        : `mid:${milestoneId}`;
      if (key === lastKey) return;
      lastKey = key;

      prefetchMilestoneDetail({
        postOwnerSlug,
        postSlug,
        milestoneId,
      });
    };

    el.addEventListener("pointerover", onPointerOver);
    return () => el.removeEventListener("pointerover", onPointerOver);
  }, [ownerSlug]);

  const visibleItems = items;

  /* Tính counts cho từng group (dùng cho dropdown). */
  const counts = useMemo((): MilestoneFilterCounts => {
    if (scrollLoad?.filterCounts) return scrollLoad.filterCounts;
    return computeFilterCounts(visibleItems);
  }, [scrollLoad?.filterCounts, visibleItems]);

  const filtered = useMemo(() => {
    let rows = visibleItems;
    if (personalFilter?.activeSlug) {
      rows = rows.filter((m) =>
        matchesPersonalFilterSlug(m.personalFilterSlugs, personalFilter.activeSlug),
      );
    }
    if (filter === "all") return rows;
    if (filter === "cong-dong") {
      return rows.filter((m) => m.visibility === "cong-dong");
    }
    if (filter === "verified") {
      return rows.filter((m) => m.variant === "verified");
    }
    if (filter === "bookmark") {
      return rows.filter((m) => m.variant === "bookmark");
    }
    return rows.filter((m) => m.type === filter);
  }, [visibleItems, filter, personalFilter?.activeSlug]);

  /* Group theo năm DESC. */
  const byYear = useMemo(() => groupByYearDesc(filtered), [filtered]);

  const yearNow = String(new Date().getFullYear());

  const [spy, setSpy] = useState<TimelineScrollSpy>(() =>
    timelineScrollSpyFromParts(filtered[0]?.year, filtered[0]?.month, yearNow),
  );

  useEffect(() => {
    setSpy(
      timelineScrollSpyFromParts(filtered[0]?.year, filtered[0]?.month, yearNow),
    );
  }, [filter, ownerSlug, yearNow, filtered[0]?.id, filtered[0]?.year, filtered[0]?.month]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || filtered.length === 0) return;

    let raf = 0;
    const sync = () => {
      raf = 0;
      const next = computeScrollSpyFromMarkers(
        root,
        ".j-milestone[data-year][data-month]",
        JOURNEY_TIMELINE_SPY_ANCHOR_PX,
      );
      if (!next) return;
      setSpy((prev) =>
        prev.year === next.year && prev.month === next.month ? prev : next,
      );
    };
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(sync);
    };

    sync();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [filtered]);

  const totalVisible = filtered.length;
  const hasPersonalLabelFilter = Boolean(personalFilter?.activeSlug);
  const activePersonalFilter = personalFilter?.activeSlug
    ? personalFilter.filters.find((f) => f.slug === personalFilter.activeSlug)
    : null;
  const options = buildFilterOptions(counts).map((o) =>
    hasPersonalLabelFilter || o.group !== filter
      ? o
      : { ...o, count: totalVisible },
  );
  const hasData =
    visibleItems.length > 0 ||
    items.length > 0 ||
    (scrollLoad?.totalCount ?? 0) > 0;

  return (
    <main
      className="j-timeline"
      aria-label="Dòng thời gian Journey"
      ref={rootRef}
    >
      <JourneyTimelineBar
        year={spy.year}
        month={spy.month}
        filter={filter}
        onFilterChange={setFilter}
        options={options}
        enabled={isOwner || hasData}
        isOwner={isOwner}
        filterVisibility={filterVisibility}
        personalLabelMatchCount={totalVisible}
      />

      {isOwner && viewerProfileId && coAuthorPendingInvites.length > 0 ? (
        <JourneyCoAuthorPendingBanner
          invites={coAuthorPendingInvites}
          viewerProfileId={viewerProfileId}
          ownerSlug={ownerSlug}
        />
      ) : null}

      {/* CTA "Thêm nội dung mới" ở trên cùng (trước cột mốc gần nhất) để
          owner luôn có lối tạo bài viết ngay khi mở Journey. Càng kéo
          xuống, milestones sẽ cũ dần (year DESC + thoi_diem DESC). */}
      {hasData && isOwner ? (
        <JourneyCreateComposer ownerSlug={ownerSlug} />
      ) : null}

      {hasData ? (
        byYear.length > 0 ? (
          byYear.map((yb) => (
            <JourneyYearBlock
              key={yb.year}
              year={yb.year}
              milestones={yb.milestones}
              metaLeft={
                yb.year === Number(yearNow) ? "Năm hiện tại" : undefined
              }
              verifiedCount={
                yb.milestones.filter((m) => m.variant === "verified").length
              }
              isOwner={isOwner}
              ownerSlug={ownerSlug}
              ownerProfileId={ownerProfileId}
              viewerProfileId={viewerProfileId}
              authorAvatarUrl={ownerAvatarUrl ?? null}
              authorName={ownerName}
              inlineExpand={inlineExpand}
              onTogglePost={handleToggleContent}
              onOpenComments={handleOpenComments}
              onCloseExpand={handleCloseExpand}
            />
          ))
        ) : (
          <FilteredEmptyState
            filter={filter}
            personalLabelName={activePersonalFilter?.ten ?? null}
          />
        )
      ) : isOwner ? (
        <OwnerEmptyState
          ownerSlug={ownerSlug}
          ownerName={ownerName}
          ownerAvatarUrl={ownerAvatarUrl ?? null}
        />
      ) : (
        <GuestEmptyState ownerName={ownerName} />
      )}

      {scrollLoad && hasMore ? (
        <div ref={sentinelRef} className="j-timeline-scroll-sentinel" aria-hidden />
      ) : null}

      {loadingMore ? (
        <div className="j-timeline-load-more" aria-busy="true" aria-live="polite">
          <article className="j-milestone">
            <div className="j-m-body-wrap">
              <div className="j-m-card jcard j-skel-post-card">
                <div className="jcard-datebar">
                  <div className="j-skel j-skel-post-avatar" />
                  <div className="j-skel-post-badges">
                    <div className="j-skel j-skel-post-badge" />
                  </div>
                </div>
                <div className="jcard-body">
                  <div className="j-skel j-skel-post-line j-skel-post-line--title" />
                  <div className="j-skel j-skel-post-line" />
                </div>
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {loadError ? (
        <div className="j-timeline-load-retry-wrap">
          <button
            type="button"
            className="j-timeline-load-retry"
            onClick={() => void loadMore()}
          >
            Không tải được thêm cột mốc — thử lại
          </button>
        </div>
      ) : null}

      <div className="j-timeline-end" aria-hidden>
        <div className="j-timeline-end-text">— bắt đầu hành trình —</div>
      </div>
    </main>
  );
}

/* ────────────────────────────────────────────────────────────────
 * Helpers — group + counts + filter options
 * ──────────────────────────────────────────────────────────────── */

function groupByYearDesc(
  milestones: ReadonlyArray<MilestoneItem>,
): Array<{ year: number; milestones: ReadonlyArray<MilestoneItem> }> {
  const map = new Map<number, MilestoneItem[]>();
  for (const m of milestones) {
    const arr = map.get(m.year) ?? [];
    arr.push(m);
    map.set(m.year, arr);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, items]) => ({
      year,
      milestones: items.slice().sort(compareTimelineOrder),
    }));
}

/* ────────────────────────────────────────────────────────────────
 * Empty states
 * ──────────────────────────────────────────────────────────────── */

function OwnerEmptyState({
  ownerSlug,
  ownerName,
  ownerAvatarUrl,
}: {
  ownerSlug: string;
  ownerName: string;
  ownerAvatarUrl?: string | null;
}) {
  return (
    <section className="j-empty" aria-label="Hành trình của bạn">
      <div className="j-empty-card">
        <p className="j-empty-eyebrow">Journey · chưa có cột mốc</p>
        <h2 className="j-empty-title">Đây là khởi đầu hành trình của bạn.</h2>
        <p className="j-empty-body">
          Mỗi cột mốc là một mảnh ghép của con đường sáng tạo — khóa học vừa
          hoàn thành, dự án bạn đang làm, sự kiện bạn tham dự, hay đơn giản là
          một suy nghĩ về định hướng. Bắt đầu từ một cột mốc nhỏ nhất cũng được.
        </p>
        <JourneyCreateComposer ownerSlug={ownerSlug} />
        <p className="j-empty-hint">
          Bài viết, ảnh hoặc video sẽ xuất hiện trên timeline Journey của bạn.
        </p>
      </div>
    </section>
  );
}

function GuestEmptyState({ ownerName }: { ownerName: string }) {
  return (
    <section className="j-empty">
      <div className="j-empty-card">
        <p className="j-empty-eyebrow">Journey trống</p>
        <h2 className="j-empty-title">
          {ownerName} chưa chia sẻ cột mốc công khai.
        </h2>
        <p className="j-empty-body">
          Hành trình của họ vẫn đang được vun đắp. Quay lại sau nhé.
        </p>
      </div>
    </section>
  );
}

function FilteredEmptyState({
  filter,
  personalLabelName,
}: {
  filter: FilterGroup;
  personalLabelName?: string | null;
}) {
  const FILTER_LABELS: Record<FilterGroup, string> = {
    all: "Tất cả",
    hoc: "Học tập",
    lam: "Công việc",
    "du-an": "Dự án",
    "su-kien": "Sự kiện",
    "thanh-tuu": "Thành tựu",
    "ca-nhan": "Cá nhân",
    bookmark: "Lưu về",
    verified: "Verified",
    "cong-dong": "Cộng đồng",
  };

  return (
    <section className="j-empty">
      <div className="j-empty-card">
        <p className="j-empty-eyebrow">Bộ lọc hiện tại</p>
        <h2 className="j-empty-title">
          {personalLabelName ? (
            <>
              Không có cột mốc công khai nào gắn nhãn{" "}
              <em>{personalLabelName}</em>.
            </>
          ) : (
            <>
              Không có cột mốc thuộc nhóm{" "}
              <em>{FILTER_LABELS[filter] ?? filter}</em>.
            </>
          )}
        </h2>
        <p className="j-empty-body">
          {personalLabelName
            ? "Các bài gắn nhãn này có thể đang ở chế độ riêng tư trên từng cột mốc (badge trên card)."
            : "Đổi bộ lọc khác hoặc chọn “Tất cả” để xem toàn bộ Journey."}
        </p>
      </div>
    </section>
  );
}
