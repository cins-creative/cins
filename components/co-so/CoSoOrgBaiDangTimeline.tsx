"use client";

import { useMemo, useState } from "react";

import {
  CoSoOrgNhanTimelineBar,
  type CoSoNhanFilter,
} from "@/components/co-so/CoSoOrgNhanTimelineBar";
import { OrgBaiDangCreateComposer } from "@/components/truong/OrgBaiDangCreateComposer";
import { OrgBaiDangFilteredFeed } from "@/components/truong/OrgBaiDangFilteredFeed";
import { OrgBaiDangTimelineBar } from "@/components/truong/OrgBaiDangTimelineBar";
import { useOrgBaiDangView } from "@/components/truong/useOrgBaiDangView";
import {
  baiDangMonthLabel,
  baiDangYear,
  countBaiDangByFilter,
  filterBaiDangPosts,
  groupBaiDangByYear,
  type BaiDangTimelineFilter,
} from "@/lib/truong/bai-dang-timeline";
import type { TruongBaiDang, TruongListItem } from "@/lib/truong/types";
import type { CoSoFilterChip } from "@/lib/to-chuc/co-so-page-queries";

type OrgOwner = Pick<
  TruongListItem,
  "avatar_id" | "logo_id" | "avatar_src" | "ten"
>;

type Props = {
  posts: TruongBaiDang[];
  owner?: OrgOwner | null;
  composeEnabled?: boolean;
  orgFilters?: CoSoFilterChip[];
  guestEmptyMessage?: string;
};

function currentYearMonth() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: `Tháng ${now.getMonth() + 1}`,
  };
}

function countNhanFilters(
  posts: ReadonlyArray<TruongBaiDang>,
  filters: CoSoFilterChip[],
): Record<string, number> {
  const counts: Record<string, number> = { all: posts.length };
  for (const chip of filters) {
    counts[chip.slug] = chip.count > 0 ? chip.count : 0;
  }
  return counts;
}

export function CoSoOrgBaiDangTimeline({
  posts,
  owner = null,
  composeEnabled = false,
  orgFilters = [],
  guestEmptyMessage =
    "Chưa có bài đăng công khai. Tin tức và sự kiện sẽ hiển thị tại đây khi cơ sở đăng trên CINs.",
}: Props) {
  const useOrgFilters = orgFilters.length > 0;
  const [loaiFilter, setLoaiFilter] = useState<BaiDangTimelineFilter>("all");
  const [nhanFilter, setNhanFilter] = useState<CoSoNhanFilter>("all");
  const { view, setView, openPostFromGrid } = useOrgBaiDangView();

  const loaiCounts = useMemo(() => countBaiDangByFilter(posts), [posts]);
  const nhanCounts = useMemo(
    () => countNhanFilters(posts, orgFilters),
    [posts, orgFilters],
  );

  const filtered = useMemo(() => {
    if (useOrgFilters) {
      if (nhanFilter === "all") return [...posts];
      return [...posts];
    }
    return filterBaiDangPosts(posts, loaiFilter);
  }, [posts, useOrgFilters, nhanFilter, loaiFilter]);

  const yearGroups = useMemo(() => groupBaiDangByYear(filtered), [filtered]);
  const fallback = currentYearMonth();
  const topYear =
    yearGroups[0]?.year ?? baiDangYear(filtered[0]?.tao_luc) ?? fallback.year;
  const topMonth =
    baiDangMonthLabel(filtered[0]?.tao_luc) ??
    (posts.length === 0 ? fallback.month : null);

  const barEnabled = composeEnabled || posts.length > 0;

  const timelineBar = useOrgFilters ? (
    <CoSoOrgNhanTimelineBar
      year={topYear}
      monthLabel={topMonth}
      filter={nhanFilter}
      onFilterChange={setNhanFilter}
      counts={nhanCounts}
      filters={orgFilters}
      enabled={barEnabled}
      view={view}
      onViewChange={setView}
    />
  ) : (
    <OrgBaiDangTimelineBar
      year={topYear}
      monthLabel={topMonth}
      filterKey={loaiFilter}
      onFilterKeyChange={(key) => setLoaiFilter(key as typeof loaiFilter)}
      loaiCounts={loaiCounts}
      nhanCounts={{}}
      enabled={barEnabled}
      view={view}
      onViewChange={setView}
    />
  );

  if (posts.length === 0) {
    return (
      <main className="j-timeline tdh-org-baidang-timeline" aria-label="Timeline bài đăng">
        {timelineBar}
        {composeEnabled ? (
          <>
            <OrgBaiDangCreateComposer />
            <section className="j-empty" aria-label="Chưa có bài đăng">
              <div className="j-empty-card">
                <p className="j-empty-eyebrow">Bài đăng · chưa có nội dung</p>
                <h2 className="j-empty-title">Bắt đầu chia sẻ từ cơ sở của bạn.</h2>
                <p className="j-empty-body">
                  Thêm bài viết, ảnh hoặc video — nội dung sẽ hiện trên
                  timeline cơ sở đào tạo.
                </p>
              </div>
            </section>
          </>
        ) : (
          <p className="tdh-placeholder">{guestEmptyMessage}</p>
        )}
      </main>
    );
  }

  return (
    <main className="j-timeline tdh-org-baidang-timeline" aria-label="Timeline bài đăng">
      {timelineBar}
      {composeEnabled ? <OrgBaiDangCreateComposer /> : null}
      <OrgBaiDangFilteredFeed
        filtered={filtered}
        yearGroups={yearGroups}
        view={view}
        onOpenPostFromGrid={openPostFromGrid}
        owner={owner}
      />
    </main>
  );
}
