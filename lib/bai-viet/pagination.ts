export type PaginationItem =
  | { kind: "page"; page: number }
  | { kind: "ellipsis"; key: string };

/** Cửa sổ số trang: 1 … 4 5 6 … 20 */
export function buildPaginationItems(
  current: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 1) return totalPages === 1 ? [{ kind: "page", page: 1 }] : [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => ({
      kind: "page" as const,
      page: i + 1,
    }));
  }

  const items: PaginationItem[] = [{ kind: "page", page: 1 }];
  const windowStart = Math.max(2, current - 1);
  const windowEnd = Math.min(totalPages - 1, current + 1);

  if (windowStart > 2) items.push({ kind: "ellipsis", key: "start" });

  for (let p = windowStart; p <= windowEnd; p++) {
    items.push({ kind: "page", page: p });
  }

  if (windowEnd < totalPages - 1) items.push({ kind: "ellipsis", key: "end" });

  items.push({ kind: "page", page: totalPages });
  return items;
}
