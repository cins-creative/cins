import type { RoadmapItem } from "@/lib/career/types";

type Props = {
  titleEng: string;
  items: RoadmapItem[] | null;
};

export function RoadmapSection({ titleEng, items }: Props) {
  if (!items?.length) return null;
  const sorted = [...items].sort((a, b) => a.thu_tu - b.thu_tu);

  return (
    <section
      className="career-section career-surface"
      aria-labelledby="career-roadmap-title"
    >
      <h2 id="career-roadmap-title" className="cins-h2 career-section-title">
        Làm cách nào để trở thành {titleEng}
      </h2>
      <ol className="career-roadmap-list">
        {sorted.map((step, i) => (
          <li key={`${step.thu_tu}-${i}-${step.tieu_de}`} className="career-roadmap-item">
            <div className="career-roadmap-num" aria-hidden>
              {step.thu_tu}
            </div>
            <div className="career-roadmap-body">
              <h3 className="career-roadmap-head">{step.tieu_de}</h3>
              <div
                className="cins-rich-text cins-body"
                dangerouslySetInnerHTML={{ __html: step.noi_dung }}
              />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
