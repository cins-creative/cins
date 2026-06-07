/** Phần tên vị trí ngắn trước ngoặc — "Director (Đạo diễn phim)" → "Director". */
export function extractNgheRoleShort(displayTitle: string): string {
  const title = displayTitle.trim();
  const beforeParen = title.split("(")[0]?.trim() ?? "";
  return beforeParen || title;
}

/** Parse `vai_tro` đã lưu — "Phim - Director" hoặc "Director". */
export function parseStoredCoAuthorRole(value: string): {
  linhVucHint: string | null;
  rolePart: string;
} {
  const trimmed = value.trim();
  const sep = " - ";
  const idx = trimmed.indexOf(sep);
  if (idx > 0) {
    return {
      linhVucHint: trimmed.slice(0, idx).trim() || null,
      rolePart: trimmed.slice(idx + sep.length).trim(),
    };
  }
  return { linhVucHint: null, rolePart: trimmed };
}

export function formatNgheRoleLabel(
  linhVucTen: string | null | undefined,
  roleTitle: string,
): string {
  const role = roleTitle.trim();
  if (!role) return "";
  const lv = linhVucTen?.trim();
  return lv ? `${lv} - ${role}` : role;
}
