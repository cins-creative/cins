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

export type OrgOgContext = {
  /** Nhãn phân loại (eyebrow): "Trường đại học" | "Cơ sở đào tạo". */
  typeLabel: string;
  /** Tên tổ chức. */
  title: string;
  /** Tên chính thức / tiếng Anh — có thể null. */
  subtitle: string | null;
  /** Mô tả ngắn đã cắt gọn. */
  summary: string | null;
  /** Mã trường / mã cơ sở — có thể null. */
  code: string | null;
  /** Nhãn cho mã: "Mã trường" | "Mã cơ sở". */
  codeLabel: string;
  /** Tỉnh/thành — có thể null. */
  location: string | null;
  /** URL ảnh cover (variant public/grid) — có thể null. */
  coverUrl: string | null;
  /** URL logo/avatar tổ chức — có thể null. */
  avatarUrl: string | null;
  /** Tiền tố path: "co-so-dao-tao" | "co-so". */
  pathPrefix: string;
  /** Dòng nhỏ góc phải chân card. */
  tagline: string;
};

function OrgLogo({ src }: { src: string | null }) {
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
        borderRadius: 20,
        objectFit: "cover",
        border: "4px solid #ffffff",
        boxShadow: "0 10px 26px rgba(15, 23, 42, 0.18)",
        flexShrink: 0,
      }}
    />
  );
}

/** OG card động cho tổ chức đào tạo (trường đại học / cơ sở đào tạo). */
export function OrgOgShareCard({
  ctx,
  slug,
  logoUrl,
}: {
  ctx: OrgOgContext;
  slug: string;
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
          {ctx.location ? <OgFloatingPill>{ctx.location}</OgFloatingPill> : null}
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 18,
          }}
        >
          <OgEyebrow label={ctx.typeLabel} />

          <div style={{ display: "flex", alignItems: "center", gap: 22, maxWidth: 640 }}>
            <OrgLogo src={ctx.avatarUrl} />
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
                  fontSize: ctx.title.length > 30 ? 46 : 56,
                  fontWeight: 800,
                  color: OG_INK,
                  lineHeight: 1.03,
                  letterSpacing: "-0.025em",
                }}
              >
                {ctx.title}
              </div>
              {ctx.subtitle ? (
                <div style={{ fontSize: 24, fontWeight: 600, color: OG_MUTED }}>
                  {ctx.subtitle}
                </div>
              ) : null}
            </div>
          </div>

          {ctx.summary ? (
            <div
              style={{
                fontSize: 22,
                lineHeight: 1.42,
                color: "#334155",
                display: "flex",
                maxWidth: 640,
              }}
            >
              {ctx.summary}
            </div>
          ) : null}

          {ctx.code ? (
            <div
              style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "7px 16px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                  border: "2px solid rgba(29, 78, 216, 0.25)",
                  color: OG_ACCENT,
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {ctx.codeLabel} {ctx.code}
              </div>
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <OgUrlPill>
            cins.vn/{ctx.pathPrefix}/{slug}
          </OgUrlPill>
          <span style={{ fontSize: 16, color: OG_MUTED, fontWeight: 600 }}>
            {ctx.tagline}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", position: "relative" }}>
        <OgCoverFrame src={ctx.coverUrl} />
      </div>
    </OgCardRoot>
  );
}
