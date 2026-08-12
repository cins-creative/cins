import {
  OG_ACCENT,
  OG_INK,
  OG_MUTED,
  OgBrand,
  OgCardRoot,
  OgCoverFrame,
  OgEyebrow,
  OgUrlPill,
} from "@/lib/og/og-card-kit";

export type ShopLoaiOgContext = {
  title: string;
  shopTen: string;
  shopAvatarUrl: string | null;
  sellerTen: string;
  coverUrl: string | null;
  summary: string | null;
  giaLabel: string;
  mauCountLabel: string | null;
  ownerSlug: string;
  shopSlug: string;
  nhomId: string;
};

function SoftChip({ children }: { children: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "8px 16px",
        borderRadius: 12,
        background: "rgba(15, 23, 42, 0.05)",
        color: "#334155",
        fontSize: 18,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function ShopRow({
  ten,
  avatarUrl,
}: {
  ten: string;
  avatarUrl: string | null;
}) {
  const initial = ten.trim().charAt(0).toUpperCase() || "?";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          width={46}
          height={46}
          style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            objectFit: "cover",
            border: "3px solid #ffffff",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.16)",
          }}
        />
      ) : (
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #fdad4c 0%, #f97316 100%)",
            color: "#ffffff",
            fontSize: 22,
            fontWeight: 800,
          }}
        >
          {initial}
        </div>
      )}
      <span style={{ fontSize: 23, fontWeight: 700, color: OG_MUTED }}>{ten}</span>
    </div>
  );
}

/** OG card động cho loại hàng (`/{slug}/shop/{shopSlug}/loai/{nhomId}`). */
export function ShopLoaiOgShareCard({
  ctx,
  logoUrl,
}: {
  ctx: ShopLoaiOgContext;
  logoUrl: string;
}) {
  const urlPill = `cins.vn/${ctx.ownerSlug}/shop/…/loai`;
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
          <SoftChip>Đang bán</SoftChip>
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
          <OgEyebrow label="Loại hàng" />

          <div
            style={{
              fontSize: ctx.title.length > 28 ? 46 : 56,
              fontWeight: 800,
              color: OG_INK,
              lineHeight: 1.03,
              letterSpacing: "-0.025em",
              display: "flex",
              maxWidth: 640,
            }}
          >
            {ctx.title}
          </div>

          <ShopRow ten={ctx.shopTen} avatarUrl={ctx.shopAvatarUrl} />

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

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 16,
              marginTop: 4,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: OG_MUTED }}>
                Giá
              </span>
              <span
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  color: OG_ACCENT,
                  lineHeight: 1.1,
                }}
              >
                {ctx.giaLabel}
              </span>
            </div>
            {ctx.mauCountLabel ? (
              <span
                style={{
                  fontSize: 19,
                  fontWeight: 600,
                  color: OG_MUTED,
                  paddingBottom: 6,
                }}
              >
                · {ctx.mauCountLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <OgUrlPill>{urlPill}</OgUrlPill>
          <span style={{ fontSize: 16, color: OG_MUTED, fontWeight: 600 }}>
            {ctx.sellerTen}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", position: "relative" }}>
        <OgCoverFrame src={ctx.coverUrl} fallbackLabel="Shop" />
      </div>
    </OgCardRoot>
  );
}
