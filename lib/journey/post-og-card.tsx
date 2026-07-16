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

/**
 * OG ảnh bài viết (`/[slug]/p/[postSlug]`).
 * Chỉ full-bleed thumbnail — title/author nằm ở meta `og:title` / `og:description`
 * mà MXH hiện dưới card, không nhúng vào ảnh.
 */
export function PostOgShareCard({
  ctx,
  logoUrl,
}: {
  ctx: PostOgContext;
  logoUrl: string;
}) {
  if (ctx.coverUrl) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#0f172a",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ctx.coverUrl}
          alt=""
          width={1200}
          height={630}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      </div>
    );
  }

  /* Không có cover — nền tối tối giản; text meta vẫn đủ cho crawler. */
  return (
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
        background: "linear-gradient(145deg, #0f172a 0%, #1e293b 55%, #0f172a 100%)",
        color: "#f8fafc",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt="CINs"
        width={56}
        height={56}
        style={{ width: 56, height: 56, borderRadius: 14 }}
      />
      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          maxWidth: 900,
          textAlign: "center",
          lineHeight: 1.2,
          display: "flex",
        }}
      >
        {ctx.title}
      </div>
    </div>
  );
}
