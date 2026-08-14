import type { BatDauHocCardMeta } from "@/components/journey/milestone-types";

/** Card cột mốc «Bắt đầu học {khóa} tại {cơ sở}» — sinh từ ghi danh / học phí. */

export type { BatDauHocCardMeta };

export function isBatDauHocNguonGoc(
  nguonGoc: string | null | undefined,
  loaiMoc: string | null | undefined,
): boolean {
  return nguonGoc === "sinh_tu_hoc_vien_lop" && loaiMoc === "hoc";
}

export function parseBatDauHocAutoTitle(
  title: string,
): { khoaTen: string; orgTen: string } | null {
  const t = title.trim();
  const m = t.match(/^Bắt đầu học\s+(.+?)\s+tại\s+(.+)$/i);
  if (!m) return null;
  const khoaTen = m[1].trim();
  const orgTen = m[2].trim();
  if (!khoaTen || !orgTen) return null;
  /* Câu composer: «Bắt đầu học tại Org với vai trò…» */
  if (/^tại\b/i.test(khoaTen)) return null;
  return { khoaTen, orgTen };
}

export function parseBatDauHocAutoBody(
  body: string | null | undefined,
): { khoaTen: string; orgTen: string } | null {
  if (!body?.trim()) return null;
  const m = body
    .trim()
    .match(/^Học viên bắt đầu khóa\s+(.+?)\s+@\s+(.+?)\.?$/i);
  if (!m) return null;
  const khoaTen = m[1].trim();
  const orgTen = m[2].trim();
  if (!khoaTen || !orgTen) return null;
  return { khoaTen, orgTen };
}

export function buildAcademyKhoaHref(
  orgSlug: string | null | undefined,
  khoaSlug: string | null | undefined,
): string | null {
  const org = orgSlug?.trim();
  const khoa = khoaSlug?.trim();
  if (!org || !khoa) return null;
  return `/academy/${encodeURIComponent(org)}/courses/${encodeURIComponent(khoa)}`;
}

export function resolveBatDauHocCardCopy(input: {
  title: string;
  body?: string | null;
  orgName?: string | null;
  meta?: BatDauHocCardMeta | null;
}): { khoaTen: string; orgTen: string } {
  if (input.meta?.khoaTen && input.meta.orgTen) {
    return { khoaTen: input.meta.khoaTen, orgTen: input.meta.orgTen };
  }
  const parsed =
    parseBatDauHocAutoTitle(input.title) ?? parseBatDauHocAutoBody(input.body);
  if (parsed) return parsed;
  const orgTen = input.orgName?.trim() || input.meta?.orgTen || "Cơ sở đào tạo";
  const stripped = input.title
    .replace(/^Bắt đầu học\s+/i, "")
    .replace(/\s+tại\s+.+$/i, "")
    .trim();
  return { khoaTen: stripped || input.title.trim() || "Khóa học", orgTen };
}
