"use client";

import Link from "next/link";
import {
  BadgeCheck,
  Heart,
  LayoutGrid,
  MessageCircle,
  Users,
  Waypoints,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { CongDongPostBookmarkAct } from "@/components/cong-dong/CongDongPostBookmarkAct";
import { useCongDongAuthGate } from "@/components/cong-dong/useCongDongAuthGate";
import { BunnyVideoProcessingPoller } from "@/components/journey/BunnyVideoProcessingPoller";
import { JourneyComposeProvider } from "@/components/journey/JourneyComposeContext";
import { JourneyCreateComposer } from "@/components/journey/JourneyCreateComposer";
import { CongDongAuthorMetaLine } from "@/components/cong-dong/CongDongAuthorMetaLine";
import { CongDongCategoryLinks } from "@/components/cong-dong/CongDongCategoryLinks";
import { congDongFeedPostCoverUrl } from "@/lib/cong-dong/feed-post-cover";
import { CongDongFilterAdminModal } from "@/components/cong-dong/CongDongFilterAdmin";
import { CongDongGroupSettingsModal } from "@/components/cong-dong/CongDongGroupSettingsModal";
import { CongDongMembersModal } from "@/components/cong-dong/CongDongMembersModal";
import {
  CongDongOrgBrandingAvatar,
  CongDongOrgBrandingCover,
} from "@/components/cong-dong/CongDongOrgBranding";
import { CongDongFeedFilterDropdown } from "@/components/cong-dong/CongDongFeedFilterDropdown";
import { CongDongNotifySidebar } from "@/components/cong-dong/CongDongNotifySidebar";
import { CongDongFeedPostContent } from "@/components/cong-dong/CongDongFeedPostContent";
import { CongDongFilterChip } from "@/components/cong-dong/CongDongFilterChip";
import { CongDongPostMenu } from "@/components/cong-dong/CongDongPostMenu";
import { JourneyArticleTagManager } from "@/components/journey/JourneyArticleTagManager";
import { JourneyMilestoneUnfold } from "@/components/journey/JourneyMilestoneUnfold";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { JourneyPostCommentsBlock } from "@/components/journey/JourneyPostBody";
import { CongDongRoleButton } from "@/components/cong-dong/CongDongRoleButton";
import {
  compareCongDongPostsByMilestoneDate,
  congDongPostTimelineParts,
} from "@/lib/cong-dong/feed-display";
import { SOCIAL_LOAI_DOI_TUONG } from "@/lib/cong-dong/constants";
import {
  canManageLabels,
  canManageMembers,
  type CongDongVaiTro,
} from "@/lib/cong-dong/vai-tro";
import type { OrgNotifyLevel } from "@/lib/social/org-notify";
import type {
  CongDongCareerSegment,
  CongDongCategory,
  CongDongComment,
  CongDongFilter,
  CongDongMemberPreview,
  CongDongPageData,
  CongDongPost,
} from "@/lib/cong-dong/types";
import { isMilestoneArticleCard } from "@/lib/journey/milestone-card-kind";
import type { MilestonePostComment } from "@/lib/journey/milestone-post-types";
import { getAvatarUrl } from "@/lib/journey/profile";
import {
  addCommentToThreads,
  countCommentThreads,
  removeCommentFromThreads,
  updateCommentInThreads,
} from "@/lib/social/comments/client-tree";
import {
  computeScrollSpyFromMarkers,
  scrollSpyAnchorBelowBar,
  timelineScrollSpyFromParts,
  type TimelineScrollSpy,
} from "@/lib/journey/timeline-scroll-spy";

type Props = {
  initial: CongDongPageData;
};

type FeedView = "journey" | "grid";
type SortMode = "moi" | "tuongtac" | "az";

const FACEPILE_COLORS = [
  "var(--cins-violet, #7c5cfc)",
  "var(--cins-mint, #1fa97e)",
  "var(--cins-orange, #FDAD4C)",
  "var(--cins-blue, #1f74c9)",
];

function buildPostsUrl(
  orgId: string,
  opts?: { cursor?: string | null; filterSlugs?: string[] },
) {
  const params = new URLSearchParams();
  if (opts?.cursor) params.set("cursor", opts.cursor);
  for (const slug of opts?.filterSlugs ?? []) {
    params.append("filter", slug);
  }
  const qs = params.toString();
  return `/api/cong-dong/${orgId}/posts${qs ? `?${qs}` : ""}`;
}

function postsMatchingFilterSlugs(
  list: CongDongPost[],
  slugs: string[],
): CongDongPost[] {
  if (slugs.length === 0) return list;
  return list.filter((post) =>
    slugs.some((slug) => post.filters.some((filter) => filter.slug === slug)),
  );
}

function sortPosts(posts: CongDongPost[], mode: SortMode): CongDongPost[] {
  const copy = [...posts];
  if (mode === "tuongtac") {
    return copy.sort(
      (a, b) =>
        b.likeCount + b.commentCount - (a.likeCount + a.commentCount),
    );
  }
  if (mode === "az") {
    return copy.sort((a, b) => {
      const ta = (a.tieuDe || a.noiDung).localeCompare(
        b.tieuDe || b.noiDung,
        "vi",
      );
      return ta;
    });
  }
  return copy.sort(compareCongDongPostsByMilestoneDate);
}

function postTimelineParts(thoiDiem: string): { year: string; month: string } {
  return congDongPostTimelineParts(thoiDiem);
}

export function CongDongPageClient({ initial }: Props) {
  const [org, setOrg] = useState(initial.org);
  const [isThanhVien, setIsThanhVien] = useState(initial.isThanhVien);
  const [viewerVaiTro, setViewerVaiTro] = useState<CongDongVaiTro | null>(
    initial.viewerVaiTro,
  );
  // Quyền CINs (trục 1) mở khoá vận hành dù không phải member cộng đồng.
  const isCinsAdmin = initial.isCinsAdmin;
  const canManageLabelsView = canManageLabels(viewerVaiTro) || isCinsAdmin;
  const canManageMembersView = canManageMembers(viewerVaiTro) || isCinsAdmin;
  const [notifyLevel, setNotifyLevel] = useState<OrgNotifyLevel>(
    initial.notifyLevel,
  );
  const [friendsInCommunity, setFriendsInCommunity] = useState<{
    friends: CongDongMemberPreview[];
    total: number;
  }>({ friends: [], total: 0 });
  const [careerMap, setCareerMap] = useState<CongDongCareerSegment[]>([]);
  const [sidebarLiveLoading, setSidebarLiveLoading] = useState(true);
  const [filters, setFilters] = useState(initial.filters);
  const [activeFilterSlugs, setActiveFilterSlugs] = useState<string[]>([]);
  const [posts, setPosts] = useState(initial.initialPosts);
  const [nextCursor, setNextCursor] = useState(initial.nextCursor);
  const [view, setView] = useState<FeedView>("journey");
  const [sortMode, setSortMode] = useState<SortMode>("moi");
  const [loadPending, startLoadMore] = useTransition();
  const [filterPending, startFilter] = useTransition();
  const filterAbortRef = useRef<AbortController | null>(null);
  const unfilteredFeedRef = useRef({
    posts: initial.initialPosts,
    nextCursor: initial.nextCursor,
  });
  const [filterAdminOpen, setFilterAdminOpen] = useState(false);
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [categories, setCategories] = useState<CongDongCategory[]>(
    initial.categories,
  );

  const canCompose = Boolean(
    isThanhVien && initial.viewerId && initial.viewerSlug,
  );
  const viewerSlug = initial.viewerSlug ?? "";

  useEffect(() => {
    let cancelled = false;
    setSidebarLiveLoading(true);
    void fetch(`/api/cong-dong/${org.id}/sidebar-live`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json: {
        friendsInCommunity?: { friends: CongDongMemberPreview[]; total: number };
        careerMap?: CongDongCareerSegment[];
      }) => {
        if (cancelled) return;
        setFriendsInCommunity(
          json.friendsInCommunity ?? { friends: [], total: 0 },
        );
        setCareerMap(json.careerMap ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setFriendsInCommunity({ friends: [], total: 0 });
          setCareerMap([]);
        }
      })
      .finally(() => {
        if (!cancelled) setSidebarLiveLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [org.id]);

  const handlePostUpdated = useCallback((updated: CongDongPost) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
  }, []);

  const handlePostDeleted = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const sortedPosts = useMemo(
    () => sortPosts(posts, sortMode),
    [posts, sortMode],
  );
  const feedBarRef = useRef<HTMLDivElement>(null);
  const yearNow = String(new Date().getFullYear());
  const firstPostParts = sortedPosts[0]
    ? postTimelineParts(sortedPosts[0].thoiDiem)
    : null;
  const showFeedTimeline = view === "journey" && sortedPosts.length > 0;
  const [timelineSpy, setTimelineSpy] = useState<TimelineScrollSpy>(() =>
    timelineScrollSpyFromParts(
      firstPostParts?.year,
      firstPostParts?.month,
      yearNow,
    ),
  );

  useEffect(() => {
    const parts = sortedPosts[0]
      ? postTimelineParts(sortedPosts[0].thoiDiem)
      : null;
    setTimelineSpy(
      timelineScrollSpyFromParts(parts?.year, parts?.month, yearNow),
    );
  }, [sortedPosts[0]?.id, sortedPosts.length, yearNow]);

  const handleTimelineSpyChange = useCallback((next: TimelineScrollSpy) => {
    setTimelineSpy((prev) =>
      prev.year === next.year && prev.month === next.month ? prev : next,
    );
  }, []);

  const onJoined = useCallback((vaiTro: CongDongVaiTro) => {
    setIsThanhVien(true);
    setViewerVaiTro(vaiTro);
    setNotifyLevel("chi_noi_bat");
  }, []);

  const onLeftCommunity = useCallback(() => {
    setIsThanhVien(false);
    setViewerVaiTro(null);
    setNotifyLevel("tat");
  }, []);

  const loadMore = () => {
    if (!nextCursor) return;
    startLoadMore(async () => {
      const res = await fetch(
        buildPostsUrl(org.id, {
          cursor: nextCursor,
          filterSlugs: activeFilterSlugs,
        }),
      );
      const json = (await res.json().catch(() => null)) as {
        posts?: CongDongPost[];
        nextCursor?: string | null;
      } | null;
      if (!res.ok || !json?.posts) return;
      setPosts((prev) => {
        const merged = [...prev, ...json.posts!];
        if (activeFilterSlugs.length === 0) {
          unfilteredFeedRef.current = {
            posts: merged,
            nextCursor: json.nextCursor ?? null,
          };
        }
        return merged;
      });
      setNextCursor(json.nextCursor ?? null);
    });
  };

  const applyFeedFilter = (slugs: string[]) => {
    setActiveFilterSlugs(slugs);

    if (slugs.length === 0) {
      const cached = unfilteredFeedRef.current;
      setPosts(cached.posts);
      setNextCursor(cached.nextCursor);
    } else {
      setPosts(
        postsMatchingFilterSlugs(unfilteredFeedRef.current.posts, slugs),
      );
    }

    filterAbortRef.current?.abort();
    const abort = new AbortController();
    filterAbortRef.current = abort;

    startFilter(async () => {
      try {
        const res = await fetch(buildPostsUrl(org.id, { filterSlugs: slugs }), {
          signal: abort.signal,
        });
        const json = (await res.json().catch(() => null)) as {
          posts?: CongDongPost[];
          nextCursor?: string | null;
        } | null;
        if (!res.ok || !json?.posts) return;
        setPosts(json.posts);
        setNextCursor(json.nextCursor ?? null);
        if (slugs.length === 0) {
          unfilteredFeedRef.current = {
            posts: json.posts,
            nextCursor: json.nextCursor ?? null,
          };
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    });
  };

  const refetchFeed = useCallback(() => {
    startFilter(async () => {
      const res = await fetch(
        buildPostsUrl(org.id, { filterSlugs: activeFilterSlugs }),
      );
      const json = (await res.json().catch(() => null)) as {
        posts?: CongDongPost[];
        nextCursor?: string | null;
      } | null;
      if (!res.ok || !json?.posts) return;
      setPosts(json.posts);
      setNextCursor(json.nextCursor ?? null);
      if (activeFilterSlugs.length === 0) {
        unfilteredFeedRef.current = {
          posts: json.posts,
          nextCursor: json.nextCursor ?? null,
        };
      }
    });
  }, [org.id, activeFilterSlugs]);

  const shareCommunity = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Sao chép link cộng đồng:", url);
    }
  };

  const onBrandingChange = useCallback(
    (patch: { avatarId?: string | null; coverId?: string | null }) => {
      setOrg((prev) => ({
        ...prev,
        ...(patch.avatarId !== undefined ? { avatarId: patch.avatarId } : {}),
        ...(patch.coverId !== undefined ? { coverId: patch.coverId } : {}),
      }));
    },
    [],
  );

  const page = (
    <>
    <div className="cd-v4-page">
      <div className="cd-v4-layout">
        <aside className="cd-v4-id">
          <div className="cd-v4-id-head">
            <div className="cd-v4-id-cover-stage">
              <CongDongOrgBrandingCover
                orgId={org.id}
                coverId={org.coverId}
                canEdit={initial.isAdmin}
                onBrandingChange={onBrandingChange}
              />
              <span className="cd-v4-cover-badge">
                <Users size={13} strokeWidth={2} aria-hidden />
                Cộng đồng
              </span>
              <div className="cd-v4-id-avatar-slot">
                <CongDongOrgBrandingAvatar
                  orgId={org.id}
                  orgName={org.ten}
                  avatarId={org.avatarId}
                  canEdit={initial.isAdmin}
                  onBrandingChange={onBrandingChange}
                />
              </div>
            </div>
            <div className="cd-v4-id-head-inset">
              <div className="cd-v4-id-head-main">
                <h1 className="cd-v4-title">{org.ten}</h1>
                {org.moTa ? <p className="cd-v4-desc">{org.moTa}</p> : null}
                <CongDongRoleButton
                  orgId={org.id}
                  isThanhVien={isThanhVien}
                  viewerVaiTro={viewerVaiTro}
                  isCinsAdmin={isCinsAdmin}
                  hideForOwner={initial.hideMembershipForOwner}
                  initialNotifyLevel={notifyLevel}
                  onJoined={onJoined}
                  onLeft={onLeftCommunity}
                  onNotifyLevelChange={setNotifyLevel}
                  onManageLabels={
                    canManageLabelsView
                      ? () => setFilterAdminOpen(true)
                      : undefined
                  }
                  onGroupSettings={
                    initial.isAdmin
                      ? () => setGroupSettingsOpen(true)
                      : undefined
                  }
                  onManageMembers={
                    canManageMembersView
                      ? () => setMembersOpen(true)
                      : undefined
                  }
                  onShare={shareCommunity}
                />
              </div>
            </div>
          </div>
          <div className="cd-v4-id-body">
            <CongDongCategoryLinks categories={categories} />

            {careerMap.length > 0 ? (
              <>
                <div className="cd-v4-divider" />
                <h2 className="cd-v4-sec-title">Cộng đồng này gồm ai</h2>
                <CareerMap segments={careerMap} />
              </>
            ) : sidebarLiveLoading ? (
              <>
                <div className="cd-v4-divider" />
                <p className="cd-v4-muted">Đang tải bản đồ nghề…</p>
              </>
            ) : null}

            {initial.viewerId && friendsInCommunity.total > 0 ? (
              <>
                <div className="cd-v4-divider" />
                <div className="cd-v4-friends-row">
                  <div className="cd-v4-facepile" aria-hidden>
                    {friendsInCommunity.friends.map((member, i) => (
                      <FacepileAvatar
                        key={member.id}
                        member={member}
                        color={FACEPILE_COLORS[i % FACEPILE_COLORS.length]}
                      />
                    ))}
                    {friendsInCommunity.total > friendsInCommunity.friends.length ? (
                      <span className="cd-v4-facepile-more">
                        +{friendsInCommunity.total - friendsInCommunity.friends.length}
                      </span>
                    ) : null}
                  </div>
                  <p className="cd-v4-face-note">
                    <strong>{friendsInCommunity.total} người bạn</strong> của bạn đang
                    ở đây
                  </p>
                </div>
              </>
            ) : sidebarLiveLoading && initial.viewerId ? (
              <>
                <div className="cd-v4-divider" />
                <p className="cd-v4-face-note cd-v4-face-note--solo cd-v4-muted">
                  Đang tải bạn bè…
                </p>
              </>
            ) : null}
          </div>
        </aside>

        <div className="cd-v4-main">
          <CongDongFeedStickyBar
            barRef={feedBarRef}
            showTimeline={showFeedTimeline}
            timelineSpy={timelineSpy}
            filters={filters}
            activeFilterSlugs={activeFilterSlugs}
            onFilterChange={applyFeedFilter}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            view={view}
            onViewChange={setView}
          />

          {canCompose && sortedPosts.length > 0 ? (
            <JourneyCreateComposer ownerSlug={viewerSlug} />
          ) : null}

          <div
            className={`cd-v4-feed${view === "grid" ? " is-grid" : " is-journey"}${filterPending ? " is-loading" : ""}`}
          >
            {filterPending && sortedPosts.length === 0 ? (
              <p className="cd-v4-empty">Đang lọc…</p>
            ) : sortedPosts.length === 0 ? (
              activeFilterSlugs.length > 0 ? (
                <p className="cd-v4-empty">
                  Chưa có bài đăng với nhãn này.
                </p>
              ) : canCompose ? (
                <CongDongMemberEmptyState
                  orgName={org.ten}
                  ownerSlug={viewerSlug}
                />
              ) : (
                <p className="cd-v4-empty">
                  Chưa có bài đăng nào. Tham gia cộng đồng để chia sẻ.
                </p>
              )
            ) : view === "journey" ? (
              <JourneyFeed
                posts={sortedPosts}
                orgId={org.id}
                filters={filters}
                viewerId={initial.viewerId}
                viewerVaiTro={viewerVaiTro}
                canInteract={isThanhVien}
                onPostUpdated={handlePostUpdated}
                onPostDeleted={handlePostDeleted}
                barRef={feedBarRef}
                onSpyChange={handleTimelineSpyChange}
              />
            ) : (
              <GridFeed
                posts={sortedPosts}
                orgId={org.id}
                canInteract={isThanhVien}
              />
            )}
          </div>

          {nextCursor ? (
            <button
              type="button"
              className="cd-v4-load-more"
              onClick={loadMore}
              disabled={loadPending}
            >
              {loadPending ? "Đang tải…" : "Xem thêm"}
            </button>
          ) : null}
        </div>

        <CongDongNotifySidebar
          orgId={org.id}
          orgTinhThanh={org.tinhThanh}
          canManage={canManageLabelsView}
        />
      </div>

    </div>

    {canManageLabelsView ? (
      <CongDongFilterAdminModal
        open={filterAdminOpen}
        onClose={() => setFilterAdminOpen(false)}
        orgId={org.id}
        filters={filters}
        onChange={setFilters}
      />
    ) : null}

    {initial.isAdmin ? (
      <CongDongGroupSettingsModal
        open={groupSettingsOpen}
        onClose={() => setGroupSettingsOpen(false)}
        orgId={org.id}
        categories={categories}
        onSaved={(next) => {
          setCategories(next);
          setGroupSettingsOpen(false);
        }}
      />
    ) : null}

    {canManageMembersView ? (
      <CongDongMembersModal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        orgId={org.id}
        orgSlug={org.slug}
        orgLabel={org.ten}
        viewerIsOwner={viewerVaiTro === "owner"}
      />
    ) : null}
    </>
  );

  if (!canCompose) return page;

  return (
    <JourneyComposeProvider
      ownerId={initial.viewerId!}
      ownerSlug={viewerSlug}
      ownerName={initial.viewerName ?? viewerSlug}
      ownerAvatarId={initial.viewerAvatarId}
      isOwner
      congDongCompose={{ orgId: org.id, filters }}
      onAfterPublished={refetchFeed}
    >
      <BunnyVideoProcessingPoller ownerSlug={viewerSlug} />
      {page}
    </JourneyComposeProvider>
  );
}

function CongDongMemberEmptyState({
  orgName,
  ownerSlug,
}: {
  orgName: string;
  ownerSlug: string;
}) {
  return (
    <section className="cd-v4-empty-card" aria-label="Chia sẻ với cộng đồng">
      <p className="cd-v4-empty-eyebrow">Cộng đồng · chưa có bài đăng</p>
      <h2 className="cd-v4-empty-title">
        Hãy là người đầu tiên chia sẻ với {orgName}.
      </h2>
      <p className="cd-v4-empty-body">
        Đăng bài viết, album ảnh hoặc video — hiển thị trong feed cộng đồng này.
      </p>
      <JourneyCreateComposer ownerSlug={ownerSlug} />
      <p className="cd-v4-empty-hint">
        Bài đăng từ đây chỉ xuất hiện trong nhóm, không thêm vào Journey cá nhân.
      </p>
    </section>
  );
}

function CareerMap({ segments }: { segments: CongDongCareerSegment[] }) {
  return (
    <div className="cd-v4-career">
      <div className="cd-v4-career-bar" aria-hidden>
        {segments.map((seg) => (
          <span
            key={seg.stage}
            style={{ width: `${seg.percent}%`, background: seg.color }}
          />
        ))}
      </div>
      <div className="cd-v4-career-legend">
        {segments.map((seg) => (
          <div key={seg.stage} className="cd-v4-career-row">
            <span
              className="cd-v4-career-swatch"
              style={{ background: seg.color }}
              aria-hidden
            />
            <span className="cd-v4-career-name">{seg.label}</span>
            <span className="cd-v4-career-val">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FacepileAvatar({
  member,
  color,
}: {
  member: CongDongMemberPreview;
  color: string;
}) {
  const avatar = getAvatarUrl(member.avatarId);
  return (
    <Link
      href={`/${member.slug}`}
      className="cd-v4-facepile-item"
      style={{ background: avatar ? undefined : color }}
      prefetch={false}
      title={member.tenHienThi}
    >
      {avatar ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={avatar} alt="" />
      ) : (
        member.initial
      )}
    </Link>
  );
}

type FeedStickyBarProps = {
  barRef: React.RefObject<HTMLDivElement | null>;
  showTimeline: boolean;
  timelineSpy: TimelineScrollSpy;
  filters: CongDongFilter[];
  activeFilterSlugs: string[];
  onFilterChange: (slugs: string[]) => void;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  view: FeedView;
  onViewChange: (view: FeedView) => void;
};

function CongDongFeedStickyBar({
  barRef,
  showTimeline,
  timelineSpy,
  filters,
  activeFilterSlugs,
  onFilterChange,
  sortMode,
  onSortModeChange,
  view,
  onViewChange,
}: FeedStickyBarProps) {
  return (
    <div
      ref={barRef}
      className={`cd-v4-moc-bar${showTimeline ? " has-timeline" : ""}`}
      aria-live={showTimeline ? "polite" : undefined}
      aria-label={
        showTimeline
          ? `Thời gian: ${timelineSpy.year}, ${timelineSpy.month || "—"}`
          : "Bộ lọc và sắp xếp bài đăng"
      }
    >
      {showTimeline ? (
        <>
          <span className="cd-v4-moc-yr">{timelineSpy.year}</span>
          <span
            className="cd-v4-moc-mo"
            style={{ visibility: timelineSpy.month ? "visible" : "hidden" }}
          >
            {timelineSpy.month || "—"}
          </span>
        </>
      ) : null}
      <div
        className="cd-v4-feed-controls"
        role="toolbar"
        aria-label="Lọc và sắp xếp bài đăng"
      >
        <CongDongFeedFilterDropdown
          filters={filters}
          activeFilterSlugs={activeFilterSlugs}
          onChange={onFilterChange}
          className="cd-v4-filter-dd--compact"
        />
        <select
          className="cd-v4-sort cd-v4-sort--compact"
          value={sortMode}
          onChange={(e) => onSortModeChange(e.target.value as SortMode)}
          aria-label="Sắp xếp bài đăng"
        >
          <option value="moi">Mới nhất</option>
          <option value="tuongtac">Tương tác</option>
          <option value="az">A → Z</option>
        </select>
        <div className="cd-v4-toggle cd-v4-toggle--compact" role="group" aria-label="Kiểu hiển thị">
          <button
            type="button"
            className={view === "journey" ? "is-on" : undefined}
            onClick={() => onViewChange("journey")}
            aria-label="Journey"
            title="Journey"
          >
            <Waypoints size={15} strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            className={view === "grid" ? "is-on" : undefined}
            onClick={() => onViewChange("grid")}
            aria-label="Lưới"
            title="Lưới"
          >
            <LayoutGrid size={15} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function JourneyFeed({
  posts,
  orgId,
  filters,
  viewerId,
  viewerVaiTro,
  canInteract,
  onPostUpdated,
  onPostDeleted,
  barRef,
  onSpyChange,
}: {
  posts: CongDongPost[];
  orgId: string;
  filters: CongDongFilter[];
  viewerId: string | null;
  viewerVaiTro: CongDongVaiTro | null;
  canInteract: boolean;
  onPostUpdated: (post: CongDongPost) => void;
  onPostDeleted: (postId: string) => void;
  barRef: React.RefObject<HTMLDivElement | null>;
  onSpyChange: (spy: TimelineScrollSpy) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || posts.length === 0) return;

    let raf = 0;
    const sync = () => {
      raf = 0;
      const anchor = scrollSpyAnchorBelowBar(barRef.current, 120);
      const next = computeScrollSpyFromMarkers(
        root,
        ".cd-v4-jcard[data-year][data-month]",
        anchor,
      );
      if (!next) return;
      onSpyChange(next);
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
  }, [posts, barRef, onSpyChange]);

  return (
    <div ref={rootRef} className="cd-v4-journey-feed">
      {posts.map((post) => (
        <CongDongJourneyPostCard
          key={post.id}
          orgId={orgId}
          post={post}
          filters={filters}
          viewerId={viewerId}
          viewerVaiTro={viewerVaiTro}
          canInteract={canInteract}
          onPostUpdated={onPostUpdated}
          onPostDeleted={onPostDeleted}
        />
      ))}
    </div>
  );
}

function GridFeed({
  posts,
  orgId,
  canInteract,
}: {
  posts: CongDongPost[];
  orgId: string;
  canInteract: boolean;
}) {
  return (
    <>
      {posts.map((post) => (
        <CongDongGridPostCard
          key={post.id}
          orgId={orgId}
          post={post}
          canInteract={canInteract}
        />
      ))}
    </>
  );
}

function usePostSocial(orgId: string, post: CongDongPost, canInteract: boolean) {
  const { requireCongDongAuth } = useCongDongAuthGate();
  const [liked, setLiked] = useState(post.viewerLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [comments, setComments] = useState<MilestonePostComment[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [pending, startTransition] = useTransition();

  const toggleLike = () => {
    requireCongDongAuth(() => {
      const next = !liked;
      setLiked(next);
      setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
      startTransition(async () => {
        const res = await fetch("/api/reactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loai_doi_tuong: SOCIAL_LOAI_DOI_TUONG.COT_MOC,
            id_doi_tuong: post.id,
            active: next,
          }),
        });
        const json = (await res.json().catch(() => null)) as { count?: number } | null;
        if (res.ok && typeof json?.count === "number") setLikeCount(json.count);
      });
    });
  };

  const openComments = () => {
    requireCongDongAuth(() => {
      setCommentsOpen(true);
      if (comments.length > 0) return;
      startTransition(async () => {
        const res = await fetch(
          `/api/cong-dong/${orgId}/posts/${post.id}/comments`,
        );
        const json = (await res.json().catch(() => null)) as {
          comments?: CongDongComment[];
        } | null;
        if (res.ok && json?.comments) {
          setComments(
            json.comments.map((c) => ({
              id: c.id,
              noiDung: c.noiDung,
              taoLuc: c.taoLuc,
              anhDinhKem: c.anhDinhKem ?? [],
              author: {
                id: c.author.id,
                slug: c.author.slug,
                tenHienThi: c.author.tenHienThi,
                avatarId: c.author.avatarId,
              },
              isOwn: false,
              reactions: [],
              replies: [],
              daXoa: false,
              ghimLuc: null,
            })),
          );
        }
      });
    });
  };

  const submitCommentAsync = useCallback(
    async (
      text: string,
      replyToId?: string | null,
      anhDinhKem?: string[],
    ) => {
      const res = await fetch(
        `/api/cong-dong/${orgId}/posts/${post.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noi_dung: text,
            id_cha: replyToId ?? null,
            anh_dinh_kem: anhDinhKem ?? [],
          }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        comment?: CongDongComment;
        error?: string;
      } | null;
      if (!res.ok || !json?.comment) {
        return {
          ok: false as const,
          error:
            typeof json?.error === "string"
              ? json.error
              : "Không gửi được bình luận.",
        };
      }
      const comment = json.comment;
      return {
        ok: true as const,
        data: {
          id: comment.id,
          noiDung: comment.noiDung,
          taoLuc: comment.taoLuc,
          idCha: replyToId ?? null,
          anhDinhKem: comment.anhDinhKem ?? [],
          author: {
            id: comment.author.id,
            slug: comment.author.slug,
            tenHienThi: comment.author.tenHienThi,
            avatarId: comment.author.avatarId,
          },
        },
      };
    },
    [orgId, post.id],
  );

  const onCommentAdded = useCallback((comment: MilestonePostComment) => {
    setComments((prev) => addCommentToThreads(prev, comment));
    setCommentCount((c) => c + 1);
  }, []);

  const onCommentUpdated = useCallback(
    (commentId: string, patch: Partial<MilestonePostComment>) => {
      setComments((prev) => updateCommentInThreads(prev, commentId, patch));
    },
    [],
  );

  const onCommentRemoved = useCallback((commentId: string) => {
    setComments((prev) => removeCommentFromThreads(prev, commentId));
    setCommentCount((c) => Math.max(0, c - 1));
  }, []);

  const onThreadsReordered = useCallback((threads: MilestonePostComment[]) => {
    setComments(threads);
  }, []);

  return {
    liked,
    likeCount,
    comments,
    commentsOpen,
    commentCount,
    pending,
    toggleLike,
    openComments,
    submitCommentAsync,
    onCommentAdded,
    onCommentUpdated,
    onCommentRemoved,
    onThreadsReordered,
  };
}

function CongDongJourneyPostCard({
  orgId,
  post,
  filters,
  viewerId,
  viewerVaiTro,
  canInteract,
  onPostUpdated,
  onPostDeleted,
}: {
  orgId: string;
  post: CongDongPost;
  filters: CongDongFilter[];
  viewerId: string | null;
  viewerVaiTro: CongDongVaiTro | null;
  canInteract: boolean;
  onPostUpdated: (post: CongDongPost) => void;
  onPostDeleted: (postId: string) => void;
}) {
  const [contentOpen, setContentOpen] = useState(false);
  const social = usePostSocial(orgId, post, canInteract);
  const avatarUrl = getAvatarUrl(post.author.avatarId);
  const initial = post.author.tenHienThi.charAt(0).toUpperCase();
  const isStatusPost =
    !post.journeyMirror &&
    !post.tieuDe &&
    post.media.length === 0;
  const { year, month } = postTimelineParts(post.thoiDiem);
  const mirror = post.journeyMirror;
  const isArticleMirror =
    Boolean(mirror) &&
    isMilestoneArticleCard(
      mirror?.noiDungBlocks,
      Boolean(mirror?.previewMedia?.src),
      mirror?.moTa,
    );
  const postOwnerSlug = mirror?.ownerSlug || post.author.slug;
  const postSlug = mirror?.postSlug || null;
  const cardTitle =
    mirror?.tieuDe || post.tieuDe || post.noiDung.slice(0, 80);
  const canManageArticleTags =
    Boolean(mirror) && viewerId === post.author.id;

  function toggleContent() {
    setContentOpen((open) => !open);
  }

  function handleExpandTrigger(e: React.MouseEvent<HTMLElement>) {
    if (!isArticleMirror || contentOpen) return;
    const target = e.target as Element;
    if (
      target?.closest(
        "a, button, input, textarea, select, summary, .j-m-menu, .authors-details, .image-grid-cell, .jcard-video-trigger, .jcard-actions",
      )
    ) {
      return;
    }
    toggleContent();
  }

  function handleExpandKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (!isArticleMirror || contentOpen) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    const target = e.target as Element;
    if (
      target?.closest(
        "a, button, input, textarea, select, summary, .j-m-menu, .authors-details, .image-grid-cell, .jcard-video-trigger, .jcard-actions",
      )
    ) {
      return;
    }
    e.preventDefault();
    toggleContent();
  }

  return (
    <article
      className={`cd-v4-jcard${post.ghim ? " is-pinned" : ""}${isStatusPost ? " is-status" : ""}${contentOpen ? " is-expanded" : ""}`}
      data-year={year}
      data-month={month}
    >
      {post.ghim ? (
        <span className="cd-v4-jcard-pin" aria-label="Đã ghim" title="Đã ghim">
          📌
        </span>
      ) : null}
      <header className="cd-v4-jcard-top">
        <JourneyUserPopover
          slug={post.author.slug}
          fallbackName={post.author.tenHienThi}
          fallbackAvatarUrl={avatarUrl}
          track={{ idBoiCanh: post.id, nguon: "cong_dong" }}
        >
          <span className="cd-v4-jcard-author">
            <span className="cd-v4-jcard-av">
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt="" />
              ) : (
                initial
              )}
            </span>
            <span className="cd-v4-jcard-meta">
              <strong>{post.author.tenHienThi}</strong>
              <CongDongAuthorMetaLine
                soBaiVietTrongNhom={post.author.soBaiVietTrongNhom}
                thoiDiem={post.thoiDiem}
              />
            </span>
          </span>
        </JourneyUserPopover>

        <div className="cd-v4-jcard-badges">
          {post.author.vaiTroLabel ? (
            <span className="cd-v4-jcard-badge">{post.author.vaiTroLabel}</span>
          ) : null}
          {post.filters.map((filter) => (
            <CongDongFilterChip key={filter.id} filter={filter} size="sm" />
          ))}
        </div>

        <CongDongPostMenu
          orgId={orgId}
          post={post}
          filters={filters}
          viewerId={viewerId}
          viewerVaiTro={viewerVaiTro}
          onUpdated={onPostUpdated}
          onDeleted={onPostDeleted}
        />
      </header>

      <div className="cd-v4-jcard-body">
        <CongDongFeedPostContent
          journeyMirror={post.journeyMirror}
          fallbackTitle={post.tieuDe}
          fallbackBody={post.noiDung}
          fallbackMedia={post.media}
          expandTrigger={
            isArticleMirror
              ? contentOpen
                ? { enabled: false, expanded: true }
                : {
                    enabled: true,
                    expanded: false,
                    ariaLabel: `Mở bài viết: ${cardTitle}`,
                    onClick: handleExpandTrigger,
                    onKeyDown: handleExpandKeyDown,
                  }
              : undefined
          }
          unfold={
            contentOpen && mirror ? (
              <JourneyMilestoneUnfold
                active
                showBlocks
                showComments={false}
                postOwnerSlug={postOwnerSlug}
                postSlug={postSlug}
                milestoneId={post.id}
                inlineSkip={{ byline: true, tags: true }}
              />
            ) : undefined
          }
          onCollapse={
            isArticleMirror && contentOpen ? () => setContentOpen(false) : undefined
          }
        />
      </div>

      <footer className="cd-v4-jcard-foot">
        <div className="cd-v4-jcard-act-group">
          <button
            type="button"
            className={`cd-v4-jcard-act${social.liked ? " is-liked" : ""}`}
            aria-label="Thích"
            onClick={social.toggleLike}
          >
            <Heart
              size={18}
              strokeWidth={2}
              fill={social.liked ? "currentColor" : "none"}
              aria-hidden
            />
            {social.likeCount > 0 ? (
              <span className="cd-v4-jcard-act-count">{social.likeCount}</span>
            ) : null}
          </button>
          <button
            type="button"
            className="cd-v4-jcard-act"
            aria-label="Bình luận"
            onClick={social.openComments}
          >
            <MessageCircle size={18} strokeWidth={2} aria-hidden />
            {social.commentCount > 0 ? (
              <span className="cd-v4-jcard-act-count">{social.commentCount}</span>
            ) : null}
          </button>
          <CongDongPostBookmarkAct
            orgId={orgId}
            postId={post.id}
            title={
              post.journeyMirror?.tieuDe ||
              post.tieuDe ||
              post.noiDung.slice(0, 55)
            }
            canInteract={canInteract}
            initialSaved={post.viewerBookmarked}
            milestoneId={post.id}
          />
        </div>
        {canManageArticleTags && mirror ? (
          <JourneyArticleTagManager
            tacPhamId={mirror.tacPhamId}
            initialTags={mirror.articleTags}
            onTagsSaved={(articleTags) =>
              onPostUpdated({
                ...post,
                journeyMirror: { ...mirror, articleTags },
              })
            }
          />
        ) : null}
      </footer>

      {social.commentsOpen ? (
        <CommentsPanel
          postId={post.id}
          contentOwnerId={post.author.id}
          viewerId={viewerId}
          social={social}
          canInteract={canInteract}
        />
      ) : null}
    </article>
  );
}

function CongDongGridPostCard({
  orgId,
  post,
  canInteract,
}: {
  orgId: string;
  post: CongDongPost;
  canInteract: boolean;
}) {
  const social = usePostSocial(orgId, post, canInteract);
  const avatarUrl = getAvatarUrl(post.author.avatarId);
  const coverSrc = congDongFeedPostCoverUrl(post);
  const initial = post.author.tenHienThi.charAt(0).toUpperCase();
  const title =
    post.journeyMirror?.tieuDe ||
    post.tieuDe ||
    post.noiDung.slice(0, 55);

  return (
    <article className="cd-v4-gcard">
      {coverSrc ? (
        <div className="cd-v4-gc-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverSrc} alt="" loading="lazy" />
          {post.filters.length > 0 ? (
            <div className="cd-v4-gc-tagfloat">
              {post.filters.map((filter) => (
                <CongDongFilterChip key={filter.id} filter={filter} size="sm" />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="cd-v4-gc-text">
          {post.noiDung.slice(0, 110)}
          {post.filters.length > 0 ? (
            <div className="cd-v4-gc-tagfloat">
              {post.filters.map((filter) => (
                <CongDongFilterChip key={filter.id} filter={filter} size="sm" />
              ))}
            </div>
          ) : null}
        </div>
      )}
      <div className="cd-v4-gc-body">
        <div className="cd-v4-gc-title">{title}</div>
        <div className="cd-v4-gc-foot">
          <span className="cd-v4-gc-av">
            {avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatarUrl} alt="" />
            ) : (
              initial
            )}
          </span>
          <Link href={`/${post.author.slug}`} prefetch={false}>
            {post.author.tenHienThi.split(" ").slice(-1)[0]}
          </Link>
          {post.author.verifiedCount > 0 ? (
            <BadgeCheck
              size={14}
              strokeWidth={2}
              aria-hidden
              className="cd-v4-gc-verified"
            />
          ) : null}
          <span className="cd-v4-gc-likes">
            <Heart size={14} strokeWidth={2} aria-hidden />
            {social.likeCount}
          </span>
        </div>
      </div>
    </article>
  );
}

function CommentsPanel({
  postId,
  contentOwnerId,
  viewerId,
  social,
  canInteract,
}: {
  postId: string;
  contentOwnerId: string;
  viewerId: string | null;
  social: ReturnType<typeof usePostSocial>;
  canInteract: boolean;
}) {
  const comments = social.comments.map((c) => ({
    ...c,
    isOwn: viewerId === c.author?.id,
  }));

  return (
    <div className="cd-v4-comments">
      <div className="cins-editor-page cins-post-view j-m-unfold-post j-m-unfold-post--comments-only">
        <JourneyPostCommentsBlock
          milestoneId={postId}
          contentOwnerId={contentOwnerId}
          viewerIsOwner={viewerId === contentOwnerId}
          comments={comments}
          viewerCanComment={canInteract}
          sectionId={`post-comments-${postId}`}
          submitComment={social.submitCommentAsync}
          onCommentAdded={social.onCommentAdded}
          onCommentUpdated={social.onCommentUpdated}
          onCommentRemoved={social.onCommentRemoved}
          onThreadsReordered={social.onThreadsReordered}
        />
      </div>
    </div>
  );
}
