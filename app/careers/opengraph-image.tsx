import { ImageResponse } from "next/og";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { loadOgFonts } from "@/lib/journey/og-fonts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Khám phá nghề trên CINs";

function siteOrigin(): string {
  return getConfiguredSiteOrigin() ?? "https://cins.vn";
}

export default async function Image() {
  const origin = siteOrigin();
  const logoUrl = `${origin}/assets/logo-cins-64.png`;
  const fonts = await loadOgFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "linear-gradient(145deg, #0f1419 0%, #1a2332 55%, #243044 100%)",
          color: "#f4f6f8",
          fontFamily: "Be Vietnam Pro",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            width={56}
            height={56}
            alt=""
            style={{ borderRadius: 12 }}
          />
          <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: 0.2 }}>
            CINs
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.15,
              maxWidth: 980,
            }}
          >
            Khám phá nghề
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 400,
              lineHeight: 1.35,
              color: "#c5ced8",
              maxWidth: 900,
            }}
          >
            120+ vị trí nghề sáng tạo thị giác — mô tả, kỹ năng, lộ trình
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
