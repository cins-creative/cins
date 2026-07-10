import type { ReactNode } from "react";

import { NgheArticleToc } from "@/components/article/nghe/NgheArticleToc";
import { NgheMainContentTabs } from "@/components/article/nghe/NgheMainContentTabs";

type Props = {
  header: ReactNode;
  /** Card nội dung chính (lead). */
  content: ReactNode;
  /** Khối liên quan lớn — nằm dưới nội dung trong cột chính. */
  contentExtra?: ReactNode;
  discussion: ReactNode;
  /** Rail phải — danh sách liên quan gọn + CTA. */
  sidebar?: ReactNode;
  /** Bật mục lục trái trong tab Nội dung. */
  showToc?: boolean;
  pageClassName?: string;
};

/** Khung trang nội dung — hero + tab nội dung/thảo luận + rail. */
export function EntityArticleLayout({
  header,
  content,
  contentExtra,
  discussion,
  sidebar,
  showToc = true,
  pageClassName = "",
}: Props) {
  const reading = (
    <div className={`ent-reading${showToc ? "" : " ent-reading--no-toc"}`}>
      {showToc ? <NgheArticleToc /> : null}
      <div className="ent-reading-body">
        {content}
        {contentExtra}
      </div>
    </div>
  );

  return (
    <article className={["ent-page", pageClassName.trim()].filter(Boolean).join(" ")}>
      <div className="ent-shell">
        {header}
        <div className="ent-grid">
          <div className="ent-primary">
            <NgheMainContentTabs content={reading} discussion={discussion} />
          </div>
          {sidebar ? <aside className="ent-rail article-side">{sidebar}</aside> : null}
        </div>
      </div>
    </article>
  );
}
