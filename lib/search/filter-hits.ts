import type { SearchEntityKind, SearchHit, SearchKindTab } from "@/lib/search/types";

function hitMatchesKind(hit: SearchHit, kind: SearchKindTab): boolean {
  if (kind === "all") return true;
  if (kind === "article") return hit.kind === "article";
  if (kind === "khoa_hoc") return hit.kind === "khoa_hoc";
  if (kind === "tuyen_dung") return hit.kind === "org_tuyen_dung";
  if (kind === "org") return hit.kind === "org";
  if (kind === "user") return hit.kind === "user";
  if (kind === "post") return hit.kind === "user_post" || hit.kind === "org_post";
  return true;
}

export function parseSearchKindTab(raw: string | null | undefined): SearchKindTab {
  const kind = (raw ?? "all").trim();
  if (
    kind === "article" ||
    kind === "khoa_hoc" ||
    kind === "tuyen_dung" ||
    kind === "org" ||
    kind === "user" ||
    kind === "post"
  ) {
    return kind;
  }
  return "all";
}

export function filterHitsByKind(hits: SearchHit[], kind: SearchKindTab): SearchHit[] {
  if (kind === "all") return hits;
  return hits.filter((hit) => hitMatchesKind(hit, kind));
}

export function countHitsByKind(hits: SearchHit[]): Record<SearchEntityKind, number> {
  const counts: Record<SearchEntityKind, number> = {
    article: 0,
    khoa_hoc: 0,
    org_tuyen_dung: 0,
    org: 0,
    user: 0,
    user_post: 0,
    org_post: 0,
  };
  for (const hit of hits) {
    counts[hit.kind] += 1;
  }
  return counts;
}

export function groupHitsByKind(hits: SearchHit[]): SearchEntityKind[] {
  const order: SearchEntityKind[] = [
    "article",
    "khoa_hoc",
    "org_tuyen_dung",
    "org",
    "user",
    "user_post",
    "org_post",
  ];
  return order.filter((kind) => hits.some((h) => h.kind === kind));
}
