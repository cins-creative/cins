"use client";

import { useEffect, useMemo, useState } from "react";

import { OrgBaiDangCreateComposer } from "@/components/truong/OrgBaiDangCreateComposer";
import { OrgBaiDangFilteredFeed } from "@/components/truong/OrgBaiDangFilteredFeed";
import { OrgBaiDangTimelineBar } from "@/components/truong/OrgBaiDangTimelineBar";
import { useOrgBaiDangFilterOptional } from "@/components/truong/OrgBaiDangFilterContext";
import { useOrgBaiDangLoaiConfig } from "@/components/truong/OrgBaiDangLoaiConfigContext";
import { useOrgBaiDangPostOverlay } from "@/components/truong/useOrgBaiDangPostOverlay";
import { useOrgBaiDangView } from "@/components/truong/useOrgBaiDangView";
import { orgBaiDangFilterKeyFromSearch } from "@/lib/org/org-bai-dang-filter-share";
import { normalizeLoaiBaiDang } from "@/lib/truong/bai-dang";
import {
  baiDangMonthLabel,
  baiDangYear,
  countBaiDangNhanFilters,
  filterBaiDangByTimelineKey,
  filterBaiDangPosts,
  groupBaiDangByYear,
  type BaiDangTimelineFilter,
  type OrgBaiDangTimelineFilterKey,
} from "@/lib/truong/bai-dang-timeline";
import { orgBaiDangNhanSlugFromKey } from "@/lib/truong/org-bai-dang-filters.shared";
import type { TruongBaiDang, TruongListItem } from "@/lib/truong/types";
import type { OrgBaiDangView } from "@/lib/truong/bai-dang-grid";
import { buildPersonalFilterSearchUrl } from "@/lib/filter/client-utils";

type OrgOwner = Pick<
  TruongListItem,
  "avatar_id" | "logo_id" | "avatar_src" | "ten" | "slug" | "org_loai"
>;

type Props = {
  posts: TruongBaiDang[];
  owner?: OrgOwner | null;
  composeEnabled?: boolean;
  guestEmptyMessage?: string;
  /**
   * `showcase` — chỉ lens theo thẻ Sản phẩm: mặc định lưới gọn (masonry), card chỉ block nội dung.
   * `feed` — timeline đầy đủ (tab Bài đăng / cơ sở).
   */
  surface?: "feed" | "showcase";
  /** Ghi đè chế độ xem khởi tạo (vd. cấu hình studio Showcase). */
  defaultView?: OrgBaiDangView;
  /** Studio — quản lý cộng sự trên card bài đăng. */
  allowCoAuthorManage?: boolean;
};

function currentYearMonth() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: `Tháng ${now.getMonth() + 1}`,
  };
}

function countPostsByLoaiKeys(
  posts: ReadonlyArray<TruongBaiDang>,
  keys: ReadonlyArray<string>,
): Record<string, number> {
  const counts: Record<string, number> = { all: posts.length };
  for (const k of keys) counts[k] = 0;
  for (const p of posts) {
    const raw = String(p.loai_bai_dang ?? "")
      .trim()
      .toLowerCase();
    if (counts[raw] !== undefined) {
      counts[raw] += 1;
      continue;
    }
    const normalized = normalizeLoaiBaiDang(p.loai_bai_dang);
    if (counts[normalized] !== undefined) counts[normalized] += 1;
  }
  return counts;
}

function syncFilterKeyToUrl(key: OrgBaiDangTimelineFilterKey) {
  if (typeof window === "undefined") return;
  const slug = orgBaiDangNhanSlugFromKey(key);
  const next = buildPersonalFilterSearchUrl(
    window.location.pathname,
    window.location.search,
    slug,
  );
  if (next !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(null, "", next);
  }
}

export function CoSoOrgBaiDangTimeline({
  posts,
  owner = null,
  composeEnabled = false,
  guestEmptyMessage =
    "Chưa có bài đăng công khai. Tin tức và sự kiện sẽ hiển thị tại đây khi cơ sở đăng trên CINs.",
  surface = "feed",
  defaultView,
  allowCoAuthorManage = false,
}: Props) {
  const isShowcase = surface === "showcase";
  const filterCtx = useOrgBaiDangFilterOptional();
  const loaiConfig = useOrgBaiDangLoaiConfig();
  const useCustomNhan = Boolean(filterCtx) && !isShowcase;

  const [loaiFilter, setLoaiFilter] = useState<BaiDangTimelineFilter>("all");
  const [filterKey, setFilterKey] = useState<OrgBaiDangTimelineFilterKey>("all");
  const { view, setView } = useOrgBaiDangView(
    defaultView ?? (isShowcase ? "masonry" : "timeline"),
  );
  const { openPost: openPostFromGrid, overlay: postOverlay } =
    useOrgBaiDangPostOverlay({ posts, owner });

  useEffect(() => {
    if (!useCustomNhan) return;
    const key = orgBaiDangFilterKeyFromSearch(window.location.search);
    setFilterKey(key);
  }, [useCustomNhan]);

  const handleFilterKeyChange = (key: OrgBaiDangTimelineFilterKey) => {
    setFilterKey(key);
    if (useCustomNhan) syncFilterKeyToUrl(key);
  };

  const customSlugs = useMemo(
    () => filterCtx?.filters.map((f) => f.slug) ?? [],
    [filterCtx?.filters],
  );

  const loaiCounts = useMemo(
    () =>
      countPostsByLoaiKeys(
        posts,
        loaiConfig.options.map((o) => o.value),
      ),
    [posts, loaiConfig.options],
  );
  const customNhanCounts = useMemo(
    () => countBaiDangNhanFilters(posts, customSlugs),
    [posts, customSlugs],
  );

  const filtered = useMemo(() => {
    if (useCustomNhan) {
      return filterBaiDangByTimelineKey(posts, filterKey);
    }
    return filterBaiDangPosts(posts, loaiFilter);
  }, [posts, useCustomNhan, filterKey, loaiFilter]);

  const yearGroups = useMemo(() => groupBaiDangByYear(filtered), [filtered]);
  const fallback = currentYearMonth();
  const topYear =
    yearGroups[0]?.year ?? baiDangYear(filtered[0]?.tao_luc) ?? fallback.year;
  const topMonth =
    baiDangMonthLabel(filtered[0]?.tao_luc) ??
    (posts.length === 0 ? fallback.month : null);

  const barEnabled = composeEnabled || posts.length > 0;

  const timelineBar = (
    <OrgBaiDangTimelineBar
      year={topYear}
      monthLabel={topMonth}
      filterKey={useCustomNhan ? filterKey : loaiFilter}
      onFilterKeyChange={
        useCustomNhan
          ? handleFilterKeyChange
          : (key) => setLoaiFilter(key as typeof loaiFilter)
      }
      loaiCounts={loaiCounts}
      nhanCounts={useCustomNhan ? customNhanCounts : {}}
      enabled={barEnabled}
      view={view}
      onViewChange={setView}
      hideDate={isShowcase}
    />
  );

  if (posts.length === 0) {
    return (
      <main className="j-timeline tdh-org-baidang-timeline" aria-label="Timeline bài đăng">
        {timelineBar}
        {composeEnabled && !isShowcase ? (
          <>
            <OrgBaiDangCreateComposer owner={owner} />
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
      {composeEnabled && !isShowcase ? (
        <OrgBaiDangCreateComposer owner={owner} />
      ) : null}
      <OrgBaiDangFilteredFeed
        filtered={filtered}
        yearGroups={yearGroups}
        view={view}
        onOpenPostFromGrid={openPostFromGrid}
        owner={owner}
        contentOnly={isShowcase}
        allowCoAuthorManage={allowCoAuthorManage}
      />
      {postOverlay}
    </main>
  );
}
