"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

import type {
  JourneyGalleryCardVariant,
  JourneyJourneyCardVariant,
  JourneyShareCardKind,
  JourneyShareCardVariant,
  JourneyShareProfile,
} from "@/lib/journey/profile-share";
import {
  resolveShareOgThemeTokens,
  shareOgBackgroundStyle,
  type ShareOgTheme,
} from "@/lib/journey/share-og-theme";

type Props = {
  kind: JourneyShareCardKind;
  variant: JourneyShareCardVariant;
  profile: JourneyShareProfile;
  targetUrl: string;
  exportRef?: RefObject<HTMLElement | null>;
  /** Org share — thay nhãn Portfolio trên thẻ gallery. */
  galleryFeatureLabel?: string;
  /** Theme nền thẻ (preset / ảnh custom). */
  theme?: ShareOgTheme | null;
};

/** Canvas thẻ mặt trước — khớp mockup; preview scale bằng transform. */
export const JOURNEY_NAMECARD_W = 1040;
export const JOURNEY_NAMECARD_H = 548;

const JOURNEY_VARIANTS = new Set<JourneyJourneyCardVariant>([
  "banner",
  "frame",
  "center",
  "split",
  "immersive",
]);

const GALLERY_VARIANTS = new Set<JourneyGalleryCardVariant>([
  "strip",
  "panel",
  "sidebar",
  "film",
  "stack",
]);

function ShareAvatar({
  profile,
  className = "",
}: {
  profile: JourneyShareProfile;
  className?: string;
}) {
  return (
    <div className={"j-nc-avatar" + (className ? ` ${className}` : "")}>
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatarUrl} alt="" crossOrigin="anonymous" />
      ) : (
        <span>{profile.initials}</span>
      )}
    </div>
  );
}

function ShareCover({
  profile,
  className = "",
  children,
}: {
  profile: JourneyShareProfile;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={[
        "j-nc-cover",
        profile.coverUrl ? "has-img" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    >
      {profile.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.coverUrl} alt="" crossOrigin="anonymous" />
      ) : null}
      {children}
    </div>
  );
}

function StatusPill({
  roleLine,
  className = "",
}: {
  roleLine: string;
  className?: string;
}) {
  if (!roleLine.trim()) return null;
  return (
    <span className={"j-nc-pill" + (className ? ` ${className}` : "")}>
      <span className="j-nc-dot" aria-hidden />
      {roleLine}
    </span>
  );
}

function StatusInline({ roleLine }: { roleLine: string }) {
  if (!roleLine.trim()) return null;
  return (
    <span className="j-nc-st">
      <span className="j-nc-dot" aria-hidden />
      {roleLine}
    </span>
  );
}

function UrlChip({
  slug,
  light = false,
  className = "",
}: {
  slug: string;
  light?: boolean;
  className?: string;
}) {
  return (
    <div
      className={
        "j-nc-url-chip" +
        (light ? " is-light" : "") +
        (className ? ` ${className}` : "")
      }
    >
      cins.vn/{slug}
    </div>
  );
}

function StatsPair({
  profile,
  className = "",
}: {
  profile: JourneyShareProfile;
  className?: string;
}) {
  const cotMoc = profile.stats?.cotMoc ?? 0;
  const tacPham = profile.stats?.tacPham ?? 0;
  return (
    <div className={"j-nc-stats" + (className ? ` ${className}` : "")}>
      <div className="j-nc-stat">
        <strong>{cotMoc}</strong>
        <span>Cột mốc</span>
      </div>
      <div className="j-nc-stat">
        <strong>{tacPham}</strong>
        <span>Tác phẩm</span>
      </div>
    </div>
  );
}

/* ── 1 · Banner ─────────────────────────────────────────────── */
function BannerLayout({ profile }: { profile: JourneyShareProfile }) {
  const cotMoc = profile.stats?.cotMoc ?? 0;
  const tacPham = profile.stats?.tacPham ?? 0;
  return (
    <div className="j-nc j-nc--banner">
      <div className="j-nc-b-cover">
        <ShareCover profile={profile} />
      </div>
      <div className="j-nc-b-body">
        <ShareAvatar profile={profile} className="j-nc-b-avatar" />
        <div className="j-nc-b-text">
          <div className="j-nc-b-name">
            <h3>{profile.displayName}</h3>
            <StatusInline roleLine={profile.roleLine} />
          </div>
          {profile.bio ? <p className="j-nc-bio">{profile.bio}</p> : null}
        </div>
        <div className="j-nc-b-stats">
          <span>
            <b>{cotMoc}</b> Cột mốc
          </span>
          <span className="j-nc-sep">•</span>
          <span>
            <b>{tacPham}</b> Tác phẩm
          </span>
        </div>
        <div className="j-nc-b-right">
          <UrlChip slug={profile.slug} />
        </div>
      </div>
    </div>
  );
}

/* ── 2 · Frame ──────────────────────────────────────────────── */
function FrameLayout({ profile }: { profile: JourneyShareProfile }) {
  return (
    <div className="j-nc j-nc--frame">
      <div className="j-nc-f-bg" aria-hidden>
        <ShareCover profile={profile} />
      </div>
      <div className="j-nc-f-panel">
        <div className="j-nc-f-cover">
          <ShareCover profile={profile} />
        </div>
        <div className="j-nc-f-side">
          <ShareAvatar profile={profile} className="j-nc-f-avatar" />
          <h3 className="j-nc-name">{profile.displayName}</h3>
          <StatusPill roleLine={profile.roleLine} />
          {profile.bio ? <p className="j-nc-bio">{profile.bio}</p> : null}
          <StatsPair profile={profile} className="j-nc-f-stats" />
          <div className="j-nc-f-foot">
            <UrlChip slug={profile.slug} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 3 · Center ─────────────────────────────────────────────── */
function CenterLayout({ profile }: { profile: JourneyShareProfile }) {
  const cotMoc = profile.stats?.cotMoc ?? 0;
  const tacPham = profile.stats?.tacPham ?? 0;
  return (
    <div className="j-nc j-nc--center">
      <div className="j-nc-c-strip" aria-hidden>
        <ShareCover profile={profile} />
      </div>
      <div className="j-nc-c-inner">
        <ShareAvatar profile={profile} className="j-nc-c-avatar" />
        <h3 className="j-nc-name j-nc-name--lg">{profile.displayName}</h3>
        <StatusPill roleLine={profile.roleLine} />
        {profile.bio ? <p className="j-nc-bio j-nc-bio--center">{profile.bio}</p> : null}
        <div className="j-nc-c-boxes">
          <div className="j-nc-c-box">
            <strong>{tacPham}</strong>
            <span>Tác phẩm</span>
          </div>
          <div className="j-nc-c-box">
            <strong>{cotMoc}</strong>
            <span>Cột mốc</span>
          </div>
        </div>
      </div>
      <div className="j-nc-c-foot">
        <UrlChip slug={profile.slug} />
      </div>
    </div>
  );
}

/* ── 4 · Split ──────────────────────────────────────────────── */
function SplitLayout({ profile }: { profile: JourneyShareProfile }) {
  return (
    <div className="j-nc j-nc--split">
      <div className="j-nc-s-cover">
        <ShareCover profile={profile} />
      </div>
      <div className="j-nc-s-side">
        <ShareAvatar profile={profile} className="j-nc-s-avatar" />
        <h3 className="j-nc-name">{profile.displayName}</h3>
        <StatusPill roleLine={profile.roleLine} />
        {profile.bio ? <p className="j-nc-bio">{profile.bio}</p> : null}
        <StatsPair profile={profile} className="j-nc-s-stats" />
        <UrlChip slug={profile.slug} className="j-nc-s-url" />
      </div>
    </div>
  );
}

/* ── 5 · Immersive ──────────────────────────────────────────── */
function ImmersiveLayout({ profile }: { profile: JourneyShareProfile }) {
  return (
    <div className="j-nc j-nc--immersive">
      <ShareCover profile={profile} className="j-nc-i-cover" />
      <div className="j-nc-i-dark" aria-hidden />
      <div className="j-nc-i-url">
        <UrlChip slug={profile.slug} light />
      </div>
      <div className="j-nc-i-foot">
        <div className="j-nc-i-info">
          <div className="j-nc-i-idrow">
            <ShareAvatar profile={profile} className="j-nc-i-avatar" />
            <div>
              <h3 className="j-nc-i-name">
                {profile.displayName}
                <StatusInline roleLine={profile.roleLine} />
              </h3>
            </div>
          </div>
          {profile.bio ? <p className="j-nc-i-bio">{profile.bio}</p> : null}
        </div>
        <StatsPair profile={profile} className="j-nc-i-stats" />
      </div>
    </div>
  );
}

function JourneyLayout({
  variant,
  profile,
}: {
  variant: JourneyJourneyCardVariant;
  profile: JourneyShareProfile;
}) {
  switch (variant) {
    case "frame":
      return <FrameLayout profile={profile} />;
    case "center":
      return <CenterLayout profile={profile} />;
    case "split":
      return <SplitLayout profile={profile} />;
    case "immersive":
      return <ImmersiveLayout profile={profile} />;
    case "banner":
    default:
      return <BannerLayout profile={profile} />;
  }
}

function GalleryThumb({
  src,
  className,
}: {
  src: string | null;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className={className}
        loading="lazy"
        decoding="async"
        crossOrigin="anonymous"
      />
    );
  }
  return <span className={className + " j-ps-ph"} aria-hidden />;
}

function padThumbs(thumbs: string[], n: number): string[] {
  const cells = [...thumbs.slice(0, n)];
  while (cells.length < n) cells.push("");
  return cells;
}

function PsAvatar({
  profile,
  className = "",
}: {
  profile: JourneyShareProfile;
  className?: string;
}) {
  return (
    <div className={"j-ps-avatar" + (className ? ` ${className}` : "")}>
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.avatarUrl} alt="" crossOrigin="anonymous" />
      ) : (
        <span>{profile.initials}</span>
      )}
    </div>
  );
}

function PsStatsInline({ profile }: { profile: JourneyShareProfile }) {
  const cotMoc = profile.stats?.cotMoc ?? 0;
  const tacPham = profile.stats?.tacPham ?? 0;
  return (
    <div className="j-ps-stats-inline">
      <span>
        <b>{cotMoc}</b> Cột mốc
      </span>
      <span className="j-ps-dot" aria-hidden>
        •
      </span>
      <span>
        <b>{tacPham}</b> Tác phẩm
      </span>
    </div>
  );
}

function PsStatsPair({ profile }: { profile: JourneyShareProfile }) {
  const cotMoc = profile.stats?.cotMoc ?? 0;
  const tacPham = profile.stats?.tacPham ?? 0;
  return (
    <div className="j-ps-stats-pair">
      <div className="j-ps-stat">
        <strong>{cotMoc}</strong>
        <span>Cột mốc</span>
      </div>
      <div className="j-ps-stat-vr" aria-hidden />
      <div className="j-ps-stat">
        <strong>{tacPham}</strong>
        <span>Tác phẩm</span>
      </div>
    </div>
  );
}

/* ── Portfolio Strip ────────────────────────────────────────── */
function StripLayout({
  profile,
  thumbs,
}: {
  profile: JourneyShareProfile;
  thumbs: string[];
}) {
  const cells = padThumbs(thumbs, 4);
  return (
    <div className="j-ps j-ps--strip">
      <header className="j-ps-strip-head">
        <PsAvatar profile={profile} className="j-ps-strip-avatar" />
        <div className="j-ps-strip-ident">
          <h3>{profile.displayName}</h3>
          <p className="j-ps-url">cins.vn/{profile.slug}</p>
          <PsStatsInline profile={profile} />
        </div>
      </header>
      <div className="j-ps-strip-grid" aria-hidden>
        <GalleryThumb src={cells[0] || null} className="j-ps-cell j-ps-cell--wide" />
        <GalleryThumb src={cells[1] || null} className="j-ps-cell" />
        <GalleryThumb src={cells[2] || null} className="j-ps-cell" />
        <GalleryThumb src={cells[3] || null} className="j-ps-cell" />
      </div>
    </div>
  );
}

/* ── Portfolio Panel ────────────────────────────────────────── */
function PanelLayout({
  profile,
  thumbs,
}: {
  profile: JourneyShareProfile;
  thumbs: string[];
}) {
  const cells = padThumbs(thumbs, 5);
  return (
    <div className="j-ps j-ps--panel">
      <div className="j-ps-panel-bg" aria-hidden />
      <aside className="j-ps-panel-card">
        <PsAvatar profile={profile} className="j-ps-panel-avatar" />
        <h3>{profile.displayName}</h3>
        <p className="j-ps-url j-ps-url--dot">cins.vn/{profile.slug}</p>
      </aside>
      <div className="j-ps-panel-main">
        <PsStatsInline profile={profile} />
        <div className="j-ps-panel-grid" aria-hidden>
          <GalleryThumb src={cells[0] || null} className="j-ps-cell j-ps-cell--hero" />
          <GalleryThumb src={cells[1] || null} className="j-ps-cell j-ps-cell--tall" />
          <GalleryThumb src={cells[2] || null} className="j-ps-cell" />
          <GalleryThumb src={cells[3] || null} className="j-ps-cell" />
          <GalleryThumb src={cells[4] || null} className="j-ps-cell" />
        </div>
      </div>
    </div>
  );
}

/* ── Portfolio Sidebar ──────────────────────────────────────── */
function SidebarLayout({
  profile,
  thumbs,
}: {
  profile: JourneyShareProfile;
  thumbs: string[];
}) {
  const cells = padThumbs(thumbs, 5);
  return (
    <div className="j-ps j-ps--sidebar">
      <aside className="j-ps-side">
        <PsAvatar profile={profile} className="j-ps-side-avatar" />
        <h3>{profile.displayName}</h3>
        <p className="j-ps-url j-ps-url--mint">cins.vn/{profile.slug}</p>
        <PsStatsPair profile={profile} />
      </aside>
      <div className="j-ps-side-gallery" aria-hidden>
        <GalleryThumb src={cells[0] || null} className="j-ps-cell j-ps-cell--hero" />
        <GalleryThumb src={cells[1] || null} className="j-ps-cell j-ps-cell--mid" />
        <GalleryThumb src={cells[2] || null} className="j-ps-cell" />
        <GalleryThumb src={cells[3] || null} className="j-ps-cell" />
        <GalleryThumb src={cells[4] || null} className="j-ps-cell" />
      </div>
    </div>
  );
}

/* ── Portfolio Film ─────────────────────────────────────────── */
function FilmLayout({
  profile,
  thumbs,
}: {
  profile: JourneyShareProfile;
  thumbs: string[];
}) {
  const cells = padThumbs(thumbs, 4);
  return (
    <div className="j-ps j-ps--film">
      <div className="j-ps-film-bg" aria-hidden />
      <header className="j-ps-film-head">
        <PsAvatar profile={profile} className="j-ps-film-avatar" />
        <div className="j-ps-film-ident">
          <h3>{profile.displayName}</h3>
          <p className="j-ps-url j-ps-url--dot">cins.vn/{profile.slug}</p>
        </div>
      </header>
      <div className="j-ps-film-row" aria-hidden>
        {cells.map((src, i) => (
          <GalleryThumb
            key={i}
            src={src || null}
            className={`j-ps-cell j-ps-film-shot j-ps-film-shot--${i}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Portfolio Stack ────────────────────────────────────────── */
function StackLayout({
  profile,
  thumbs,
}: {
  profile: JourneyShareProfile;
  thumbs: string[];
}) {
  const cells = padThumbs(thumbs, 5);
  return (
    <div className="j-ps j-ps--stack">
      <div className="j-ps-stack-bg" aria-hidden />
      <header className="j-ps-stack-head">
        <PsAvatar profile={profile} className="j-ps-stack-avatar" />
        <div className="j-ps-stack-ident">
          <h3>{profile.displayName}</h3>
          <PsStatsPair profile={profile} />
        </div>
      </header>
      <div className="j-ps-url-pill">
        <span>cins.vn/{profile.slug}</span>
        <span className="j-ps-url-pill-ic" aria-hidden>
          ↗
        </span>
      </div>
      <div className="j-ps-stack-fan" aria-hidden>
        {cells.map((src, i) => (
          <div key={i} className={`j-ps-stack-card j-ps-stack-card--${i}`}>
            <GalleryThumb src={src || null} className="j-ps-cell" />
          </div>
        ))}
      </div>
    </div>
  );
}

function GalleryLayout({
  variant,
  profile,
  thumbs,
}: {
  variant: JourneyGalleryCardVariant;
  profile: JourneyShareProfile;
  thumbs: string[];
}) {
  switch (variant) {
    case "panel":
      return <PanelLayout profile={profile} thumbs={thumbs} />;
    case "sidebar":
      return <SidebarLayout profile={profile} thumbs={thumbs} />;
    case "film":
      return <FilmLayout profile={profile} thumbs={thumbs} />;
    case "stack":
      return <StackLayout profile={profile} thumbs={thumbs} />;
    case "strip":
    default:
      return <StripLayout profile={profile} thumbs={thumbs} />;
  }
}

/** Scale canvas 1040×548 cho vừa khung preview (giống mockup). */
function NamecardStage({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      const w = el.clientWidth;
      setScale(w > 0 ? Math.min(1, w / JOURNEY_NAMECARD_W) : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const s = scale ?? 0;

  return (
    <div
      ref={stageRef}
      className="j-share-preview-stage"
      style={{ height: JOURNEY_NAMECARD_H * s }}
      data-ready={scale != null ? "1" : "0"}
    >
      <div
        className="j-share-preview-stage-inner"
        style={{ transform: `scale(${s})` }}
      >
        {children}
      </div>
    </div>
  );
}

export function JourneyShareCardPreview({
  kind,
  variant,
  profile,
  targetUrl,
  exportRef,
  galleryFeatureLabel,
  theme = null,
}: Props) {
  const galleryLabel = galleryFeatureLabel ?? "Portfolio";
  const journeyVariant: JourneyJourneyCardVariant =
    kind === "journey" &&
    JOURNEY_VARIANTS.has(variant as JourneyJourneyCardVariant)
      ? (variant as JourneyJourneyCardVariant)
      : "banner";

  const galleryVariant: JourneyGalleryCardVariant =
    kind === "gallery" &&
    GALLERY_VARIANTS.has(variant as JourneyGalleryCardVariant)
      ? (variant as JourneyGalleryCardVariant)
      : "strip";

  const thumbs = profile.galleryThumbs ?? [];
  const isJourney = kind === "journey";
  const cardModifier = isJourney ? journeyVariant : galleryVariant;
  const tokens = resolveShareOgThemeTokens(theme, profile.slug);
  const themeClass = tokens.isCustom
    ? "j-share-card--theme-custom"
    : `j-share-card--theme-${tokens.presetId ?? "paper"}`;
  const bg = shareOgBackgroundStyle(tokens);

  /** Card tùy chỉnh = canvas trắng + ảnh user (không render layout mẫu). */
  if (tokens.isCustom && tokens.backgroundImage) {
    return (
      <NamecardStage>
        <article
          ref={exportRef as RefObject<HTMLElement>}
          className={[
            "j-share-card",
            `j-share-card--${kind}`,
            "j-share-card--namecard",
            "j-share-card--custom-art",
            themeClass,
          ].join(" ")}
          style={{
            backgroundColor: "#ffffff",
            color: tokens.ink,
          }}
          data-share-url={targetUrl}
          aria-label={
            isJourney
              ? `Card tùy chỉnh — ${profile.displayName}`
              : `Card ${galleryLabel} tùy chỉnh — ${profile.displayName}`
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="j-share-card-custom-art-img"
            src={tokens.backgroundImage}
            alt=""
            draggable={false}
          />
        </article>
      </NamecardStage>
    );
  }

  const themeStyle = {
    "--og-surface": tokens.surface,
    "--og-ink": tokens.ink,
    "--og-muted": tokens.muted,
    "--og-accent": tokens.accent,
    "--og-panel": tokens.panel,
    backgroundColor: bg.backgroundColor,
    backgroundImage: bg.backgroundImage,
    backgroundSize: bg.backgroundSize,
    color: tokens.ink,
  } as CSSProperties;

  return (
    <NamecardStage>
      <article
        ref={exportRef as RefObject<HTMLElement>}
        className={[
          "j-share-card",
          `j-share-card--${kind}`,
          `j-share-card--${cardModifier}`,
          "j-share-card--namecard",
          themeClass,
        ].join(" ")}
        style={themeStyle}
        data-share-url={targetUrl}
        aria-label={
          isJourney
            ? `Thẻ giới thiệu Journey — ${profile.displayName}`
            : `Thẻ ${galleryLabel} — ${profile.displayName}`
        }
      >
        <div className="j-share-card-main">
          {isJourney ? (
            <JourneyLayout variant={journeyVariant} profile={profile} />
          ) : (
            <GalleryLayout
              variant={galleryVariant}
              profile={profile}
              thumbs={thumbs}
            />
          )}
        </div>
      </article>
    </NamecardStage>
  );
}
