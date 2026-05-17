import type { NganhHubItem, NganhSidebarGroup } from "@/lib/nganh/types";

/** Sidebar hub tab Ngành học — nhóm theo `article_nhom` loại `nhom_nganh`. */
export function groupNhomNganhForSidebar(items: NganhHubItem[]): NganhSidebarGroup[] {
  const byHeading = new Map<string, NganhHubItem[]>();

  for (const item of items) {
    const nhoms = (item.article_nhom_all ?? []).filter(
      (n) => n.loai_nhom === "nhom_nganh",
    );
    if (!nhoms.length) {
      const key = "__other__";
      const arr = byHeading.get(key) ?? [];
      arr.push(item);
      byHeading.set(key, arr);
      continue;
    }
    for (const nh of nhoms) {
      const key = nh.id;
      const arr = byHeading.get(key) ?? [];
      if (!arr.some((x) => x.id === item.id)) arr.push(item);
      byHeading.set(key, arr);
    }
  }

  const groups: NganhSidebarGroup[] = [];
  for (const [key, list] of byHeading) {
    const nh =
      list
        .flatMap((c) => c.article_nhom_all ?? [])
        .find((n) => n.id === key && n.loai_nhom === "nhom_nganh") ??
      list[0]?.article_nhom;
    const heading =
      key === "__other__"
        ? "Ngành khác"
        : (nh?.ten?.trim() || "Nhóm ngành");
    const thuTu = nh?.thu_tu ?? 999;
    groups.push({
      id: key === "__other__" ? "other" : key,
      heading,
      nhomKey: nh?.slug?.trim() || heading,
      thu_tu: Number.isFinite(thuTu) ? thuTu : 999,
      links: [...list]
        .sort((a, b) =>
          (a.titleVi ?? a.title).localeCompare(b.titleVi ?? b.title, "vi", {
            sensitivity: "base",
          }),
        )
        .map((item) => ({
          id: item.id,
          slug: item.slug,
          label: item.titleVi ?? item.title,
        })),
    });
  }

  groups.sort((a, b) => {
    if (a.id === "other") return 1;
    if (b.id === "other") return -1;
    if (a.thu_tu !== b.thu_tu) return a.thu_tu - b.thu_tu;
    return a.heading.localeCompare(b.heading, "vi", { sensitivity: "base" });
  });

  return groups;
}

export function nganhMatchesActiveNhom(
  item: NganhHubItem,
  nhomId: string,
): boolean {
  if (!nhomId) return true;
  return (item.article_nhom_all ?? []).some(
    (n) => n.id === nhomId && n.loai_nhom === "nhom_nganh",
  );
}
