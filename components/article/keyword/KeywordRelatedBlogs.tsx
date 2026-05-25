import { NgheRelCard } from "@/components/article/nghe/NgheRelParts";
import type { ArticleCard } from "@/lib/articles/types";

type Props = {
  blogs: ArticleCard[];
  sectionNum?: number;
};

export function KeywordRelatedBlogs({ blogs, sectionNum = 2 }: Props) {
  if (!blogs.length) return null;
  const num = String(sectionNum).padStart(2, "0");
  return (
    <section aria-labelledby="kw-related-blogs-title">
      <h2 id="kw-related-blogs-title" className="section-h">
        <span className="num">{num}</span>
        Bài viết liên quan
      </h2>
      <div className="job-grid">
        {blogs.slice(0, 3).map((b, i) => (
          <NgheRelCard
            key={b.id}
            card={b}
            tipClass={
              i === blogs.length - 1 && blogs.length > 2 ? "tip-right" : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}
