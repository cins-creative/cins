import {
  OG_INK,
  OG_MUTED,
  OgBrand,
  OgCardRoot,
  OgCoverFrame,
  OgEyebrow,
  OgUrlPill,
} from "@/lib/og/og-card-kit";

export type PostOgContext = {
  title: string;
  summary: string | null;
  coverUrl: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  dateLabel: string | null;
  ownerSlug: string;
  postSlug: string;
};

function AuthorRow({
  name,
  avatarUrl,
  dateLabel,
}: {
  name: string;
  avatarUrl: string | null;
  dateLabel: string | null;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          width={48}
          height={48}
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            objectFit: "cover",
            border: "3px solid #ffffff",
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.16)",
          }}
        />
      ) : (
        <div
          style={{
            width: 48,
            height: 48,
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
      <span style={{ fontSize: 23, fontWeight: 700, color: OG_INK }}>{name}</span>
      {dateLabel ? (
        <span style={{ fontSize: 20, fontWeight: 600, color: OG_MUTED }}>
          · {dateLabel}
        </span>
      ) : null}
    </div>
  );
}

/** OG card động cho bài viết người dùng (`/[slug]/p/[postSlug]`). */
export function PostOgShareCard({
  ctx,
  logoUrl,
}: {
  ctx: PostOgContext;
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
        <OgBrand logoUrl={logoUrl} />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 18,
          }}
        >
          <OgEyebrow label="Bài viết" />

          <div
            style={{
              fontSize: ctx.title.length > 34 ? 48 : 58,
              fontWeight: 800,
              color: OG_INK,
              lineHeight: 1.04,
              letterSpacing: "-0.025em",
              display: "flex",
              maxWidth: 640,
            }}
          >
            {ctx.title}
          </div>

          <AuthorRow
            name={ctx.authorName}
            avatarUrl={ctx.authorAvatarUrl}
            dateLabel={ctx.dateLabel}
          />

          {ctx.summary ? (
            <div
              style={{
                fontSize: 22,
                lineHeight: 1.42,
                color: "#334155",
                display: "flex",
                maxWidth: 640,
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
          <OgUrlPill>
            cins.vn/{ctx.ownerSlug}/p/{ctx.postSlug}
          </OgUrlPill>
          <span style={{ fontSize: 16, color: OG_MUTED, fontWeight: 600 }}>
            Hành trình sáng tạo
          </span>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", position: "relative" }}>
        <OgCoverFrame src={ctx.coverUrl} />
      </div>
    </OgCardRoot>
  );
}
