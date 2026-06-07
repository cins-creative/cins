"use client";

import Link from "next/link";
import {
  BadgeCheck,
  Bookmark,
  Heart,
  LayoutGrid,
  MessageCircle,
  MoreHorizontal,
  Pin,
  ShieldCheck,
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
import { CongDongEventRail } from "@/components/cong-dong/CongDongEventRail";
import { CongDongFeedPostContent } from "@/components/cong-dong/CongDongFeedPostContent";
import { CongDongFilterChip } from "@/components/cong-dong/CongDongFilterChip";
import { CongDongRoleButton } from "@/components/cong-dong/CongDongRoleButton";
import { formatCongDongRelativeTime } from "@/lib/cong-dong/feed-display";
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
  CongDongPulseItem,
} from "@/lib/cong-dong/types";
import { getAvatarUrl } from "@/lib/journey/profile";
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
  "var(--cins-orange, #f0913b)",
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
  return copy.sort(
    (a, b) => new Date(b.taoLuc).getTime() - new Date(a.taoLuc).getTime(),
  );
}

function postTimelineParts(iso: string): { year: string; month: string } {
  const d = new Date(iso);
  return {
    year: String(d.getUTCFullYear()),
    month: String(d.getUTCMonth() + 1),
  };
}

export function CongDongPageClient({ initial }: Props) {
  const [org, setOrg] = useState(initial.org);
  const [isThanhVien, setIsThanhVien] = useState(initial.isThanhVien);
  const [viewerVaiTro, setViewerVaiTro] = useState<CongDongVaiTro | null>(
    initial.viewerVaiTro,
  );
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
  const [filterAdminOpen, setFilterAdminOpen] = useState(false);
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [eventRail, setEventRail] = useState(initial.eventRail);
  const [categories, setCategories] = useState<CongDongCategory[]>(
    initial.categories,
  );

  const isVerifiedOfficial = org.trangThaiTinCay === "verified_official";
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

  const sortedPosts = useMemo(
    () => sortPosts(posts, sortMode),
    [posts, sortMode],
  );
  const feedBarRef = useRef<HTMLDivElement>(null);
  const yearNow = String(new Date().getFullYear());
  const firstPostParts = sortedPosts[0]
    ? postTimelineParts(sortedPosts[0].taoLuc)
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
    const parts = sortedPosts[0] ? postTimelineParts(sortedPosts[0].taoLuc) : null;
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
      setPosts((prev) => [...prev, ...json.posts!]);
      setNextCursor(json.nextCursor ?? null);
    });
  };

  const applyFeedFilter = (slugs: string[]) => {
    setActiveFilterSlugs(slugs);
    startFilter(async () => {
      const res = await fetch(buildPostsUrl(org.id, { filterSlugs: slugs }));
      const json = (await res.json().catch(() => null)) as {
        posts?: CongDongPost[];
        nextCursor?: string | null;
      } | null;
      if (!res.ok || !json?.posts) return;
      setPosts(json.posts);
      setNextCursor(json.nextCursor ?? null);
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
            <CongDongOrgBrandingCover
              orgId={org.id}
              coverId={org.coverId}
              canEdit={initial.isAdmin}
              onBrandingChange={onBrandingChange}
            />
            <div className="cd-v4-id-head-inset">
              <CongDongOrgBrandingAvatar
                orgId={org.id}
                orgName={org.ten}
                avatarId={org.avatarId}
                canEdit={initial.isAdmin}
                onBrandingChange={onBrandingChange}
              />
              <h1 className="cd-v4-title">{org.ten}</h1>
              <div className="cd-v4-meta">
                <span className="cd-v4-verified">
                  <ShieldCheck size={14} strokeWidth={2} aria-hidden />
                  Cộng đồng
                </span>
                {isVerifiedOfficial ? (
                  <>
                    <span className="cd-v4-dot" aria-hidden />
                    <span className="cd-v4-verified">
                      <BadgeCheck size={14} strokeWidth={2} aria-hidden />
                      Đã xác minh
                    </span>
                  </>
                ) : null}
              </div>

              <CongDongRoleButton
                orgId={org.id}
                isThanhVien={isThanhVien}
                viewerVaiTro={viewerVaiTro}
                hideForOwner={initial.hideMembershipForOwner}
                initialNotifyLevel={notifyLevel}
                onJoined={onJoined}
                onLeft={onLeftCommunity}
                onNotifyLevelChange={setNotifyLevel}
                onManageLabels={
                  canManageLabels(viewerVaiTro)
                    ? () => setFilterAdminOpen(true)
                    : undefined
                }
                onGroupSettings={
                  initial.isAdmin
                    ? () => setGroupSettingsOpen(true)
                    : undefined
                }
                onManageMembers={
                  canManageMembers(viewerVaiTro)
                    ? () => setMembersOpen(true)
                    : undefined
                }
                onShare={shareCommunity}
              />

              {org.moTa ? <p className="cd-v4-desc">{org.moTa}</p> : null}
            </div>
          </div>
          <div className="cd-v4-id-body">
            <CongDongCategoryLinks categories={categories} />

            {initial.viewerId && friendsInCommunity.total > 0 ? (
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
            ) : sidebarLiveLoading && initial.viewerId ? (
              <p className="cd-v4-face-note cd-v4-face-note--solo cd-v4-muted">
                Đang tải bạn bè…
              </p>
            ) : null}

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

            {initial.communityPulse.length > 0 ? (
              <>
                <div className="cd-v4-divider" />
                <h2 className="cd-v4-sec-title">Nhịp cộng đồng</h2>
                <CommunityPulse items={initial.communityPulse} />
              </>
            ) : null}
          </div>
        </aside>

        <div className="cd-v4-main">
          <CongDongFeedStickyBar
            barRef={feedBarRef}
            showTimeline={showFeedTimeline}
            timelineSpy={timelineSpy}
            filterPending={filterPending}
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
            className={`cd-v4-feed${view === "grid" ? " is-grid" : " is-journey"}`}
          >
            {sortedPosts.length === 0 ? (
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
                canInteract={isThanhVien}
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

        <CongDongEventRail
          orgId={org.id}
          eventRail={eventRail}
          canManage={canManageLabels(viewerVaiTro)}
          onEventRailChange={setEventRail}
        />
      </div>

    </div>

    {canManageLabels(viewerVaiTro) ? (
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

    {canManageMembers(viewerVaiTro) ? (
      <CongDongMembersModal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        orgId={org.id}
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

function CommunityPulse({ items }: { items: CongDongPulseItem[] }) {
  return (
    <div className="cd-v4-pulse">
      {items.map((item, i) => (
        <div key={`${item.kind}-${item.userSlug}-${i}`} className="cd-v4-pulse-item">
          <span
            className={`cd-v4-pulse-dot${item.kind === "join" ? " is-join" : " is-mile"}`}
            aria-hidden
          />
          <div className="cd-v4-pulse-copy">
            {item.kind === "milestone" ? (
              <>
                <strong>{item.userName}</strong> vừa đạt cột mốc{" "}
                <span className="cd-v4-pulse-badge">
                  <BadgeCheck size={12} strokeWidth={2} aria-hidden />
                  {item.milestoneTitle}
                </span>{" "}
                <span className="cd-v4-pulse-time">
                  · {formatCongDongRelativeTime(item.taoLuc)}
                </span>
              </>
            ) : (
              <>
                <strong>{item.userName}</strong> vừa tham gia{" "}
                <span className="cd-v4-pulse-time">
                  · {formatCongDongRelativeTime(item.taoLuc)}
                </span>
              </>
            )}
          </div>
        </div>
      ))}
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
  filterPending: boolean;
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
  filterPending,
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
        className={`cd-v4-feed-controls${filterPending ? " is-loading" : ""}`}
        role="toolbar"
        aria-label="Lọc và sắp xếp bài đăng"
      >
        <CongDongFeedFilterDropdown
          filters={filters}
          activeFilterSlugs={activeFilterSlugs}
          onChange={onFilterChange}
          disabled={filterPending}
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
  canInteract,
  barRef,
  onSpyChange,
}: {
  posts: CongDongPost[];
  orgId: string;
  canInteract: boolean;
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
          canInteract={canInteract}
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
  const [comments, setComments] = useState<CongDongComment[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
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
            loai_doi_tuong: SOCIAL_LOAI_DOI_TUONG.THAO_LUAN,
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
        if (res.ok && json?.comments) setComments(json.comments);
      });
    });
  };

  const openSave = () => {
    requireCongDongAuth(() => {
      /* Bookmark thảo luận — sẽ bổ sung API sau */
    });
  };

  const openPostMenu = () => {
    requireCongDongAuth(() => {
      /* Tuỳ chọn bài — sẽ bổ sung sau */
    });
  };

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    requireCongDongAuth(() => {
      if (!canInteract) return;
      const text = commentText.trim();
      if (!text) return;
      startTransition(async () => {
        const res = await fetch(
          `/api/cong-dong/${orgId}/posts/${post.id}/comments`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ noi_dung: text }),
          },
        );
        const json = (await res.json().catch(() => null)) as {
          comment?: CongDongComment;
        } | null;
        if (!res.ok || !json?.comment) return;
        setComments((prev) => [...prev, json.comment!]);
        setCommentCount((c) => c + 1);
        setCommentText("");
      });
    });
  };

  return {
    liked,
    likeCount,
    comments,
    commentsOpen,
    commentText,
    setCommentText,
    commentCount,
    pending,
    toggleLike,
    openComments,
    openSave,
    openPostMenu,
    submitComment,
  };
}

function CongDongJourneyPostCard({
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
  const initial = post.author.tenHienThi.charAt(0).toUpperCase();
  const isStatusPost =
    !post.journeyMirror &&
    !post.tieuDe &&
    post.media.length === 0;
  const { year, month } = postTimelineParts(post.taoLuc);

  return (
    <article
      className={`cd-v4-jcard${post.ghim ? " is-pinned" : ""}${isStatusPost ? " is-status" : ""}`}
      data-year={year}
      data-month={month}
    >
      <header className="cd-v4-jcard-top">
        <Link
          href={`/${post.author.slug}`}
          className="cd-v4-jcard-author"
          prefetch={false}
        >
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
              activityAt={post.taoLuc}
            />
          </span>
        </Link>

        <div className="cd-v4-jcard-badges">
          {post.author.vaiTroLabel ? (
            <span className="cd-v4-jcard-badge">{post.author.vaiTroLabel}</span>
          ) : null}
          {post.ghim ? (
            <span className="cd-v4-jcard-badge is-pin">
              <Pin size={11} aria-hidden />
              Ghim
            </span>
          ) : null}
          {post.filters.map((filter) => (
            <CongDongFilterChip key={filter.id} filter={filter} size="sm" />
          ))}
        </div>

        <button
          type="button"
          className="cd-v4-jcard-menu"
          aria-label="Tuỳ chọn"
          onClick={social.openPostMenu}
        >
          <MoreHorizontal size={18} strokeWidth={2} aria-hidden />
        </button>
      </header>

      <div className="cd-v4-jcard-body">
        <CongDongFeedPostContent
          authorSlug={post.author.slug}
          journeyMirror={post.journeyMirror}
          fallbackTitle={post.tieuDe}
          fallbackBody={post.noiDung}
          fallbackMedia={post.media}
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
          <button
            type="button"
            className="cd-v4-jcard-act"
            aria-label="Lưu"
            onClick={social.openSave}
          >
            <Bookmark size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </footer>

      {social.commentsOpen ? (
        <CommentsPanel social={social} canInteract={canInteract} />
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
  social,
  canInteract,
}: {
  social: ReturnType<typeof usePostSocial>;
  canInteract: boolean;
}) {
  return (
    <div className="cd-v4-comments">
      {social.comments.map((c) => {
        const cAvatar = getAvatarUrl(c.author.avatarId);
        return (
          <div key={c.id} className="cd-v4-comment">
            <div className="cd-v4-comment-av">
              {cAvatar ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={cAvatar} alt="" />
              ) : (
                c.author.tenHienThi.charAt(0)
              )}
            </div>
            <div className="cd-v4-comment-bubble">
              <strong>{c.author.tenHienThi}</strong>
              {c.noiDung}
            </div>
          </div>
        );
      })}
      {canInteract ? (
        <form className="cd-v4-comment-form" onSubmit={social.submitComment}>
          <input
            value={social.commentText}
            onChange={(e) => social.setCommentText(e.target.value)}
            placeholder="Viết bình luận…"
            maxLength={2000}
          />
          <button type="submit" disabled={social.pending}>
            Gửi
          </button>
        </form>
      ) : null}
    </div>
  );
}
