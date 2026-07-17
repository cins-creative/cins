import { EntityArticleHeader } from "@/components/article/entity/EntityArticleHeader";
import type { ReactNode } from "react";

const NGHE_HERO_TITLE_FALLBACK = "3D Modeller";

type Props = {
  title?: string | null;
  emLine?: string | null;
  summary?: string | null;
  linhVucLabel?: string | null;
  thumbnailUrl?: string | null;
  draftTools?: ReactNode;
  attribution?: ReactNode;
  belowInner?: ReactNode;
};

/** Header cố định trang nghề — wrapper `EntityArticleHeader`. */
export function NgheEntityHeader({
  title,
  emLine,
  summary,
  linhVucLabel,
  thumbnailUrl,
  draftTools,
  attribution,
  belowInner,
}: Props) {
  const displayTitle = (title ?? "").trim() || NGHE_HERO_TITLE_FALLBACK;

  return (
    <EntityArticleHeader
      kind="nghe"
      title={displayTitle}
      emLine={emLine}
      summary={summary}
      contextLabel={linhVucLabel}
      thumbnailUrl={thumbnailUrl}
      introId="nghe-sec-intro"
      draftTools={draftTools}
      attribution={attribution}
      belowInner={belowInner}
    />
  );
}
