/** Tên bộ phận hiển thị: ưu tiên `nn_bo_phan.ten`, sau đó `bo_phan` text legacy */
export function boPhanTen(n: {
  nn_bo_phan?: { ten: string } | null;
  bo_phan?: string | null;
}): string | null {
  const t = n.nn_bo_phan?.ten?.trim();
  if (t) return t;
  const b = n.bo_phan?.trim();
  return b || null;
}

/** Chuẩn hóa embed PostgREST đôi khi trả về mảng một phần tử */
export function normalizeNnBoPhanEmbed<T extends { nn_bo_phan?: unknown }>(
  row: T,
): T & {
  nn_bo_phan: { ten: string; mo_ta: string | null } | null;
} {
  let nn = row.nn_bo_phan as
    | { ten: string; mo_ta: string | null }
    | [{ ten: string; mo_ta: string | null }]
    | null
    | undefined;
  if (Array.isArray(nn)) nn = nn[0] ?? null;
  return { ...row, nn_bo_phan: nn ?? null };
}
