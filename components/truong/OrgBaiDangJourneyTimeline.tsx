"use client";

import { useMemo, useState } from "react";

import { OrgBaiDangCreateComposer } from "@/components/truong/OrgBaiDangCreateComposer";
import { OrgBaiDangJourneyCard } from "@/components/truong/OrgBaiDangJourneyCard";
import { OrgBaiDangTimelineBar } from "@/components/truong/OrgBaiDangTimelineBar";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import {
  baiDangMonthLabel,
  baiDangYear,
  countBaiDangByFilter,
  filterBaiDangPosts,
  groupBaiDangByYear,
  type BaiDangTimelineFilter,
} from "@/lib/truong/bai-dang-timeline";
import type { TruongBaiDang } from "@/lib/truong/types";

type Props = {
  posts: TruongBaiDang[];
};

export function OrgBaiDangJourneyTimeline({ posts: postsProp }: Props) {
  const ctx = useTruongInlineEdit();
  const posts = ctx?.baidang ?? postsProp;
  const canEdit = Boolean(ctx?.isEditing);
  const [filter, setFilter] = useState<BaiDangTimelineFilter>("all");

  const filtered = useMemo(
    () => filterBaiDangPosts(posts, filter),
    [posts, filter],
  );
  const yearGroups = useMemo(() => groupBaiDangByYear(filtered), [filtered]);
  const counts = useMemo(() => countBaiDangByFilter(posts), [posts]);

  const topYear = yearGroups[0]?.year ?? baiDangYear(filtered[0]?.tao_luc);
  const topMonth = baiDangMonthLabel(filtered[0]?.tao_luc);

  if (posts.length === 0) {
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
      <OrgBaiDangTimelineBar
        year={topYear}
        monthLabel={topMonth}
        filter={filter}
        onFilterChange={setFilter}
        counts={counts}
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
