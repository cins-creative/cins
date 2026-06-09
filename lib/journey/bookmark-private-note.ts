const BOOKMARK_PRIVATE_NOTE_MAX = 500;

/** Ghi chú riêng trên `social_luu` — chỉ người lưu thấy. */
export function normalizeBookmarkPrivateNote(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, BOOKMARK_PRIVATE_NOTE_MAX);
}

export const BOOKMARK_PRIVATE_NOTE_MAX_LENGTH = BOOKMARK_PRIVATE_NOTE_MAX;
