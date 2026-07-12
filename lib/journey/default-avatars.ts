/**
 * Avatar mặc định onboard — file tĩnh trong `/public/avatars/default/`.
 * Lưu `user_nguoi_dung.avatar_id` dạng `default-man` / `default-cins-01`…
 * (không phải Cloudflare UUID). Resolve URL qua `getDefaultAvatarUrl`.
 */

const FILE_BY_ID = {
  "default-man": "man.jpg",
  "default-woman": "woman.jpg",
  "default-khac": "khac.jpg",
  "default-cins-01": "cins-01.jpg",
  "default-cins-02": "cins-02.jpg",
  "default-cins-03": "cins-03.jpg",
  "default-cins-04": "cins-04.jpg",
  "default-cins-05": "cins-05.jpg",
  "default-cins-06": "cins-06.jpg",
  "default-cins-07": "cins-07.jpg",
  "default-cins-08": "cins-08.jpg",
  "default-meme-01": "meme-01.jpg",
  "default-meme-02": "meme-02.jpg",
  "default-meme-03": "meme-03.jpg",
  "default-meme-04": "meme-04.jpg",
  "default-meme-cute-07": "meme-cute-07.jpg",
  "default-meme-cute-25": "meme-cute-25.jpg",
  "default-meme-cuoi": "meme-cuoi.jpg",
  "default-meme-hot": "meme-hot.jpg",
} as const;

export type DefaultAvatarId = keyof typeof FILE_BY_ID;

/** Tất cả path public — dùng preload khi vào bước avatar. */
export const DEFAULT_AVATAR_PATHS: ReadonlyArray<string> = Object.values(
  FILE_BY_ID,
).map((file) => `/avatars/default/${file}`);

/** Map giới tính → avatar mặc định khi user chưa chọn tay. */
export type GioiTinhOnboarding = "nam" | "nu" | "khong_muon_noi";

/** Thứ tự hiển thị: giới tính → CINs → meme. */
export const DEFAULT_AVATAR_OPTIONS: ReadonlyArray<{
  id: DefaultAvatarId;
  label: string;
}> = [
  { id: "default-man", label: "Nam" },
  { id: "default-woman", label: "Nữ" },
  { id: "default-khac", label: "Khác" },
  { id: "default-cins-01", label: "CINs 01" },
  { id: "default-cins-02", label: "CINs 02" },
  { id: "default-cins-03", label: "CINs 03" },
  { id: "default-cins-04", label: "CINs 04" },
  { id: "default-cins-05", label: "CINs 05" },
  { id: "default-cins-06", label: "CINs 06" },
  { id: "default-cins-07", label: "CINs 07" },
  { id: "default-cins-08", label: "CINs 08" },
  { id: "default-meme-01", label: "Meme 01" },
  { id: "default-meme-02", label: "Meme 02" },
  { id: "default-meme-03", label: "Meme 03" },
  { id: "default-meme-04", label: "Meme 04" },
  { id: "default-meme-cute-07", label: "Meme cute" },
  { id: "default-meme-cute-25", label: "Meme cute 25" },
  { id: "default-meme-cuoi", label: "Meme cười" },
  { id: "default-meme-hot", label: "Meme hot" },
];

const ID_SET = new Set<string>(Object.keys(FILE_BY_ID));

export function isDefaultAvatarId(
  value: string | null | undefined,
): value is DefaultAvatarId {
  return typeof value === "string" && ID_SET.has(value);
}

export function getDefaultAvatarPublicPath(id: DefaultAvatarId): string {
  return `/avatars/default/${FILE_BY_ID[id]}`;
}

/** Resolve `default-*` → path public; khác → null (để caller fallback Cloudflare). */
export function getDefaultAvatarUrl(
  avatarId: string | null | undefined,
): string | null {
  if (!isDefaultAvatarId(avatarId)) return null;
  return getDefaultAvatarPublicPath(avatarId);
}

export function defaultAvatarForGioiTinh(
  gioiTinh: GioiTinhOnboarding | null,
): DefaultAvatarId | null {
  if (gioiTinh === "nam") return "default-man";
  if (gioiTinh === "nu") return "default-woman";
  if (gioiTinh === "khong_muon_noi") return "default-khac";
  return null;
}
