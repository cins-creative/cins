import { labelTinhThanh, normalizeTinhThanhForDb } from "@/lib/truong/contact";
import type { TruongChiNhanh, TruongListItem } from "@/lib/truong/types";

export const CHI_NHANH_MAX = 40;
export const CHI_NHANH_SIDEBAR_PREVIEW = 3;
export const CHI_NHANH_TEN_MAX = 80;
export const CHI_NHANH_DIA_CHI_MAX = 240;

export function newChiNhanhId(): string {
  return `cn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyChiNhanh(): TruongChiNhanh {
  return {
    id: newChiNhanhId(),
    ten: "",
    dia_chi: "",
    tinh_thanh: null,
    dien_thoai: null,
  };
}

export function parseChiNhanhFromCauHinh(raw: unknown): TruongChiNhanh[] | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const list = (raw as { chi_nhanh?: unknown }).chi_nhanh;
  if (!Array.isArray(list)) return null;
  const out: TruongChiNhanh[] = [];
  for (const item of list) {
    const n = normalizeChiNhanh(item as TruongChiNhanh);
    if (n) out.push(n);
  }
  return out.length ? out : null;
}

export function normalizeChiNhanh(raw: TruongChiNhanh): TruongChiNhanh | null {
  const ten = raw.ten?.trim().slice(0, CHI_NHANH_TEN_MAX) ?? "";
  const dia_chi = raw.dia_chi?.trim().slice(0, CHI_NHANH_DIA_CHI_MAX) ?? "";
  if (!ten || !dia_chi) return null;
  const tinh_thanh = normalizeTinhThanhForDb(raw.tinh_thanh);
  const dien_thoai = raw.dien_thoai?.trim() || null;
  return {
    id: raw.id?.trim() || newChiNhanhId(),
    ten,
    dia_chi,
    tinh_thanh,
    dien_thoai,
  };
}

export function normalizeChiNhanhList(list: TruongChiNhanh[]): TruongChiNhanh[] {
  return list
    .map((item) => normalizeChiNhanh(item))
    .filter((item): item is TruongChiNhanh => item != null)
    .slice(0, CHI_NHANH_MAX);
}

/** Legacy: một địa chỉ cột `dia_chi` → một chi nhánh mặc định. */
export function legacyChiNhanhFromContact(
  school: Pick<TruongListItem, "dia_chi" | "tinh_thanh">,
): TruongChiNhanh[] {
  const dia_chi = school.dia_chi?.trim();
  if (!dia_chi) return [];
  return [
    {
      id: "legacy-primary",
      ten: "Cơ sở chính",
      dia_chi,
      tinh_thanh: normalizeTinhThanhForDb(school.tinh_thanh),
      dien_thoai: null,
    },
  ];
}

export function resolveTruongChiNhanh(
  school: Pick<TruongListItem, "chi_nhanh" | "dia_chi" | "tinh_thanh">,
): TruongChiNhanh[] {
  if (school.chi_nhanh?.length) return school.chi_nhanh;
  return legacyChiNhanhFromContact(school);
}

export function formatChiNhanhAddress(branch: TruongChiNhanh): string {
  const parts: string[] = [branch.dia_chi.trim()];
  const city = labelTinhThanh(branch.tinh_thanh);
  if (city) parts.push(city);
  return parts.join(", ");
}

export function mergeChiNhanhIntoCauHinh(
  existing: unknown,
  chi_nhanh: TruongChiNhanh[],
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return {
    ...base,
    chi_nhanh: normalizeChiNhanhList(chi_nhanh),
  };
}

export function primaryContactFromChiNhanh(
  chi_nhanh: TruongChiNhanh[],
): { dia_chi: string | null; tinh_thanh: string | null } {
  const primary = normalizeChiNhanhList(chi_nhanh)[0];
  if (!primary) return { dia_chi: null, tinh_thanh: null };
  return {
    dia_chi: primary.dia_chi,
    tinh_thanh: primary.tinh_thanh,
  };
}

const FACEBOOK_URL_MAX = 500;

export function normalizeFacebookUrl(value: unknown): string | null {
  const raw = String(value ?? "").trim().slice(0, FACEBOOK_URL_MAX);
  if (!raw) return null;

  let href = raw;
  if (!/^https?:\/\//i.test(href)) {
    if (/facebook\.com|fb\.com/i.test(raw)) {
      href = `https://${raw.replace(/^\/+/, "")}`;
    } else {
      const slug = raw.replace(/^@/, "").replace(/^\/+/, "");
      if (!slug) return null;
      href = `https://facebook.com/${slug}`;
    }
  }

  try {
    const u = new URL(href);
    if (!/facebook\.com|fb\.com/i.test(u.hostname)) return null;
    return u.href.replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function parseFacebookFromCauHinh(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return normalizeFacebookUrl((raw as { facebook?: unknown }).facebook);
}

export function facebookDisplayLabel(url: string): string {
  const trimmed = url.trim();
  try {
    const u = new URL(trimmed);
    const path = u.pathname.replace(/^\/+|\/+$/g, "");
    if (path) return path.replace(/\//g, " · ");
    return u.hostname.replace(/^www\./, "");
  } catch {
    return trimmed.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

export function mergeFacebookIntoCauHinh(
  existing: unknown,
  facebook: string | null,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const normalized = normalizeFacebookUrl(facebook);
  if (normalized) {
    base.facebook = normalized;
  } else {
    delete base.facebook;
  }
  return base;
}
