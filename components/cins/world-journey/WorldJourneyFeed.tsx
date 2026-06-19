"use client";

import {
  ArrowDownNarrowWide,
  AudioLines,
  BookOpen,
  Bookmark,
  Boxes,
  CalendarDays,
  Check,
  ChevronDown,
  Eye,
  FileText,
  Heart,
  History,
  Image as ImageIcon,
  LayoutGrid,
  MessageCircle,
  MoreHorizontal,
  Palette,
  Play,
  Rows3,
  Share2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Upload,
  UserPlus,
  Video,
} from "lucide-react";
import { Suspense, use, useEffect, useRef, useState } from "react";

import { CinsFeedComposer } from "@/components/cins/CinsFeedComposer";
import { JourneySidebarNavCountsSkeleton } from "@/app/[slug]/_components/JourneySidebarNavCounts.skeleton";
import type { EditProfileInitial } from "@/components/journey/JourneyEditProfileModal";
import {
  JourneySidebar,
  type SidebarProfile,
} from "@/components/journey/JourneySidebar";
import { JourneySidebarSwitchNav } from "@/components/journey/JourneySidebarSwitchNav";
import { JourneyViewProvider } from "@/components/journey/JourneyViewContext";
import {
  MOCK_FOLLOW_SUGGESTIONS,
  MOCK_UPCOMING_EVENTS,
  MOCK_WORLD_JOURNEY_POSTS,
  WORLD_JOURNEY_SORT_OPTIONS,
  type WjPostMock,
  type WjTagTone,
} from "@/lib/cins/worldJourneyFeedMock";
import type { WjFilterChip } from "@/lib/cins/worldJourneyFeedFilters";
import {
  findWorldJourneyFilterChip,
  worldJourneyPostMatchesFilter,
} from "@/lib/cins/worldJourneyFeedFilters";

import "@/app/world-journey-feed.css";

type FeedView = "feed" | "grid";

function toneClass(tone: WjPostMock["author"]["tone"]) {
  return `wj-av-${tone}`;
}

function tagClass(tone: WjTagTone) {
  return `wj-tag ${tone}`;
}

function WorldJourneyFilterBar({
  chips,
  activeFilter,
  onFilter,
  view,
  onView,
  sort,
  onSort,
  sortOpen,
  onSortOpen,
}: {
  chips: WjFilterChip[];
  activeFilter: string;
  onFilter: (id: string) => void;
  view: FeedView;
  onView: (v: FeedView) => void;
  sort: (typeof WORLD_JOURNEY_SORT_OPTIONS)[number];
  onSort: (s: (typeof WORLD_JOURNEY_SORT_OPTIONS)[number]) => void;
  sortOpen: boolean;
  onSortOpen: (open: boolean) => void;
}) {
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!sortRef.current?.contains(e.target as Node)) onSortOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [sortOpen, onSortOpen]);

  const chipIcon = (icon: string) => {
    const props = { size: 13, strokeWidth: 2 };
    switch (icon) {
      case "sparkles":
        return <Sparkles {...props} />;
      case "image":
        return <ImageIcon {...props} />;
      case "video":
        return <Video {...props} />;
      case "book-open":
        return <BookOpen {...props} />;
      case "smartphone":
        return <Smartphone {...props} />;
      case "boxes":
        return <Boxes {...props} />;
      case "audio-lines":
        return <AudioLines {...props} />;
      case "file-text":
        return <FileText {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="wj-filter-bar">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className={`wj-fchip${activeFilter === chip.id ? " active" : ""}${chip.kind === "linh_vuc" ? " wj-fchip--linh-vuc" : ""}`}
          onClick={() => onFilter(chip.id)}
          title={
            chip.kind === "linh_vuc"
              ? `${chip.label} · Lĩnh vực (như career hub)`
              : undefined
          }
        >
          {chipIcon(chip.icon)}
          {chip.label}
        </button>
      ))}
      <span className="wj-filter-spacer" />
      <div className="wj-view-toggle" role="group" aria-label="Chế độ xem">
        <button
          type="button"
          className={`wj-vt-btn${view === "feed" ? " active" : ""}`}
          aria-label="Dòng thời gian"
          onClick={() => onView("feed")}
        >
          <Rows3 size={13} />
          <span>Dòng</span>
        </button>
        <button
          type="button"
          className={`wj-vt-btn${view === "grid" ? " active" : ""}`}
          aria-label="Lưới"
          onClick={() => onView("grid")}
        >
          <LayoutGrid size={13} />
          <span>Lưới</span>
        </button>
      </div>
      <div className="wj-sort-wrap" ref={sortRef}>
        <button
          type="button"
          className="wj-sort-btn"
          aria-expanded={sortOpen}
          onClick={() => onSortOpen(!sortOpen)}
        >
          <ArrowDownNarrowWide size={13} />
          <span>Sắp xếp:</span>
          <span className="wj-sort-val">{sort}</span>
          <ChevronDown size={13} />
        </button>
        {sortOpen ? (
          <div className="wj-sort-pop" role="menu">
            {WORLD_JOURNEY_SORT_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                className={sort === opt ? "sel" : undefined}
                role="menuitem"
                onClick={() => {
                  onSort(opt);
                  onSortOpen(false);
                }}
              >
                {opt}
                <Check size={13} />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function WorldJourneyPostMedia({ post }: { post: WjPostMock }) {
  if (!post.media) return null;

  if (post.media.kind === "artbook") {
    return (
      <>
        <div className="wj-post-media wj-m-single wj-bg-artbook">
          <span className="wj-media-label">
            <Palette size={11} />
            Watercolor · 32 trang
          </span>
          <span className="wj-verified-ribbon">
            <ShieldCheck size={12} />
            Verified
          </span>
          <div className="wj-artbook-title">
            MIỀN TÂY 2025
            <small>SKETCHBOOK · LINH HÀ</small>
          </div>
        </div>
        {post.verifiedFoot ? (
          <div className="wj-verified-foot">
            <ShieldCheck size={14} />
            {post.verifiedFoot}
          </div>
        ) : null}
      </>
    );
  }

  if (post.media.kind === "video") {
    return (
      <>
        <div className="wj-post-media wj-m-video">
          <span className="wj-media-label">
            <Video size={11} />
            Turntable · 3D
          </span>
          <div className="wj-video-character" aria-hidden="true" />
          <button type="button" className="wj-play-btn" aria-label="Phát">
            <Play size={24} fill="currentColor" />
          </button>
          <span className="wj-video-duration num">{post.media.duration}</span>
        </div>
        <div className="wj-video-caption">{post.media.caption}</div>
      </>
    );
  }

  if (post.media.kind === "comic") {
    return (
      <div className="wj-post-media wj-m-4grid">
        <span className="wj-media-label">
          <BookOpen size={11} />
          Comic · 4 panel
        </span>
        <div className="wj-comic-panel wj-cp-1">
          <div className="wj-pnum">01</div>
          <div className="wj-pcap">
            &quot;Ý tưởng nguệch ngoạc trên giấy ăn quán cà phê.&quot;
          </div>
        </div>
        <div className="wj-comic-panel wj-cp-2">
          <div className="wj-pnum">02</div>
          <div className="wj-pcap">
            &quot;Block-out thô trong Unity — chưa có texture, chưa có hồn.&quot;
          </div>
        </div>
        <div className="wj-comic-panel wj-cp-3">
          <div className="wj-pnum">03</div>
          <div className="wj-pcap">
            &quot;Playtest đầu tiên — và 3 bug critical xuất hiện.&quot;
          </div>
        </div>
        <div className="wj-comic-panel wj-cp-4">
          <div className="wj-pnum">04</div>
          <div className="wj-pcap">&quot;Polish lần 7. Deadline gõ cửa.&quot;</div>
        </div>
      </div>
    );
  }

  return null;
}

function WorldJourneyPostCard({ post }: { post: WjPostMock }) {
  const isTextOnly = post.media?.kind === "text-only";

  return (
    <article className={`wj-post${isTextOnly ? " text-only" : ""}`}>
      <header className="wj-post-head">
        {post.context ? (
          <div className="wj-post-context">
            <Eye size={12} />
            {post.context}
          </div>
        ) : null}
        <div className="wj-post-author">
          <div
            className={`wj-av-44 ${toneClass(post.author.tone)}${post.author.square ? " square" : ""}`}
          >
            {post.author.initials}
          </div>
          <div className="wj-post-author-meta">
            <div className="wj-post-name">
              {post.author.name}
              {post.author.verified ? <ShieldCheck size={14} /> : null}
            </div>
            <div className="wj-post-org">{post.author.org}</div>
            <div className="wj-post-time num">
              {post.time}
              <span aria-hidden="true"> · </span>
              <Eye size={11} />
              {post.visibility}
            </div>
          </div>
          <button type="button" className="wj-post-more" aria-label="Thêm">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </header>
      <div className="wj-post-body">
        {post.pullquote ? <p className="wj-pullquote">{post.pullquote}</p> : null}
        {post.paragraphs?.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </div>
      <WorldJourneyPostMedia post={post} />
      <div className="wj-post-tags">
        {post.tags.map((tag) => (
          <span key={tag.label} className={tagClass(tag.tone)}>
            {tag.label}
          </span>
        ))}
      </div>
      <div className="wj-post-foot">
        <button type="button" className="wj-pf-btn">
          <Heart size={16} />
          <span>
            <span className="num">{post.likes}</span> người cũng thấy đẹp
          </span>
        </button>
        <button type="button" className="wj-pf-btn">
          <MessageCircle size={16} />
          <span className="num">{post.comments}</span> bình luận
        </button>
        <button type="button" className="wj-pf-btn">
          <Share2 size={16} />
          Chia sẻ
        </button>
        <span className="wj-pf-spacer" />
        <button type="button" className="wj-pf-btn" aria-label="Lưu">
          <Bookmark size={16} />
        </button>
      </div>
    </article>
  );
}

function JourneySidebarSwitchNavWithCounts({
  slug,
  countsPromise,
}: {
  slug: string;
  countsPromise: Promise<{ friendCount: number; orgCount: number }>;
}) {
  const { friendCount, orgCount } = use(countsPromise);

  return (
    <JourneySidebarSwitchNav
      slug={slug}
      friendCount={friendCount}
      orgCount={orgCount}
    />
  );
}

function WorldJourneyAsideRight() {
  return (
    <aside className="wj-aside-right">
      <div className="wj-r-card">
        <div className="wj-r-head">
          <UserPlus size={14} />
          Gợi ý theo dõi
        </div>
        {MOCK_FOLLOW_SUGGESTIONS.map((row) => (
          <div key={row.name} className="wj-r-row">
            <div
              className={`wj-av-36 ${toneClass(row.tone)}${"square" in row && row.square ? " square" : ""}`}
            >
              {row.initials}
            </div>
            <div className="wj-r-info">
              <div className="wj-r-name">
                {row.name}
                {"verified" in row && row.verified ? (
                  <ShieldCheck size={11} />
                ) : null}
              </div>
              <div className="wj-r-role">{row.role}</div>
            </div>
            <button type="button" className="wj-r-follow">
              Theo dõi
            </button>
          </div>
        ))}
      </div>
      <div className="wj-r-card">
        <div className="wj-r-head">
          <CalendarDays size={14} />
          Sự kiện sắp tới
        </div>
        {MOCK_UPCOMING_EVENTS.map((ev) => (
          <div key={ev.name} className="wj-ev-row">
            <div className="wj-ev-date">
              <div className="d num">{ev.day}</div>
              <span className="m">{ev.month}</span>
            </div>
            <div className="wj-r-info">
              <div className="wj-ev-name">{ev.name}</div>
              <div className="wj-ev-host">{ev.host}</div>
              <div className="wj-ev-time num">{ev.time}</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export function WorldJourneyFeed({
  sidebarProfile,
  editProfileInitial,
  countsPromise,
  viewerProfileId,
  filterChips,
}: {
  sidebarProfile: SidebarProfile;
  editProfileInitial: EditProfileInitial;
  countsPromise: Promise<{ friendCount: number; orgCount: number }>;
  viewerProfileId: string;
  filterChips: WjFilterChip[];
}) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [view, setView] = useState<FeedView>("feed");
  const [sort, setSort] = useState<(typeof WORLD_JOURNEY_SORT_OPTIONS)[number]>(
    WORLD_JOURNEY_SORT_OPTIONS[0],
  );
  const [sortOpen, setSortOpen] = useState(false);

  const activeChip = findWorldJourneyFilterChip(filterChips, activeFilter);
  const visiblePosts = MOCK_WORLD_JOURNEY_POSTS.filter((post) =>
    worldJourneyPostMatchesFilter(post, activeChip),
  );

  return (
    <JourneyViewProvider initialView="journey" slug={sidebarProfile.slug}>
      <div
        className="world-journey-home cins-journey-page"
        aria-label="World Journey"
      >
        <header className="wj-feed-header">
          <WorldJourneyFilterBar
            chips={filterChips}
            activeFilter={activeFilter}
            onFilter={setActiveFilter}
            view={view}
            onView={setView}
            sort={sort}
            onSort={setSort}
            sortOpen={sortOpen}
            onSortOpen={setSortOpen}
          />
        </header>

        <div className={`wj-shell${view === "grid" ? " view-grid" : ""}`}>
          <JourneySidebar
            profile={sidebarProfile}
            isOwner
            editProfileInitial={editProfileInitial}
            viewerProfileId={viewerProfileId}
            switchNav={
              <Suspense fallback={<JourneySidebarNavCountsSkeleton />}>
                <JourneySidebarSwitchNavWithCounts
                  slug={sidebarProfile.slug}
                  countsPromise={countsPromise}
                />
              </Suspense>
            }
          />

          <div className={`wj-feed${view === "grid" ? " view-grid" : ""}`}>
            <CinsFeedComposer
              ownerSlug={sidebarProfile.slug}
              ownerName={sidebarProfile.tenHienThi}
              avatarUrl={sidebarProfile.avatarUrl}
              layout="feed"
            />

          {visiblePosts.map((post) => (
            <WorldJourneyPostCard key={post.id} post={post} />
          ))}

          <div className="wj-promo">
            <span className="wj-promo-label">CINs giới thiệu</span>
            <div className="wj-promo-hero">
              <div className="wj-promo-headline">
                TỚI MÙA TỐT NGHIỆP
                <small>ĐỒ ÁN 2026 · ĐĂNG NGAY</small>
              </div>
            </div>
            <div className="wj-promo-body">
              <p className="wj-promo-sub">
                Đăng tác phẩm cuối kỳ lên CINs — được verify bởi giảng viên, hiện
                diện vĩnh viễn trong hồ sơ Journey của bạn.
              </p>
              <div className="wj-promo-cta">
                <button type="button" className="wj-btn wj-btn-primary">
                  <Upload size={15} />
                  Đăng ngay
                </button>
                <button type="button" className="wj-btn wj-btn-outline">
                  Tìm hiểu thêm
                </button>
              </div>
            </div>
          </div>

          <div className="wj-feed-end">
            <b>Đã hết feed mới — bạn đã đọc xong post của hôm nay</b>
            <button type="button" className="wj-btn wj-btn-outline">
              <History size={15} />
              Xem thêm post cũ
            </button>
          </div>
        </div>

        <WorldJourneyAsideRight />
      </div>
    </div>
    </JourneyViewProvider>
  );
}
