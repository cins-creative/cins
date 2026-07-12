import { getCoverUrl } from "@/lib/articles/cover";
import type { GiaiDoan } from "@/lib/auth/session";
import { getDefaultAvatarUrl } from "@/lib/journey/default-avatars";

/**
 * Helper này pure (không touch DB/secrets) → an toàn import cả client lẫn server.
 * `getAvatarUrl` đọc env Cloudflare; trên client chỉ resolve khi
 * `NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH` được set, ngược lại trả `null`. Để chắc avatar
 * hiển thị, page.tsx (Server Component) nên resolve URL rồi pass xuống Sidebar.
 */

/**
 * Bảng map enum `tinh_thanh_vn_enum` (Supabase) → tên hiển thị tiếng Việt.
 * Đồng bộ với `lib/truong/contact.ts` (34 tỉnh/thành NQ 202/2025/QH15).
 */
const TINH_THANH_LABEL: Record<string, string> = {
  hcm: "TP. Hồ Chí Minh",
  ha_noi: "Hà Nội",
  da_nang: "Đà Nẵng",
  an_giang: "An Giang",
  bac_ninh: "Bắc Ninh",
  ca_mau: "Cà Mau",
  can_tho: "Cần Thơ",
  cao_bang: "Cao Bằng",
  dak_lak: "Đắk Lắk",
  dien_bien: "Điện Biên",
  dong_nai: "Đồng Nai",
  dong_thap: "Đồng Tháp",
  gia_lai: "Gia Lai",
  ha_tinh: "Hà Tĩnh",
  hai_phong: "Hải Phòng",
  hung_yen: "Hưng Yên",
  hue: "Huế",
  khanh_hoa: "Khánh Hòa",
  lai_chau: "Lai Châu",
  lam_dong: "Lâm Đồng",
  lang_son: "Lạng Sơn",
  lao_cai: "Lào Cai",
  nghe_an: "Nghệ An",
  ninh_binh: "Ninh Bình",
  phu_tho: "Phú Thọ",
  quang_ngai: "Quảng Ngãi",
  quang_ninh: "Quảng Ninh",
  quang_tri: "Quảng Trị",
  son_la: "Sơn La",
  tay_ninh: "Tây Ninh",
  thai_nguyen: "Thái Nguyên",
  thanh_hoa: "Thanh Hóa",
  tuyen_quang: "Tuyên Quang",
  vinh_long: "Vĩnh Long",
  // Legacy aliases (hiển thị)
  ho_chi_minh: "TP. Hồ Chí Minh",
  binh_duong: "TP. Hồ Chí Minh",
};

export function formatTinhThanh(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (TINH_THANH_LABEL[key]) return TINH_THANH_LABEL[key];
  return key
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * `mxh_links` JSONB schema chưa cố định. Hỗ trợ 2 dạng:
 *  - Object map: `{ behance: "https://…", instagram: "…" }`
 *  - Array link list: `[{ label, url, icon? }, …]`
 *
 * Trả về list normalized để render trong sidebar.
 */
export type SocialLink = {
  label: string;
  url: string;
  ico: string;
};

const PLATFORM_META: Record<string, { label: string; ico: string }> = {
  behance: { label: "Behance", ico: "Be" },
  instagram: { label: "Instagram", ico: "Ig" },
  facebook: { label: "Facebook", ico: "Fb" },
  youtube: { label: "YouTube", ico: "Yt" },
  twitter: { label: "X", ico: "X" },
  x: { label: "X", ico: "X" },
  linkedin: { label: "LinkedIn", ico: "Li" },
  tiktok: { label: "TikTok", ico: "Tk" },
  artstation: { label: "ArtStation", ico: "As" },
  dribbble: { label: "Dribbble", ico: "Dr" },
  pinterest: { label: "Pinterest", ico: "Pi" },
  github: { label: "GitHub", ico: "Gh" },
  website: { label: "Website", ico: "🔗" },
};

function platformFromUrl(url: string): { label: string; ico: string } {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    for (const key of Object.keys(PLATFORM_META)) {
      if (host.includes(key)) return PLATFORM_META[key]!;
    }
    return { label: host, ico: "🔗" };
  } catch {
    return { label: url, ico: "🔗" };
  }
}

export function normalizeSocialLinks(
  raw: unknown,
): SocialLink[] {
  if (!raw) return [];
  const out: SocialLink[] = [];

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      const url = typeof obj.url === "string" ? obj.url.trim() : "";
      if (!url) continue;
      const labelExplicit = typeof obj.label === "string" ? obj.label : "";
      const platform = platformFromUrl(url);
      out.push({
        label: labelExplicit || platform.label,
        url,
        ico: typeof obj.icon === "string" ? obj.icon : platform.ico,
      });
    }
    return out;
  }

  if (typeof raw === "object") {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const url = typeof value === "string" ? value.trim() : "";
      if (!url) continue;
      const meta = PLATFORM_META[key.toLowerCase()] || platformFromUrl(url);
      out.push({ label: meta.label, url, ico: meta.ico });
    }
  }

  return out;
}

/**
 * Avatar → URL.
 *  - `default-*` → file tĩnh `/avatars/default/…` (onboarding)
 *  - còn lại → Cloudflare Images variant `avatar`
 */
export function getAvatarUrl(
  avatarId: string | null | undefined,
): string | null {
  const local = getDefaultAvatarUrl(avatarId);
  if (local) return local;
  return getCoverUrl(avatarId, "avatar");
}

/** Cover Cloudflare → URL. Variant `cover` hoặc `public`. */
export function getProfileCoverUrl(
  coverId: string | null | undefined,
): string | null {
  return getCoverUrl(coverId, "public");
}

/** Initials fallback khi không có avatar — chữ cái đầu của 1-2 từ trong tên. */
export function getNameInitials(
  tenHienThi: string | null | undefined,
  slug: string,
): string {
  const src = (tenHienThi || slug || "C").trim();
  const words = src.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "C";
  if (words.length === 1) return words[0]!.charAt(0).toUpperCase();
  return (words[0]!.charAt(0) + words[words.length - 1]!.charAt(0))
    .toUpperCase();
}

/** Stage label cho dòng "vai trò" dưới tên. */
const GIAI_DOAN_LABEL: Record<GiaiDoan, string> = {
  moi_bat_dau: "Mới bắt đầu",
  dang_hoc: "Đang học",
  dang_lam: "Đang làm",
  tim_viec: "Đang tìm việc",
  freelance: "Freelance",
  dang_day: "Giáo viên",
};
export function getGiaiDoanLabel(g: GiaiDoan | null): string {
  return g ? GIAI_DOAN_LABEL[g] : "Đang khởi tạo hồ sơ";
}
