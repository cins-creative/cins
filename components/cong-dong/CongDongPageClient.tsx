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
  Rss,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { BunnyVideoProcessingPoller } from "@/components/journey/BunnyVideoProcessingPoller";
import { JourneyComposeProvider } from "@/components/journey/JourneyComposeContext";
import { JourneyCreateComposer } from "@/components/journey/JourneyCreateComposer";
import { CongDongFilterAdmin } from "@/components/cong-dong/CongDongFilterAdmin";
import { CongDongFilterChip } from "@/components/cong-dong/CongDongFilterChip";
import { CongDongRoleButton } from "@/components/cong-dong/CongDongRoleButton";
import { SOCIAL_LOAI_DOI_TUONG } from "@/lib/cong-dong/constants";
import type { CongDongVaiTro } from "@/lib/cong-dong/vai-tro";
import type { OrgNotifyLevel } from "@/lib/social/org-notify";
import { congDongImageUrl } from "@/lib/cong-dong/images";
import type {
  CongDongCareerSegment,
  CongDongComment,
  CongDongFilter,
  CongDongMemberPreview,
  CongDongPageData,
  CongDongPost,
  CongDongPulseItem,
} from "@/lib/cong-dong/types";
import { getAvatarUrl } from "@/lib/journey/profile";
import { getCoverUrl } from "@/lib/articles/cover";

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

function formatCount(count: number): string {
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Hôm qua";
  if (days < 7) return `${days} ngày trước`;
  const d = date.getUTCDate();
  const m = date.getUTCMonth() + 1;
  const y = date.getUTCFullYear();
  const now = new Date();
  if (y === now.getUTCFullYear()) {
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
  }
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
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

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
}

function monthLabel(key: string): { year: string; month: string } {
  const [y, m] = key.split("-");
  return { year: y, month: `THÁNG ${Number(m)}` };
}

export function CongDongPageClient({ initial }: Props) {
  const { requireAuth } = useAuthGate();
  const [org] = useState(initial.org);
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

  const coverUrl = getCoverUrl(org.coverId);
  const avatarUrl = getAvatarUrl(org.avatarId);
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

  const scrollToFilterAdmin = useCallback(() => {
    document
      .querySelector(".cd-filter-admin")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const page = (
    <div className="cd-v4-page">
      <div className="cd-v4-layout">
        <aside className="cd-v4-id">
          <div
            className={`cd-v4-id-cover${coverUrl ? " has-img" : ""}`}
            aria-hidden
          >
            {coverUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={coverUrl} alt="" />
            ) : null}
          </div>
          <div className="cd-v4-id-body">
            <div className="cd-v4-avatar" aria-hidden>
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt="" />
              ) : (
                <span>{org.ten.charAt(0).toUpperCase()}</span>
              )}
            </div>
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
              onManageCommunity={scrollToFilterAdmin}
              onManageContent={scrollToFilterAdmin}
              onShare={shareCommunity}
            />

            {org.moTa ? <p className="cd-v4-desc">{org.moTa}</p> : null}

            {initial.viewerId && friendsInCommunity.total > 0 ? (
              <>
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
              </>
            ) : sidebarLiveLoading && initial.viewerId ? (
              <p className="cd-v4-face-note cd-v4-muted">Đang tải bạn bè…</p>
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
          <div className={`cd-v4-toolbar${filterPending ? " is-loading" : ""}`}>
            <div className="cd-v4-chips" role="toolbar" aria-label="Lọc bài đăng">
              <button
                type="button"
                className={`cd-v4-chip cd-v4-chip--all${activeFilterSlugs.length === 0 ? " is-active" : ""}`}
                onClick={() => applyFeedFilter([])}
              >
                Tất cả
              </button>
              {filters.map((filter) => {
                const active = activeFilterSlugs.includes(filter.slug);
                return (
                  <CongDongFilterChip
                    key={filter.id}
                    filter={filter}
                    active={active}
                    size="toolbar"
                    onClick={() => {
                      if (active) {
                        applyFeedFilter([]);
                        return;
                      }
                      applyFeedFilter([filter.slug]);
                    }}
                  />
                );
              })}
            </div>
            <div className="cd-v4-tools">
              <select
                className="cd-v4-sort"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                aria-label="Sắp xếp bài đăng"
              >
                <option value="moi">Mới nhất</option>
                <option value="tuongtac">Nhiều tương tác</option>
                <option value="az">A → Z</option>
              </select>
              <div className="cd-v4-toggle" role="group" aria-label="Kiểu hiển thị">
                <button
                  type="button"
                  className={view === "journey" ? "is-on" : undefined}
                  onClick={() => setView("journey")}
                >
                  <Rss size={16} strokeWidth={2} aria-hidden />
                  Journey
                </button>
                <button
                  type="button"
                  className={view === "grid" ? "is-on" : undefined}
                  onClick={() => setView("grid")}
                >
                  <LayoutGrid size={16} strokeWidth={2} aria-hidden />
                  Lưới
                </button>
              </div>
            </div>
          </div>

          {initial.isAdmin ? (
            <CongDongFilterAdmin
              orgId={org.id}
              filters={filters}
              onChange={setFilters}
            />
          ) : null}

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
      </div>

    </div>
  );

  if (!canCompose) return page;

  return (
    <JourneyComposeProvider
      ownerId={initial.viewerId!}
      ownerSlug={viewerSlug}
      ownerName={initial.viewerName ?? viewerSlug}
      ownerAvatarId={initial.viewerAvatarId}
      isOwner
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
        Đăng bài viết, album ảnh hoặc video — cùng luồng tạo nội dung trên
        Journey của bạn.
      </p>
      <JourneyCreateComposer ownerSlug={ownerSlug} />
      <p className="cd-v4-empty-hint">
        Bài viết, ảnh hoặc video sẽ xuất hiện trên Journey và feed cộng đồng.
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
                  · {formatRelativeTime(item.taoLuc)}
                </span>
              </>
            ) : (
              <>
                <strong>{item.userName}</strong> vừa tham gia{" "}
                <span className="cd-v4-pulse-time">
                  · {formatRelativeTime(item.taoLuc)}
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

function JourneyFeed({
  posts,
  orgId,
  canInteract,
}: {
  posts: CongDongPost[];
  orgId: string;
  canInteract: boolean;
}) {
  let lastMoc: string | null = null;
  return (
    <>
      {posts.map((post) => {
        const moc = monthKey(post.taoLuc);
        const showMoc = moc !== lastMoc;
        if (showMoc) lastMoc = moc;
        const label = monthLabel(moc);
        return (
          <div key={post.id}>
            {showMoc ? (
              <div className="cd-v4-moc">
                <span className="cd-v4-moc-yr">{label.year}</span>
                <span className="cd-v4-moc-mo">{label.month}</span>
                <span className="cd-v4-moc-ln" aria-hidden />
              </div>
            ) : null}
            <CongDongJourneyPostCard
              orgId={orgId}
              post={post}
              canInteract={canInteract}
            />
          </div>
        );
      })}
    </>
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
  const { requireAuth } = useAuthGate();
  const [liked, setLiked] = useState(post.viewerLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [comments, setComments] = useState<CongDongComment[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [pending, startTransition] = useTransition();

  const toggleLike = () => {
    requireAuth(() => {
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
  };

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canInteract) return;
    requireAuth(() => {
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
  const coverMedia = post.media[0];
  const coverSrc = coverMedia ? congDongImageUrl(coverMedia.cloudflareId) : null;
  const initial = post.author.tenHienThi.charAt(0).toUpperCase();
  const isStatusPost = !post.tieuDe && post.media.length === 0;

  return (
    <article
      className={`cd-v4-jcard${post.ghim ? " is-pinned" : ""}${isStatusPost ? " is-status" : ""}`}
    >
      <div className="cd-v4-p-head">
        <Link href={`/${post.author.slug}`} className="cd-v4-p-av" prefetch={false}>
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarUrl} alt="" />
          ) : (
            initial
          )}
        </Link>
        <div className="cd-v4-p-who">
          <div className="cd-v4-p-name">
            <Link href={`/${post.author.slug}`} prefetch={false}>
              {post.author.tenHienThi}
            </Link>
            {post.author.vaiTroLabel ? (
              <span className="cd-v4-p-role">{post.author.vaiTroLabel}</span>
            ) : null}
            {post.author.verifiedCount > 0 ? (
              <span className="cd-v4-p-verif">
                <BadgeCheck size={12} strokeWidth={2} aria-hidden />
                Đã xác minh
              </span>
            ) : null}
            {post.ghim ? (
              <span className="cd-v4-p-verif is-pin">
                <Pin size={12} aria-hidden />
                Ghim
              </span>
            ) : null}
          </div>
          <div className="cd-v4-p-sub">
            {post.author.ngheLabel ?? "Thành viên"}
            <span className="cd-v4-dot" aria-hidden />
            {formatRelativeTime(post.taoLuc)}
          </div>
        </div>
        <span className="cd-v4-p-menu" aria-hidden>
          <MoreHorizontal size={18} strokeWidth={2} />
        </span>
      </div>

      {post.filters.length > 0 ? (
        <div className="cd-v4-p-tags">
          {post.filters.map((filter) => (
            <CongDongFilterChip key={filter.id} filter={filter} size="sm" />
          ))}
        </div>
      ) : null}

      {post.tieuDe ? <h3 className="cd-v4-p-title">{post.tieuDe}</h3> : null}
      <p className="cd-v4-p-text">{post.noiDung}</p>

      {coverSrc ? (
        <div className="cd-v4-p-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverSrc} alt="" loading="lazy" />
        </div>
      ) : null}

      {post.media.length > 1 ? (
        <div className="cd-v4-p-media-grid">
          {post.media.slice(1).map((m) => {
            const src = congDongImageUrl(m.cloudflareId);
            if (!src) return null;
            return (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img key={m.id} src={src} alt="" loading="lazy" />
            );
          })}
        </div>
      ) : null}

      <div className="cd-v4-p-foot">
        <button
          type="button"
          className={`cd-v4-act${social.liked ? " is-liked" : ""}`}
          onClick={social.toggleLike}
        >
          <Heart
            size={18}
            strokeWidth={2}
            fill={social.liked ? "currentColor" : "none"}
            aria-hidden
          />
          {social.likeCount > 0 ? social.likeCount : null}
        </button>
        <button type="button" className="cd-v4-act" onClick={social.openComments}>
          <MessageCircle size={18} strokeWidth={2} aria-hidden />
          {social.commentCount > 0 ? social.commentCount : null}
        </button>
        <button type="button" className="cd-v4-act" aria-label="Lưu">
          <Bookmark size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>

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
  const coverMedia = post.media[0];
  const coverSrc = coverMedia ? congDongImageUrl(coverMedia.cloudflareId) : null;
  const initial = post.author.tenHienThi.charAt(0).toUpperCase();
  const title = post.tieuDe || post.noiDung.slice(0, 55);

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
