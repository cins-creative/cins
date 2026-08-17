import { createCachedResource } from "@/lib/client-cache";
import { type TagLoaiFilter } from "@/lib/tag/tag-loai";
import {
  TAG_BROWSE_MAX,
  TAG_SUGGEST_CACHE_KEY,
  TAG_SUGGEST_CACHE_TTL_MS,
  TAG_SUGGEST_MAX,
  type TagSuggestRow,
} from "@/lib/tag/suggest-types";

export type LoaiFilter = TagLoaiFilter;

export type IndexedTagSuggest = TagSuggestRow & {
  _n: string;
  _nv: string;
  _ne: string;
};

type CacheEntry = { ts: number; rows: TagSuggestRow[] };

function validateTagSuggestIndex(raw: unknown): TagSuggestRow[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  for (const item of raw) {
    if (item == null || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || !row.id.trim()) return null;
    if (typeof row.tieu_de !== "string") return null;
  }
  return raw as TagSuggestRow[];
}

export async function fetchTagSuggestIndex(): Promise<TagSuggestRow[]> {
  const res = await fetch("/api/tag/index");
  if (!res.ok) return [];
  const json = (await res.json().catch(() => null)) as
    | { rows?: TagSuggestRow[] }
    | null;
  return json?.rows ?? [];
}

const tagSuggestIndexCache = createCachedResource<TagSuggestRow[]>({
  keyPrefix: "tag-suggest-index",
  ttlMs: TAG_SUGGEST_CACHE_TTL_MS,
  persist: "session",
  validate: validateTagSuggestIndex,
  fetcher: async () => {
    const rows = await fetchTagSuggestIndex();
    if (rows.length === 0) {
      throw new Error("tag-suggest-index-empty");
    }
    return rows;
  },
});

function readLegacyTagSuggestCache(): CacheEntry | null {
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
    const rows = validateTagSuggestIndex(parsed.rows);
    if (!rows) return null;
    return { ts: parsed.ts, rows };
  } catch {
    return null;
  }
}

function migrateLegacyTagSuggestCache(): TagSuggestRow[] | null {
  const legacy = readLegacyTagSuggestCache();
  if (!legacy?.rows.length) return null;
  tagSuggestIndexCache.write(legacy.rows);
  try {
    window.sessionStorage.removeItem(TAG_SUGGEST_CACHE_KEY);
  } catch {
    /* quota / private mode */
  }
  return legacy.rows;
}

/** RAM / session — không đợi mạng nếu đã warm. */
export function peekTagSuggestIndex(): TagSuggestRow[] | null {
  return tagSuggestIndexCache.peek() ?? migrateLegacyTagSuggestCache();
}

/** Gọi khi mở trình soạn — inflight dedup với menu `#`. */
export function prefetchTagSuggestIndex(): void {
  if (typeof window === "undefined") return;
  void peekTagSuggestIndex();
  tagSuggestIndexCache.prefetch();
}

export async function loadTagSuggestIndexClient(): Promise<TagSuggestRow[]> {
  const peeked = peekTagSuggestIndex();
  try {
    return await tagSuggestIndexCache.fetch();
  } catch {
    return peeked ?? [];
  }
}

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

function rowMatchesLoai(
  row: { loai_bai_viet: string },
  loaiFilter: LoaiFilter,
  allowLoai?: ReadonlySet<string>,
): boolean {
  if (allowLoai && !allowLoai.has(row.loai_bai_viet)) return false;
  if (loaiFilter !== "all" && row.loai_bai_viet !== loaiFilter) return false;
  return true;
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
  if (row.so_nguoi_tagged > 0) {
    best += Math.min(0.08, row.so_nguoi_tagged * 0.003);
  }
  if (row.so_gan > 0) {
    best += Math.min(0.28, row.so_gan * 0.01);
  }
  if (row.loai_bai_viet === "keyword") best += 0.02;
  return best;
}

/** Keyword gắn nhiều bài đứng trước — `so_gan` rồi số người. */
function compareTagPopularity(a: TagSuggestRow, b: TagSuggestRow): number {
  return (
    (b.so_gan ?? 0) - (a.so_gan ?? 0) ||
    (b.so_nguoi_tagged ?? 0) - (a.so_nguoi_tagged ?? 0) ||
    Number(b.loai_bai_viet === "keyword") -
      Number(a.loai_bai_viet === "keyword") ||
    a.tieu_de.localeCompare(b.tieu_de, "vi")
  );
}

export function filterTagSuggestIndex(
  index: ReadonlyArray<IndexedTagSuggest>,
  query: string,
  options: {
    loaiFilter: LoaiFilter;
    excludeIds: ReadonlySet<string>;
    max?: number;
    allowLoai?: ReadonlySet<string>;
  },
): TagSuggestRow[] {
  const q = normalizeVi(query.trim());
  if (!q || q.length < 1) return [];

  const scored = index
    .filter((row) => {
      if (options.excludeIds.has(row.id)) return false;
      if (!rowMatchesLoai(row, options.loaiFilter, options.allowLoai)) {
        return false;
      }
      return scoreMatch(q, row) > 0;
    })
    .map((row) => ({ row, score: scoreMatch(q, row) }));

  return scored
    .sort(
      (a, b) => b.score - a.score || compareTagPopularity(a.row, b.row),
    )
    .slice(0, options.max ?? TAG_SUGGEST_MAX)
    .map((s) => s.row);
}

/** List lúc mở menu (chưa gõ) — sort lượt gắn thẻ (`so_gan`). */
export function browseTagSuggestIndex(
  index: ReadonlyArray<IndexedTagSuggest>,
  options: {
    loaiFilter: LoaiFilter;
    excludeIds: ReadonlySet<string>;
    max?: number;
    allowLoai?: ReadonlySet<string>;
  },
): TagSuggestRow[] {
  const max = options.max ?? TAG_BROWSE_MAX;
  return index
    .filter((row) => {
      if (options.excludeIds.has(row.id)) return false;
      return rowMatchesLoai(row, options.loaiFilter, options.allowLoai);
    })
    .sort(compareTagPopularity)
    .slice(0, max);
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
      so_gan: cached.so_gan || row.so_gan || 0,
      da_verify: row.da_verify || cached.da_verify,
      cover_id: row.cover_id ?? cached.cover_id ?? null,
      slug: row.slug ?? cached.slug ?? null,
    };
  });
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
