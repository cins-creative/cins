import { facebookDisplayLabel } from "@/lib/truong/chi-nhanh";
import type { TruongListItem } from "@/lib/truong/types";

/** Mã enum `tinh_thanh_vn_enum` trên Supabase (không trùng slug UI cũ). */
const TINH_THANH_ALLOWED = [
  "hcm",
  "ha_noi",
  "da_nang",
  "can_tho",
  "hai_phong",
  "dong_nai",
] as const;

export type TinhThanhCode = (typeof TINH_THANH_ALLOWED)[number];

/** Alias / mã cũ trong code hoặc dữ liệu legacy → mã enum DB. */
const TINH_THANH_ALIASES: Record<string, TinhThanhCode> = {
  ho_chi_minh: "hcm",
  "tp.hcm": "hcm",
  tp_hcm: "hcm",
  tphcm: "hcm",
  "tp ho chi minh": "hcm",
  hn: "ha_noi",
  hanoi: "ha_noi",
  danang: "da_nang",
  dn: "da_nang",
  cantho: "can_tho",
  haiphong: "hai_phong",
  dongnai: "dong_nai",
  binh_duong: "dong_nai",
  binhduong: "dong_nai",
};

export const TINH_THANH_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "— Chưa chọn —" },
  { value: "hcm", label: "TP. Hồ Chí Minh" },
  { value: "ha_noi", label: "Hà Nội" },
  { value: "da_nang", label: "Đà Nẵng" },
  { value: "can_tho", label: "Cần Thơ" },
  { value: "hai_phong", label: "Hải Phòng" },
  { value: "dong_nai", label: "Đồng Nai" },
];

const TINH_THANH_LABELS: Record<string, string> = {
  hcm: "TP. Hồ Chí Minh",
  ho_chi_minh: "TP. Hồ Chí Minh",
  ha_noi: "Hà Nội",
  da_nang: "Đà Nẵng",
  can_tho: "Cần Thơ",
  hai_phong: "Hải Phòng",
  dong_nai: "Đồng Nai",
  binh_duong: "Bình Dương",
};

export function labelTinhThanh(code: string | null | undefined): string | null {
  const key = (code ?? "").trim().toLowerCase();
  if (!key) return null;
  if (TINH_THANH_LABELS[key]) return TINH_THANH_LABELS[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Chuẩn hóa trước khi PATCH — tránh lỗi enum DB (vd. \"HCM\" → ho_chi_minh). */
export function normalizeTinhThanhForDb(value: unknown): string | null {
  if (value === "" || value === undefined || value === null) return null;
  const key = String(value).trim().toLowerCase();
  if (!key) return null;
  if ((TINH_THANH_ALLOWED as readonly string[]).includes(key)) {
    return key;
  }
  const alias = TINH_THANH_ALIASES[key];
  if (alias) return alias;
  return null;
}

export type TruongContactLine = {
  kind: "address" | "phone" | "email" | "web" | "facebook";
  label: string;
  value: string;
  href?: string;
};

export function buildTruongContactLines(
  school: Pick<
    TruongListItem,
    | "website"
    | "facebook"
    | "dia_chi"
    | "chi_nhanh"
    | "dien_thoai"
    | "email_lien_he"
    | "tinh_thanh"
  >,
  options?: { includeAddress?: boolean },
): TruongContactLine[] {
  const lines: TruongContactLine[] = [];
  const includeAddress = options?.includeAddress ?? true;

  if (includeAddress) {
    const addressParts: string[] = [];
    if (school.dia_chi?.trim()) addressParts.push(school.dia_chi.trim());
    const city = labelTinhThanh(school.tinh_thanh);
    if (city) addressParts.push(city);
    if (addressParts.length > 0) {
      lines.push({
        kind: "address",
        label: "Địa chỉ",
        value: addressParts.join(", "),
      });
    }
  }

  const phone = school.dien_thoai?.trim();
  if (phone) {
    const tel = phone.replace(/\s+/g, "");
    lines.push({
      kind: "phone",
      label: "Điện thoại",
      value: phone,
      href: `tel:${tel}`,
    });
  }

  const email = school.email_lien_he?.trim();
  if (email) {
    lines.push({
      kind: "email",
      label: "Email",
      value: email,
      href: `mailto:${email}`,
    });
  }

  const web = school.website?.trim();
  if (web) {
    const href = web.startsWith("http") ? web : `https://${web}`;
    const display = web.replace(/^https?:\/\//, "").replace(/\/$/, "");
    lines.push({
      kind: "web",
      label: "Website",
      value: display,
      href,
    });
  }

  const facebook = school.facebook?.trim();
  if (facebook) {
    lines.push({
      kind: "facebook",
      label: "Facebook",
      value: facebookDisplayLabel(facebook),
      href: facebook.startsWith("http") ? facebook : `https://${facebook}`,
    });
  }

  return lines;
}

export function hasTruongContactInfo(
  school: Parameters<typeof buildTruongContactLines>[0],
): boolean {
  return buildTruongContactLines(school).length > 0;
}
