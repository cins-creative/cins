import type { JourneyShareProfile } from "@/lib/journey/profile-share";

const COLORS = {
  ink: "#0f172a",
  muted: "#64748b",
  soft: "#94a3b8",
  line: "#e2e8f0",
  panel: "#f8fafc",
  blue: "#2563eb",
  indigo: "#6366f1",
  milestone: "#d97706",
  works: "#7c3aed",
  white: "#ffffff",
};

const COVER_FALLBACK =
  "linear-gradient(125deg, #1f74c9 0%, #6366f1 38%, #06b6d4 72%, #10b981 100%)";

function OgAvatar({
  profile,
  size = 88,
}: {
  profile: JourneyShareProfile;
  size?: number;
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
          border: "4px solid #ffffff",
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
        background: "linear-gradient(135deg, #2563eb, #6366f1)",
        color: COLORS.white,
        fontSize: size * 0.34,
        fontWeight: 700,
        border: "4px solid #ffffff",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.18)",
        flexShrink: 0,
      }}
    >
      {profile.initials}
    </div>
  );
}

function OgBrand({ logoUrl }: { logoUrl: string }) {
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
          fontSize: 22,
          fontWeight: 700,
          color: COLORS.ink,
          letterSpacing: "0.04em",
        }}
      >
        CINS.VN
      </span>
    </div>
  );
}

function OgStat({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "12px 18px",
        borderRadius: 16,
        background: COLORS.white,
        border: `1px solid ${COLORS.line}`,
        minWidth: 108,
      }}
    >
      <span
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: accent,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: COLORS.muted,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function OgTag({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 18px",
        borderRadius: 999,
        background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.indigo})`,
        color: COLORS.white,
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.9)",
        }}
      />
      {label}
    </div>
  );
}

/** Journey — layout Hồ sơ (cover cinematic + strip thông tin). */
export function OgJourneyShareCard({
  profile,
  logoUrl,
}: {
  profile: JourneyShareProfile;
  logoUrl: string;
}) {
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
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        fontFamily: "Be Vietnam Pro",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 250,
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
            height={250}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: COVER_FALLBACK }} />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(15,23,42,0.12) 0%, transparent 38%), linear-gradient(0deg, rgba(248,251,255,1) 0%, rgba(248,251,255,0) 42%)",
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "0 48px 40px",
          marginTop: -44,
          position: "relative",
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
          <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
            <OgAvatar profile={profile} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  fontSize: 42,
                  fontWeight: 700,
                  color: COLORS.ink,
                  lineHeight: 1.1,
                }}
              >
                {profile.displayName}
              </div>
              {profile.roleLine ? (
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: COLORS.muted,
                  }}
                >
                  {profile.roleLine}
                </div>
              ) : null}
            </div>
          </div>
          <OgTag label="Journey" />
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            gap: 32,
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                fontSize: 22,
                lineHeight: 1.45,
                color: COLORS.ink,
              }}
            >
              {bio}
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: COLORS.blue,
                }}
              >
                cins.vn/{profile.slug}
              </span>
              {profile.locationLine ? (
                <span style={{ fontSize: 18, color: COLORS.soft }}>
                  {profile.locationLine}
                </span>
              ) : null}
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, flexShrink: 0 }}>
            <OgStat value={cotMoc} label="Cột mốc" accent={COLORS.milestone} />
            <OgStat value={tacPham} label="Tác phẩm" accent={COLORS.works} />
          </div>
        </div>

        <div
          style={{
            marginTop: "auto",
            paddingTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `1px solid ${COLORS.line}`,
          }}
        >
          <OgBrand logoUrl={logoUrl} />
          <span style={{ fontSize: 16, color: COLORS.soft, fontWeight: 600 }}>
            Hành trình sáng tạo trên CINs
          </span>
        </div>
      </div>
    </div>
  );
}

function OgGalleryThumb({ src }: { src: string | null }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={260}
        height={195}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: 16,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 16,
        background: "linear-gradient(135deg, #e2e8f0, #cbd5e1)",
      }}
    />
  );
}

/** Portfolio / Gallery — mosaic 2×2 + header hồ sơ. */
export function OgGalleryShareCard({
  profile,
  logoUrl,
}: {
  profile: JourneyShareProfile;
  logoUrl: string;
}) {
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
        background: COLORS.panel,
        fontFamily: "Be Vietnam Pro",
        padding: 40,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <OgAvatar profile={profile} size={72} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: COLORS.ink,
                lineHeight: 1.1,
              }}
            >
              {profile.displayName}
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: COLORS.muted }}>
              {tacPham} tác phẩm · cins.vn/{profile.slug}
            </div>
          </div>
        </div>
        <OgTag label="Portfolio" />
      </div>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 16,
        }}
      >
        {cells.map((src, index) => (
          <OgGalleryThumb key={index} src={src || null} />
        ))}
      </div>

      <div
        style={{
          marginTop: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <OgBrand logoUrl={logoUrl} />
        <span style={{ fontSize: 16, color: COLORS.soft, fontWeight: 600 }}>
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
        background: COVER_FALLBACK,
        fontFamily: "Be Vietnam Pro",
        color: COLORS.white,
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
            color: COLORS.white,
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
