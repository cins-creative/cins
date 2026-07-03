import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { GiaiDoan } from "@/lib/cins/home-adaptive/persona";
import { getAvatarUrl } from "@/lib/journey/profile";
import { orgJobPath } from "@/lib/to-chuc/tuyen-dung-href";
import { jobMatchesViewerGiaiDoan } from "@/lib/to-chuc/studio-tuyen-dung-distribution";
import {
  mapStudioJobRow,
  STUDIO_JOB_SELECT,
  type StudioJob,
} from "@/lib/to-chuc/studio-tuyen-dung-types";

export type CoHoiItem = {
  id: string;
  tieuDe: string;
  orgTen: string;
  orgSlug: string | null;
  /** Logo studio tuyển (Cloudflare Images) — null → dùng initials fallback. */
  avatarUrl: string | null;
  loaiHinhLabel: string;
  place: string;
  linhVucTen: string | null;
  salary: string | null;
  /** Dòng meta gộp (fallback) — org · lĩnh vực · nơi làm · loại hình. */
  sub: string;
  href: string | null;
};

const LOAI_HINH_LABEL: Record<string, string> = {
  toan_thoi_gian: "Toàn thời gian",
  ban_thoi_gian: "Bán thời gian",
  remote: "Remote",
  freelance: "Freelance",
  thuc_tap: "Thực tập",
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
  tinh_thanh: string | null;
  lam_tu_xa: boolean | null;
  muc_luong_tu: number | null;
  muc_luong_den: number | null;
  hien_thi_luong: boolean | null;
  giai_doan_muc_tieu: string[] | null;
  hien_thi_co_hoi: boolean | null;
  org_to_chuc: OrgEmbed | OrgEmbed[] | null;
  linh_vuc?: { ten: string | null } | { ten: string | null }[] | null;
};

function pickOrg(org: Row["org_to_chuc"]): OrgEmbed | null {
  if (!org) return null;
  return Array.isArray(org) ? org[0] ?? null : org;
}

function diaDiem(row: Row): string {
  if (row.lam_tu_xa) return "Remote";
  return row.tinh_thanh ? row.tinh_thanh.replace(/_/g, " ") : "Linh hoạt";
}

function formatSalary(row: Row): string | null {
  if (row.hien_thi_luong === false) return null;
  const fmt = (n: number) => n.toLocaleString("vi-VN");
  if (row.muc_luong_tu && row.muc_luong_den) {
    return `${fmt(row.muc_luong_tu)} – ${fmt(row.muc_luong_den)} đ`;
  }
  if (row.muc_luong_tu) return `Từ ${fmt(row.muc_luong_tu)} đ`;
  if (row.muc_luong_den) return `Đến ${fmt(row.muc_luong_den)} đ`;
  return null;
}

function linhVucTen(row: Row): string | null {
  if (!row.linh_vuc) return null;
  const lv = Array.isArray(row.linh_vuc) ? row.linh_vuc[0] : row.linh_vuc;
  return lv?.ten?.trim() || null;
}

/**
 * Tin tuyển dụng đang mở cho module `co_hoi` (cụm LÀM, brief §8).
 * Lọc theo `giai_doan` viewer + `hien_thi_co_hoi`.
 */
export async function loadCoHoiForHome(
  viewerGiaiDoan: GiaiDoan | null | undefined,
  limit = 4,
): Promise<CoHoiItem[]> {
  const admin = createServiceRoleClient();
  try {
    const { data, error } = await admin
      .from("org_tuyen_dung")
      .select(
        "id, tieu_de, mo_ta_ngan, loai_hinh, tinh_thanh, lam_tu_xa, muc_luong_tu, muc_luong_den, hien_thi_luong, giai_doan_muc_tieu, hien_thi_co_hoi, org_to_chuc:org_to_chuc!inner(ten, slug, avatar_id, loai_to_chuc), linh_vuc:linh_vuc(ten)",
      )
      .eq("da_xoa", false)
      .eq("trang_thai", "dang_mo")
      .eq("hien_thi_co_hoi", true)
      .order("tao_luc", { ascending: false })
      .limit(Math.max(limit * 4, 16))
      .returns<Row[]>();

    if (error || !data) return [];

    const matched = data.filter((row) =>
      jobMatchesViewerGiaiDoan(
        row.giai_doan_muc_tieu as GiaiDoan[] | null,
        viewerGiaiDoan,
      ),
    );

    return matched.slice(0, limit).map((row) => {
      const loaiLabel = row.loai_hinh
        ? (LOAI_HINH_LABEL[row.loai_hinh] ?? row.loai_hinh)
        : "";
      const place = diaDiem(row);
      const lv = linhVucTen(row);
      const org = pickOrg(row.org_to_chuc);
      const orgSlug = org?.slug ?? null;
      const orgTen = org?.ten ?? "Tổ chức";
      return {
        id: row.id,
        tieuDe: row.tieu_de,
        orgTen,
        orgSlug,
        avatarUrl: getAvatarUrl(org?.avatar_id),
        loaiHinhLabel: loaiLabel,
        place,
        linhVucTen: lv,
        salary: formatSalary(row),
        sub: [orgTen, lv, place, loaiLabel].filter(Boolean).join(" · "),
        href: orgSlug ? orgJobPath(org?.loai_to_chuc, orgSlug, row.id) : null,
      };
    });
  } catch {
    return [];
  }
}

/** Admin — danh sách tin (mọi trạng thái) kèm org. */
export async function fetchAdminTuyenDungJobs(): Promise<
  Array<StudioJob & { orgTen: string; orgSlug: string | null }>
> {
  const admin = createServiceRoleClient();
  try {
    const { data, error } = await admin
      .from("org_tuyen_dung")
      .select(
        `${STUDIO_JOB_SELECT}, org_to_chuc:org_to_chuc!inner(ten, slug)`,
      )
      .eq("da_xoa", false)
      .order("tao_luc", { ascending: false })
      .limit(200);

    if (error || !data) return [];

    return data.map((row) => {
      const job = mapStudioJobRow(row);
      const rawOrg = row.org_to_chuc as
        | { ten: string | null; slug: string | null }
        | { ten: string | null; slug: string | null }[]
        | null;
      const org = Array.isArray(rawOrg) ? rawOrg[0] : rawOrg;
      return {
        ...job,
        orgTen: org?.ten ?? "Tổ chức",
        orgSlug: org?.slug ?? null,
      };
    });
  } catch {
    return [];
  }
}
