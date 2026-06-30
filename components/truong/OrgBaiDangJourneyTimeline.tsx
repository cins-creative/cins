"use client";

import { useEffect, useMemo, useState } from "react";

import { OrgBaiDangCreateComposer } from "@/components/truong/OrgBaiDangCreateComposer";
import { OrgBaiDangGridView } from "@/components/truong/OrgBaiDangGridView";
import { OrgBaiDangJourneyCard } from "@/components/truong/OrgBaiDangJourneyCard";
import { OrgBaiDangScheduledQueue } from "@/components/truong/OrgBaiDangScheduledQueue";
import { OrgBaiDangTimelineBar } from "@/components/truong/OrgBaiDangTimelineBar";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import type { OrgBaiDangView } from "@/lib/truong/bai-dang-grid";
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
  const [view, setView] = useState<OrgBaiDangView>("timeline");
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);

  function openPostInTimeline(postId: string) {
    setView("timeline");
    setPendingScrollId(postId);
  }

  useEffect(() => {
    if (view !== "timeline" || !pendingScrollId) return;
    const el = document.getElementById(`org-post-${pendingScrollId}`);
    setPendingScrollId(null);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("is-flash");
    const t = setTimeout(() => el.classList.remove("is-flash"), 1600);
    return () => clearTimeout(t);
  }, [view, pendingScrollId]);

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
            <OrgBaiDangCreateComposer />
            <section
              className="j-empty tdh-org-baidang-empty-intro"
              aria-label="Chưa có bài đăng"
            >
              <div className="j-empty-card tdh-org-baidang-empty-card">
                <p className="j-empty-eyebrow">Bài đăng · timeline trống</p>
                <h2 className="j-empty-title">
                  Chia sẻ tin tuyển sinh, sự kiện và hoạt động của trường.
                </h2>
                <p className="j-empty-body">
                  Đăng bài viết, album ảnh hoặc video — nội dung hiển thị ngay
                  trên trang trường, giúp học sinh và phụ huynh theo dõi dễ
                  hơn.
                </p>
                <p className="j-empty-hint tdh-org-baidang-empty-hint">
                  Chạm ô soạn thảo ở trên — thêm chữ, ảnh hoặc video để bắt
                  đầu.
                </p>
              </div>
            </section>
          </>
        ) : (
          <section className="j-empty tdh-org-baidang-empty-intro" aria-label="Chưa có bài đăng">
            <div className="j-empty-card tdh-org-baidang-empty-card">
              <p className="j-empty-eyebrow">Bài đăng</p>
              <h2 className="j-empty-title">
                Trường chưa đăng tin công khai.
              </h2>
              <p className="j-empty-body">
                Tin tuyển sinh, sự kiện và hoạt động sẽ hiển thị tại đây khi
                trường chia sẻ trên CINs.
              </p>
            </div>
          </section>
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
        view={view}
        onView={setView}
      />
      {view === "grid" ? (
        <OrgBaiDangGridView posts={filtered} onOpenPost={openPostInTimeline} />
      ) : (
        <>
          {canEdit ? <OrgBaiDangCreateComposer /> : null}
          {filtered.length === 0 ? (
            <p className="tdh-placeholder">
              Không có bài đăng thuộc nhóm lọc này.
            </p>
          ) : (
            yearGroups.map(({ year, posts: yearPosts }) => (
              <section key={year} className="j-year-block" data-year={year}>
                {yearPosts.map((post) => (
                  <OrgBaiDangJourneyCard key={post.id} post={post} />
                ))}
              </section>
            ))
          )}
        </>
      )}
    </main>
  );
}
