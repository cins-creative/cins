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

export type KhoaHocOgContext = {
  title: string;
  orgTen: string;
  orgAvatarUrl: string | null;
  summary: string | null;
  coverUrl: string | null;
  moHinhLabel: string;
  trinhDoLabel: string;
  hinhThucLabel: string | null;
  hocPhiLabel: string;
  hocPhiSuffix: string;
  thoiLuongLabel: string | null;
  trangThaiLabel: string;
  trangThaiTone: "open" | "soon" | "pause";
  orgSlug: string;
  khoaSlug: string;
};

const TONE_DOT: Record<KhoaHocOgContext["trangThaiTone"], string> = {
  open: "#10b981",
  soon: "#f59e0b",
  pause: "#94a3b8",
};

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: KhoaHocOgContext["trangThaiTone"];
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 20px",
        borderRadius: 999,
        background: "#ffffff",
        border: "2px solid rgba(15, 23, 42, 0.10)",
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.10)",
        color: OG_INK,
        fontSize: 18,
        fontWeight: 700,
      }}
    >
      <div
        style={{
          width: 13,
          height: 13,
          borderRadius: "50%",
          background: TONE_DOT[tone],
        }}
      />
      {label}
    </div>
  );
}

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

function OrgRow({ ten, avatarUrl }: { ten: string; avatarUrl: string | null }) {
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
            background: "linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)",
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

/** OG card động cho khóa học (`/co-so/[org]/khoa-hoc/[slug]`). */
export function KhoaHocOgShareCard({
  ctx,
  logoUrl,
}: {
  ctx: KhoaHocOgContext;
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
          <StatusPill label={ctx.trangThaiLabel} tone={ctx.trangThaiTone} />
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
          <OgEyebrow label="Khóa học" />

          <div
            style={{
              fontSize: ctx.title.length > 30 ? 48 : 58,
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

          <OrgRow ten={ctx.orgTen} avatarUrl={ctx.orgAvatarUrl} />

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

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
            <SoftChip>{ctx.moHinhLabel}</SoftChip>
            <SoftChip>{ctx.trinhDoLabel}</SoftChip>
            {ctx.hinhThucLabel ? <SoftChip>{ctx.hinhThucLabel}</SoftChip> : null}
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: 4 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: OG_MUTED }}>
                Học phí
              </span>
              <span
                style={{
                  fontSize: 34,
                  fontWeight: 800,
                  color: OG_ACCENT,
                  lineHeight: 1.1,
                }}
              >
                {ctx.hocPhiLabel}
                {ctx.hocPhiSuffix ? (
                  <span style={{ fontSize: 20, fontWeight: 700 }}>
                    {ctx.hocPhiSuffix}
                  </span>
                ) : null}
              </span>
            </div>
            {ctx.thoiLuongLabel ? (
              <span
                style={{
                  fontSize: 19,
                  fontWeight: 600,
                  color: OG_MUTED,
                  paddingBottom: 6,
                }}
              >
                · {ctx.thoiLuongLabel}
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
          <OgUrlPill>
            cins.vn/co-so/{ctx.orgSlug}/khoa-hoc/{ctx.khoaSlug}
          </OgUrlPill>
          <span style={{ fontSize: 16, color: OG_MUTED, fontWeight: 600 }}>
            Học nghề sáng tạo
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", position: "relative" }}>
        <OgCoverFrame src={ctx.coverUrl} />
      </div>
    </OgCardRoot>
  );
}
