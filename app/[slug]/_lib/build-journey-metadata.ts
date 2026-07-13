import type { Metadata } from "next";

import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";
import {
  fetchOgShareContext,
  type OgShareKind,
} from "@/lib/journey/og-share-fetch";
import type { ShareOgTheme } from "@/lib/journey/share-og-theme";

function ogKindFromSearch(view: string | undefined): OgShareKind {
  return view === "gallery" ? "gallery" : "journey";
}

/**
 * Token phiên bản OG suy ra từ theme đang active. Đổi theme → URL ảnh OG đổi
 * theo, buộc Facebook/Zalo/… refetch ảnh mới thay vì dùng bản đã cache.
 */
function ogThemeVersion(theme: ShareOgTheme | null | undefined): string | null {
  if (!theme) return null;
  if (theme.kind === "custom") {
    return `c${theme.imageId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}`;
  }
  return `p${theme.id}`;
}

/** Metadata journey/gallery — nhận giá trị đã resolve, không nhận Promise params. */
export async function buildJourneyMetadata(
  slug: string,
  view?: string,
): Promise<Metadata> {
  const kind = ogKindFromSearch(view);
  const ctx = await fetchOgShareContext(slug, kind);
  const siteOrigin = getConfiguredSiteOrigin() ?? "https://cins.vn";
  const pagePath =
    kind === "gallery"
      ? `/${encodeURIComponent(slug)}?view=gallery`
      : `/${encodeURIComponent(slug)}`;

  const title = ctx
    ? `${ctx.displayTitle} · CINS`
    : `Journey · ${slug} · CINS`;
  const description =
    ctx?.description ?? `Hành trình sáng tạo của ${slug} trên CINS.`;

  const ogBase =
    kind === "gallery"
      ? `/${encodeURIComponent(slug)}/opengraph-image?view=gallery`
      : `/${encodeURIComponent(slug)}/opengraph-image`;
  const themeVersion = ctx ? ogThemeVersion(ctx.theme) : null;
  const ogImagePath = themeVersion
    ? `${ogBase}${ogBase.includes("?") ? "&" : "?"}v=${themeVersion}`
    : ogBase;

  return {
    metadataBase: new URL(siteOrigin),
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: pagePath,
      siteName: "CINs",
      locale: "vi_VN",
      type: "profile",
      // Ghi rõ kích thước + type: khi override images thủ công, Next không tự
      // thêm og:image:width/height nữa. Thiếu chúng khiến Zalo/một số crawler
      // không dựng được card (Facebook thì tự đo nên vẫn hiện).
      images: [
        {
          url: ogImagePath,
          alt: title,
          width: 1200,
          height: 630,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: ogImagePath, alt: title, width: 1200, height: 630 }],
    },
  };
}
