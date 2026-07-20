import type { MetadataRoute } from "next";

import { seoSiteOrigin } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  const origin = seoSiteOrigin();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/auth/",
          "/login",
          "/dang-ky",
          "/settings",
          "/settings/",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
