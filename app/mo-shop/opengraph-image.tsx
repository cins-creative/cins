import { ImageResponse } from "next/og";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { getPhiDangApDungShop } from "@/lib/billing/phi-chinh-sach";
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
export const alt = "CINs dựng shop hộ bạn";
export const runtime = "nodejs";

function siteOrigin(): string {
  return getConfiguredSiteOrigin() ?? "https://cins.vn";
}

export default async function Image() {
  const origin = siteOrigin();
  const logoUrl = `${origin}/assets/logo-cins-64.png`;
  const [fonts, phi] = await Promise.all([
    loadOgFonts(),
    getPhiDangApDungShop(),
  ]);

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
            <OgEyebrow label="Mở shop" />
            <div
              style={{
                fontSize: 54,
                fontWeight: 800,
                color: OG_INK,
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
              }}
            >
              Gửi link hàng — CINs dựng shop hộ bạn
            </div>
            <div
              style={{
                fontSize: 22,
                lineHeight: 1.4,
                color: "#334155",
                display: "flex",
                maxWidth: 620,
              }}
            >
              {phi.tyLePercent}% phí · Tiền vào thẳng STK của bạn · Không public
              trước khi bạn duyệt
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <OgUrlPill>cins.vn/mo-shop</OgUrlPill>
            <span style={{ fontSize: 16, color: OG_MUTED, fontWeight: 600 }}>
              Shop của bạn
            </span>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <OgCoverFrame src={null} fallbackLabel="Shop" />
        </div>
      </OgCardRoot>
    ),
    { ...size, fonts },
  );
}
