import type { MonThiCatalogItem } from "@/lib/truong/calc-draft";

/** `edu_mon_thi.loai` — nhóm hiển thị trong dropdown. */
export const MON_THI_LOAI_LABELS: Record<string, string> = {
  nang_khieu: "Năng khiếu",
  van_hoa: "Văn hóa",
  ngoai_ngu: "Ngoại ngữ",
};

const LOAI_SORT_ORDER = ["nang_khieu", "van_hoa", "ngoai_ngu"] as const;

export function labelMonThiLoai(loai: string | null | undefined): string {
  const key = loai?.trim().toLowerCase();
  if (!key) return "Khác";
  return MON_THI_LOAI_LABELS[key] ?? key.replace(/_/g, " ");
}

export function distinctMonThiLoai(
  catalog: MonThiCatalogItem[],
): string[] {
  const keys = new Set<string>();
  for (const item of catalog) {
    keys.add(item.loai?.trim().toLowerCase() || "__khac__");
  }
  const ordered: string[] = [];
  for (const k of LOAI_SORT_ORDER) {
    if (keys.has(k)) {
      ordered.push(k);
      keys.delete(k);
    }
  }
  const rest = [...keys].filter((k) => k !== "__khac__").sort();
  ordered.push(...rest);
  if (keys.has("__khac__")) ordered.push("__khac__");
  return ordered;
}

export type MonThiCatalogGroup = {
  loaiKey: string;
  label: string;
  items: MonThiCatalogItem[];
};

export function groupMonThiCatalog(
  catalog: MonThiCatalogItem[],
): MonThiCatalogGroup[] {
  const byLoai = new Map<string, MonThiCatalogItem[]>();
  for (const item of catalog) {
    const key = item.loai?.trim().toLowerCase() || "__khac__";
    const list = byLoai.get(key) ?? [];
    list.push(item);
    byLoai.set(key, list);
  }

  const groups: MonThiCatalogGroup[] = [];
  const push = (loaiKey: string) => {
    const items = byLoai.get(loaiKey);
    if (!items?.length) return;
    items.sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
    groups.push({
      loaiKey,
      label: loaiKey === "__khac__" ? "Khác" : labelMonThiLoai(loaiKey),
      items,
    });
    byLoai.delete(loaiKey);
  };

  for (const k of LOAI_SORT_ORDER) push(k);
  for (const k of [...byLoai.keys()].sort()) push(k);

  return groups;
}

export function filterMonThiCatalog(
  catalog: MonThiCatalogItem[],
  loaiFilter: string,
): MonThiCatalogItem[] {
  if (loaiFilter === "all") return catalog;
  if (loaiFilter === "__khac__") {
    return catalog.filter((c) => !c.loai?.trim());
  }
  return catalog.filter(
    (c) => (c.loai?.trim().toLowerCase() ?? "") === loaiFilter,
  );
}
