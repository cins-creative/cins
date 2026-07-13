import type { JourneyShareProfile } from "@/lib/journey/profile-share";
import {
  resolveShareOgThemeTokens,
  shareOgBackgroundStyle,
  type ShareOgTheme,
} from "@/lib/journey/share-og-theme";

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

function OgBrand({
  logoUrl,
  ink,
}: {
  logoUrl: string;
  ink: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt="CINs"
        width={40}
        height={40}
        style={{ width: 40, height: 40, borderRadius: 10 }}
      />
      <span
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: ink,
          letterSpacing: "0.04em",
        }}
      >
        CINS.VN
      </span>
    </div>
  );
}

function OgUrlChip({
  slug,
  accent,
  panel,
}: {
  slug: string;
  accent: string;
  panel: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 18px",
        borderRadius: 999,
        background: panel,
        color: accent,
        fontSize: 18,
        fontWeight: 700,
      }}
    >
      cins.vn/{slug}
    </div>
  );
}

/** Journey — cover cinematic + identity strip theo theme. */
export function OgJourneyShareCard({
  profile,
  logoUrl,
  theme,
}: {
  profile: JourneyShareProfile;
  logoUrl: string;
  theme?: ShareOgTheme | null;
}) {
  const tokens = resolveShareOgThemeTokens(theme, profile.slug);
  const bg = shareOgBackgroundStyle(tokens);
  const cotMoc = profile.stats?.cotMoc ?? 0;
  const tacPham = profile.stats?.tacPham ?? 0;
  const bio =
    profile.bio?.trim() ||
    "Khám phá hành trình sáng tạo — cột mốc, tác phẩm và kết nối trên CINs.";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: bg.backgroundColor,
        ...(tokens.isCustom
          ? {}
          : {
              backgroundImage: bg.backgroundImage,
              backgroundSize: bg.backgroundSize,
            }),
        color: tokens.ink,
        fontFamily: "Be Vietnam Pro",
        position: "relative",
      }}
    >
      {tokens.backgroundImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tokens.backgroundImage}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.35,
          }}
        />
      ) : null}

      <div
        style={{
          position: "relative",
          width: "100%",
          height: 320,
          overflow: "hidden",
          display: "flex",
        }}
      >
        {profile.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.coverUrl}
            alt=""
            width={1200}
            height={320}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: tokens.accent,
              opacity: 0.35,
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(180deg, transparent 30%, ${
              tokens.lightInk ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.92)"
            } 100%)`,
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "0 48px 40px",
          marginTop: -72,
          position: "relative",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-end", gap: 22 }}>
            <OgAvatar
              profile={profile}
              size={96}
              borderColor={tokens.lightInk ? "#0f172a" : "#ffffff"}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 800,
                  color: tokens.ink,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                }}
              >
                {profile.displayName}
              </div>
              {profile.roleLine ? (
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: tokens.muted,
                  }}
                >
                  {profile.roleLine}
                </div>
              ) : null}
            </div>
          </div>
          <OgUrlChip
            slug={profile.slug}
            accent={tokens.accent}
            panel={tokens.panel}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: 28,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              flex: 1,
              fontSize: 22,
              lineHeight: 1.4,
              color: tokens.ink,
              opacity: 0.92,
            }}
          >
            {bio}
          </div>
          <div
            style={{
              display: "flex",
              gap: 20,
              flexShrink: 0,
              padding: "14px 22px",
              borderRadius: 18,
              background: tokens.panel,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: tokens.accent,
                  lineHeight: 1,
                }}
              >
                {cotMoc}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: tokens.muted }}>
                Cột mốc
              </span>
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
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: tokens.accent,
                  lineHeight: 1,
                }}
              >
                {tacPham}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: tokens.muted }}>
                Tác phẩm
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <OgBrand logoUrl={logoUrl} ink={tokens.ink} />
          <span style={{ fontSize: 16, color: tokens.muted, fontWeight: 600 }}>
            Journey trên CINs
          </span>
        </div>
      </div>
    </div>
  );
}

function OgGalleryThumb({
  src,
  radius = 18,
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
        width={280}
        height={210}
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

/** Portfolio — mosaic lớn + identity theo theme. */
export function OgGalleryShareCard({
  profile,
  logoUrl,
  theme,
}: {
  profile: JourneyShareProfile;
  logoUrl: string;
  theme?: ShareOgTheme | null;
}) {
  const tokens = resolveShareOgThemeTokens(theme, profile.slug);
  const bg = shareOgBackgroundStyle(tokens);
  const tacPham = profile.stats?.tacPham ?? 0;
  const cells = [...(profile.galleryThumbs ?? []).slice(0, 4)];
  while (cells.length < 4) cells.push("");

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: bg.backgroundColor,
        ...(tokens.isCustom
          ? {}
          : {
              backgroundImage: bg.backgroundImage,
              backgroundSize: bg.backgroundSize,
            }),
        color: tokens.ink,
        fontFamily: "Be Vietnam Pro",
        padding: 36,
        position: "relative",
      }}
    >
      {tokens.backgroundImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tokens.backgroundImage}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.28,
          }}
        />
      ) : null}

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22,
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <OgAvatar profile={profile} size={68} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontSize: 34,
                fontWeight: 800,
                color: tokens.ink,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              {profile.displayName}
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: tokens.muted,
              }}
            >
              {tacPham} tác phẩm
            </div>
          </div>
        </div>
        <OgUrlChip
          slug={profile.slug}
          accent={tokens.accent}
          panel={tokens.panel}
        />
      </div>

      <div
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          gap: 14,
        }}
      >
        <div style={{ flex: 1.35, display: "flex" }}>
          <OgGalleryThumb src={cells[0] || null} radius={20} />
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ flex: 1, display: "flex" }}>
            <OgGalleryThumb src={cells[1] || null} />
          </div>
          <div style={{ flex: 1, display: "flex", gap: 14 }}>
            <div style={{ flex: 1, display: "flex" }}>
              <OgGalleryThumb src={cells[2] || null} />
            </div>
            <div style={{ flex: 1, display: "flex" }}>
              <OgGalleryThumb src={cells[3] || null} />
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          marginTop: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <OgBrand logoUrl={logoUrl} ink={tokens.ink} />
        <span style={{ fontSize: 16, color: tokens.muted, fontWeight: 600 }}>
          Portfolio trên CINs
        </span>
      </div>
    </div>
  );
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
        Journey · {slug}
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, opacity: 0.92 }}>
        Hành trình sáng tạo trên CINs
      </div>
    </div>
  );
}
