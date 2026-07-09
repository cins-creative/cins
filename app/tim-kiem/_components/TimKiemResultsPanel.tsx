"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { TimKiemEmptyState } from "@/app/tim-kiem/_components/TimKiemEmptyState";
import { TimKiemKindTabs } from "@/app/tim-kiem/_components/TimKiemKindTabs";
import { TimKiemResults } from "@/app/tim-kiem/_components/TimKiemResults";
import { groupHitsByKind } from "@/lib/search/filter-hits";
import {
  countHitsByKind,
  filterHitsByKind,
  parseSearchKindTab,
} from "@/lib/search/filter-hits";
import { buildTimKiemUrl } from "@/lib/search/paths";
import type { SearchEntityKind, SearchHit, SearchKindTab } from "@/lib/search/types";

type Props = {
  query: string;
  initialKind: SearchKindTab;
  hits: SearchHit[];
  message?: string;
};

function formatCount(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

const STAT_ITEMS: Array<{ key: SearchEntityKind; label: string }> = [
  { key: "article", label: "Kiến thức" },
  { key: "khoa_hoc", label: "Khóa học" },
  { key: "org_tuyen_dung", label: "Tuyển dụng" },
  { key: "org", label: "Tổ chức" },
  { key: "user", label: "Người dùng" },
  { key: "user_post", label: "Journey" },
  { key: "org_post", label: "Bài org" },
];

export function TimKiemResultsPanel({
  query,
  initialKind,
  hits,
  message,
}: Props) {
  const [activeKind, setActiveKind] = useState(initialKind);
  const allCounts = useMemo(() => countHitsByKind(hits), [hits]);

  useEffect(() => {
    setActiveKind(initialKind);
  }, [initialKind, query]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveKind(parseSearchKindTab(params.get("kind")));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const selectKind = useCallback(
    (kind: SearchKindTab) => {
      setActiveKind(kind);
      const nextUrl = buildTimKiemUrl({ q: query, kind });
      window.history.replaceState(window.history.state, "", nextUrl);
    },
    [query],
  );

  const visibleHits = useMemo(
    () => filterHitsByKind(hits, activeKind),
    [hits, activeKind],
  );
  const sectionKinds = useMemo(
    () => groupHitsByKind(visibleHits),
    [visibleHits],
  );
  const total = visibleHits.length;

  return (
    <div className="tk-body">
      <div className="tk-toolbar">
        <TimKiemKindTabs activeKind={activeKind} onKindChange={selectKind} />
        {total > 0 ? (
          <p className="tk-summary">
            <strong>{formatCount(total)}</strong> kết quả cho &ldquo;
            {query}&rdquo;
          </p>
        ) : null}
      </div>

      {message ? (
        <p className="tk-message tk-message--err" role="alert">
          {message}
        </p>
      ) : null}

      {activeKind === "all" && hits.length > 0 ? (
        <div className="tk-stat-row" aria-label="Phân bổ kết quả">
          {STAT_ITEMS.map(({ key, label }) =>
            allCounts[key] > 0 ? (
              <span key={key} className="tk-stat-chip">
                <strong>{formatCount(allCounts[key])}</strong> {label}
              </span>
            ) : null,
          )}
        </div>
      ) : null}

      {total > 0 ? (
        <TimKiemResults
          hits={visibleHits}
          sectionKinds={sectionKinds}
          query={query}
          activeKind={activeKind}
          counts={allCounts}
          onFilterKind={selectKind}
        />
      ) : (
        <TimKiemEmptyState hasQuery />
      )}
    </div>
  );
}
