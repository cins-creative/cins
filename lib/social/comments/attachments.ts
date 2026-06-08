const CF_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MAX_COMMENT_ATTACHMENTS = 4;

/** Lọc Cloudflare image id hợp lệ — tối đa 4. */
export function sanitizeCommentImageIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!CF_UUID_RE.test(id)) continue;
    if (out.includes(id)) continue;
    out.push(id);
    if (out.length >= MAX_COMMENT_ATTACHMENTS) break;
  }
  return out;
}

export function parseCommentImageIdsFromRow(
  raw: string[] | null | undefined,
): string[] {
  return sanitizeCommentImageIds(raw ?? []);
}
