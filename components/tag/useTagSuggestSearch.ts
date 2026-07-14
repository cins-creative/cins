"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { TagDedupMatch } from "@/lib/tag/dedup";
import {
  enrichTagSuggestRows,
  fetchTagSuggestIndex,
  filterTagSuggestIndex,
  indexTagSuggestRows,
  readTagSuggestCache,
  titlesMatchQuery,
  writeTagSuggestCache,
  type IndexedTagSuggest,
  type LoaiFilter,
} from "@/lib/tag/suggest-index-client";
import {
  TAG_SUGGEST_DEBOUNCE_MS,
  TAG_SUGGEST_MAX,
  type TagSuggestRow,
} from "@/lib/tag/suggest-types";

type DedupExact = { type: "exact"; match: TagDedupMatch };
type DedupFuzzy = { type: "fuzzy"; suggestions: TagDedupMatch[] };

type Options = {
  enabled?: boolean;
  query: string;
  loaiFilter: LoaiFilter;
  excludeIds: ReadonlySet<string>;
  /** Giới hạn số gợi ý (mặc định TAG_SUGGEST_MAX). */
  max?: number;
};

export function useTagSuggestSearch({
  enabled = true,
  query,
  loaiFilter,
  excludeIds,
  max = TAG_SUGGEST_MAX,
}: Options) {
  const [index, setIndex] = useState<IndexedTagSuggest[] | null>(null);
  const [indexLoading, setIndexLoading] = useState(false);
  const [exactMatch, setExactMatch] = useState<TagSuggestRow | null>(null);
  const [serverSuggestions, setServerSuggestions] = useState<
    TagSuggestRow[] | null
  >(null);
  const [refining, setRefining] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dedupAbortRef = useRef<AbortController | null>(null);

  const trimmed = query.trim();
  const indexById = useMemo(
    () => new Map((index ?? []).map((row) => [row.id, row])),
    [index],
  );

  const ensureIndex = useCallback(() => {
    if (index || indexLoading) return;
    setIndexLoading(true);

    const cached = readTagSuggestCache();
    if (cached) {
      setIndex(indexTagSuggestRows(cached.rows));
    }

    void (async () => {
      try {
        const rows = await fetchTagSuggestIndex();
        if (rows.length > 0) {
          writeTagSuggestCache(rows);
          setIndex(indexTagSuggestRows(rows));
        }
      } finally {
        setIndexLoading(false);
      }
    })();
  }, [index, indexLoading]);

  useEffect(() => {
    if (!enabled) return;
    ensureIndex();
  }, [enabled, ensureIndex]);

  const localSuggestions = useMemo(() => {
    if (!trimmed || !index) return [];
    return filterTagSuggestIndex(index, trimmed, {
      loaiFilter,
      excludeIds,
      max,
    });
  }, [index, trimmed, loaiFilter, excludeIds, max]);

  const suggestions = useMemo(() => {
    if (!serverSuggestions) return localSuggestions;
    const server = enrichTagSuggestRows(serverSuggestions, indexById);
    const seen = new Set(localSuggestions.map((r) => r.id));
    const merged = [...localSuggestions];
    for (const row of server) {
      if (seen.has(row.id)) continue;
      if (loaiFilter !== "all" && row.loai_bai_viet !== loaiFilter) continue;
      if (excludeIds.has(row.id)) continue;
      seen.add(row.id);
      merged.push(row);
    }
    return merged.slice(0, max);
  }, [
    serverSuggestions,
    localSuggestions,
    indexById,
    loaiFilter,
    excludeIds,
    max,
  ]);

  const runDedup = useCallback(
    async (ten: string) => {
      const q = ten.trim();
      if (!q) {
        dedupAbortRef.current?.abort();
        dedupAbortRef.current = null;
        setExactMatch(null);
        setServerSuggestions(null);
        setRefining(false);
        return;
      }

      dedupAbortRef.current?.abort();
      const controller = new AbortController();
      dedupAbortRef.current = controller;
      setRefining(true);

      try {
        const res = await fetch("/api/tag/dedup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ten: q }),
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        const json = (await res.json().catch(() => null)) as
          | DedupExact
          | DedupFuzzy
          | { error?: string }
          | null;

        if (!res.ok || !json || !("type" in json)) {
          setExactMatch(null);
          setServerSuggestions(null);
          return;
        }

        if (json.type === "exact") {
          const enriched = enrichTagSuggestRows(
            [json.match as TagSuggestRow],
            indexById,
          )[0]!;
          setExactMatch(enriched);
          setServerSuggestions(null);
        } else {
          setExactMatch(null);
          const enriched = enrichTagSuggestRows(
            (json.suggestions ?? []) as TagSuggestRow[],
            indexById,
          ).slice(0, max);
          setServerSuggestions(enriched);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setExactMatch(null);
        setServerSuggestions(null);
      } finally {
        if (!controller.signal.aborted) {
          setRefining(false);
        }
      }
    },
    [indexById, max],
  );

  useEffect(() => {
    if (!enabled) return;

    setExactMatch(null);
    setServerSuggestions(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!trimmed) {
      setRefining(false);
      dedupAbortRef.current?.abort();
      return;
    }

    debounceRef.current = setTimeout(() => {
      void runDedup(trimmed);
    }, TAG_SUGGEST_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [enabled, trimmed, runDedup]);

  useEffect(
    () => () => {
      dedupAbortRef.current?.abort();
    },
    [],
  );

  const hasExactSuggestion = useMemo(
    () => suggestions.some((s) => titlesMatchQuery(s, trimmed)),
    [suggestions, trimmed],
  );

  const loading =
    Boolean(trimmed) &&
    !exactMatch &&
    suggestions.length === 0 &&
    (refining || indexLoading || !index);

  return {
    trimmed,
    exactMatch,
    suggestions,
    refining,
    loading,
    hasExactSuggestion,
    ensureIndex,
  };
}

export type { TagSuggestRow, LoaiFilter };
