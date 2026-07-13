import "server-only";

import { getAvatarUrl } from "@/lib/journey/profile";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { orgJobPath } from "@/lib/to-chuc/tuyen-dung-href";
import { formatStudioDateShort } from "@/lib/to-chuc/studio-tuyen-dung-format";
import {
  capDoLabels,
  normalizeCapDo,
} from "@/lib/to-chuc/studio-tuyen-dung-distribution";
import {
  STUDIO_JOB_LOAI_HINH_LABEL,
  type StudioJobLoaiHinh,
} from "@/lib/to-chuc/studio-tuyen-dung-types";

export type TuyenDungListItem = {
  id: string;
  tieuDe: string;
  moTaNgan: string | null;
  orgTen: string;
  orgSlug: string | null;
  avatarUrl: string | null;
  /** Loại hình raw (toan_thoi_gian…) dùng cho bộ lọc. */
  loaiHinh: StudioJobLoaiHinh;
  loaiHinhLabel: string;
  place: string;
  /** Tin cho phép làm từ xa — dùng cho bộ lọc nơi làm. */
  remote: boolean;
  linhVucTen: string | null;
  /** Cấp độ raw (junior…) dùng cho bộ lọc; `capDo` là nhãn hiển thị. */
  capDoValues: string[];
  capDo: string[];
  /** Lương thấp/cao nhất (VND, null nếu ẩn lương) dùng cho bộ lọc mức lương. */
  salaryMin: number | null;
  salaryMax: number | null;
  salary: string | null;
  /** Hạn nộp dạng ngắn "dd/mm/yyyy" (null nếu không có hạn). */
  deadline: string | null;
  /** Ngày đăng tin dạng ngắn "dd/mm/yyyy". */
  posted: string | null;
  /** Tin đã qua hạn nộp (dù trạng thái vẫn "đang mở"). */
  expired: boolean;
  href: string | null;
};

export type TuyenDungListing = {
  items: TuyenDungListItem[];
  total: number;
};

type OrgEmbed = {
  ten: string | null;
  slug: string | null;
  avatar_id: string | null;
  loai_to_chuc: string | null;
};

type Row = {
  id: string;
  tieu_de: string;
  mo_ta_ngan: string | null;
  loai_hinh: string | null;
  cap_do: string[] | string | null;
  tinh_thanh: string | null;
  lam_tu_xa: boolean | null;
  muc_luong_tu: number | null;
  muc_luong_den: number | null;
  hien_thi_luong: boolean | null;
  han_nop: string | null;
  tao_luc: string | null;
  org_to_chuc: OrgEmbed | OrgEmbed[] | null;
  linh_vuc?: { ten: string | null } | { ten: string | null }[] | null;
};

const TUYEN_DUNG_LIST_SELECT =
  "id, tieu_de, mo_ta_ngan, loai_hinh, cap_do, tinh_thanh, lam_tu_xa, muc_luong_tu, muc_luong_den, hien_thi_luong, han_nop, tao_luc, org_to_chuc:org_to_chuc!inner(ten, slug, avatar_id, loai_to_chuc), linh_vuc:linh_vuc(ten)";

/** Tin đã qua hạn nộp (kết thúc sau 23:59:59 ngày hạn). */
function isExpired(hanNop: string | null): boolean {
  if (!hanNop) return false;
  const d = new Date(hanNop);
  if (Number.isNaN(d.getTime())) return false;
  d.setHours(23, 59, 59, 999);
  return d.getTime() < Date.now();
}

function pickOrg(org: Row["org_to_chuc"]): OrgEmbed | null {
  if (!org) return null;
  return Array.isArray(org) ? org[0] ?? null : org;
}

function pickLinhVuc(linhVuc: Row["linh_vuc"]): string | null {
  if (!linhVuc) return null;
  const row = Array.isArray(linhVuc) ? linhVuc[0] : linhVuc;
  return row?.ten?.trim() || null;
}

function place(row: Row): string {
  if (row.lam_tu_xa) return "Remote";
  return row.tinh_thanh ? row.tinh_thanh.replace(/_/g, " ") : "Linh hoạt";
}

function salary(row: Row): string | null {
  if (row.hien_thi_luong === false) return null;
  const fmt = (n: number) => n.toLocaleString("vi-VN");
  if (row.muc_luong_tu && row.muc_luong_den) {
    return `${fmt(row.muc_luong_tu)} – ${fmt(row.muc_luong_den)} đ`;
  }
  if (row.muc_luong_tu) return `Từ ${fmt(row.muc_luong_tu)} đ`;
  if (row.muc_luong_den) return `Đến ${fmt(row.muc_luong_den)} đ`;
  return null;
}

/**
 * Tin tuyển dụng đang mở toàn sàn cho trang `/tuyen-dung`.
 * Public read — chỉ tin `trang_thai = dang_mo`, chưa xóa. Có phân trang.
 */
export async function loadTuyenDungListing(
  limit = 24,
  offset = 0,
): Promise<TuyenDungListing> {
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error, count } = await supabase
      .from("org_tuyen_dung")
      .select(TUYEN_DUNG_LIST_SELECT, { count: "exact" })
      .eq("da_xoa", false)
      .eq("trang_thai", "dang_mo")
      .order("tao_luc", { ascending: false })
      .range(offset, offset + limit - 1)
      .returns<Row[]>();

    if (error || !data) return { items: [], total: 0 };

    const items = data.map((row): TuyenDungListItem => {
      const org = pickOrg(row.org_to_chuc);
      const orgSlug = org?.slug ?? null;
      const loaiRaw = row.loai_hinh ?? "toan_thoi_gian";
      const loai = (
        loaiRaw in STUDIO_JOB_LOAI_HINH_LABEL ? loaiRaw : "toan_thoi_gian"
      ) as StudioJobLoaiHinh;
      const luongVisible = row.hien_thi_luong !== false;
      return {
        id: row.id,
        tieuDe: row.tieu_de,
        moTaNgan: row.mo_ta_ngan?.trim() || null,
        orgTen: org?.ten ?? "Tổ chức",
        orgSlug,
        avatarUrl: getAvatarUrl(org?.avatar_id),
        loaiHinh: loai,
        loaiHinhLabel: STUDIO_JOB_LOAI_HINH_LABEL[loai],
        place: place(row),
        remote: Boolean(row.lam_tu_xa) || loai === "remote",
        linhVucTen: pickLinhVuc(row.linh_vuc),
        capDoValues: normalizeCapDo(row.cap_do),
        capDo: capDoLabels(row.cap_do),
        salaryMin: luongVisible ? row.muc_luong_tu : null,
        salaryMax: luongVisible ? row.muc_luong_den : null,
        salary: salary(row),
        deadline: formatStudioDateShort(row.han_nop),
        posted: formatStudioDateShort(row.tao_luc),
        expired: isExpired(row.han_nop),
        href: orgSlug ? orgJobPath(org?.loai_to_chuc, orgSlug, row.id) : null,
      };
    });

    return { items, total: count ?? items.length };
  } catch {
    return { items: [], total: 0 };
  }
}
