"use client";

import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { JourneyPostModal } from "@/components/journey/JourneyPostModal";
import { JourneyTimelineBar } from "@/components/journey/JourneyTimelineBar";
import type { FilterGroup } from "@/components/journey/JourneyTimelineBar";
import { JourneyYearBlock } from "@/components/journey/JourneyYearBlock";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import type { LoaiMocVisibilityMap } from "@/lib/journey/filter-visibility";

type Props = {
  isOwner: boolean;
  ownerName: string;
  /** Slug owner — wire CTA "tạo cột mốc" → `/{ownerSlug}/p/new` (chỉ owner). */
  ownerSlug: string;
  /** Avatar URL owner (Cloudflare delivery) — render trong badge "Cá nhân". */
  ownerAvatarUrl?: string | null;
  /** Milestones từ DB — không sort sẵn. Component tự group theo year + sort desc. */
  milestones: ReadonlyArray<MilestoneItem>;
  /** Visibility per loai_moc filter row trong dropdown. Owner thấy toggle,
   *  visitor không thấy row nào marked `private`. */
  filterVisibility?: LoaiMocVisibilityMap;
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
  milestones,
  filterVisibility,
}: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterGroup>("all");
  /* Fallback modal state — chỉ kích hoạt cho cột mốc CHƯA có post (postSlug
     null). Cột mốc có postSlug → navigate URL `/{ownerSlug}/p/{postSlug}` để
     intercepted route hiển thị modal đè trên journey (URL update + share-able
     + browser-back hoạt động tự nhiên). */
  const [openMilestoneId, setOpenMilestoneId] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  /* Delegate click trên `.j-m-card`. Bỏ qua nếu click rơi vào `.j-m-menu`
     (kebab + popup) hoặc các tương tác có ý nghĩa riêng. */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (target.closest(".j-m-menu")) return;
      const article = target.closest<HTMLElement>(".j-milestone[data-mid]");
      if (!article || !el.contains(article)) return;
      const mid = article.getAttribute("data-mid");
      if (!mid) return;

      const postSlug = article.getAttribute("data-post-slug");
      if (postSlug) {
        /* Có post slug → navigate URL. Next.js intercept (vì đang ở
           `/[slug]/journey`) → render `@modal/(..)p/[postSlug]/page.tsx`
           ở slot modal, journey vẫn live ở dưới. */
        router.push(`/${ownerSlug}/p/${postSlug}`);
        return;
      }
      /* Không có post slug → fallback modal cũ (load by milestoneId). */
      setOpenMilestoneId(mid);
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [router, ownerSlug]);

  const handleClose = useCallback(() => setOpenMilestoneId(null), []);

  /* Tính counts cho từng group (dùng cho dropdown). */
  const counts = useMemo(() => computeCounts(milestones), [milestones]);

  /* Lọc theo filter hiện tại. */
  const filtered = useMemo(() => {
    if (filter === "all") return milestones;
    if (filter === "verified")
      return milestones.filter((m) => m.variant === "verified");
    return milestones.filter((m) => m.type === filter);
  }, [milestones, filter]);

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
  const hasData = milestones.length > 0;

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

      {/* CTA "Thêm nội dung mới" ở trên cùng (trước cột mốc gần nhất) để
          owner luôn có lối tạo bài viết ngay khi mở Journey. Càng kéo
          xuống, milestones sẽ cũ dần (year DESC + thoi_diem DESC). */}
      {hasData && isOwner ? <CreateMilestoneCta ownerSlug={ownerSlug} /> : null}

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
        <OwnerEmptyState ownerSlug={ownerSlug} />
      ) : (
        <GuestEmptyState ownerName={ownerName} />
      )}

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
      milestones: items
        .slice()
        .sort((a, b) => (b.month - a.month) || a.id.localeCompare(b.id)),
    }));
}

/* ────────────────────────────────────────────────────────────────
 * Empty states
 * ──────────────────────────────────────────────────────────────── */

function OwnerEmptyState({ ownerSlug }: { ownerSlug: string }) {
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
        <div className="j-empty-actions">
          <Link
            href={`/${ownerSlug}/p/new`}
            className="j-empty-btn j-empty-btn--primary"
          >
            <Plus size={16} strokeWidth={2} aria-hidden /> Thêm cột mốc đầu tiên
          </Link>
          <button
            type="button"
            className="j-empty-btn j-empty-btn--ghost"
            disabled
          >
            Xem hướng dẫn
          </button>
        </div>
        <p className="j-empty-hint">
          Bài viết được lưu vào cột mốc đầu tiên trên Journey của bạn.
        </p>
      </div>
    </section>
  );
}

/**
 * CTA tạo cột mốc — luôn hiện ở đầu timeline cho owner (cả khi đã có
 * milestones lẫn lúc trống). Click → mở trình tạo bài viết.
 */
function CreateMilestoneCta({ ownerSlug }: { ownerSlug: string }) {
  return (
    <Link
      href={`/${ownerSlug}/p/new`}
      className="j-create-cta"
      aria-label="Thêm nội dung mới vào Journey"
    >
      <span className="j-create-cta-diamond" aria-hidden>
        <Plus size={20} strokeWidth={2.2} />
      </span>
      <span className="j-create-cta-body">
        <span className="j-create-cta-title">Thêm nội dung mới</span>
        <span className="j-create-cta-sub">
          Bài viết · dự án · sự kiện · thành tựu — kể câu chuyện sáng tạo của bạn.
        </span>
      </span>
      <span className="j-create-cta-arrow" aria-hidden>
        <ArrowRight size={16} strokeWidth={1.8} />
      </span>
    </Link>
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
