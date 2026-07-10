import {
  PICKABLE_TAG_LOAI,
  type PickableTagLoai,
} from "@/lib/tag/tag-loai";
import {
  TAG_SUGGEST_CACHE_KEY,
  TAG_SUGGEST_CACHE_TTL_MS,
  TAG_SUGGEST_MAX,
  type TagSuggestRow,
} from "@/lib/tag/suggest-types";

export type LoaiFilter = PickableTagLoai | "all";

export type IndexedTagSuggest = TagSuggestRow & {
  _n: string;
  _nv: string;
  _ne: string;
};

type CacheEntry = { ts: number; rows: TagSuggestRow[] };

export function normalizeVi(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function indexTagSuggestRows(
  rows: ReadonlyArray<TagSuggestRow>,
): IndexedTagSuggest[] {
  return rows.map((r) => ({
    ...r,
    _n: normalizeVi(r.tieu_de),
    _nv: normalizeVi(r.tieu_de_viet ?? ""),
    _ne: normalizeVi(r.tieu_de_eng ?? ""),
  }));
}

export function readTagSuggestCache(): CacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(TAG_SUGGEST_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (
      !parsed ||
      typeof parsed.ts !== "number" ||
      !Array.isArray(parsed.rows)
    ) {
      return null;
    }
    if (Date.now() - parsed.ts > TAG_SUGGEST_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeTagSuggestCache(rows: TagSuggestRow[]) {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry = { ts: Date.now(), rows };
    window.sessionStorage.setItem(TAG_SUGGEST_CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* sessionStorage quota / disabled */
  }
}

function scoreMatch(query: string, row: IndexedTagSuggest): number {
  const q = query.toLowerCase();
  let best = 0;
  for (const c of [row._n, row._nv, row._ne]) {
    if (!c) continue;
    if (c === q) best = Math.max(best, 1);
    else if (c.startsWith(q)) best = Math.max(best, 0.85);
    else if (q.startsWith(c)) best = Math.max(best, 0.8);
    else if (c.includes(q)) best = Math.max(best, 0.65);
    else if (q.includes(c)) best = Math.max(best, 0.55);
  }
  if (row.da_verify) best += 0.15;
  if (row.so_nguoi_tagged > 0) {
    best += Math.min(0.12, row.so_nguoi_tagged * 0.004);
  }
  return best;
}

function pickDiverse(
  rows: TagSuggestRow[],
  scores: Map<string, number>,
  max = TAG_SUGGEST_MAX,
): TagSuggestRow[] {
  const byLoai = new Map<PickableTagLoai, TagSuggestRow[]>();
  const sorted = [...rows].sort(
    (a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0),
  );
  for (const row of sorted) {
    const bucket = byLoai.get(row.loai_bai_viet) ?? [];
    bucket.push(row);
    byLoai.set(row.loai_bai_viet, bucket);
  }

  const out: TagSuggestRow[] = [];
  const seen = new Set<string>();
  let round = 0;
  while (out.length < max) {
    let added = false;
    for (const loai of PICKABLE_TAG_LOAI) {
      const item = byLoai.get(loai)?.[round];
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
      added = true;
      if (out.length >= max) break;
    }
    if (!added) break;
    round++;
  }
  return out;
}

export function filterTagSuggestIndex(
  index: ReadonlyArray<IndexedTagSuggest>,
  query: string,
  options: {
    loaiFilter: LoaiFilter;
    excludeIds: ReadonlySet<string>;
    max?: number;
  },
): TagSuggestRow[] {
  const q = normalizeVi(query.trim());
  if (!q || q.length < 1) return [];

  const scored = index
    .filter((row) => {
      if (options.excludeIds.has(row.id)) return false;
      if (options.loaiFilter !== "all" && row.loai_bai_viet !== options.loaiFilter) {
        return false;
      }
      return scoreMatch(q, row) > 0;
    })
    .map((row) => ({ row, score: scoreMatch(q, row) }));

  const scores = new Map(scored.map((s) => [s.row.id, s.score]));
  return pickDiverse(
    scored.map((s) => s.row),
    scores,
    options.max ?? TAG_SUGGEST_MAX,
  );
}

export function enrichTagSuggestRows(
  rows: ReadonlyArray<TagSuggestRow>,
  indexById: ReadonlyMap<string, IndexedTagSuggest>,
): TagSuggestRow[] {
  return rows.map((row) => {
    const cached = indexById.get(row.id);
    if (!cached) return row;
    return {
      ...row,
      tieu_de_viet: row.tieu_de_viet ?? cached.tieu_de_viet,
      tieu_de_eng: row.tieu_de_eng ?? cached.tieu_de_eng,
      linh_vuc_ten: row.linh_vuc_ten ?? cached.linh_vuc_ten,
      so_nguoi_tagged: cached.so_nguoi_tagged || row.so_nguoi_tagged,
      da_verify: row.da_verify || cached.da_verify,
    };
  });
}

export async function fetchTagSuggestIndex(): Promise<TagSuggestRow[]> {
  const res = await fetch("/api/tag/index");
  if (!res.ok) return [];
  const json = (await res.json().catch(() => null)) as
    | { rows?: TagSuggestRow[] }
    | null;
  return json?.rows ?? [];
}

export function titlesMatchQuery(
  row: Pick<TagSuggestRow, "tieu_de" | "tieu_de_viet" | "tieu_de_eng">,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return [row.tieu_de, row.tieu_de_viet, row.tieu_de_eng].some(
    (t) => typeof t === "string" && t.trim().toLowerCase() === q,
  );
}
