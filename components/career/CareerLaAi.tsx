import type { NgheNghiepRow } from "@/lib/career/types";

type Props = {
  nghe: NgheNghiepRow;
  html: string | undefined;
  illuUrl: string | null | undefined;
};

export function CareerLaAi({ nghe, html, illuUrl }: Props) {
  const titleEng = nghe.title_eng ?? "";
  if (!html?.trim() && !illuUrl) return null;

  return (
    <section
      className="career-section career-surface"
      aria-labelledby="career-la-ai-title"
    >
      <h2 id="career-la-ai-title" className="cins-h2 career-section-title">
        {titleEng} là ai?
      </h2>
      <div className="career-la-ai-grid">
        <div className="career-la-ai-copy">
          {html?.trim() ? (
            <div
              className="cins-rich-text cins-body"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : null}
        </div>
        {illuUrl ? (
          <div className="career-la-ai-img-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={illuUrl}
              alt=""
              className="career-la-ai-img"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
