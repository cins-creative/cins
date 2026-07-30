"use client";

import {
  BookOpen,
  Compass,
  GraduationCap,
  LayoutGrid,
  Search,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useLab } from "@/components/lab/LabProvider";
import {
  COURSES_HOC,
  FEED_ITEMS,
  LINH_VUC_CHIPS,
  SUGGEST_ORGS,
  SUGGEST_PEOPLE,
  type FeedTab,
} from "@/mocks/logged-in-home";
import type { MockPersona } from "@/mocks/session";

function FollowRow({
  name,
  role,
  isOrg,
  initialFollowing,
}: {
  name: string;
  role: string;
  isOrg?: boolean;
  initialFollowing: boolean;
}) {
  // LOGIC_TOUCH: home.follow-org
  // Real: OrgFollowButton / theo dõi API (user_theo_doi)
  // Mock: local useState toggle
  // Apply: call follow/unfollow mutation; optimistic UI optional
  const [following, setFollowing] = useState(initialFollowing);
  return (
    <div className="lab-ha-row">
      <div className={`lab-ha-av${isOrg ? " lab-ha-av--org" : ""}`} aria-hidden />
      <div>
        <div className="lab-ha-name">{name}</div>
        <div className="lab-ha-role">{role}</div>
      </div>
      <button
        type="button"
        className="lab-ha-follow"
        aria-pressed={following}
        onClick={() => setFollowing((v) => !v)}
      >
        {following ? "Đang theo dõi" : "Theo dõi"}
      </button>
    </div>
  );
}

function LeftModules({ persona }: { persona: MockPersona }) {
  // LOGIC_TOUCH: home.sidebar-modules
  // Real: HomeModuleColumn + MODULE_LAYOUT[persona] + per-module loaders
  // Mock: static panels switched by persona
  // Apply: restore HomeModuleColumn server components + fetches
  if (persona === "hoc") {
    return (
      <>
        <section className="ha-card">
          <div className="ha-card-head">
            <Compass size={16} aria-hidden />
            <span className="ha-card-title">Lĩnh vực</span>
          </div>
          {LINH_VUC_CHIPS.map((lv) => (
            <a key={lv.slug} href={`/entity?type=linh-vuc&slug=${lv.slug}`} className="ha-cat">
              <span
                className="ha-cat-dot"
                style={{ background: lv.accent }}
                aria-hidden
              />
              <span className="ha-cat-name">{lv.label}</span>
            </a>
          ))}
        </section>
        <section className="ha-card">
          <div className="ha-card-head">
            <GraduationCap size={16} aria-hidden />
            <span className="ha-card-title">Cơ sở đào tạo</span>
          </div>
          {SUGGEST_ORGS.map((o) => (
            <FollowRow
              key={o.id}
              name={o.name}
              role={o.role}
              isOrg
              initialFollowing={o.following}
            />
          ))}
        </section>
        <section className="ha-card">
          <div className="ha-card-head">
            <BookOpen size={16} aria-hidden />
            <span className="ha-card-title">Khóa học gợi ý</span>
          </div>
          {COURSES_HOC.map((c) => (
            <div key={c.id} className="lab-ha-row">
              <div>
                <div className="lab-ha-name">{c.title}</div>
                <div className="lab-ha-role">{c.org}</div>
              </div>
            </div>
          ))}
        </section>
      </>
    );
  }

  if (persona === "day") {
    return (
      <>
        <section className="ha-card">
          <div className="ha-card-head">
            <span className="ha-card-title">Chờ bạn duyệt</span>
          </div>
          <p className="ha-card-empty">Không có yêu cầu (mock).</p>
        </section>
        <section className="ha-card">
          <div className="ha-card-head">
            <span className="ha-card-title">Học viên của bạn</span>
          </div>
          <p className="ha-card-empty">Chưa có học viên gắn (mock).</p>
        </section>
      </>
    );
  }

  // lam
  return (
    <>
      <section className="ha-card ha-card--profile">
        <div className="ha-card-head">
          <span className="ha-card-title">Hồ sơ của bạn</span>
        </div>
        {/*
          LOGIC_TOUCH: home.profile-completeness
          Real: lib/cins/home-adaptive/profile-completeness.ts
          Mock: static nudge copy
          Apply: compute from profile fields; link to edit
        */}
        <p className="ha-card-empty">
          Hồ sơ ~60% — bổ sung portfolio và giai đoạn nghề nghiệp.
        </p>
      </section>
      <section className="ha-card ha-card--people">
        <div className="ha-card-head">
          <span className="ha-card-title">Người cùng ngành</span>
        </div>
        {SUGGEST_PEOPLE.map((p) => (
          <FollowRow
            key={p.id}
            name={p.name}
            role={p.role}
            initialFollowing={p.following}
          />
        ))}
      </section>
      <section className="ha-card ha-card--studio">
        <div className="ha-card-head">
          <span className="ha-card-title">Studio gợi ý</span>
        </div>
        {SUGGEST_ORGS.map((o) => (
          <FollowRow
            key={o.id}
            name={o.name}
            role={o.role}
            isOrg
            initialFollowing={o.following}
          />
        ))}
      </section>
    </>
  );
}

function RightModules({ seeking }: { seeking: boolean }) {
  return (
    <>
      <section className="ha-card">
        <div className="ha-card-head">
          <span className="ha-card-title">Đang theo dõi</span>
        </div>
        {SUGGEST_ORGS.filter((o) => o.following).length === 0 ? (
          <p className="ha-card-empty">Chưa theo dõi org nào (mock).</p>
        ) : (
          SUGGEST_ORGS.filter((o) => o.following).map((o) => (
            <FollowRow
              key={o.id}
              name={o.name}
              role={o.role}
              isOrg
              initialFollowing
            />
          ))
        )}
      </section>
      {seeking ? (
        <section className="ha-card ha-card--jobs">
          <div className="ha-card-head">
            <span className="ha-card-title">Cơ hội</span>
            <span className="ha-card-badge">Đang mở</span>
          </div>
          <p className="ha-card-empty">
            3 tin tuyển dụng phù hợp persona tìm việc (mock).
          </p>
        </section>
      ) : (
        <section className="ha-card">
          <div className="ha-card-head">
            <Sparkles size={16} aria-hidden />
            <span className="ha-card-title">Gợi ý theo dõi</span>
          </div>
          {SUGGEST_PEOPLE.map((p) => (
            <FollowRow
              key={p.id}
              name={p.name}
              role={p.role}
              initialFollowing={p.following}
            />
          ))}
        </section>
      )}
    </>
  );
}

/**
 * Visual fork of logged-in Home (World Journey + adaptive columns).
 *
 * LOGIC_TOUCH: home.session-gate · home.persona · home.feed ·
 * home.sidebar-modules · home.follow-org · home.profile-completeness ·
 * home.feed-boost
 */
export function LoggedInHomeLab() {
  const { session, persona, seeking } = useLab();
  const [tab, setTab] = useState<FeedTab>("following");
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [composeOpen, setComposeOpen] = useState(false);

  const items = useMemo(
    () =>
      FEED_ITEMS.filter((item) =>
        tab === "following" ? item.source === "following" : true,
      ),
    [tab],
  );

  const profile = session.profile!;

  return (
    <div className="world-journey-home" data-screen-label="Lab-Home-LoggedIn">
      <div className="wj-shell">
        <aside
          className="wj-guest-aside wj-guest-aside--left ha-col ha-col--left"
          aria-label="Module trái"
        >
          <LeftModules persona={persona} />
        </aside>

        <main className="wj-feed">
          <header className="wj-feed-header">
            <div className="wj-feed-tabs" role="tablist" aria-label="Nguồn feed">
              <button
                type="button"
                role="tab"
                className={tab === "following" ? "on" : undefined}
                aria-selected={tab === "following"}
                onClick={() => setTab("following")}
              >
                <Waypoints size={16} aria-hidden />
                Đang theo dõi
              </button>
              <button
                type="button"
                role="tab"
                className={tab === "explore" ? "on" : undefined}
                aria-selected={tab === "explore"}
                onClick={() => setTab("explore")}
              >
                <Search size={16} aria-hidden />
                Khám phá
              </button>
            </div>
            <button
              type="button"
              className="lab-chrome-btn"
              style={{ marginLeft: "auto" }}
              aria-label="Chuyển gallery (lab stub)"
              title="Gallery view — lát cắt sau"
            >
              <LayoutGrid size={16} aria-hidden />
            </button>
          </header>

          {/*
            LOGIC_TOUCH: home.compose
            Real: JourneyComposeProvider + CinsFeedComposer → publish content_cot_moc
            Mock: expand local compose row; no submit
            Apply: restore compose overlay + publish API
          */}
          <div className="lab-composer">
            <div className="lab-feed-avatar" aria-hidden />
            <button
              type="button"
              className="lab-composer-input"
              style={{ textAlign: "left", cursor: "pointer" }}
              onClick={() => setComposeOpen((v) => !v)}
            >
              {composeOpen
                ? "Composer mở (mock — không publish)"
                : `Xin chào ${profile.tenHienThi}, bạn đang làm gì?`}
            </button>
          </div>

          {items.map((item) => {
            const isLiked = liked[item.id] ?? false;
            return (
              <article key={item.id} className="lab-feed-card">
                {/*
                  LOGIC_TOUCH: home.feed-boost
                  Real: world editorial boost (L29) + feed scoring
                  Mock: no boost badge (intentional — boost ẩn với viewer)
                  Apply: scoring + TTL boost server-side; UI không nhãn viewer
                */}
                <div className="lab-feed-card-head">
                  <div className="lab-feed-avatar" aria-hidden />
                  <div className="lab-feed-meta">
                    <div className="lab-feed-name">{item.authorName}</div>
                    <div className="lab-feed-sub">
                      @{item.authorSlug} · {item.timeLabel}
                    </div>
                  </div>
                </div>
                <p className="lab-feed-body">{item.body}</p>
                {item.hasMedia ? (
                  <div className="lab-feed-media" aria-hidden />
                ) : null}
                <div className="lab-feed-actions">
                  <button
                    type="button"
                    aria-pressed={isLiked}
                    onClick={() =>
                      setLiked((prev) => ({
                        ...prev,
                        [item.id]: !isLiked,
                      }))
                    }
                  >
                    {isLiked ? "Đã thích" : "Thích"}
                  </button>
                  <button type="button">Bình luận</button>
                  <button type="button">Chia sẻ</button>
                </div>
              </article>
            );
          })}
        </main>

        <aside
          className="wj-guest-aside wj-guest-aside--right ha-col ha-col--right"
          aria-label="Module phải"
        >
          <RightModules seeking={seeking} />
        </aside>
      </div>
    </div>
  );
}
