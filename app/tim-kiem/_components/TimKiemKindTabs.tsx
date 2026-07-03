import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  Building2,
  FileText,
  GraduationCap,
  LayoutGrid,
  UserRound,
} from "lucide-react";

import { buildTimKiemUrl } from "@/lib/search/paths";
import { SEARCH_KIND_TABS, type SearchKindTab } from "@/lib/search/types";

const TAB_ICONS: Record<SearchKindTab, LucideIcon> = {
  all: LayoutGrid,
  article: BookOpen,
  khoa_hoc: GraduationCap,
  tuyen_dung: Briefcase,
  org: Building2,
  user: UserRound,
  post: FileText,
};

type Props = {
  query: string;
  activeKind: SearchKindTab;
};

export function TimKiemKindTabs({ query, activeKind }: Props) {
  return (
    <nav className="tk-tabs" aria-label="Lọc loại kết quả">
      {SEARCH_KIND_TABS.map((tab) => {
        const isActive = tab.id === activeKind;
        const href = buildTimKiemUrl({ q: query, kind: tab.id });
        const Icon = TAB_ICONS[tab.id];

        return (
          <Link
            key={tab.id}
            href={href}
            className={`tk-tab${isActive ? " is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={15} strokeWidth={2} aria-hidden className="tk-tab-ico" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
