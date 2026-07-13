import type { NgheOgContext } from "@/lib/articles/nghe-og-fetch";
import {
  OG_INK,
  OG_MUTED,
  OgBrand,
  OgCardRoot,
  OgCoverFrame,
  OgEyebrow,
  OgFloatingPill,
  OgUrlPill,
} from "@/lib/og/og-card-kit";

/**
 * OG card động cho bài `nghe` — nền sáng CINs, khối trang trí thương hiệu,
 * cột trái nội dung (lĩnh vực) + cột phải khung ảnh minh hoạ.
 */
export function NgheOgShareCard({
  ctx,
  slug,
  logoUrl,
}: {
  ctx: NgheOgContext;
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
          {ctx.linhVuc ? <OgFloatingPill>{ctx.linhVuc}</OgFloatingPill> : null}
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
          <OgEyebrow label="Nghề nghiệp" />

          <div
            style={{
              fontSize: ctx.title.length > 28 ? 56 : 66,
              fontWeight: 800,
              color: OG_INK,
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
            }}
          >
            {ctx.title}
          </div>

          {ctx.subtitle ? (
            <div style={{ fontSize: 26, fontWeight: 600, color: OG_MUTED }}>
              {ctx.subtitle}
            </div>
          ) : null}

          {ctx.summary ? (
            <div
              style={{
                fontSize: 22,
                lineHeight: 1.42,
                color: "#334155",
                display: "flex",
                maxWidth: 620,
              }}
            >
              {ctx.summary}
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
          <OgUrlPill>cins.vn/nghe-nghiep/{slug}</OgUrlPill>
          <span style={{ fontSize: 16, color: OG_MUTED, fontWeight: 600 }}>
            Ngành sáng tạo thị giác
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", position: "relative" }}>
        <OgCoverFrame src={ctx.coverUrl} />
      </div>
    </OgCardRoot>
  );
}
