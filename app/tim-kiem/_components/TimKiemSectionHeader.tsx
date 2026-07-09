import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

import { buildTimKiemUrl } from "@/lib/search/paths";
import type { SearchEntityKind, SearchKindTab } from "@/lib/search/types";
import { SEARCH_SECTION_META } from "@/lib/search/types";

type Props = {
  kind: SearchEntityKind;
  count: number;
  query: string;
  activeKind: SearchKindTab;
  icon: LucideIcon;
  onFilterKind?: (kind: SearchKindTab) => void;
};

const KIND_TAB: Record<SearchEntityKind, SearchKindTab> = {
  article: "article",
  khoa_hoc: "khoa_hoc",
  org_tuyen_dung: "tuyen_dung",
  org: "org",
  user: "user",
  user_post: "post",
  org_post: "post",
};

export function TimKiemSectionHeader({
  kind,
  count,
  query,
  activeKind,
  icon: Icon,
  onFilterKind,
}: Props) {
  const meta = SEARCH_SECTION_META[kind];
  const showMoreLink = activeKind === "all" && count > 0;
  const tab = KIND_TAB[kind];

  return (
    <header className="tk-section-head">
      <div className="tk-section-head-main">
        <span className="tk-section-icon" aria-hidden>
          <Icon size={18} strokeWidth={2} />
        </span>
        <div className="tk-section-copy">
          <h2 className="tk-section-title">{meta.label}</h2>
          <p className="tk-section-lead">{meta.lead}</p>
        </div>
      </div>
      <div className="tk-section-head-actions">
        <span className="tk-section-count">{count}</span>
        {showMoreLink && tab !== "all" ? (
          onFilterKind ? (
            <button
              type="button"
              className="tk-section-more"
              onClick={() => onFilterKind(tab)}
            >
              Lọc tab này
              <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
            </button>
          ) : (
            <Link
              href={buildTimKiemUrl({ q: query, kind: tab })}
              className="tk-section-more"
            >
              Lọc tab này
              <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
            </Link>
          )
        ) : null}
      </div>
    </header>
  );
}
