import type { ReactNode } from "react";

type Props = {
  num?: string;
  title: string;
  note?: string;
  id?: string;
  children: ReactNode;
};

/** Section liên quan trong cột nội dung — tiêu đề số + lưới thẻ. */
export function EntityRelatedSection({ num, title, note, id, children }: Props) {
  return (
    <section className="ent-section" aria-label={title}>
      <div className="ent-section-head">
        {num ? <span className="ent-section-num">{num}</span> : null}
        <h2 className="ent-section-title" id={id}>
          {title}
          {note ? <em>{note}</em> : null}
        </h2>
      </div>
      {children}
    </section>
  );
}
