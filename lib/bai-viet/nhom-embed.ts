export type ArticleNhomEmbedRow = {
  id: string;
  slug: string;
  ten: string;
  mo_ta: string | null;
  thu_tu: number;
  loai_nhom: string;
};

export function parseArticleNhomRow(r: {
  id?: string;
  slug?: string;
  ten?: string;
  mo_ta?: string | null;
  thu_tu?: number | null;
  loai_nhom?: string;
}): ArticleNhomEmbedRow | null {
  const id = String(r.id ?? "").trim();
  if (!id) return null;
  const thuTu = Number(r.thu_tu ?? 0);
  return {
    id,
    slug: String(r.slug ?? "").trim(),
    ten: String(r.ten ?? "").trim() || "Nhóm",
    mo_ta: (r.mo_ta as string | null) ?? null,
    thu_tu: Number.isFinite(thuTu) ? thuTu : 0,
    loai_nhom: String(r.loai_nhom ?? ""),
  };
}

export function sortNhomEmbeds(a: ArticleNhomEmbedRow, b: ArticleNhomEmbedRow): number {
  if (a.thu_tu !== b.thu_tu) return a.thu_tu - b.thu_tu;
  return a.ten.localeCompare(b.ten, "vi", { sensitivity: "base" });
}

export function pickNhomByLoai(
  all: ArticleNhomEmbedRow[] | null | undefined,
  loai: string,
): ArticleNhomEmbedRow | null {
  if (!all?.length) return null;
  return all.find((n) => n.loai_nhom === loai) ?? null;
}

/** Class chip theo slug nhóm (brief §6). */
export function nhomChipClass(slug: string | null | undefined): string {
  const s = slug?.trim().toLowerCase() ?? "";
  if (!s) return "bv-chip bv-chip--default";
  const safe = s.replace(/[^a-z0-9-]/g, "-");
  return `bv-chip bv-chip--${safe}`;
}
