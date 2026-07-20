import { getConfiguredSiteOrigin } from "@/lib/auth/auth-origin";

/** Origin public cố định — SEO / sitemap / JSON-LD. */
export function seoSiteOrigin(): string {
  return getConfiguredSiteOrigin() ?? "https://cins.vn";
}

/** Absolute URL từ path bắt đầu bằng `/`. */
export function seoAbsoluteUrl(path: string): string {
  const origin = seoSiteOrigin();
  if (!path) return origin;
  return path.startsWith("http")
    ? path
    : `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
