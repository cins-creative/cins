/**
 * Palette cố định cho thẻ tài nguyên phòng chat.
 * Không trùng tint “purple AI default”; đủ tách biệt trên nền trắng.
 */
export const ROOM_TAG_COLOR_PALETTE = [
  "#1f74c9", // blue
  "#0d9488", // teal
  "#c2410c", // burnt orange
  "#15803d", // green
  "#b45309", // amber
  "#be123c", // rose
  "#0369a1", // sky deep
  "#a16207", // gold brown
  "#0f766e", // dark teal
  "#9a3412", // rust
  "#4d7c0f", // olive
  "#9f1239", // crimson
] as const;

function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!/^#([0-9a-fA-F]{6})$/.test(raw)) return null;
  return raw.toLowerCase();
}

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Màu hiển thị ổn định: ưu tiên `mau` DB, không có thì hash theo id. */
export function resolveRoomTagColor(
  tagId: string,
  mau?: string | null,
): string {
  const stored = normalizeHex(mau);
  if (stored) return stored;
  const idx = hashSeed(tagId) % ROOM_TAG_COLOR_PALETTE.length;
  return ROOM_TAG_COLOR_PALETTE[idx]!;
}

/**
 * Chọn màu mới khi tạo thẻ: ưu tiên màu palette chưa dùng trong phòng,
 * nếu hết thì random trong palette.
 */
export function pickRoomTagColor(usedColors: Array<string | null | undefined>): string {
  const used = new Set(
    usedColors
      .map((c) => normalizeHex(c))
      .filter((c): c is string => Boolean(c)),
  );
  const available = ROOM_TAG_COLOR_PALETTE.filter((c) => !used.has(c));
  const pool = available.length > 0 ? available : [...ROOM_TAG_COLOR_PALETTE];
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx]!;
}

/** Style chip/pill theo màu thẻ (filter, badge, nút gắn). */
export function roomTagChipStyle(
  color: string,
  opts?: { active?: boolean },
): { borderColor: string; background: string; color: string } {
  const active = opts?.active ?? false;
  if (active) {
    return {
      borderColor: color,
      background: color,
      color: "#fff",
    };
  }
  return {
    borderColor: color,
    background: `color-mix(in srgb, ${color} 14%, #fff)`,
    color,
  };
}
