import type { LinhVucRow } from "@/lib/career/types";

function slugMatches(lv: LinhVucRow, q: string): boolean {
  const s = (lv.slug ?? "").trim().toLowerCase();
  const qn = q.trim().toLowerCase();
  if (!s || !qn) return false;
  if (s === qn) return true;
  const sCore = s.replace(/^lv-/, "");
  const qCore = qn.replace(/^lv-/, "");
  return sCore.length > 0 && sCore === qCore;
}

/** Chọn lĩnh vực active từ query `?linh_vuc=` hoặc mặc định phần tử đầu. */
export function resolveActiveLinhVuc(
  linhVucs: LinhVucRow[],
  requestedRaw?: string,
): { activeLv: LinhVucRow | null; activeSlug: string } {
  const requested =
    typeof requestedRaw === "string"
      ? decodeURIComponent(requestedRaw).trim()
      : undefined;

  const defaultSlug = linhVucs[0]?.slug ?? "";
  const activeSlug =
    requested && linhVucs.some((l) => slugMatches(l, requested))
      ? (linhVucs.find((l) => slugMatches(l, requested))?.slug ?? "").trim() ||
        defaultSlug
      : defaultSlug;

  const activeLv =
    linhVucs.find((l) => slugMatches(l, activeSlug)) ?? linhVucs[0] ?? null;

  return { activeLv, activeSlug };
}
