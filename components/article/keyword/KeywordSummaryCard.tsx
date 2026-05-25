import Link from "next/link";

import { KeywordShortVideo } from "@/components/article/keyword/KeywordShortVideo";
import { articlePublicHref } from "@/lib/articles/article-href";
import type { ArticleCard } from "@/lib/articles/types";

type Props = {
  headline: string;
  summary: string | null;
  videoUrl?: string | null;
  selfSlug: string;
  selfTitle: string;
  selfTitleVi?: string | null;
  relatedKeywords: ArticleCard[];
};

export function KeywordSummaryCard({
  headline,
  summary,
  videoUrl,
  selfSlug,
  selfTitle,
  selfTitleVi,
  relatedKeywords,
}: Props) {
  const pills = [
    { label: selfTitle, href: articlePublicHref("keyword", selfSlug) },
    ...(selfTitleVi?.trim()
      ? [
          {
            label: selfTitleVi.trim(),
            href: articlePublicHref("keyword", selfSlug),
          },
        ]
      : []),
    ...relatedKeywords.slice(0, 5).map((k) => ({
      label: k.tieu_de,
      href: articlePublicHref("keyword", k.slug),
    })),
  ];
  const tags = pills.filter(
    (p, i, arr) =>
      arr.findIndex((x) => x.label.toLowerCase() === p.label.toLowerCase()) ===
      i,
  );
  const video = videoUrl?.trim() ?? "";
  const hasVideo = video.length > 0;

  return (
    <section
      className={[
        "nghe-hero-panel kw-summary-panel",
        hasVideo ? "kw-summary-panel--has-video" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label="Tổng quan keyword"
    >
      <div className="l1-hero kw-summary-inner">
        <div
          className={[
            "kw-summary-layout",
            hasVideo ? "kw-summary-layout--with-video" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="kw-summary-main">
            <span className="kicker k-keyword">Keyword</span>
            <h2 className="h-disp nghe-hero-title kw-summary-headline">
              {headline}
            </h2>
            {tags.length > 0 ? (
              <div className="kw-summary-tags" role="list">
                {tags.map((t) => (
                  <Link
                    key={t.label}
                    href={t.href}
                    className="chip-keyword"
                    role="listitem"
                  >
                    {t.label}
                  </Link>
                ))}
              </div>
            ) : null}
            {summary ? (
              <p className="h-summary kw-summary-lead">{summary}</p>
            ) : null}
          </div>

          {hasVideo ? (
            <aside
              className="kw-summary-aside"
              aria-label="Video Short YouTube"
            >
              <KeywordShortVideo url={video} />
            </aside>
          ) : null}
        </div>
      </div>
    </section>
  );
}
