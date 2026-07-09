import {
  Briefcase,
  BookOpen,
  Building2,
  FileText,
  GraduationCap,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { SearchEntityKind, SearchHit, SearchKindTab } from "@/lib/search/types";
import { SEARCH_SECTION_META } from "@/lib/search/types";

import { TimKiemHitCard } from "./TimKiemHitCard";
import { TimKiemSectionHeader } from "./TimKiemSectionHeader";

const SECTION_ICONS: Record<SearchEntityKind, LucideIcon> = {
  article: Sparkles,
  khoa_hoc: GraduationCap,
  org_tuyen_dung: Briefcase,
  org: Building2,
  user: UserRound,
  user_post: FileText,
  org_post: BookOpen,
};

type Props = {
  hits: SearchHit[];
  sectionKinds: SearchEntityKind[];
  query: string;
  activeKind: SearchKindTab;
  counts: Record<SearchEntityKind, number>;
  onFilterKind?: (kind: SearchKindTab) => void;
};

function sectionGridClass(kind: SearchEntityKind): string {
  const layout = SEARCH_SECTION_META[kind].layout;
  return `tk-grid tk-grid--${layout}`;
}

export function TimKiemResults({
  hits,
  sectionKinds,
  query,
  activeKind,
  counts,
  onFilterKind,
}: Props) {
  if (hits.length === 0) return null;

  return (
    <div className="tk-results">
      {sectionKinds.map((kind) => {
        const sectionHits = hits.filter((h) => h.kind === kind);
        if (sectionHits.length === 0) return null;

        return (
          <section
            key={kind}
            className="tk-section"
            aria-label={SEARCH_SECTION_META[kind].label}
          >
            <TimKiemSectionHeader
              kind={kind}
              count={counts[kind]}
              query={query}
              activeKind={activeKind}
              icon={SECTION_ICONS[kind]}
              onFilterKind={onFilterKind}
            />
            <ul className={sectionGridClass(kind)}>
              {sectionHits.map((hit) => (
                <li key={`${hit.kind}-${hit.id}`}>
                  <TimKiemHitCard hit={hit} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
