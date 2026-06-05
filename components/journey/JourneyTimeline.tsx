"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { JourneyCoAuthorPendingBanner } from "@/components/journey/JourneyCoAuthorPendingBanner";
import { JourneyCreateComposer } from "@/components/journey/JourneyCreateComposer";
import { JourneyPostModal } from "@/components/journey/JourneyPostModal";
import { JourneyTimelineBar } from "@/components/journey/JourneyTimelineBar";
import type { FilterGroup } from "@/components/journey/JourneyTimelineBar";
import { JourneyYearBlock } from "@/components/journey/JourneyYearBlock";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import type { LoaiMocVisibilityMap } from "@/lib/journey/filter-visibility";
import type { MilestoneFilterCounts } from "@/lib/journey/milestones-page-fetch";
import type { PendingCoAuthorInvite } from "@/lib/social/types";

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
 * Scroll-spy cập nhật `tl-bar.year / month` theo viewport sẽ wire ở lượt sau
 * (không critical cho design).
 */
export function JourneyTimeline({
  isOwner,
  ownerName,
  ownerSlug,
  ownerAvatarUrl,
  milestones: initialMilestones,
  filterVisibility,
  viewerProfileId = null,
  coAuthorPendingInvites = [],
  scrollLoad,
}: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterGroup>("all");
  const [items, setItems] = useState<MilestoneItem[]>(() => [...initialMilestones]);
  const [hasMore, setHasMore] = useState(scrollLoad?.hasMore ?? false);
  const [nextOffset, setNextOffset] = useState(
    scrollLoad?.nextOffset ?? initialMilestones.length,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [openMilestoneId, setOpenMilestoneId] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    setItems([...initialMilestones]);
    setHasMore(scrollLoad?.hasMore ?? false);
    setNextOffset(scrollLoad?.nextOffset ?? initialMilestones.length);
    setLoadError(false);
  }, [initialMilestones, scrollLoad?.hasMore, scrollLoad?.nextOffset]);

  const loadMore = useCallback(async () => {
    if (!scrollLoad || loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadError(false);
    try {
      const res = await fetch(
        `/api/journey/${encodeURIComponent(scrollLoad.ownerSlug)}/milestones?offset=${nextOffset}`,
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
  }, [scrollLoad, hasMore, nextOffset]);

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

  /* Prefetch dedupe — track những href đã gọi `router.prefetch()` để tránh
     nhân đôi request (đặc biệt khi cùng card vừa enter viewport vừa hover). */
  const prefetchedRef = useRef<Set<string>>(new Set());
  const prefetch = useCallback(
    (postSlug: string, postOwnerSlug?: string | null) => {
      const actualOwnerSlug = postOwnerSlug || ownerSlug;
      const href =
        actualOwnerSlug === ownerSlug
          ? `/${actualOwnerSlug}/p/${postSlug}`
          : `/${actualOwnerSlug}/p/${postSlug}?owner=${encodeURIComponent(actualOwnerSlug)}`;
      if (prefetchedRef.current.has(href)) return;
      prefetchedRef.current.add(href);
      router.prefetch(href);
    },
    [router, ownerSlug],
  );

  /* Delegate click chỉ trên `.j-m-card.is-clickable` (NOT cả `.j-milestone`
     — `j-m-month` / diamond / dash đường ngang nằm ngoài card cũng thuộc
     article nhưng không nên trigger modal). Bỏ qua khi click rơi vào
     `.j-m-menu` (kebab + popup) — owner menu xử lý riêng. */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      const openPostAction = target.closest("[data-open-post]");
      if (
        !openPostAction &&
        target.closest(
          "a,button,input,textarea,select,summary,.j-m-menu,.authors-details",
        )
      ) {
        return;
      }

      const card = target.closest<HTMLElement>(".j-m-card.is-clickable");
      if (!card || !el.contains(card)) return;

      /* Lấy data-mid / data-post-slug từ `.j-milestone` chứa card đó. */
      const article = card.closest<HTMLElement>(".j-milestone[data-mid]");
      if (!article) return;
      const mid = article.getAttribute("data-mid");
      if (!mid) return;

      const postSlug = article.getAttribute("data-post-slug");
      if (postSlug) return;

      /* Không có post slug → fallback modal cũ (load by milestoneId). */
      setOpenMilestoneId(mid);
    };
    /* Keyboard parity: card là `<div role="button" tabIndex=0>` nên Enter /
       Space cần trigger giống click. Listener riêng cho keydown. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const target = e.target as Element | null;
      if (!target) return;
      const card = target.closest<HTMLElement>(".j-m-card.is-clickable");
      if (!card || !el.contains(card)) return;
      /* Chỉ trigger khi card đang focus — tránh bắt phím khi user gõ trong
         input/textarea bên trong card (chưa có nhưng future-proof). */
      if (document.activeElement !== card) return;
      e.preventDefault();
      const article = card.closest<HTMLElement>(".j-milestone[data-mid]");
      if (!article) return;
      const mid = article.getAttribute("data-mid");
      if (!mid) return;
      const postSlug = article.getAttribute("data-post-slug");
      if (postSlug) return;

      setOpenMilestoneId(mid);
    };
    /* Prefetch on hover — user di chuột tới card = intent rõ ràng → fire
       prefetch ngay để khi click là instant. Dùng `pointerover` (bubbles)
       thay `pointerenter` (không bubble, không delegate qua root được).
       `prefetch()` đã dedupe nên gọi nhiều lần khi chuột di chuyển trong
       card cũng OK. */
    let lastHoveredCard: Element | null = null;
    const onPointerOver = (e: Event) => {
      const target = e.target as Element | null;
      if (!target) return;
      const card = target.closest<HTMLElement>(".j-m-card.is-clickable");
      if (!card || card === lastHoveredCard) return;
      lastHoveredCard = card;
      const article = card.closest<HTMLElement>(".j-milestone[data-mid]");
      const postSlug = article?.getAttribute("data-post-slug");
      const postOwnerSlug = article?.getAttribute("data-post-owner-slug");
      if (postSlug) prefetch(postSlug, postOwnerSlug);
    };

    el.addEventListener("click", onClick);
    el.addEventListener("keydown", onKey);
    el.addEventListener("pointerover", onPointerOver);
    return () => {
      el.removeEventListener("click", onClick);
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("pointerover", onPointerOver);
    };
  }, [ownerSlug, prefetch]);

  /* Prefetch eager — gọi `router.prefetch` cho 8 milestone đầu tiên (above
     fold + ngay dưới). Next.js cache RSC payload của route intercepted, lần
     click sau navigation gần như không có latency. Dùng `requestIdleCallback`
     để không block initial render; fallback `setTimeout` cho browser cũ. */
  useEffect(() => {
    const eager = items
      .filter((m) => m.postSlug)
      .slice(0, 8)
      .map((m) => ({
        postSlug: m.postSlug as string,
        postOwnerSlug: m.postOwnerSlug ?? null,
      }));
    if (eager.length === 0) return;

    const run = () => {
      for (const item of eager) prefetch(item.postSlug, item.postOwnerSlug);
    };
    const ric: typeof window.requestIdleCallback | undefined = (
      window as unknown as {
        requestIdleCallback?: typeof window.requestIdleCallback;
      }
    ).requestIdleCallback;
    if (typeof ric === "function") {
      const id = ric(run);
      return () => {
        const cic: typeof window.cancelIdleCallback | undefined = (
          window as unknown as {
            cancelIdleCallback?: typeof window.cancelIdleCallback;
          }
        ).cancelIdleCallback;
        cic?.(id);
      };
    }
    const tid = window.setTimeout(run, 200);
    return () => window.clearTimeout(tid);
  }, [items, prefetch]);

  /* Prefetch lazy bằng IntersectionObserver — khi card cuộn vào viewport
     mới prefetch. Tránh blast 100+ request cùng lúc với journey dài. Dùng
     rootMargin dương để bắt đầu prefetch ngay TRƯỚC khi card thật sự visible
     (user scroll xuống = sẽ thấy ngay sau đó). */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const article = entry.target as HTMLElement;
          const postSlug = article.getAttribute("data-post-slug");
          const postOwnerSlug = article.getAttribute("data-post-owner-slug");
          if (postSlug) prefetch(postSlug, postOwnerSlug);
          observer.unobserve(article);
        }
      },
      { root: null, rootMargin: "200px 0px", threshold: 0 },
    );

    const articles = el.querySelectorAll<HTMLElement>(
      ".j-milestone[data-post-slug]",
    );
    articles.forEach((a) => observer.observe(a));

    return () => observer.disconnect();
    /* Re-bind khi milestones / filter đổi vì DOM article tree thay đổi. */
  }, [items, filter, prefetch]);

  const handleClose = useCallback(() => setOpenMilestoneId(null), []);

  /* Tính counts cho từng group (dùng cho dropdown). */
  const counts = useMemo((): Counts => {
    if (scrollLoad?.filterCounts) return scrollLoad.filterCounts;
    return computeCounts(items);
  }, [scrollLoad?.filterCounts, items]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "verified") return items.filter((m) => m.variant === "verified");
    if (filter === "bookmark") return items.filter((m) => m.variant === "bookmark");
    return items.filter((m) => m.type === filter);
  }, [items, filter]);

  /* Group theo năm DESC. */
  const byYear = useMemo(() => groupByYearDesc(filtered), [filtered]);

  const yearNow = String(new Date().getFullYear());
  const headerYear = byYear[0]?.year.toString() || yearNow;
  const headerMonth =
    byYear[0]?.milestones[0]?.month != null
      ? `Tháng ${byYear[0].milestones[0].month}`
      : "";

  const totalVisible = filtered.length;
  const options = buildOptions(counts);
  const hasData = (scrollLoad?.totalCount ?? items.length) > 0;

  return (
    <main
      className="j-timeline"
      aria-label="Dòng thời gian Journey"
      ref={rootRef}
    >
      <JourneyTimelineBar
        year={headerYear}
        month={headerMonth}
        filter={filter}
        onFilterChange={setFilter}
        options={options.map((o) =>
          o.group === filter ? { ...o, count: totalVisible } : o,
        )}
        enabled={hasData}
        isOwner={isOwner}
        filterVisibility={filterVisibility}
      />

      {isOwner && viewerProfileId && coAuthorPendingInvites.length > 0 ? (
        <JourneyCoAuthorPendingBanner
          invites={coAuthorPendingInvites}
          viewerProfileId={viewerProfileId}
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
              authorAvatarUrl={ownerAvatarUrl ?? null}
              authorName={ownerName}
            />
          ))
        ) : (
          <FilteredEmptyState filter={filter} />
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
          <div className="j-skel-milestone">
            <div className="j-skel j-skel-m-month" />
            <div className="j-skel-card">
              <div className="j-skel j-skel-card-head" />
              <div className="j-skel j-skel-card-title" />
              <div className="j-skel j-skel-card-line" />
            </div>
          </div>
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

      <JourneyPostModal
        milestoneId={openMilestoneId}
        onClose={handleClose}
      />
    </main>
  );
}

/* ────────────────────────────────────────────────────────────────
 * Helpers — group + counts + filter options
 * ──────────────────────────────────────────────────────────────── */

type Counts = {
  all: number;
  hoc: number;
  lam: number;
  "du-an": number;
  "su-kien": number;
  "thanh-tuu": number;
  "ca-nhan": number;
  bookmark: number;
  verified: number;
};

function computeCounts(milestones: ReadonlyArray<MilestoneItem>): Counts {
  const c: Counts = {
    all: milestones.length,
    hoc: 0,
    lam: 0,
    "du-an": 0,
    "su-kien": 0,
    "thanh-tuu": 0,
    "ca-nhan": 0,
    bookmark: 0,
    verified: 0,
  };
  for (const m of milestones) {
    if (m.type in c) c[m.type] = (c[m.type] as number) + 1;
    if (m.variant === "verified") c.verified += 1;
  }
  return c;
}

function buildOptions(c: Counts) {
  return [
    { group: "all" as const, label: "Tất cả", count: c.all, section: "type" as const, ico: "●" },
    { group: "hoc" as const, label: "Học tập", count: c.hoc, section: "type" as const, ico: "◆" },
    { group: "lam" as const, label: "Công việc", count: c.lam, section: "type" as const, ico: "◆" },
    { group: "du-an" as const, label: "Dự án", count: c["du-an"], section: "type" as const, ico: "◆" },
    { group: "su-kien" as const, label: "Sự kiện", count: c["su-kien"], section: "type" as const, ico: "◆" },
    { group: "thanh-tuu" as const, label: "Thành tựu", count: c["thanh-tuu"], section: "type" as const, ico: "◆" },
    { group: "ca-nhan" as const, label: "Cá nhân", count: c["ca-nhan"], section: "type" as const, ico: "◆" },
    {
      group: "verified" as const,
      label: "Verified",
      count: c.verified,
      section: "status" as const,
      modifier: "verified" as const,
      ico: "✓",
    },
    {
      group: "bookmark" as const,
      label: "Lưu về",
      count: c.bookmark,
      section: "status" as const,
      modifier: "bookmark" as const,
      ico: "⤓",
    },
  ];
}

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
      /* Sort trong năm: tháng DESC → ngày DESC → `createdAt` DESC → id ASC.
         Cùng ngày dùng `createdAt` (tao_luc) để mốc mới hơn lên đầu; nếu
         vẫn tie (createdAt null) thì id ASC ổn định cuối. */
      milestones: items.slice().sort((a, b) => {
        if (b.month !== a.month) return b.month - a.month;
        if (b.day !== a.day) return b.day - a.day;
        const ac = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bc = b.createdAt ? Date.parse(b.createdAt) : 0;
        if (bc !== ac) return bc - ac;
        return a.id.localeCompare(b.id);
      }),
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

function FilteredEmptyState({ filter }: { filter: FilterGroup }) {
  return (
    <section className="j-empty">
      <div className="j-empty-card">
        <p className="j-empty-eyebrow">Bộ lọc hiện tại</p>
        <h2 className="j-empty-title">
          Không có cột mốc thuộc nhóm <em>{filter}</em>.
        </h2>
        <p className="j-empty-body">
          Đổi bộ lọc khác hoặc chọn “Tất cả” để xem toàn bộ Journey.
        </p>
      </div>
    </section>
  );
}
