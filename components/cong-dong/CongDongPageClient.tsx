"use client";

import Link from "next/link";
import {
  BadgeCheck,
  Heart,
  MessageCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { ContentSurfaceViewToggle } from "@/components/cins/ContentSurfaceViewToggle";
import { CongDongPostBookmarkAct } from "@/components/cong-dong/CongDongPostBookmarkAct";
import { useCongDongAuthGate } from "@/components/cong-dong/useCongDongAuthGate";
import { BunnyVideoProcessingPoller } from "@/components/journey/BunnyVideoProcessingPoller";
import { JourneyComposeProvider } from "@/components/journey/JourneyComposeContext";
import { JourneyCreateComposer } from "@/components/journey/JourneyCreateComposer";
import { JourneyLikeButton } from "@/components/journey/JourneyLikeButton";
import { CongDongAuthorMetaLine } from "@/components/cong-dong/CongDongAuthorMetaLine";
import { CongDongTopicsAside } from "@/components/cong-dong/CongDongTopicsAside";
import { congDongFeedPostCoverUrl } from "@/lib/cong-dong/feed-post-cover";
import type { ContentSurfaceView } from "@/lib/cins/content-surface-view";
import {
  CongDongManageModal,
  type CongDongManageSection,
} from "@/components/cong-dong/CongDongManageModal";
import { CongDongRosterModal } from "@/components/cong-dong/CongDongRosterModal";
import {
  CongDongOrgBrandingAvatar,
  CongDongOrgBrandingCover,
} from "@/components/cong-dong/CongDongOrgBranding";
import { CongDongFeedFilterDropdown } from "@/components/cong-dong/CongDongFeedFilterDropdown";
import { CongDongNotifySidebar } from "@/components/cong-dong/CongDongNotifySidebar";
import { CongDongSuKienDetailHost } from "@/components/cong-dong/CongDongSuKienDetailHost";
import { CongDongFeedPostContent } from "@/components/cong-dong/CongDongFeedPostContent";
import { CongDongFilterChip } from "@/components/cong-dong/CongDongFilterChip";
import { CongDongPostFilterChips } from "@/components/cong-dong/CongDongPostFilterChips";
import { CongDongPostMenu } from "@/components/cong-dong/CongDongPostMenu";
import { JourneyArticleTagManager } from "@/components/journey/JourneyArticleTagManager";
import { JourneyChiChuNenPicker } from "@/components/journey/JourneyChiChuNenPicker";
import { JourneyMilestoneUnfold } from "@/components/journey/JourneyMilestoneUnfold";
import { JourneyUserPopover } from "@/components/journey/JourneyUserPopover";
import { JourneyPostCommentsBlock } from "@/components/journey/JourneyPostBody";
import { CongDongRoleButton } from "@/components/cong-dong/CongDongRoleButton";
import { CongDongTopbarToolbar } from "@/components/cong-dong/CongDongTopbarToolbar";
import {
  compareCongDongPostsByMilestoneDate,
  congDongPostTimelineParts,
} from "@/lib/cong-dong/feed-display";
import {
  SOCIAL_LOAI_DOI_TUONG,
} from "@/lib/cong-dong/constants";
import {
  canManageLabels,
  canManageMembers,
  type CongDongVaiTro,
} from "@/lib/cong-dong/vai-tro";
import { getCongDongPostMenuPermissions } from "@/lib/cong-dong/post-permissions";
import type { OrgNotifyLevel } from "@/lib/social/org-notify";
import type {
  CongDongCareerSegment,
  CongDongCategory,
  CongDongComment,
  CongDongFilter,
  CongDongLinhVuc,
  CongDongMemberPreview,
  CongDongPageData,
  CongDongPost,
} from "@/lib/cong-dong/types";
import {
  isMilestoneArticleCard,
  milestoneCardContentKind,
} from "@/lib/journey/milestone-card-kind";
import { articleCardHasExpandableContent } from "@/lib/journey/post-media";
import {
  resolveChiChuNen,
  type ChiChuNenId,
} from "@/lib/journey/plain-text-bg";
import type { MilestonePostComment } from "@/lib/journey/milestone-post-types";
import { getAvatarUrl } from "@/lib/journey/profile";
import {
  addCommentToThreads,
  countCommentThreads,
  removeCommentFromThreads,
  updateCommentInThreads,
} from "@/lib/social/comments/client-tree";

type Props = {
  initial: CongDongPageData;
  /** Khi có — cột main hiện chi tiết/quản lý sự kiện thay feed. */
  activeSuKienId?: string | null;
};

type FeedView = ContentSurfaceView;

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

function sortPosts(posts: CongDongPost[]): CongDongPost[] {
  return [...posts].sort(compareCongDongPostsByMilestoneDate);
}

function postTimelineParts(thoiDiem: string): { year: string; month: string } {
  return congDongPostTimelineParts(thoiDiem);
}

export function CongDongPageClient({
  initial,
  activeSuKienId = null,
}: Props) {
  const [org, setOrg] = useState(initial.org);
  const [isThanhVien, setIsThanhVien] = useState(initial.isThanhVien);
  const [joinPending, setJoinPending] = useState(initial.joinPending);
  const [canViewFeed, setCanViewFeed] = useState(initial.canViewFeed);
  const [viewerVaiTro, setViewerVaiTro] = useState<CongDongVaiTro | null>(
    initial.viewerVaiTro,
  );
  // Quyền CINs (trục 1) mở khoá vận hành dù không phải member cộng đồng.
  const isCinsAdmin = initial.isCinsAdmin;
  const canManageLabelsView = canManageLabels(viewerVaiTro) || isCinsAdmin;
  const canManageMembersView = canManageMembers(viewerVaiTro) || isCinsAdmin;
  const canManageTopicsView = initial.isAdmin;
  /** Cùng quyền quản lý sự kiện trên tab / chi tiết (owner · admin · quản lý nội dung). */
  const canManageSuKienView = canManageLabelsView;
  const canOpenManage =
    canManageLabelsView ||
    canManageMembersView ||
    canManageTopicsView ||
    viewerVaiTro === "owner";
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
  const [view, setView] = useState<FeedView>("timeline");
  const [loadPending, startLoadMore] = useTransition();
  const [filterPending, startFilter] = useTransition();
  const filterAbortRef = useRef<AbortController | null>(null);
  const unfilteredFeedRef = useRef({
    posts: initial.initialPosts,
    nextCursor: initial.nextCursor,
  });
  const [manageOpen, setManageOpen] = useState(false);
  const [manageSection, setManageSection] = useState<
    CongDongManageSection | undefined
  >(undefined);
  const [suKienChoDuyet, setSuKienChoDuyet] = useState(0);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [categories, setCategories] = useState<CongDongCategory[]>(
    initial.categories,
  );
  const [linhVucs, setLinhVucs] = useState<CongDongLinhVuc[]>(
    initial.linhVucs ?? [],
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

  useEffect(() => {
    if (!canManageSuKienView) {
      setSuKienChoDuyet(0);
      return;
    }
    let cancelled = false;
    void fetch(`/api/org/${encodeURIComponent(org.id)}/su-kien/quan-ly`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok || cancelled) return;
        const json = (await res.json().catch(() => null)) as {
          tongChoDuyet?: number;
        } | null;
        if (cancelled) return;
        setSuKienChoDuyet(
          typeof json?.tongChoDuyet === "number" ? json.tongChoDuyet : 0,
        );
      })
      .catch(() => {
        /* giữ số cũ */
      });
    return () => {
      cancelled = true;
    };
  }, [canManageSuKienView, org.id, manageOpen]);

  const openManage = useCallback(
    (section?: CongDongManageSection) => {
      const next =
        section ??
        (canManageSuKienView && suKienChoDuyet > 0 ? "su_kien" : undefined);
      setManageSection(next);
      setManageOpen(true);
    },
    [canManageSuKienView, suKienChoDuyet],
  );

  const handlePostUpdated = useCallback((updated: CongDongPost) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
  }, []);

  const handlePostDeleted = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const sortedPosts = useMemo(() => sortPosts(posts), [posts]);
  const feedBarRef = useRef<HTMLDivElement>(null);

  const onJoined = useCallback((vaiTro: CongDongVaiTro) => {
    setIsThanhVien(true);
    setJoinPending(false);
    setCanViewFeed(true);
    setViewerVaiTro(vaiTro);
    setNotifyLevel("chi_noi_bat");
    setOrg((prev) => ({ ...prev, soThanhVien: prev.soThanhVien + 1 }));
  }, []);

  const onJoinPending = useCallback(() => {
    setIsThanhVien(false);
    setJoinPending(true);
    setViewerVaiTro(null);
  }, []);

  const onLeftCommunity = useCallback(() => {
    setIsThanhVien(false);
    setJoinPending(false);
    setViewerVaiTro(null);
    setNotifyLevel("tat");
    // Nội bộ/bí mật: rời → mất feed; công khai vẫn xem được.
    setCanViewFeed(initial.org.cheDo === "cong_khai");
    setOrg((prev) => ({
      ...prev,
      soThanhVien: Math.max(0, prev.soThanhVien - 1),
    }));
  }, [initial.org.cheDo]);

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

  const shareSource = useMemo(
    () => ({
      orgId: org.id,
      slug: org.slug,
      ten: org.ten,
      moTa: org.moTa,
      avatar_id: org.avatarId,
      cover_id: org.coverId,
      tinhThanh: org.tinhThanh,
      stats: { noiBat: org.soBaiViet, tacPham: 0 },
    }),
    [
      org.id,
      org.slug,
      org.ten,
      org.moTa,
      org.avatarId,
      org.coverId,
      org.tinhThanh,
      org.soBaiViet,
    ],
  );

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
    <CongDongTopbarToolbar
      orgId={org.id}
      isThanhVien={isThanhVien}
      viewerVaiTro={viewerVaiTro}
      isCinsAdmin={isCinsAdmin}
      hideForOwner={initial.hideMembershipForOwner}
      canManage={canOpenManage}
      initialNotifyLevel={notifyLevel}
      onNotifyLevelChange={setNotifyLevel}
      onLeft={onLeftCommunity}
      onOpenManage={() => openManage()}
      suKienChoDuyet={canManageSuKienView ? suKienChoDuyet : 0}
    />
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
                  cheDo={org.cheDo}
                  shareSource={shareSource}
                  isThanhVien={isThanhVien}
                  joinPending={joinPending}
                  viewerVaiTro={viewerVaiTro}
                  isCinsAdmin={isCinsAdmin}
                  hideForOwner={initial.hideMembershipForOwner}
                  onJoined={onJoined}
                  onJoinPending={onJoinPending}
                  onLeft={onLeftCommunity}
                />
              </div>
            </div>
          </div>
          <div className="cd-v4-id-body">
            <CongDongTopicsAside
              linhVucs={linhVucs}
              categories={categories}
            />

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
                <button
                  type="button"
                  className="cd-v4-friends-row cd-v4-friends-row--btn"
                  onClick={() => setRosterOpen(true)}
                  aria-label={`Xem ${org.soThanhVien} thành viên cộng đồng ${org.ten}`}
                >
                  <span className="cd-v4-facepile">
                    {friendsInCommunity.friends.map((member, i) => (
                      <FacepileAvatar
                        key={member.id}
                        member={member}
                        color={FACEPILE_COLORS[i % FACEPILE_COLORS.length]}
                      />
                    ))}
                    {friendsInCommunity.total >
                    friendsInCommunity.friends.length ? (
                      <span className="cd-v4-facepile-more">
                        +
                        {friendsInCommunity.total -
                          friendsInCommunity.friends.length}
                      </span>
                    ) : null}
                  </span>
                  <span className="cd-v4-face-note">
                    <strong>{org.soThanhVien}</strong> thành viên
                  </span>
                </button>
              </>
            ) : org.soThanhVien > 0 ? (
              <>
                <div className="cd-v4-divider" />
                <button
                  type="button"
                  className="cd-v4-face-note cd-v4-face-note--solo cd-v4-face-note--btn"
                  onClick={() => setRosterOpen(true)}
                  aria-label={`Xem ${org.soThanhVien} thành viên cộng đồng ${org.ten}`}
                >
                  <strong>{org.soThanhVien}</strong> thành viên
                </button>
              </>
            ) : null}
          </div>
        </aside>

        <div className="cd-v4-main">
          {activeSuKienId ? (
            <CongDongSuKienDetailHost
              orgId={org.id}
              orgSlug={org.slug}
              orgTen={org.ten}
              orgTinhThanh={org.tinhThanh}
              orgAvatarId={org.avatarId}
              canManage={canManageLabelsView}
              activeSuKienId={activeSuKienId}
            />
          ) : (
            <>
          <CongDongFeedStickyBar
            barRef={feedBarRef}
            filters={filters}
            activeFilterSlugs={activeFilterSlugs}
            onFilterChange={applyFeedFilter}
            view={view}
            onViewChange={setView}
          />

          {canCompose && sortedPosts.length > 0 ? (
            <JourneyCreateComposer ownerSlug={viewerSlug} />
          ) : null}

          {!canViewFeed ? (
            <div className="cd-v4-feed">
              <p className="cd-v4-empty">
                {joinPending
                  ? "Yêu cầu tham gia đang chờ admin duyệt. Bạn sẽ thấy bài đăng khi được chấp nhận."
                  : "Cộng đồng nội bộ — tham gia (hoặc được mời) để xem bài đăng."}
              </p>
            </div>
          ) : (
          <div
            className={`cd-v4-feed${
              view === "timeline"
                ? " is-journey"
                : view === "masonry"
                  ? " is-masonry"
                  : " is-grid"
            }${filterPending ? " is-loading" : ""}`}
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
            ) : view === "timeline" ? (
              <JourneyFeed
                posts={sortedPosts}
                orgId={org.id}
                filters={filters}
                viewerId={initial.viewerId}
                viewerVaiTro={viewerVaiTro}
                canInteract={isThanhVien}
                onJoined={onJoined}
                onPostUpdated={handlePostUpdated}
                onPostDeleted={handlePostDeleted}
              />
            ) : (
              <GridFeed
                posts={sortedPosts}
                orgId={org.id}
                canInteract={isThanhVien}
              />
            )}
          </div>
          )}

          {canViewFeed && nextCursor ? (
            <button
              type="button"
              className="cd-v4-load-more"
              onClick={loadMore}
              disabled={loadPending}
            >
              {loadPending ? "Đang tải…" : "Xem thêm"}
            </button>
          ) : null}
            </>
          )}
        </div>

        <CongDongNotifySidebar
          orgId={org.id}
          orgSlug={org.slug}
          orgTinhThanh={org.tinhThanh}
          canManage={canManageLabelsView}
          activeSuKienId={activeSuKienId}
        />
      </div>

    </div>

    {canOpenManage ? (
      <CongDongManageModal
        open={manageOpen}
        onClose={() => {
          setManageOpen(false);
          setManageSection(undefined);
        }}
        initialSection={manageSection}
        orgId={org.id}
        orgSlug={org.slug}
        orgLabel={org.ten}
        viewerIsOwner={viewerVaiTro === "owner"}
        canTopics={canManageTopicsView}
        canLabels={canManageLabelsView}
        canSuKien={canManageSuKienView}
        canMembers={canManageMembersView}
        trangThaiHoatDong={org.trangThaiHoatDong}
        categories={categories}
        linhVucs={linhVucs}
        filters={filters}
        onFiltersChange={setFilters}
        onTopicsSaved={(next) => {
          setCategories(next.categories);
          setLinhVucs(next.linhVucs);
        }}
        onHoatDongChange={(next) => {
          setOrg((prev) => ({ ...prev, trangThaiHoatDong: next }));
        }}
        onOwnershipTransferred={() => {
          setViewerVaiTro("admin");
        }}
        suKienChoDuyet={suKienChoDuyet}
        onSuKienChoDuyetChange={setSuKienChoDuyet}
      />
    ) : null}
    <CongDongRosterModal
      open={rosterOpen}
      onClose={() => setRosterOpen(false)}
      orgId={org.id}
      orgLabel={org.ten}
    />
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
    <span
      className="cd-v4-facepile-item"
      style={{ background: avatar ? undefined : color }}
      title={member.tenHienThi}
    >
      {avatar ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={avatar} alt="" />
      ) : (
        member.initial
      )}
    </span>
  );
}

type FeedStickyBarProps = {
  barRef: React.RefObject<HTMLDivElement | null>;
  filters: CongDongFilter[];
  activeFilterSlugs: string[];
  onFilterChange: (slugs: string[]) => void;
  view: FeedView;
  onViewChange: (view: FeedView) => void;
};

function CongDongFeedStickyBar({
  barRef,
  filters,
  activeFilterSlugs,
  onFilterChange,
  view,
  onViewChange,
}: FeedStickyBarProps) {
  return (
    <div
      ref={barRef}
      className="j-tlb cd-v4-moc-bar"
      aria-label="Bộ lọc bài đăng"
    >
      <span className="j-tlb-streak-slow" aria-hidden="true" />
      <div
        className="j-tlb-filters cd-v4-feed-controls"
        role="toolbar"
        aria-label="Lọc bài đăng"
      >
        <CongDongFeedFilterDropdown
          filters={filters}
          activeFilterSlugs={activeFilterSlugs}
          onChange={onFilterChange}
          appearance="tlb"
        />
      </div>
      <ContentSurfaceViewToggle
        view={view}
        onViewChange={onViewChange}
        ariaLabel="Kiểu hiển thị"
      />
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
  onJoined,
  onPostUpdated,
  onPostDeleted,
}: {
  posts: CongDongPost[];
  orgId: string;
  filters: CongDongFilter[];
  viewerId: string | null;
  viewerVaiTro: CongDongVaiTro | null;
  canInteract: boolean;
  onJoined: (vaiTro: CongDongVaiTro) => void;
  onPostUpdated: (post: CongDongPost) => void;
  onPostDeleted: (postId: string) => void;
}) {
  return (
    <div className="cd-v4-journey-feed">
      {posts.map((post) => (
        <CongDongJourneyPostCard
          key={post.id}
          orgId={orgId}
          post={post}
          filters={filters}
          viewerId={viewerId}
          viewerVaiTro={viewerVaiTro}
          canInteract={canInteract}
          onJoined={onJoined}
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

  useEffect(() => {
    setLiked(post.viewerLiked);
    setLikeCount(post.likeCount);
    setCommentCount(post.commentCount);
  }, [post.id, post.viewerLiked, post.likeCount, post.commentCount]);

  useEffect(() => {
    const onSocial = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          milestoneId: string;
          liked?: boolean;
          likeCount?: number;
        }>
      ).detail;
      if (detail.milestoneId !== post.id) return;
      if (typeof detail.liked === "boolean") setLiked(detail.liked);
      if (typeof detail.likeCount === "number") setLikeCount(detail.likeCount);
    };
    window.addEventListener("cins:social-action", onSocial);
    return () => window.removeEventListener("cins:social-action", onSocial);
  }, [post.id]);

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
        const json = (await res.json().catch(() => null)) as {
          count?: number;
          likeCount?: number;
        } | null;
        if (res.ok) {
          const synced =
            typeof json?.likeCount === "number"
              ? json.likeCount
              : typeof json?.count === "number"
                ? json.count
                : null;
          if (synced !== null) setLikeCount(synced);
        }
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
  onJoined,
  onPostUpdated,
  onPostDeleted,
}: {
  orgId: string;
  post: CongDongPost;
  filters: CongDongFilter[];
  viewerId: string | null;
  viewerVaiTro: CongDongVaiTro | null;
  canInteract: boolean;
  onJoined: (vaiTro: CongDongVaiTro) => void;
  onPostUpdated: (post: CongDongPost) => void;
  onPostDeleted: (postId: string) => void;
}) {
  const [contentOpen, setContentOpen] = useState(false);
  const { requireCongDongAuth } = useCongDongAuthGate();
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
    ) &&
    articleCardHasExpandableContent(mirror?.moTa, mirror?.noiDungBlocks);
  const isTextMirror =
    Boolean(mirror) &&
    milestoneCardContentKind(
      mirror?.noiDungBlocks,
      Boolean(mirror?.previewMedia?.src),
      mirror?.moTa,
    ) === "text";
  const canEditChiChuNen =
    isTextMirror &&
    Boolean(mirror?.tacPhamId) &&
    Boolean(viewerId) &&
    viewerId === post.author.id;
  const chiChuSeed =
    (mirror?.tieuDe || "").trim() ||
    (mirror?.moTa || "").trim() ||
    mirror?.tacPhamId ||
    "cins-chi-chu";
  const [chiChuNen, setChiChuNen] = useState<ChiChuNenId>(() =>
    resolveChiChuNen(mirror?.noiDungBlocks, chiChuSeed),
  );

  useEffect(() => {
    if (!isTextMirror || !mirror?.tacPhamId) return;
    setChiChuNen(resolveChiChuNen(mirror.noiDungBlocks, chiChuSeed));
    // Chỉ theo identity bài — không ghi đè khi đang chọn màu local.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed/blocks đổi khi gõ title không reset màu
  }, [isTextMirror, mirror?.tacPhamId]);

  const postOwnerSlug = mirror?.ownerSlug || post.author.slug;
  const postSlug = mirror?.postSlug || null;
  const cardTitle =
    mirror?.tieuDe || post.tieuDe || post.noiDung.slice(0, 80);
  const canManageArticleTags =
    Boolean(mirror) && viewerId === post.author.id;
  const canEditFilters = getCongDongPostMenuPermissions(
    viewerId,
    viewerVaiTro,
    post,
  ).canEditFilters;

  function toggleContent() {
    setContentOpen((open) => !open);
  }

  function handleExpandTrigger(e: React.MouseEvent<HTMLElement>) {
    if (!isArticleMirror || contentOpen) return;
    const target = e.target as Element;
    if (
      target?.closest(
        "a, button, input, textarea, select, summary, .j-m-menu, .authors-details, .image-grid-cell, .jcard-video-trigger, .jcard-actions, .cd-v4-jcard-filter-edit, .cd-v4-post-menu-wrap, .jcard-chi-chu-nen-wrap, .cd-v4-jcard-nen-bar",
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
        "a, button, input, textarea, select, summary, .j-m-menu, .authors-details, .image-grid-cell, .jcard-video-trigger, .jcard-actions, .cd-v4-jcard-filter-edit, .cd-v4-post-menu-wrap, .jcard-chi-chu-nen-wrap, .cd-v4-jcard-nen-bar",
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
          <CongDongPostFilterChips
            orgId={orgId}
            post={post}
            filters={filters}
            canEdit={canEditFilters}
            onUpdated={onPostUpdated}
          />
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
          canEditChiChuNen={canEditChiChuNen}
          tacPhamId={mirror?.tacPhamId ?? null}
          chiChuNenPickerPlacement="none"
          chiChuNen={canEditChiChuNen ? chiChuNen : undefined}
          onChiChuNenChange={canEditChiChuNen ? setChiChuNen : undefined}
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

      {canEditChiChuNen && mirror?.tacPhamId ? (
        <div className="cd-v4-jcard-nen-bar">
          <JourneyChiChuNenPicker
            tacPhamId={mirror.tacPhamId}
            nen={chiChuNen}
            onNenChange={setChiChuNen}
          />
        </div>
      ) : null}

      <footer className="cd-v4-jcard-foot">
        <div className="cd-v4-jcard-act-group jcard-actions">
          <JourneyLikeButton
            milestoneId={post.id}
            initialLiked={post.viewerLiked}
            initialCount={post.likeCount}
            initialReactionEmoji={post.viewerReactionEmoji}
            initialTopReactionEmoji={post.topReactionEmoji}
            showCount
            onRequireAuth={requireCongDongAuth}
          />
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
          orgId={orgId}
          postId={post.id}
          contentOwnerId={post.author.id}
          viewerId={viewerId}
          social={social}
          canInteract={canInteract}
          onJoined={onJoined}
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
  orgId,
  postId,
  contentOwnerId,
  viewerId,
  social,
  canInteract,
  onJoined,
}: {
  orgId: string;
  postId: string;
  contentOwnerId: string;
  viewerId: string | null;
  social: ReturnType<typeof usePostSocial>;
  canInteract: boolean;
  onJoined: (vaiTro: CongDongVaiTro) => void;
}) {
  const [joinPending, startJoin] = useTransition();
  const comments = social.comments.map((c) => ({
    ...c,
    isOwn: viewerId === c.author?.id,
  }));

  const joinToComment = () => {
    startJoin(async () => {
      const res = await fetch(`/api/cong-dong/${orgId}/tham-gia`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => null)) as {
        viewerVaiTro?: CongDongVaiTro | null;
        isThanhVien?: boolean;
        joinPending?: boolean;
      } | null;
      if (!res.ok) return;
      if (json?.joinPending) return;
      if (json?.isThanhVien !== false) {
        onJoined(json?.viewerVaiTro ?? "thanh_vien");
      }
    });
  };

  const commentDeniedFallback =
    viewerId && !canInteract ? (
      <>
        <button
          type="button"
          className="post-comments-login-btn"
          onClick={joinToComment}
          disabled={joinPending}
        >
          {joinPending ? "Đang tham gia…" : "Tham gia cộng đồng"}
        </button>{" "}
        để bình luận.
      </>
    ) : undefined;

  return (
    <div className="cd-v4-comments">
      <div className="cins-editor-page cins-post-view j-m-unfold-post j-m-unfold-post--comments-only">
        <JourneyPostCommentsBlock
          milestoneId={postId}
          contentOwnerId={contentOwnerId}
          viewerIsOwner={viewerId === contentOwnerId}
          comments={comments}
          viewerCanComment={canInteract}
          commentDeniedFallback={commentDeniedFallback}
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
