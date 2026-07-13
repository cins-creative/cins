import { ImageResponse } from "next/og";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { loadOgFonts } from "@/lib/journey/og-fonts";
import {
  OG_INK,
  OG_MUTED,
  OgBrand,
  OgCardRoot,
  OgCoverFrame,
  OgEyebrow,
  OgUrlPill,
} from "@/lib/og/og-card-kit";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Cộng đồng nghề sáng tạo tại Việt Nam trên CINs";

function siteOrigin(): string {
  return getConfiguredSiteOrigin() ?? "https://cins.vn";
}

export default async function Image() {
  const origin = siteOrigin();
  const logoUrl = `${origin}/assets/logo-cins-64.png`;
  const fonts = await loadOgFonts();

  return new ImageResponse(
    (
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
          <OgBrand logoUrl={logoUrl} />

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 20,
            }}
          >
            <OgEyebrow label="Cộng đồng" />
            <div
              style={{
                fontSize: 62,
                fontWeight: 800,
                color: OG_INK,
                lineHeight: 1.02,
                letterSpacing: "-0.025em",
              }}
            >
              Cộng đồng nghề sáng tạo
            </div>
            <div
              style={{
                fontSize: 24,
                lineHeight: 1.4,
                color: "#334155",
                display: "flex",
                maxWidth: 620,
              }}
            >
              Thảo luận, chia sẻ kinh nghiệm và kết nối người trong ngành sáng tạo
              thị giác tại Việt Nam.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <OgUrlPill>cins.vn/cong-dong</OgUrlPill>
            <span style={{ fontSize: 16, color: OG_MUTED, fontWeight: 600 }}>
              Ngành sáng tạo thị giác
            </span>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <OgCoverFrame src={null} fallbackLabel="CINs" />
        </div>
      </OgCardRoot>
    ),
    { ...size, fonts },
  );
}
