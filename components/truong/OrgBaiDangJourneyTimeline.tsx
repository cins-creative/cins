"use client";

import { useMemo, useState } from "react";

import { OrgBaiDangCreateComposer } from "@/components/truong/OrgBaiDangCreateComposer";
import { OrgBaiDangJourneyCard } from "@/components/truong/OrgBaiDangJourneyCard";
import { OrgBaiDangScheduledQueue } from "@/components/truong/OrgBaiDangScheduledQueue";
import { OrgBaiDangTimelineBar } from "@/components/truong/OrgBaiDangTimelineBar";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import {
  baiDangMonthLabel,
  baiDangYear,
  countBaiDangByFilter,
  countBaiDangNhanFilters,
  filterBaiDangByTimelineKey,
  groupBaiDangByYear,
  type OrgBaiDangTimelineFilterKey,
} from "@/lib/truong/bai-dang-timeline";
import { useOrgBaiDangFilterOptional } from "@/components/truong/OrgBaiDangFilterContext";
import { isTruongBaiDangVisibleOnTimeline } from "@/lib/truong/org-bai-dang-schedule";
import type { TruongBaiDang } from "@/lib/truong/types";

type Props = {
  posts: TruongBaiDang[];
};

export function OrgBaiDangJourneyTimeline({ posts: postsProp }: Props) {
  const ctx = useTruongInlineEdit();
  const filterCtx = useOrgBaiDangFilterOptional();
  const allPosts = ctx?.baidang ?? postsProp;
  const scheduledPosts = ctx?.scheduledBaidang ?? [];
  const posts = useMemo(
    () => allPosts.filter((p) => isTruongBaiDangVisibleOnTimeline(p)),
    [allPosts],
  );
  const canEdit = Boolean(ctx?.isEditing);
  const [filterKey, setFilterKey] = useState<OrgBaiDangTimelineFilterKey>("all");

  const customSlugs = useMemo(
    () => filterCtx?.filters.map((f) => f.slug) ?? [],
    [filterCtx?.filters],
  );

  const filtered = useMemo(
    () => filterBaiDangByTimelineKey(posts, filterKey),
    [posts, filterKey],
  );
  const yearGroups = useMemo(() => groupBaiDangByYear(filtered), [filtered]);
  const loaiCounts = useMemo(() => countBaiDangByFilter(posts), [posts]);
  const nhanCounts = useMemo(
    () => countBaiDangNhanFilters(posts, customSlugs),
    [posts, customSlugs],
  );

  const topYear = yearGroups[0]?.year ?? baiDangYear(filtered[0]?.tao_luc);
  const topMonth = baiDangMonthLabel(filtered[0]?.tao_luc);

  if (posts.length === 0 && scheduledPosts.length === 0) {
    return (
      <div className="tdh-org-baidang-empty">
        {canEdit ? (
          <>
            <p className="tdh-placeholder">
              Chưa có bài đăng — thêm bài viết, ảnh hoặc video đầu tiên.
            </p>
            <OrgBaiDangCreateComposer />
          </>
        ) : (
          <p className="tdh-placeholder">
            Chưa có bài đăng công khai. Tin tuyển sinh và sự kiện sẽ hiển thị tại
            đây khi trường đăng trên CINs.
          </p>
        )}
      </div>
    );
  }

  return (
    <main className="j-timeline tdh-org-baidang-timeline" aria-label="Timeline bài đăng">
      {canEdit && scheduledPosts.length > 0 ? (
        <OrgBaiDangScheduledQueue posts={scheduledPosts} />
      ) : null}
      <OrgBaiDangTimelineBar
        year={topYear}
        monthLabel={topMonth}
        filterKey={filterKey}
        onFilterKeyChange={setFilterKey}
        loaiCounts={loaiCounts}
        nhanCounts={nhanCounts}
        enabled={posts.length > 0}
      />
      {canEdit ? <OrgBaiDangCreateComposer /> : null}
      {filtered.length === 0 ? (
        <p className="tdh-placeholder">Không có bài đăng thuộc nhóm lọc này.</p>
      ) : (
        yearGroups.map(({ year, posts: yearPosts }) => (
          <section key={year} className="j-year-block" data-year={year}>
            {yearPosts.map((post) => (
              <OrgBaiDangJourneyCard key={post.id} post={post} />
            ))}
          </section>
        ))
      )}
    </main>
  );
}
