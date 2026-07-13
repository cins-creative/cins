"use client";

import { useEffect } from "react";
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

import type { SearchEntityKind, SearchHit } from "@/lib/search/types";
import { SEARCH_SECTION_META } from "@/lib/search/types";

import { TimKiemHitCard } from "./TimKiemHitCard";
import { TimKiemSectionHeader } from "./TimKiemSectionHeader";
import { useTimKiemStream } from "./TimKiemStreamContext";

const SECTION_ICONS: Record<SearchEntityKind, LucideIcon> = {
  article: Sparkles,
  khoa_hoc: GraduationCap,
  org_tuyen_dung: Briefcase,
  org: Building2,
  user: UserRound,
  user_post: FileText,
  org_post: BookOpen,
};

function sectionGridClass(kind: SearchEntityKind): string {
  return `tk-grid tk-grid--${SEARCH_SECTION_META[kind].layout}`;
}

type Props = {
  entityKind: SearchEntityKind;
  hits: SearchHit[];
};

export function TimKiemStreamedSection({ entityKind, hits }: Props) {
  const { registerHits, activeKind, query, setActiveKind } = useTimKiemStream();

  useEffect(() => {
    registerHits(entityKind, hits);
  }, [entityKind, hits, registerHits]);

  if (hits.length === 0) return null;

  return (
    <section
      className="tk-section"
      aria-label={SEARCH_SECTION_META[entityKind].label}
    >
      <TimKiemSectionHeader
        kind={entityKind}
        count={hits.length}
        query={query}
        activeKind={activeKind}
        icon={SECTION_ICONS[entityKind]}
        onFilterKind={setActiveKind}
      />
      <ul className={sectionGridClass(entityKind)}>
        {hits.map((hit) => (
          <li key={`${hit.kind}-${hit.id}`}>
            <TimKiemHitCard hit={hit} />
          </li>
        ))}
      </ul>
    </section>
  );
}
