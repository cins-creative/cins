import {
  OG_ACCENT,
  OG_INK,
  OG_MUTED,
  OgBrand,
  OgCardRoot,
  OgCoverFrame,
  OgEyebrow,
  OgFloatingPill,
  OgUrlPill,
} from "@/lib/og/og-card-kit";

export type CongDongOgContext = {
  title: string;
  linhVucLabel: string | null;
  summary: string | null;
  coverUrl: string | null;
  avatarUrl: string | null;
  location: string | null;
  soThanhVien: number;
  soBaiViet: number;
  verified: boolean;
  slug: string;
};

function formatCount(n: number): string {
  return n.toLocaleString("vi-VN");
}

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span
        style={{
          fontSize: 40,
          fontWeight: 800,
          color: OG_ACCENT,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
        }}
      >
        {formatCount(value)}
      </span>
      <span style={{ fontSize: 17, fontWeight: 600, color: OG_MUTED }}>{label}</span>
    </div>
  );
}

function CommunityLogo({ src }: { src: string | null }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={84}
      height={84}
      style={{
        width: 84,
        height: 84,
        borderRadius: "50%",
        objectFit: "cover",
        border: "4px solid #ffffff",
        boxShadow: "0 10px 26px rgba(15, 23, 42, 0.18)",
        flexShrink: 0,
      }}
    />
  );
}

/** OG card động cho cộng đồng nghề (`/cong-dong/[slug]`). */
export function CongDongOgShareCard({
  ctx,
  logoUrl,
}: {
  ctx: CongDongOgContext;
  logoUrl: string;
}) {
  return (
    <OgCardRoot>
      <div
        style={{
          flex: 1.5,
          display: "flex",
          flexDirection: "column",
          padding: "50px 30px 44px 58px",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <OgBrand logoUrl={logoUrl} />
          {ctx.verified ? (
            <OgFloatingPill>✓ Đã xác minh</OgFloatingPill>
          ) : ctx.location ? (
            <OgFloatingPill>{ctx.location}</OgFloatingPill>
          ) : null}
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <OgEyebrow label="Cộng đồng" />

          <div style={{ display: "flex", alignItems: "center", gap: 22, maxWidth: 640 }}>
            <CommunityLogo src={ctx.avatarUrl} />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: ctx.title.length > 26 ? 46 : 56,
                  fontWeight: 800,
                  color: OG_INK,
                  lineHeight: 1.03,
                  letterSpacing: "-0.025em",
                }}
              >
                {ctx.title}
              </div>
              {ctx.linhVucLabel ? (
                <div style={{ fontSize: 23, fontWeight: 600, color: OG_MUTED }}>
                  {ctx.linhVucLabel}
                </div>
              ) : null}
            </div>
          </div>

          {ctx.summary ? (
            <div
              style={{
                fontSize: 21,
                lineHeight: 1.4,
                color: "#334155",
                display: "flex",
                maxWidth: 640,
              }}
            >
              {ctx.summary}
            </div>
          ) : null}

          <div style={{ display: "flex", alignItems: "center", gap: 44, marginTop: 6 }}>
            <StatBlock value={ctx.soThanhVien} label="thành viên" />
            <StatBlock value={ctx.soBaiViet} label="bài viết" />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <OgUrlPill>cins.vn/cong-dong/{ctx.slug}</OgUrlPill>
          <span style={{ fontSize: 16, color: OG_MUTED, fontWeight: 600 }}>
            Cộng đồng nghề sáng tạo
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", position: "relative" }}>
        <OgCoverFrame src={ctx.coverUrl} />
      </div>
    </OgCardRoot>
  );
}
