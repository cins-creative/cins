import type { MetadataRoute } from "next";

import {
  CO_SO_DAO_TAO_HUB_PATH,
  NGANH_HOC_HUB_PATH,
  NGHE_NGHIEP_HUB_PATH,
  TIM_KHOA_HOC_HUB_PATH,
} from "@/lib/cins/hubPaths";
import { listPublishedArticlesForSitemap } from "@/lib/seo/sitemap-articles";
import { seoAbsoluteUrl, seoSiteOrigin } from "@/lib/seo/site";

const STATIC_HUBS: ReadonlyArray<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: NGHE_NGHIEP_HUB_PATH, changeFrequency: "weekly", priority: 0.9 },
  { path: NGANH_HOC_HUB_PATH, changeFrequency: "weekly", priority: 0.9 },
  { path: CO_SO_DAO_TAO_HUB_PATH, changeFrequency: "weekly", priority: 0.8 },
  { path: TIM_KHOA_HOC_HUB_PATH, changeFrequency: "weekly", priority: 0.8 },
  { path: "/ho-tro", changeFrequency: "monthly", priority: 0.4 },
  { path: "/ho-tro/huong-dan", changeFrequency: "weekly", priority: 0.45 },
  { path: "/termandservice", changeFrequency: "yearly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = seoSiteOrigin();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_HUBS.map((h) => ({
    url: seoAbsoluteUrl(h.path),
    lastModified: now,
    changeFrequency: h.changeFrequency,
    priority: h.priority,
  }));

  const articles = await listPublishedArticlesForSitemap();
  const seen = new Set(staticEntries.map((e) => e.url));
  const articleEntries: MetadataRoute.Sitemap = [];

  for (const a of articles) {
    const url = a.path.startsWith("http")
      ? a.path
      : `${origin}${a.path.startsWith("/") ? a.path : `/${a.path}`}`;
    if (seen.has(url)) continue;
    seen.add(url);
    articleEntries.push({
      url,
      lastModified: a.lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return [...staticEntries, ...articleEntries];
}
