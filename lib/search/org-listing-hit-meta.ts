import "server-only";

import type { ScoredSearchItem } from "@/lib/search/ranking";
import { stripHtmlToPlainText } from "@/lib/search/helpers";
import type { SearchHit } from "@/lib/search/types";
import { coSoKhoaHocDetailPath } from "@/lib/to-chuc/co-so-routes";
import { orgJobPath } from "@/lib/to-chuc/tuyen-dung-href";
import { parseKhoaHocNoiDungBlocks } from "@/lib/to-chuc/khoa-hoc-meta-blocks";
import { STUDIO_JOB_LOAI_HINH_LABEL } from "@/lib/to-chuc/studio-tuyen-dung-types";
import { resolveTruongImageSrcSync } from "@/lib/truong/media-url";

type OrgEmbed = {
  slug?: string | null;
  ten?: string | null;
  loai_to_chuc?: string | null;
  avatar_id?: string | null;
};

function pickEmbed<T>(embed: T | T[] | null | undefined): T | null {
  if (!embed) return null;
  return Array.isArray(embed) ? embed[0] ?? null : embed;
}

function orgAvatar(avatarId: string | null | undefined): string | null {
  return avatarId
    ? resolveTruongImageSrcSync(avatarId, ["public", "avatar"])
    : null;
}

/* ── Khóa học ─────────────────────────────────────────────── */

const TRINH_DO_LABEL: Record<string, string> = {
  co_ban: "Cơ bản",
  trung_cap: "Trung cấp",
  nang_cao: "Nâng cao",
  khong_yeu_cau: "Không yêu cầu",
};

function formatHocPhi(hocPhi: unknown): string | null {
  if (hocPhi == null) return "Liên hệ";
  const n = Number(hocPhi);
  if (Number.isNaN(n)) return "Liên hệ";
  if (n <= 0) return "Miễn phí";
  return `${n.toLocaleString("vi-VN")} đ`;
}

export const KHOA_HOC_SEARCH_SELECT = `
  id,
  slug,
  ten_khoa_hoc,
  mo_ta,
  trinh_do_dau_vao,
  hoc_phi,
  avatar_id,
  cover_id,
  noi_dung_blocks,
  org_to_chuc:org_to_chuc!inner ( slug, ten, loai_to_chuc, avatar_id )
`;

export const KHOA_HOC_SEARCH_SELECT_NO_BLOCKS = `
  id,
  slug,
  ten_khoa_hoc,
  mo_ta,
  trinh_do_dau_vao,
  hoc_phi,
  avatar_id,
  cover_id,
  org_to_chuc:org_to_chuc!inner ( slug, ten, loai_to_chuc, avatar_id )
`;

export function buildKhoaHocSearchItem(
  row: Record<string, unknown>,
  trigramSim = 0,
): ScoredSearchItem | null {
  const org = pickEmbed(row.org_to_chuc as OrgEmbed | OrgEmbed[] | null);
  const orgSlug = String(org?.slug ?? "").trim();
  if (!orgSlug) return null;

  // Bỏ khóa ẩn (chế độ hiển thị "an") — lưu trong noi_dung_blocks.
  if ("noi_dung_blocks" in row) {
    const parsed = parseKhoaHocNoiDungBlocks(row.noi_dung_blocks);
    if (parsed.cheDoHienThi === "an") return null;
  }

  const courseSlug = String(row.slug ?? "").trim();
  if (!courseSlug) return null;

  const title = String(row.ten_khoa_hoc ?? "").trim() || "Khóa học";
  const moTa = row.mo_ta ? String(row.mo_ta).trim() : null;
  const orgTen = org?.ten ? String(org.ten).trim() : orgSlug;
  const trinhDo = String(row.trinh_do_dau_vao ?? "").trim();
  const trinhDoLabel =
    trinhDo && trinhDo !== "khong_yeu_cau"
      ? TRINH_DO_LABEL[trinhDo] ?? null
      : null;

  const coverUrl =
    resolveTruongImageSrcSync(
      row.cover_id ? String(row.cover_id) : null,
      ["public", "cover", "medium"],
    ) ??
    resolveTruongImageSrcSync(
      row.avatar_id ? String(row.avatar_id) : null,
      ["public", "avatar", "medium"],
    );

  const hit: SearchHit = {
    id: String(row.id),
    kind: "khoa_hoc",
    title,
    subtitle: orgTen,
    snippet: moTa ? moTa.slice(0, 160) : null,
    href: coSoKhoaHocDetailPath(orgSlug, courseSlug),
    avatarUrl: orgAvatar(org?.avatar_id),
    badge: "Khóa học",
    entityLoai: null,
    slug: courseSlug,
    courseMeta: {
      coverUrl,
      orgTen,
      orgAvatarUrl: orgAvatar(org?.avatar_id),
      hocPhi: formatHocPhi(row.hoc_phi),
      trinhDoLabel,
    },
  };

  return {
    trigramSim,
    fields: {
      title,
      slug: courseSlug,
      summary: moTa,
    },
    hit,
  };
}

/* ── Tin tuyển dụng ───────────────────────────────────────── */

function formatJobSalary(row: Record<string, unknown>): string | null {
  if (row.hien_thi_luong === false) return null;
  const fmt = (n: number) => n.toLocaleString("vi-VN");
  const tu = row.muc_luong_tu != null ? Number(row.muc_luong_tu) : null;
  const den = row.muc_luong_den != null ? Number(row.muc_luong_den) : null;
  if (tu && den) return `${fmt(tu)} – ${fmt(den)} đ`;
  if (tu) return `Từ ${fmt(tu)} đ`;
  if (den) return `Đến ${fmt(den)} đ`;
  return null;
}

function jobPlace(row: Record<string, unknown>): string {
  if (row.lam_tu_xa) return "Remote";
  const tinh = row.tinh_thanh ? String(row.tinh_thanh).trim() : "";
  return tinh ? tinh.replace(/_/g, " ") : "Linh hoạt";
}

export const TUYEN_DUNG_SEARCH_SELECT = `
  id,
  tieu_de,
  mo_ta_ngan,
  mo_ta,
  loai_hinh,
  tinh_thanh,
  lam_tu_xa,
  muc_luong_tu,
  muc_luong_den,
  hien_thi_luong,
  org_to_chuc:org_to_chuc!inner ( slug, ten, loai_to_chuc, avatar_id )
`;

export function buildTuyenDungSearchItem(
  row: Record<string, unknown>,
  trigramSim = 0,
): ScoredSearchItem | null {
  const org = pickEmbed(row.org_to_chuc as OrgEmbed | OrgEmbed[] | null);
  const orgSlug = String(org?.slug ?? "").trim();
  if (!orgSlug) return null;

  const title = String(row.tieu_de ?? "").trim() || "Tin tuyển dụng";
  const moTaNgan = row.mo_ta_ngan ? String(row.mo_ta_ngan).trim() : null;
  const moTaPlain =
    moTaNgan ?? stripHtmlToPlainText(row.mo_ta ? String(row.mo_ta) : null);
  const orgTen = org?.ten ? String(org.ten).trim() : orgSlug;
  const loai = String(row.loai_hinh ?? "toan_thoi_gian");
  const loaiHinhLabel =
    STUDIO_JOB_LOAI_HINH_LABEL[
      loai as keyof typeof STUDIO_JOB_LOAI_HINH_LABEL
    ] ?? loai;

  const hit: SearchHit = {
    id: String(row.id),
    kind: "org_tuyen_dung",
    title,
    subtitle: orgTen,
    snippet: moTaPlain ? moTaPlain.slice(0, 160) : null,
    href: orgJobPath(org?.loai_to_chuc, orgSlug, String(row.id)),
    avatarUrl: orgAvatar(org?.avatar_id),
    badge: "Tuyển dụng",
    entityLoai: null,
    slug: orgSlug,
    jobMeta: {
      orgTen,
      orgAvatarUrl: orgAvatar(org?.avatar_id),
      salary: formatJobSalary(row),
      loaiHinhLabel,
      place: jobPlace(row),
    },
  };

  return {
    trigramSim,
    fields: {
      title,
      summary: moTaNgan,
      content: moTaPlain,
    },
    hit,
  };
}
