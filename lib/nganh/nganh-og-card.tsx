import type { NganhOgContext } from "@/lib/nganh/nganh-og-fetch";
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

/**
 * OG card động cho bài `nganh_dao_tao` — nền sáng CINs, khối trang trí thương hiệu,
 * cột trái nội dung (mã ngành + khối thi) + cột phải khung ảnh minh hoạ.
 */
export function NganhOgShareCard({
  ctx,
  slug,
  logoUrl,
}: {
  ctx: NganhOgContext;
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
          {ctx.maNganh ? (
            <OgFloatingPill>Mã ngành {ctx.maNganh}</OgFloatingPill>
          ) : null}
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
          <OgEyebrow label="Ngành đào tạo" />

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

          {ctx.khoiThi.length > 0 ? (
            <div
              style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}
            >
              <span style={{ fontSize: 17, fontWeight: 600, color: OG_MUTED }}>
                Khối thi
              </span>
              {ctx.khoiThi.map((k) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "7px 15px",
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                    border: "2px solid rgba(29, 78, 216, 0.25)",
                    color: OG_ACCENT,
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {k}
                </div>
              ))}
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
          <OgUrlPill>cins.vn/nganh-hoc/{slug}</OgUrlPill>
          <span style={{ fontSize: 16, color: OG_MUTED, fontWeight: 600 }}>
            Chọn đúng ngành đại học
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", position: "relative" }}>
        <OgCoverFrame src={ctx.coverUrl} />
      </div>
    </OgCardRoot>
  );
}
