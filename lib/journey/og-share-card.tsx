import type { CSSProperties, ReactNode } from "react";

import type {
  JourneyGalleryCardVariant,
  JourneyJourneyCardVariant,
  JourneyShareProfile,
} from "@/lib/journey/profile-share";
import {
  DEFAULT_SHARE_OG_LAYOUTS,
  resolveShareOgThemeTokens,
  shareOgBackgroundStyle,
  type ShareOgTheme,
  type ShareOgThemeTokens,
} from "@/lib/journey/share-og-theme";

/* ── Primitives ─────────────────────────────────────────────── */

function OgAvatar({
  profile,
  size = 88,
  borderColor = "#ffffff",
}: {
  profile: JourneyShareProfile;
  size?: number;
  borderColor?: string;
}) {
  if (profile.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatarUrl}
        alt=""
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: `4px solid ${borderColor}`,
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.18)",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
        color: "#ffffff",
        fontSize: size * 0.34,
        fontWeight: 700,
        border: `4px solid ${borderColor}`,
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.18)",
        flexShrink: 0,
      }}
    >
      {profile.initials}
    </div>
  );
}

function OgBrand({ logoUrl, ink }: { logoUrl: string; ink: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt="CINs"
        width={36}
        height={36}
        style={{ width: 36, height: 36, borderRadius: 10 }}
      />
      <span style={{ fontSize: 18, fontWeight: 700, color: ink, letterSpacing: "0.04em" }}>
        CINS
      </span>
    </div>
  );
}

function OgUrlChip({
  slug,
  accent,
  panel,
  light = false,
}: {
  slug: string;
  accent: string;
  panel: string;
  light?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 16px",
        borderRadius: 999,
        background: light ? "rgba(255,255,255,0.18)" : panel,
        color: light ? "#ffffff" : accent,
        fontSize: 18,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {`cins.vn/${slug}`}
    </div>
  );
}

function OgCover({
  profile,
  style,
}: {
  profile: JourneyShareProfile;
  style?: CSSProperties;
}) {
  if (profile.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.coverUrl}
        alt=""
        width={1200}
        height={630}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          ...style,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #0ea5e9 0%, #0369a1 55%, #0f172a 100%)",
        ...style,
      }}
    />
  );
}

function OgGalleryThumb({
  src,
  radius = 16,
}: {
  src: string | null;
  radius?: number;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={400}
        height={400}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: radius,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: radius,
        background: "linear-gradient(135deg, #e2e8f0, #cbd5e1)",
      }}
    />
  );
}

function padThumbs(thumbs: string[] | undefined, n: number): string[] {
  const cells = [...(thumbs ?? []).slice(0, n)];
  while (cells.length < n) cells.push("");
  return cells;
}

function ThemeShell({
  tokens,
  children,
  padding = 0,
}: {
  tokens: ShareOgThemeTokens;
  children: ReactNode;
  padding?: number;
}) {
  const bg = shareOgBackgroundStyle(tokens);
  const style: CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    backgroundColor: bg.backgroundColor,
    color: tokens.ink,
    fontFamily: "Be Vietnam Pro",
    position: "relative",
    padding,
  };
  if (!tokens.isCustom && bg.backgroundImage) {
    style.backgroundImage = bg.backgroundImage;
    if (bg.backgroundSize) style.backgroundSize = bg.backgroundSize;
  }

  return (
    <div style={style}>
      {tokens.backgroundImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tokens.backgroundImage}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : null}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          flex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function RoleLine({
  text,
  color,
  size = 18,
}: {
  text: string;
  color: string;
  size?: number;
}) {
  if (!text.trim()) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: size, fontWeight: 600, color }}>{text}</span>
    </div>
  );
}

function StatsInline({
  profile,
  ink,
  muted,
}: {
  profile: JourneyShareProfile;
  ink: string;
  muted: string;
}) {
  const cotMoc = profile.stats?.cotMoc ?? 0;
  const tacPham = profile.stats?.tacPham ?? 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18 }}>
      <span style={{ display: "flex", gap: 6 }}>
        <span style={{ fontWeight: 800, color: ink }}>{cotMoc}</span>
        <span style={{ fontWeight: 600, color: muted }}>Cột mốc</span>
      </span>
      <span style={{ color: muted }}>•</span>
      <span style={{ display: "flex", gap: 6 }}>
        <span style={{ fontWeight: 800, color: ink }}>{tacPham}</span>
        <span style={{ fontWeight: 600, color: muted }}>Tác phẩm</span>
      </span>
    </div>
  );
}

function StatsPair({
  profile,
  tokens,
}: {
  profile: JourneyShareProfile;
  tokens: ShareOgThemeTokens;
}) {
  const cotMoc = profile.stats?.cotMoc ?? 0;
  const tacPham = profile.stats?.tacPham ?? 0;
  return (
    <div
      style={{
        display: "flex",
        gap: 18,
        padding: "12px 18px",
        borderRadius: 16,
        background: tokens.panel,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: tokens.accent, lineHeight: 1 }}>
          {cotMoc}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: tokens.muted }}>Cột mốc</span>
      </div>
      <div
        style={{
          width: 1,
          alignSelf: "stretch",
          background: tokens.muted,
          opacity: 0.35,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: tokens.accent, lineHeight: 1 }}>
          {tacPham}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: tokens.muted }}>Tác phẩm</span>
      </div>
    </div>
  );
}

function bioText(profile: JourneyShareProfile): string {
  return (
    profile.bio?.trim() ||
    "Khám phá hành trình sáng tạo — cột mốc, tác phẩm và kết nối trên CINs."
  );
}

/* ── Journey layouts ────────────────────────────────────────── */

function BannerLayout({
  profile,
  tokens,
  logoUrl,
}: {
  profile: JourneyShareProfile;
  tokens: ShareOgThemeTokens;
  logoUrl: string;
}) {
  const cotMoc = profile.stats?.cotMoc ?? 0;
  const tacPham = profile.stats?.tacPham ?? 0;
  return (
    <ThemeShell tokens={tokens}>
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
        }}
      >
        <div style={{ display: "flex", height: 340, overflow: "hidden" }}>
          <OgCover profile={profile} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            padding: "22px 36px",
            flex: 1,
            background: tokens.panel,
          }}
        >
          <div style={{ marginTop: -48, display: "flex" }}>
            <OgAvatar profile={profile} size={96} />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              flex: 1,
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 36,
                  fontWeight: 800,
                  color: tokens.ink,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                }}
              >
                {profile.displayName}
              </div>
              <RoleLine text={profile.roleLine} color={tokens.muted} size={16} />
            </div>
            <div
              style={{
                fontSize: 18,
                color: tokens.ink,
                opacity: 0.88,
                lineHeight: 1.35,
                display: "flex",
              }}
            >
              {bioText(profile)}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              alignItems: "flex-end",
            }}
          >
            <OgUrlChip
              slug={profile.slug}
              accent={tokens.accent}
              panel="rgba(255,255,255,0.92)"
            />
            <div
              style={{
                display: "flex",
                gap: 12,
                fontSize: 16,
                color: tokens.muted,
                fontWeight: 600,
              }}
            >
              <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontWeight: 800, color: tokens.accent }}>{cotMoc}</span>
                <span>Cột mốc</span>
              </span>
              <span>•</span>
              <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontWeight: 800, color: tokens.accent }}>{tacPham}</span>
                <span>Tác phẩm</span>
              </span>
            </div>
            <OgBrand logoUrl={logoUrl} ink={tokens.ink} />
          </div>
        </div>
      </div>
    </ThemeShell>
  );
}

function FrameLayout({
  profile,
  tokens,
}: {
  profile: JourneyShareProfile;
  tokens: ShareOgThemeTokens;
}) {
  return (
    <ThemeShell tokens={tokens} padding={28}>
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          borderRadius: 28,
          overflow: "hidden",
          background: tokens.panel,
        }}
      >
        <div style={{ display: "flex", width: "46%", height: "100%" }}>
          <OgCover profile={profile} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "36px 40px",
            gap: 14,
            justifyContent: "center",
          }}
        >
          <OgAvatar profile={profile} size={84} />
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: tokens.ink,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            {profile.displayName}
          </div>
          <RoleLine text={profile.roleLine} color={tokens.muted} />
          <div
            style={{
              fontSize: 20,
              lineHeight: 1.4,
              color: tokens.ink,
              opacity: 0.9,
              display: "flex",
            }}
          >
            {bioText(profile)}
          </div>
          <StatsPair profile={profile} tokens={tokens} />
          <OgUrlChip slug={profile.slug} accent={tokens.accent} panel={tokens.panel} />
        </div>
      </div>
    </ThemeShell>
  );
}

function CenterLayout({
  profile,
  tokens,
}: {
  profile: JourneyShareProfile;
  tokens: ShareOgThemeTokens;
}) {
  const cotMoc = profile.stats?.cotMoc ?? 0;
  const tacPham = profile.stats?.tacPham ?? 0;
  return (
    <ThemeShell tokens={tokens}>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
        <div style={{ display: "flex", height: 160, overflow: "hidden" }}>
          <OgCover profile={profile} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flex: 1,
            padding: "0 48px 28px",
            marginTop: -52,
          }}
        >
          <OgAvatar profile={profile} size={104} />
          <div
            style={{
              marginTop: 14,
              fontSize: 42,
              fontWeight: 800,
              color: tokens.ink,
              letterSpacing: "-0.02em",
              textAlign: "center",
            }}
          >
            {profile.displayName}
          </div>
          <div style={{ marginTop: 8 }}>
            <RoleLine text={profile.roleLine} color={tokens.muted} />
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 18,
              lineHeight: 1.35,
              color: tokens.ink,
              opacity: 0.88,
              textAlign: "center",
              maxWidth: 720,
            }}
          >
            {bioText(profile)}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 18 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "14px 28px",
                borderRadius: 16,
                background: tokens.panel,
                minWidth: 140,
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 800, color: tokens.accent }}>{tacPham}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: tokens.muted }}>Tác phẩm</span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "14px 28px",
                borderRadius: 16,
                background: tokens.panel,
                minWidth: 140,
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 800, color: tokens.accent }}>{cotMoc}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: tokens.muted }}>Cột mốc</span>
            </div>
          </div>
          <div style={{ marginTop: "auto" }}>
            <OgUrlChip slug={profile.slug} accent={tokens.accent} panel={tokens.panel} />
          </div>
        </div>
      </div>
    </ThemeShell>
  );
}

function SplitLayout({
  profile,
  tokens,
}: {
  profile: JourneyShareProfile;
  tokens: ShareOgThemeTokens;
}) {
  return (
    <ThemeShell tokens={tokens}>
      <div style={{ position: "relative", display: "flex", width: "100%", height: "100%" }}>
        <div style={{ display: "flex", width: "52%", height: "100%" }}>
          <OgCover profile={profile} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "40px 44px",
            gap: 14,
            justifyContent: "center",
            background: tokens.panel,
          }}
        >
          <OgAvatar profile={profile} size={88} />
          <div
            style={{
              fontSize: 38,
              fontWeight: 800,
              color: tokens.ink,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            {profile.displayName}
          </div>
          <RoleLine text={profile.roleLine} color={tokens.muted} />
          <div style={{ fontSize: 19, lineHeight: 1.4, color: tokens.ink, opacity: 0.9 }}>
            {bioText(profile)}
          </div>
          <StatsPair profile={profile} tokens={tokens} />
          <OgUrlChip slug={profile.slug} accent={tokens.accent} panel="rgba(255,255,255,0.9)" />
        </div>
      </div>
    </ThemeShell>
  );
}

function ImmersiveLayout({
  profile,
  tokens,
}: {
  profile: JourneyShareProfile;
  tokens: ShareOgThemeTokens;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        fontFamily: "Be Vietnam Pro",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
        }}
      >
        <OgCover profile={profile} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "linear-gradient(180deg, rgba(15,23,42,0.25) 0%, rgba(15,23,42,0.55) 45%, rgba(15,23,42,0.92) 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: "36px 40px",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <OgUrlChip
            slug={profile.slug}
            accent="#ffffff"
            panel="rgba(255,255,255,0.18)"
            light
          />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <OgAvatar profile={profile} size={80} borderColor="rgba(255,255,255,0.9)" />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontSize: 40,
                      fontWeight: 800,
                      color: "#ffffff",
                      letterSpacing: "-0.02em",
                      lineHeight: 1.1,
                    }}
                  >
                    {profile.displayName}
                  </span>
                  <RoleLine text={profile.roleLine} color="rgba(255,255,255,0.75)" size={16} />
                </div>
              </div>
            </div>
            <div style={{ fontSize: 20, lineHeight: 1.4, color: "rgba(255,255,255,0.9)", maxWidth: 760 }}>
              {bioText(profile)}
            </div>
          </div>
          <StatsPair
            profile={profile}
            tokens={{
              ...tokens,
              panel: "rgba(255,255,255,0.14)",
              accent: "#ffffff",
              muted: "rgba(255,255,255,0.7)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Gallery layouts ────────────────────────────────────────── */

function FilterPill({
  label,
  accent,
  panel,
}: {
  label: string;
  accent: string;
  panel: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "6px 12px",
        borderRadius: 999,
        background: panel,
        color: accent,
        fontSize: 15,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {label}
    </div>
  );
}

function StripLayout({
  profile,
  tokens,
  logoUrl,
  filterLabel,
}: {
  profile: JourneyShareProfile;
  tokens: ShareOgThemeTokens;
  logoUrl: string;
  filterLabel?: string | null;
}) {
  const cells = padThumbs(profile.galleryThumbs, 4);
  return (
    <ThemeShell tokens={tokens} padding={36}>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%", gap: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <OgAvatar profile={profile} size={72} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 34, fontWeight: 800, color: tokens.ink, letterSpacing: "-0.02em" }}>
                  {profile.displayName}
                </span>
                {filterLabel ? (
                  <FilterPill label={filterLabel} accent={tokens.accent} panel={tokens.panel} />
                ) : null}
              </div>
              <span style={{ fontSize: 16, fontWeight: 600, color: tokens.muted }}>
                {`cins.vn/${profile.slug}`}
              </span>
              <StatsInline profile={profile} ink={tokens.ink} muted={tokens.muted} />
            </div>
          </div>
          <OgBrand logoUrl={logoUrl} ink={tokens.ink} />
        </div>
        <div style={{ display: "flex", flex: 1, gap: 12 }}>
          <div style={{ flexGrow: 2, display: "flex" }}>
            <OgGalleryThumb src={cells[0] || null} radius={18} />
          </div>
          <div style={{ flexGrow: 1, display: "flex" }}>
            <OgGalleryThumb src={cells[1] || null} radius={18} />
          </div>
          <div style={{ flexGrow: 1, display: "flex" }}>
            <OgGalleryThumb src={cells[2] || null} radius={18} />
          </div>
          <div style={{ flexGrow: 1, display: "flex" }}>
            <OgGalleryThumb src={cells[3] || null} radius={18} />
          </div>
        </div>
      </div>
    </ThemeShell>
  );
}

function PanelLayout({
  profile,
  tokens,
  filterLabel,
}: {
  profile: JourneyShareProfile;
  tokens: ShareOgThemeTokens;
  filterLabel?: string | null;
}) {
  const cells = padThumbs(profile.galleryThumbs, 5);
  return (
    <ThemeShell tokens={tokens} padding={28}>
      <div style={{ position: "relative", display: "flex", width: "100%", height: "100%", gap: 22 }}>
        <div
          style={{
            width: 280,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            padding: 28,
            borderRadius: 24,
            background: tokens.panel,
            flexShrink: 0,
          }}
        >
          <OgAvatar profile={profile} size={96} />
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: tokens.ink,
              textAlign: "center",
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}
          >
            {profile.displayName}
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, color: tokens.muted }}>
            {`cins.vn/${profile.slug}`}
          </span>
          {filterLabel ? (
            <FilterPill label={filterLabel} accent={tokens.accent} panel="rgba(255,255,255,0.9)" />
          ) : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 14 }}>
          <StatsInline profile={profile} ink={tokens.ink} muted={tokens.muted} />
          <div style={{ display: "flex", flex: 1, gap: 12 }}>
            <div style={{ flexGrow: 2, display: "flex" }}>
              <OgGalleryThumb src={cells[0] || null} radius={16} />
            </div>
            <div style={{ width: 160, display: "flex" }}>
              <OgGalleryThumb src={cells[1] || null} radius={16} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 12 }}>
              <div style={{ flex: 1, display: "flex" }}>
                <OgGalleryThumb src={cells[2] || null} radius={14} />
              </div>
              <div style={{ flex: 1, display: "flex", gap: 12 }}>
                <div style={{ flex: 1, display: "flex" }}>
                  <OgGalleryThumb src={cells[3] || null} radius={14} />
                </div>
                <div style={{ flex: 1, display: "flex" }}>
                  <OgGalleryThumb src={cells[4] || null} radius={14} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ThemeShell>
  );
}

function SidebarLayout({
  profile,
  tokens,
  filterLabel,
}: {
  profile: JourneyShareProfile;
  tokens: ShareOgThemeTokens;
  filterLabel?: string | null;
}) {
  const cells = padThumbs(profile.galleryThumbs, 5);
  return (
    <ThemeShell tokens={tokens} padding={28}>
      <div style={{ position: "relative", display: "flex", width: "100%", height: "100%", gap: 22 }}>
        <div
          style={{
            width: 300,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            padding: "28px 24px",
            background: "transparent",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <OgAvatar profile={profile} size={88} />
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: tokens.ink,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}
          >
            {profile.displayName}
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: tokens.accent }}>
            {`cins.vn/${profile.slug}`}
          </span>
          {filterLabel ? (
            <FilterPill label={filterLabel} accent={tokens.accent} panel="rgba(255,255,255,0.9)" />
          ) : null}
          <StatsPair profile={profile} tokens={tokens} />
        </div>
        <div style={{ display: "flex", flex: 1, gap: 12 }}>
          <div style={{ flexGrow: 2, display: "flex" }}>
            <OgGalleryThumb src={cells[0] || null} radius={16} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 12 }}>
            <div style={{ flexGrow: 2, display: "flex" }}>
              <OgGalleryThumb src={cells[1] || null} radius={14} />
            </div>
            <div style={{ flex: 1, display: "flex", gap: 12 }}>
              <div style={{ flex: 1, display: "flex" }}>
                <OgGalleryThumb src={cells[2] || null} radius={12} />
              </div>
              <div style={{ flex: 1, display: "flex" }}>
                <OgGalleryThumb src={cells[3] || null} radius={12} />
              </div>
              <div style={{ flex: 1, display: "flex" }}>
                <OgGalleryThumb src={cells[4] || null} radius={12} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ThemeShell>
  );
}

function FilmLayout({
  profile,
  tokens,
  logoUrl,
  filterLabel,
}: {
  profile: JourneyShareProfile;
  tokens: ShareOgThemeTokens;
  logoUrl: string;
  filterLabel?: string | null;
}) {
  const cells = padThumbs(profile.galleryThumbs, 4);
  return (
    <ThemeShell tokens={tokens} padding={36}>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <OgAvatar profile={profile} size={64} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: tokens.ink, letterSpacing: "-0.02em" }}>
                  {profile.displayName}
                </span>
                {filterLabel ? (
                  <FilterPill label={filterLabel} accent={tokens.accent} panel={tokens.panel} />
                ) : null}
              </div>
              <span style={{ fontSize: 16, fontWeight: 600, color: tokens.muted }}>
                {`cins.vn/${profile.slug}`}
              </span>
            </div>
          </div>
          <OgBrand logoUrl={logoUrl} ink={tokens.ink} />
        </div>
        <div style={{ display: "flex", flex: 1, gap: 14 }}>
          {cells.map((src, i) => (
            <div key={i} style={{ flex: 1, display: "flex" }}>
              <OgGalleryThumb src={src || null} radius={18} />
            </div>
          ))}
        </div>
      </div>
    </ThemeShell>
  );
}

function StackLayout({
  profile,
  tokens,
  filterLabel,
}: {
  profile: JourneyShareProfile;
  tokens: ShareOgThemeTokens;
  filterLabel?: string | null;
}) {
  const cells = padThumbs(profile.galleryThumbs, 5);
  const offsets = [
    { x: 40, y: 20, rot: -8 },
    { x: 160, y: 8, rot: -3 },
    { x: 290, y: 0, rot: 2 },
    { x: 420, y: 10, rot: 6 },
    { x: 540, y: 28, rot: 10 },
  ];
  return (
    <ThemeShell tokens={tokens} padding={36}>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 12 }}>
          <OgAvatar profile={profile} size={68} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 34, fontWeight: 800, color: tokens.ink, letterSpacing: "-0.02em" }}>
                {profile.displayName}
              </span>
              {filterLabel ? (
                <FilterPill label={filterLabel} accent={tokens.accent} panel={tokens.panel} />
              ) : null}
            </div>
            <StatsPair profile={profile} tokens={tokens} />
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            alignSelf: "flex-start",
            gap: 10,
            padding: "10px 18px",
            borderRadius: 999,
            background: tokens.panel,
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: tokens.accent }}>
            {`cins.vn/${profile.slug}`}
          </span>
          <span style={{ fontSize: 16, color: tokens.muted }}>↗</span>
        </div>
        <div style={{ position: "relative", flex: 1, display: "flex" }}>
          {cells.map((src, i) => {
            const o = offsets[i]!;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: o.x,
                  top: o.y,
                  width: 220,
                  height: 280,
                  display: "flex",
                  transform: `rotate(${o.rot}deg)`,
                  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.22)",
                  borderRadius: 18,
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                <OgGalleryThumb src={src || null} radius={18} />
              </div>
            );
          })}
        </div>
      </div>
    </ThemeShell>
  );
}

/* ── Public API ─────────────────────────────────────────────── */

export function OgJourneyShareCard({
  profile,
  logoUrl,
  theme,
  layout = DEFAULT_SHARE_OG_LAYOUTS.journey,
}: {
  profile: JourneyShareProfile;
  logoUrl: string;
  theme?: ShareOgTheme | null;
  layout?: JourneyJourneyCardVariant;
}) {
  const tokens = resolveShareOgThemeTokens(theme, profile.slug);
  switch (layout) {
    case "frame":
      return <FrameLayout profile={profile} tokens={tokens} />;
    case "center":
      return <CenterLayout profile={profile} tokens={tokens} />;
    case "split":
      return <SplitLayout profile={profile} tokens={tokens} />;
    case "immersive":
      return <ImmersiveLayout profile={profile} tokens={tokens} />;
    case "banner":
    default:
      return <BannerLayout profile={profile} tokens={tokens} logoUrl={logoUrl} />;
  }
}

export function OgGalleryShareCard({
  profile,
  logoUrl,
  theme,
  layout = DEFAULT_SHARE_OG_LAYOUTS.gallery,
  filterLabel = null,
}: {
  profile: JourneyShareProfile;
  logoUrl: string;
  theme?: ShareOgTheme | null;
  layout?: JourneyGalleryCardVariant;
  /** Nhãn filter đang chia sẻ (Cộng đồng, Học tập, …). */
  filterLabel?: string | null;
}) {
  const tokens = resolveShareOgThemeTokens(theme, profile.slug);
  const label = filterLabel?.trim() || null;
  switch (layout) {
    case "panel":
      return <PanelLayout profile={profile} tokens={tokens} filterLabel={label} />;
    case "sidebar":
      return <SidebarLayout profile={profile} tokens={tokens} filterLabel={label} />;
    case "film":
      return (
        <FilmLayout
          profile={profile}
          tokens={tokens}
          logoUrl={logoUrl}
          filterLabel={label}
        />
      );
    case "stack":
      return <StackLayout profile={profile} tokens={tokens} filterLabel={label} />;
    case "strip":
    default:
      return (
        <StripLayout
          profile={profile}
          tokens={tokens}
          logoUrl={logoUrl}
          filterLabel={label}
        />
      );
  }
}

export function OgFallbackShareCard({
  slug,
  logoUrl,
}: {
  slug: string;
  logoUrl: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        background: "linear-gradient(125deg, #0f172a 0%, #0c4a6e 55%, #134e4a 100%)",
        fontFamily: "Be Vietnam Pro",
        color: "#ffffff",
        padding: 48,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt="CINs"
          width={48}
          height={48}
          style={{ width: 48, height: 48, borderRadius: 12 }}
        />
        <span
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "0.04em",
          }}
        >
          CINS.VN
        </span>
      </div>
      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.15,
        }}
      >
        {`Journey · ${slug}`}
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, opacity: 0.92 }}>
        Hành trình sáng tạo trên CINs
      </div>
    </div>
  );
}
