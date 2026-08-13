"use client";

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
  activeKind: SearchKindTab;
  onKindChange: (kind: SearchKindTab) => void;
};

export function TimKiemKindTabs({ activeKind, onKindChange }: Props) {
  return (
    <nav className="tk-tabs" aria-label="Lọc loại kết quả">
      {SEARCH_KIND_TABS.map((tab) => {
        const isActive = tab.id === activeKind;
        const Icon = TAB_ICONS[tab.id];

        return (
          <button
            key={tab.id}
            type="button"
            className={`tk-tab${isActive ? " is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onKindChange(tab.id)}
          >
            <Icon size={15} strokeWidth={2} aria-hidden className="tk-tab-ico" />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
