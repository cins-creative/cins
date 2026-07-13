import { ImageResponse } from "next/og";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import { loadOgFonts } from "@/lib/journey/og-fonts";
import { JobOgShareCard } from "@/lib/to-chuc/tuyen-dung-og-card";
import { fetchJobOgContext } from "@/lib/to-chuc/tuyen-dung-og-fetch";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Tin tuyển dụng ngành sáng tạo trên CINs";

type Params = Promise<{ slug: string; tab: string; jobId: string }>;

function siteOrigin(): string {
  return getConfiguredSiteOrigin() ?? "https://cins.vn";
}

export default async function Image({ params }: { params: Params }) {
  const { slug, jobId } = await params;
  const origin = siteOrigin();
  const logoUrl = `${origin}/assets/logo-cins-64.png`;

  const [ctx, fonts] = await Promise.all([
    fetchJobOgContext(slug, jobId),
    loadOgFonts(),
  ]);

  const element = ctx ? (
    <JobOgShareCard ctx={ctx} logoUrl={logoUrl} />
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
        Tuyển dụng
      </div>
      <div style={{ fontSize: 24, fontWeight: 600, color: "#64748b" }}>
        Việc làm ngành sáng tạo thị giác trên CINs
      </div>
    </div>
  );

  return new ImageResponse(element, { ...size, fonts });
}
