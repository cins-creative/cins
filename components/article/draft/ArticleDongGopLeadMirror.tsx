import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Mirror DOM/CSS của `.nghe-lead-panel` trên entity page —
 * modal portal ra `body` nên cần ancestor `.arv2-nghe` + `.ent-page`.
 */
export function ArticleDongGopLeadMirror({ children, className }: Props) {
  return (
    <div
      className={["contrib-editor-lead-mirror arv2 arv2-nghe", className]
        .filter(Boolean)
        .join(" ")}
    >
      <article className="ent-page ent-page--nghe">
        <div
          className="nghe-lead-panel entity-lead-panel"
          data-rich-lead-slot="true"
        >
          <div className="article-content-html">{children}</div>
        </div>
      </article>
    </div>
  );
}
