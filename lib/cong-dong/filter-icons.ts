/**
 * Bộ icon Lucide được phép gắn nhãn cộng đồng.
 * Id = kebab-case khớp `lucide-react` / seed mặc định.
 */
export const CONG_DONG_FILTER_ICON_IDS = [
  "palette",
  "help-circle",
  "briefcase",
  "book-open",
  "bell",
  "megaphone",
  "calendar",
  "users",
  "message-circle",
  "image",
  "video",
  "file-text",
  "link",
  "star",
  "heart",
  "map-pin",
  "sparkles",
  "lightbulb",
  "trophy",
  "graduation-cap",
  "code",
  "music",
  "camera",
  "newspaper",
  "shopping-bag",
  "handshake",
  "paperclip",
  "folder",
  "tag",
  "hash",
] as const;

export type CongDongFilterIconId =
  (typeof CONG_DONG_FILTER_ICON_IDS)[number];

const ICON_SET = new Set<string>(CONG_DONG_FILTER_ICON_IDS);

export function isCongDongFilterIconId(
  value: string | null | undefined,
): value is CongDongFilterIconId {
  return !!value && ICON_SET.has(value);
}

/** Chuẩn hoá icon khi tạo/sửa nhãn — rỗng = null; sai id = lỗi. */
export function normalizeCongDongFilterIcon(
  value: string | null | undefined,
):
  | { ok: true; icon: CongDongFilterIconId | null }
  | { ok: false; error: string } {
  if (value == null) return { ok: true, icon: null };
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, icon: null };
  if (!isCongDongFilterIconId(trimmed)) {
    return { ok: false, error: "Icon nhãn không hợp lệ." };
  }
  return { ok: true, icon: trimmed };
}
