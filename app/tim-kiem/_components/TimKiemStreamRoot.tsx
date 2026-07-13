"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TimKiemEmptyState } from "@/app/tim-kiem/_components/TimKiemEmptyState";
import { TimKiemKindTabs } from "@/app/tim-kiem/_components/TimKiemKindTabs";
import {
  countHitsByKind,
  filterHitsByKind,
  parseSearchKindTab,
} from "@/lib/search/filter-hits";
import { buildTimKiemUrl } from "@/lib/search/paths";
import {
  SEARCH_ENTITY_KINDS,
  type SearchEntityKind,
  type SearchHit,
  type SearchKindTab,
} from "@/lib/search/types";

import { TimKiemStreamContext } from "./TimKiemStreamContext";

type Props = {
  query: string;
  initialKind: SearchKindTab;
  message?: string;
  children: ReactNode;
};

const STAT_ITEMS: Array<{ key: SearchEntityKind; label: string }> = [
  { key: "article", label: "Kiến thức" },
  { key: "khoa_hoc", label: "Khóa học" },
  { key: "org_tuyen_dung", label: "Tuyển dụng" },
  { key: "org", label: "Tổ chức" },
  { key: "user", label: "Người dùng" },
  { key: "user_post", label: "Journey" },
  { key: "org_post", label: "Bài org" },
];

function formatCount(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

export function TimKiemStreamRoot({
  query,
  initialKind,
  message,
  children,
}: Props) {
  const [activeKind, setActiveKind] = useState<SearchKindTab>(initialKind);
  const [hitsByKind, setHitsByKind] = useState<
    Partial<Record<SearchEntityKind, SearchHit[]>>
  >({});

  useEffect(() => {
    setActiveKind(initialKind);
  }, [initialKind]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveKind(parseSearchKindTab(params.get("kind")));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const registerHits = useCallback(
    (kind: SearchEntityKind, hits: SearchHit[]) => {
      setHitsByKind((prev) =>
        prev[kind] !== undefined ? prev : { ...prev, [kind]: hits },
      );
    },
    [],
  );

  const selectKind = useCallback(
    (kind: SearchKindTab) => {
      setActiveKind(kind);
      const nextUrl = buildTimKiemUrl({ q: query, kind });
      window.history.replaceState(window.history.state, "", nextUrl);
    },
    [query],
  );

  const allHits = useMemo(
    () => Object.values(hitsByKind).flat() as SearchHit[],
    [hitsByKind],
  );
  const allCounts = useMemo(() => countHitsByKind(allHits), [allHits]);
  const visibleTotal = useMemo(
    () => filterHitsByKind(allHits, activeKind).length,
    [allHits, activeKind],
  );

  const resolvedCount = Object.keys(hitsByKind).length;
  const allResolved = resolvedCount >= SEARCH_ENTITY_KINDS.length;

  const contextValue = useMemo(
    () => ({
      query,
      activeKind,
      setActiveKind: selectKind,
      hitsByKind,
      registerHits,
    }),
    [query, activeKind, selectKind, hitsByKind, registerHits],
  );

  return (
    <TimKiemStreamContext.Provider value={contextValue}>
      <div className="tk-body">
        <div className="tk-toolbar">
          <TimKiemKindTabs activeKind={activeKind} onKindChange={selectKind} />
          {visibleTotal > 0 ? (
            <p className="tk-summary">
              <strong>{formatCount(visibleTotal)}</strong> kết quả cho &ldquo;
              {query}&rdquo;
            </p>
          ) : null}
        </div>

        {message ? (
          <p className="tk-message tk-message--err" role="alert">
            {message}
          </p>
        ) : null}

        {activeKind === "all" && allHits.length > 0 ? (
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

        <div className="tk-results">{children}</div>

        {allResolved && visibleTotal === 0 ? (
          <TimKiemEmptyState hasQuery />
        ) : null}
      </div>
    </TimKiemStreamContext.Provider>
  );
}
