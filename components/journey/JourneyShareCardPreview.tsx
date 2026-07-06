"use client";

import type { RefObject } from "react";

import { JourneyShareCardQr } from "@/components/journey/JourneyShareCardQr";
import type {
  JourneyJourneyCardVariant,
  JourneyShareCardKind,
  JourneyShareCardVariant,
  JourneyShareProfile,
} from "@/lib/journey/profile-share";

type Props = {
  kind: JourneyShareCardKind;
  variant: JourneyShareCardVariant;
  profile: JourneyShareProfile;
  targetUrl: string;
  exportRef?: RefObject<HTMLElement | null>;
};

const SHARE_CARD_LOGO_SRC = "/assets/logo-cins-64.png";

function ShareCardBrand({
  className = "",
  size = 64,
}: {
  className?: string;
  size?: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={SHARE_CARD_LOGO_SRC}
      alt="CINs"
      className={"j-share-card-brand" + (className ? ` ${className}` : "")}
      width={size}
      height={size}
      decoding="async"
    />
  );
}

function ShareAvatar({
  profile,
  className = "",
}: {
  profile: JourneyShareProfile;
  className?: string;
}) {
  return (
    <div className={"j-share-card-avatar" + (className ? ` ${className}` : "")}>
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
  tall = false,
}: {
  profile: JourneyShareProfile;
  className?: string;
  tall?: boolean;
}) {
  return (
    <div
      className={[
        "j-share-card-cover",
        profile.coverUrl ? "has-img" : "",
        tall ? "j-share-card-cover--tall" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    >
      {profile.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.coverUrl} alt="" crossOrigin="anonymous" />
      ) : (
        <div className="j-share-card-cover-blob" />
      )}
    </div>
  );
}

function CardAside({
  slug,
  targetUrl,
  hideUrl = false,
}: {
  slug: string;
  targetUrl: string;
  hideUrl?: boolean;
}) {
  return (
    <aside className="j-share-card-aside" aria-label="Mã QR và liên kết CINs">
      <ShareCardBrand size={32} className="j-share-card-brand--aside" />
      <JourneyShareCardQr url={targetUrl} />
      {hideUrl ? null : (
        <span className="j-share-card-url">cins.vn/{slug}</span>
      )}
    </aside>
  );
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
      <img src={src} alt="" className={className} loading="lazy" decoding="async" crossOrigin="anonymous" />
    );
  }
  return <span className={className + " j-share-card-ph"} aria-hidden />;
}

/** Layout 1 — cinematic cover + profile strip (16:9). */
function JourneyProfileLayout({ profile }: { profile: JourneyShareProfile }) {
  const cotMoc = profile.stats?.cotMoc ?? 0;
  const tacPham = profile.stats?.tacPham ?? 0;

  return (
    <div className="j-share-journey j-share-journey--profile">
      <div className="j-share-profile-cover-wrap">
        <ShareCover profile={profile} className="j-share-journey-cover" />
        <div className="j-share-profile-cover-shimmer" aria-hidden />
        <div className="j-share-profile-cover-fade" aria-hidden />
      </div>
      <div className="j-share-journey-body j-share-profile-body">
        <div className="j-share-journey-head j-share-profile-head">
          <ShareAvatar
            profile={profile}
            className="j-share-journey-avatar j-share-profile-avatar"
          />
          <div className="j-share-journey-ident j-share-profile-ident">
            <strong>{profile.displayName}</strong>
            {profile.roleLine ? (
              <span className="j-share-profile-role">{profile.roleLine}</span>
            ) : null}
          </div>
        </div>
        <div className="j-share-profile-mid">
          <div className="j-share-profile-copy">
            {profile.bio ? (
              <p className="j-share-journey-bio j-share-profile-bio">{profile.bio}</p>
            ) : (
              <p className="j-share-journey-bio j-share-profile-bio j-share-profile-bio--placeholder">
                Khám phá hành trình sáng tạo — cột mốc, tác phẩm và kết nối trên CINs.
              </p>
            )}
            <span className="j-share-profile-url">cins.vn/{profile.slug}</span>
            {profile.locationLine ? (
              <span className="j-share-profile-loc">{profile.locationLine}</span>
            ) : null}
          </div>
          <div className="j-share-profile-side">
            <div className="j-share-profile-stats">
              <div className="j-share-journey-stat j-share-profile-stat j-share-profile-stat--milestone">
                <strong>{cotMoc}</strong>
                <span>Cột mốc</span>
              </div>
              <div className="j-share-journey-stat j-share-profile-stat j-share-profile-stat--works">
                <strong>{tacPham}</strong>
                <span>Tác phẩm</span>
              </div>
            </div>
            <span className="j-share-journey-tag j-share-profile-tag">
              <span className="j-share-profile-tag-dot" aria-hidden />
              Journey
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Layout 2 — frosted panel trên mesh gradient, đủ thông tin hồ sơ. */
function JourneyGlassLayout({ profile }: { profile: JourneyShareProfile }) {
  const cotMoc = profile.stats?.cotMoc ?? 0;
  const tacPham = profile.stats?.tacPham ?? 0;

  return (
    <div className="j-share-journey j-share-journey--glass">
      <div className="j-share-journey-glass-bg" aria-hidden />
      <div className="j-share-journey-glass-panel">
        <div className="j-share-glass-head">
          <ShareAvatar
            profile={profile}
            className="j-share-journey-avatar j-share-glass-avatar"
          />
          <div className="j-share-glass-ident">
            <strong>{profile.displayName}</strong>
            {profile.roleLine ? (
              <span className="j-share-glass-role">{profile.roleLine}</span>
            ) : null}
          </div>
        </div>
        <div className="j-share-glass-mid">
          <div className="j-share-glass-copy">
            {profile.bio ? (
              <p className="j-share-journey-bio j-share-glass-bio">{profile.bio}</p>
            ) : (
              <p className="j-share-journey-bio j-share-glass-bio j-share-glass-bio--placeholder">
                Khám phá hành trình sáng tạo — cột mốc, tác phẩm và kết nối trên CINs.
              </p>
            )}
            <span className="j-share-glass-url">cins.vn/{profile.slug}</span>
            {profile.locationLine ? (
              <span className="j-share-glass-loc">{profile.locationLine}</span>
            ) : null}
          </div>
          <div className="j-share-glass-side">
            <div className="j-share-glass-stats">
              <div className="j-share-journey-stat j-share-glass-stat j-share-glass-stat--milestone">
                <strong>{cotMoc}</strong>
                <span>Cột mốc</span>
              </div>
              <div className="j-share-journey-stat j-share-glass-stat j-share-glass-stat--works">
                <strong>{tacPham}</strong>
                <span>Tác phẩm</span>
              </div>
            </div>
            <span className="j-share-journey-tag j-share-glass-tag">
              <span className="j-share-glass-tag-dot" aria-hidden />
              Journey
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Layout 3 — cover trái · hồ sơ phải. */
function JourneyHeroLayout({ profile }: { profile: JourneyShareProfile }) {
  const cotMoc = profile.stats?.cotMoc ?? 0;
  const tacPham = profile.stats?.tacPham ?? 0;

  return (
    <div className="j-share-journey j-share-journey--hero">
      <ShareCover profile={profile} className="j-share-journey-hero-visual" />
      <div className="j-share-journey-hero-panel">
        <div className="j-share-journey-head">
          <ShareAvatar profile={profile} className="j-share-journey-avatar" />
          <div className="j-share-journey-ident">
            <strong>{profile.displayName}</strong>
            {profile.roleLine ? <span>{profile.roleLine}</span> : null}
          </div>
        </div>
        {profile.bio ? (
          <p className="j-share-journey-bio">{profile.bio}</p>
        ) : null}
        <div className="j-share-journey-foot j-share-journey-foot--hero">
          <div className="j-share-journey-stat">
            <strong>{cotMoc}</strong>
            <span>Cột mốc</span>
          </div>
          <div className="j-share-journey-stat">
            <strong>{tacPham}</strong>
            <span>Tác phẩm</span>
          </div>
          <span className="j-share-journey-cta">Xem Journey</span>
        </div>
      </div>
    </div>
  );
}

/** Layout 4 — visual trái · panel ấm phải. */
function JourneyTabLayout({ profile }: { profile: JourneyShareProfile }) {
  return (
    <div className="j-share-journey j-share-journey--tab">
      <div className="j-share-journey-tab-visual">
        {profile.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.coverUrl}
            alt=""
            className="j-share-journey-tab-img"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="j-share-journey-tab-img j-share-journey-tab-img--grad" aria-hidden />
        )}
      </div>
      <div className="j-share-journey-tab-panel">
        <div className="j-share-journey-head">
          <ShareAvatar profile={profile} className="j-share-journey-avatar" />
          <div className="j-share-journey-ident">
            <strong>{profile.displayName}</strong>
            {profile.roleLine ? <span>{profile.roleLine}</span> : null}
          </div>
        </div>
        <p className="j-share-journey-bio">
          {profile.bio?.trim() ||
            "Khám phá hành trình sáng tạo trên CINs — cột mốc, tác phẩm và kết nối."}
        </p>
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
    case "glass":
      return <JourneyGlassLayout profile={profile} />;
    case "hero":
      return <JourneyHeroLayout profile={profile} />;
    case "tab":
      return <JourneyTabLayout profile={profile} />;
    case "profile":
    default:
      return <JourneyProfileLayout profile={profile} />;
  }
}

function GalleryGridLayout({
  profile,
  variant,
  thumbs,
}: {
  profile: JourneyShareProfile;
  variant: "mosaic" | "spotlight" | "filmstrip";
  thumbs: string[];
}) {
  const tacPham = profile.stats?.tacPham ?? 0;
  const cells = [...thumbs.slice(0, variant === "filmstrip" ? 5 : 4)];
  const minCells = variant === "filmstrip" ? 5 : 4;
  while (cells.length < minCells) cells.push("");

  return (
    <div className="j-share-card-body j-share-card-body--gallery">
      <div className="j-share-card-head j-share-card-head--compact">
        <ShareAvatar profile={profile} />
        <div className="j-share-card-ident">
          <strong>{profile.displayName}</strong>
          <span>{tacPham} tác phẩm</span>
        </div>
      </div>
      {variant === "mosaic" ? (
        <div className="j-share-card-gallery j-share-card-gallery--mosaic">
          {cells.slice(0, 4).map((src, i) => (
            <GalleryThumb
              key={i}
              src={src || null}
              className="j-share-card-g-cell"
            />
          ))}
        </div>
      ) : variant === "spotlight" ? (
        <div className="j-share-card-gallery j-share-card-gallery--spotlight">
          <GalleryThumb
            src={cells[0] || null}
            className="j-share-card-g-spot"
          />
          <div className="j-share-card-g-row">
            {cells.slice(1, 4).map((src, i) => (
              <GalleryThumb
                key={i}
                src={src || null}
                className="j-share-card-g-cell"
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="j-share-card-gallery j-share-card-gallery--filmstrip">
          {cells.slice(0, 5).map((src, i) => (
            <GalleryThumb
              key={i}
              src={src || null}
              className="j-share-card-g-strip"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PortfolioLayout({
  profile,
  thumbs,
}: {
  profile: JourneyShareProfile;
  thumbs: string[];
}) {
  const cells = [...thumbs.slice(0, 4)];
  while (cells.length < 4) cells.push("");

  return (
    <div className="j-share-card-portfolio">
      <header className="j-share-card-portfolio-head">
        <ShareAvatar
          profile={profile}
          className="j-share-card-avatar--portfolio"
        />
        <div className="j-share-card-portfolio-ident">
          <strong>{profile.displayName}</strong>
          <span className="j-share-card-portfolio-url">
            cins.vn/{profile.slug}
          </span>
        </div>
        <span className="j-share-card-portfolio-badge">Portfolio</span>
      </header>
      <div className="j-share-card-portfolio-mosaic" aria-hidden>
        <GalleryThumb
          src={cells[0] || null}
          className="j-share-card-portfolio-cell j-share-card-portfolio-cell--hero"
        />
        <GalleryThumb
          src={cells[1] || null}
          className="j-share-card-portfolio-cell"
        />
        <GalleryThumb
          src={cells[2] || null}
          className="j-share-card-portfolio-cell"
        />
        <GalleryThumb
          src={cells[3] || null}
          className="j-share-card-portfolio-cell"
        />
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
}: Props) {
  const journeyVariant: JourneyJourneyCardVariant =
    kind === "journey" &&
    (variant === "profile" ||
      variant === "glass" ||
      variant === "hero" ||
      variant === "tab")
      ? variant
      : "profile";

  const galleryVariant: "mosaic" | "spotlight" | "filmstrip" | "portfolio" =
    kind === "gallery" &&
    (variant === "mosaic" ||
      variant === "spotlight" ||
      variant === "filmstrip" ||
      variant === "portfolio")
      ? variant
      : "mosaic";

  const thumbs = profile.galleryThumbs ?? [];

  const cardModifier =
    kind === "journey"
      ? journeyVariant
      : galleryVariant === "portfolio"
        ? "portfolio"
        : galleryVariant;

  return (
    <article
      ref={exportRef as RefObject<HTMLElement>}
      className={[
        "j-share-card",
        `j-share-card--${kind}`,
        `j-share-card--${cardModifier}`,
      ].join(" ")}
      data-share-url={targetUrl}
      aria-label={
        kind === "journey"
          ? `Thẻ giới thiệu Journey — ${profile.displayName}`
          : `Thẻ Portfolio — ${profile.displayName}`
      }
    >
      <div className="j-share-card-main">
        {kind === "journey" ? (
          <JourneyLayout variant={journeyVariant} profile={profile} />
        ) : galleryVariant === "portfolio" ? (
          <PortfolioLayout profile={profile} thumbs={thumbs} />
        ) : (
          <GalleryGridLayout
            profile={profile}
            variant={galleryVariant}
            thumbs={thumbs}
          />
        )}
      </div>

      <CardAside
        slug={profile.slug}
        targetUrl={targetUrl}
        hideUrl={kind === "gallery" && galleryVariant === "portfolio"}
      />
    </article>
  );
}
