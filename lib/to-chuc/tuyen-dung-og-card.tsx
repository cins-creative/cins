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

export type JobOgContext = {
  title: string;
  orgTen: string;
  orgAvatarUrl: string | null;
  coverUrl: string | null;
  summary: string | null;
  linhVuc: string | null;
  loaiHinhLabel: string;
  capDoLabel: string | null;
  place: string;
  salary: string | null;
  deadline: string | null;
  expired: boolean;
  pathPrefix: string;
  orgSlug: string;
  jobId: string;
};

function StatusPill({ expired }: { expired: boolean }) {
  const label = expired ? "Đã hết hạn" : "Đang tuyển";
  const dot = expired ? "#94a3b8" : "#10b981";
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
      <div style={{ width: 13, height: 13, borderRadius: "50%", background: dot }} />
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

/** OG card động cho tin tuyển dụng (`/{studio|co-so}/[slug]/tuyen-dung/[jobId]`). */
export function JobOgShareCard({
  ctx,
  logoUrl,
}: {
  ctx: JobOgContext;
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
          <StatusPill expired={ctx.expired} />
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
          <OgEyebrow label="Tuyển dụng" />

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
            <SoftChip>{ctx.loaiHinhLabel}</SoftChip>
            {ctx.capDoLabel ? <SoftChip>{ctx.capDoLabel}</SoftChip> : null}
            <SoftChip>{ctx.place}</SoftChip>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: 4 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: OG_MUTED }}>
                Mức lương
              </span>
              <span
                style={{
                  fontSize: ctx.salary ? 32 : 26,
                  fontWeight: 800,
                  color: OG_ACCENT,
                  lineHeight: 1.1,
                }}
              >
                {ctx.salary ?? "Thỏa thuận"}
              </span>
            </div>
            {ctx.deadline ? (
              <span
                style={{
                  fontSize: 19,
                  fontWeight: 600,
                  color: OG_MUTED,
                  paddingBottom: 6,
                }}
              >
                · Hạn nộp {ctx.deadline}
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
            cins.vn/{ctx.pathPrefix}/{ctx.orgSlug}/tuyen-dung
          </OgUrlPill>
          <span style={{ fontSize: 16, color: OG_MUTED, fontWeight: 600 }}>
            Việc làm ngành sáng tạo
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", position: "relative" }}>
        <OgCoverFrame src={ctx.coverUrl ?? ctx.orgAvatarUrl} />
      </div>
    </OgCardRoot>
  );
}
