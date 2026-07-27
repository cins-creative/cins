/**
 * 10 nick seeding Autopilot — chỉ các slug này được đăng qua API nội bộ.
 * Có thể mở rộng bằng env `CINS_NICK_SEED_SLUGS` (csv).
 */
export const NICK_SEED_MAC_DINH = [
  "kiritominh",
  "hinatavy",
  "yukitrang",
  "levikhoa",
  "itachihung",
  "sakuralinh",
  "zorobao",
  "remnhi",
  "nezukochi",
  "mikungoc",
] as const;

export type NickSeedSlug = (typeof NICK_SEED_MAC_DINH)[number];

export function danhSachNickSeedChoPhep(): ReadonlySet<string> {
  const extra = process.env.CINS_NICK_SEED_SLUGS?.trim();
  const fromEnv = extra
    ? extra
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : [];
  return new Set<string>([...NICK_SEED_MAC_DINH, ...fromEnv]);
}

export function laNickSeedChoPhep(slug: string | null | undefined): boolean {
  const trimmed = slug?.trim().toLowerCase();
  if (!trimmed) return false;
  return danhSachNickSeedChoPhep().has(trimmed);
}
