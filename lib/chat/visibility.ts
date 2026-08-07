/**
 * Tin chat một phía (P3b): `chat_tin_nhan.chi_hien_cho`.
 * NULL / thiếu = mọi thành viên phòng thấy.
 */

export function tinHienVoiViewer(
  chiHienCho: string[] | null | undefined,
  viewerId: string,
): boolean {
  if (chiHienCho == null || chiHienCho.length === 0) return true;
  return chiHienCho.includes(viewerId);
}

export function normalizeChiHienCho(
  ids: string[] | null | undefined,
): string[] | null {
  if (ids == null || ids.length === 0) return null;
  const out = [
    ...new Set(
      ids.map((id) => id.trim()).filter((id) => id.length > 0),
    ),
  ];
  return out.length > 0 ? out : null;
}
