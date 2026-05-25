import { NgheRelCard } from "@/components/article/nghe/NgheRelParts";
import {
  NGHE_COURSE_CARDS,
  type StaticRelCardData,
} from "@/components/article/nghe/static/nghe-static-data";
import { StaticRelCard } from "@/components/article/nghe/static/NgheStaticParts";
import type { ArticleCard } from "@/lib/articles/types";

type Props = {
  courses: ArticleCard[];
  /** Số hiển thị trong `.section-h .num` (mặc định 01). */
  sectionNum?: string;
};

export function MonHocCoursesSection({
  courses,
  sectionNum = "01",
}: Props) {
  const useDb = courses.length > 0;

  return (
    <section aria-labelledby="mon-hoc-courses-heading">
      <h2 className="section-h" id="mon-hoc-courses-heading">
        <span className="num">{sectionNum}</span>
        Các khóa học liên quan
      </h2>
      <div className="job-grid">
        {useDb
          ? courses.map((card, i) => (
              <NgheRelCard
                key={card.id}
                card={card}
                tipClass={i % 3 === 2 ? "tip-right" : "tip-left"}
              />
            ))
          : NGHE_COURSE_CARDS.map((card: StaticRelCardData) => (
              <StaticRelCard key={card.name} item={card} />
            ))}
      </div>
    </section>
  );
}
