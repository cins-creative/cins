import Link from "next/link";

import type { RelatedCareerCard } from "@/lib/career/types";

type Props = {
  related: RelatedCareerCard[];
  lienQuanHtml: string | undefined;
};

export function RelatedCareers({ related, lienQuanHtml }: Props) {
  if (!related.length && !lienQuanHtml?.trim()) return null;

  return (
    <section
      className="career-section career-surface"
      aria-labelledby="career-related-title"
    >
      <h2 id="career-related-title" className="cins-h2 career-section-title">
        Các vị trí công việc liên quan
      </h2>
      {related.length > 0 ? (
        <ul className="career-related-grid">
          {related.map((r) => {
            const label = r.title_eng ?? r.title_vietnam ?? r.slug;
            return (
              <li key={r.id}>
                <Link href={`/nghe-nghiep/${r.slug}`} className="career-related-card">
                  <div className="career-related-thumb">
                    {r.thumbnail_mascot ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.thumbnail_mascot}
                        alt=""
                        width={120}
                        height={120}
                        className="career-related-img"
                      />
                    ) : (
                      <div
                        className="career-related-ph"
                        style={{
                          background:
                            "linear-gradient(135deg, var(--cins-blue-soft), var(--cins-violet-soft))",
                        }}
                      />
                    )}
                  </div>
                  <span className="career-related-label">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
      {lienQuanHtml?.trim() ? (
        <div
          className="cins-rich-text cins-body career-related-text"
          dangerouslySetInnerHTML={{ __html: lienQuanHtml }}
        />
      ) : null}
    </section>
  );
}
