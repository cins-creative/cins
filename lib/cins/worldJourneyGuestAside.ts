import type { LinhVucRow } from "@/lib/career/types";
import { NGHE_NGHIEP_HUB_PATH } from "@/lib/cins/hubPaths";

export type WjLinhVucAsideItem = {
  slug: string;
  label: string;
  accentColor: string;
};

const ACCENT_FALLBACKS = [
  "var(--cins-yellow)",
  "var(--cins-mint)",
  "var(--cins-orange)",
  "var(--cins-violet)",
  "var(--cins-blue)",
] as const;

export function linhVucDisplayLabel(row: LinhVucRow): string {
  return (row.ten_vi ?? row.ten ?? row.ten_en ?? row.slug ?? "").trim();
}

export function mapLinhVucForGuestAside(
  rows: ReadonlyArray<LinhVucRow>,
): WjLinhVucAsideItem[] {
  return rows
    .filter((row) => Boolean(row.slug?.trim()))
    .map((row, index) => ({
      slug: row.slug!.trim(),
      label: linhVucDisplayLabel(row),
      accentColor:
        row.mau_accent?.trim() ||
        ACCENT_FALLBACKS[index % ACCENT_FALLBACKS.length]!,
    }));
}

export function linhVucHubHref(slug: string): string {
  return `${NGHE_NGHIEP_HUB_PATH}?linh_vuc=${encodeURIComponent(slug.trim())}`;
}
