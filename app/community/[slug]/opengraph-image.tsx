import { ImageResponse } from "next/og";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { CongDongOgShareCard } from "@/lib/cong-dong/cong-dong-og-card";
import { fetchCongDongOgContext } from "@/lib/cong-dong/cong-dong-og-fetch";
import { loadOgFonts } from "@/lib/journey/og-fonts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Cộng đồng nghề sáng tạo trên CINs";

type Params = Promise<{ slug: string }>;

function siteOrigin(): string {
  return getConfiguredSiteOrigin() ?? "https://cins.vn";
}

export default async function Image({ params }: { params: Params }) {
  const { slug } = await params;
  const origin = siteOrigin();
  const logoUrl = `${origin}/assets/logo-cins-64.png`;

  const [ctx, fonts] = await Promise.all([
    fetchCongDongOgContext(slug),
    loadOgFonts(),
  ]);

  const element = ctx ? (
    <CongDongOgShareCard ctx={ctx} logoUrl={logoUrl} />
  ) : (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        fontFamily: "Be Vietnam Pro",
        background:
          "linear-gradient(135deg, #ffffff 0%, #f1f5f9 55%, #eff6ff 100%)",
        color: "#0f172a",
        padding: 56,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${origin}/assets/logo-cins-64.png`}
        alt="CINs"
        width={56}
        height={56}
        style={{ width: 56, height: 56, borderRadius: 14 }}
      />
      <div style={{ fontSize: 52, fontWeight: 800, textAlign: "center" }}>
        Cộng đồng nghề
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color: "#64748b" }}>
        Kết nối người trong ngành sáng tạo trên CINs
      </div>
    </div>
  );

  return new ImageResponse(element, { ...size, fonts });
}
