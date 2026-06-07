/** Chuẩn hoá tên tag cho dedup exact (lowercase + trim). */
export function normalizeTagName(ten: string): string {
  return ten.trim().toLowerCase();
}
