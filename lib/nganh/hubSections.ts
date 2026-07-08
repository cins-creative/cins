import type { NganhHubItem, NganhHubSection } from "@/lib/nganh/types";

function jobSort(a: NganhHubItem, b: NganhHubItem): number {
  return a.title.localeCompare(b.title, "vi", { sensitivity: "base" });
}

function nhomNganhForItem(item: NganhHubItem) {
  const all = item.article_nhom_all ?? (item.article_nhom ? [item.article_nhom] : []);
  return all.filter((n) => n.loai_nhom === "nhom_nganh");
}

export function groupNganhByNhomNganh(items: NganhHubItem[]): NganhHubSection[] {
  if (!items.length) return [];

  const byNhomId = new Map<string, NganhHubItem[]>();

  for (const item of items) {
    const nhoms = nhomNganhForItem(item);
    if (!nhoms.length) continue;
    for (const nh of nhoms) {
      const arr = byNhomId.get(nh.id) ?? [];
      if (!arr.some((x) => x.id === item.id)) arr.push(item);
      byNhomId.set(nh.id, arr);
    }
  }

  const sections: NganhHubSection[] = [];
  for (const [nhomId, list] of byNhomId) {
    const nh =
      list.flatMap((c) => nhomNganhForItem(c)).find((n) => n.id === nhomId) ??
      list[0]?.article_nhom;
    sections.push({
      id: `nganh-sec-${nhomId}`,
      nhomId,
      thu_tu: nh?.thu_tu ?? 999,
      title: nh?.ten?.trim() || "Nhóm ngành",
      intro: nh?.mo_ta?.trim() || null,
      items: [...list].sort(jobSort),
    });
  }

  sections.sort((a, b) => {
    if (a.thu_tu !== b.thu_tu) return a.thu_tu - b.thu_tu;
    return a.title.localeCompare(b.title, "vi", { sensitivity: "base" });
  });

  return sections;
}
