import type { MainContent } from "@/lib/career/types";

import { VideoEmbed } from "./VideoEmbed";

type Props = {
  titleEng: string;
  mainContent: MainContent | null;
  showreelUrl: string | null;
};

export function WorkSection({ titleEng, mainContent, showreelUrl }: Props) {
  const rawItems = mainContent?.cong_viec;
  const sorted = rawItems?.length
    ? [...rawItems].sort((a, b) => a.thu_tu - b.thu_tu)
    : [];

  if (!sorted.length && !showreelUrl) return null;

  return (
    <section
      className="career-section career-surface"
      aria-labelledby={sorted.length ? "career-work-title" : undefined}
    >
      {showreelUrl ? (
        <VideoEmbed url={showreelUrl} title={`Showreel ${titleEng}`} />
      ) : null}
      {sorted.length > 0 ? (
        <>
          <h2 id="career-work-title" className="cins-h2 career-section-title">
            Công việc của {titleEng}
          </h2>
          <div className="career-work-list">
            {sorted.map((w) => (
              <article key={w.thu_tu} className="career-work-item">
                <h3 className="career-work-item-title">
                  <span className="career-work-num">{w.thu_tu}.</span>{" "}
                  {w.tieu_de}
                </h3>
                <div
                  className="cins-rich-text cins-body"
                  dangerouslySetInnerHTML={{ __html: w.noi_dung }}
                />
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
