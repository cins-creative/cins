import { NgheRelCard } from "@/components/article/nghe/NgheRelParts";
import type { ArticleCard } from "@/lib/articles/types";

type Props = {
  nganh: ArticleCard[];
  sectionNum: number;
};

export function KeywordNganhSection({ nganh, sectionNum }: Props) {
  if (!nganh.length) return null;
  const num = String(sectionNum).padStart(2, "0");
  return (
    <section>
      <h2 className="section-h">
        <span className="num">{num}</span>
        Phổ biến trong ngành
      </h2>
      <div className="job-grid kw-nganh-grid">
        {nganh.map((card, i) => (
          <NgheRelCard
            key={card.id}
            card={card}
            tipClass={
              i === nganh.length - 1 && nganh.length > 2 ? "tip-right" : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}
