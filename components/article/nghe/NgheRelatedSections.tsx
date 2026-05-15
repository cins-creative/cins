import { NgheRelCard, NgheRelTile } from "@/components/article/nghe/NgheRelParts";
import type { ArticleCard } from "@/lib/articles/types";

function sectionNum(base: number): string {
  return String(base).padStart(2, "0");
}

function hasSection(sections: { title: string }[], needles: string[]): boolean {
  const t = sections.map((s) => s.title.toLowerCase()).join(" ");
  return needles.some((n) => t.includes(n));
}

type Props = {
  ngheJobs: ArticleCard[];
  phanMem: ArticleCard[];
  parsedSectionCount: number;
  parsedTitles: { title: string }[];
};

export function NgheRelatedSections({
  ngheJobs,
  phanMem,
  parsedSectionCount,
  parsedTitles,
}: Props) {
  const showJobs =
    ngheJobs.length > 0 &&
    !hasSection(parsedTitles, ["công việc", "việc liên quan", "vị trí"]);
  const showSw =
    phanMem.length > 0 &&
    !hasSection(parsedTitles, ["phần mềm", "phan mem", "software"]);

  let n = parsedSectionCount;

  return (
    <>
      {showJobs ? (
        <section>
          <h2 className="section-h">
            <span className="num">{sectionNum(++n)}</span>
            Vị trí công việc liên quan
          </h2>
          <div className="job-grid">
            {ngheJobs.map((card, i) => (
              <NgheRelCard
                key={card.id}
                card={card}
                tipClass={
                  i === ngheJobs.length - 1 && ngheJobs.length > 2
                    ? "tip-right"
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {showSw ? (
        <section>
          <h2 className="section-h">
            <span className="num">{sectionNum(++n)}</span>
            Phần mềm sử dụng
          </h2>
          <div className="sw-row">
            {phanMem.map((card, i) => (
              <NgheRelTile
                key={card.id}
                card={card}
                tipClass={
                  i === phanMem.length - 1 && phanMem.length > 3
                    ? "tip-right"
                    : i === 0
                      ? "tip-left"
                      : undefined
                }
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
