import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { GiaiDoan } from "@/lib/cins/home-adaptive/persona";
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

type Row = {
  id: string;
  tieu_de: string;
  mo_ta_ngan: string | null;
  loai_hinh: string | null;
  tinh_thanh: string | null;
  lam_tu_xa: boolean | null;
  giai_doan_muc_tieu: string[] | null;
  hien_thi_co_hoi: boolean | null;
  org_to_chuc: { ten: string | null; slug: string | null } | null;
  linh_vuc?: { ten: string | null } | { ten: string | null }[] | null;
};

function diaDiem(row: Row): string {
  if (row.lam_tu_xa) return "Remote";
  return row.tinh_thanh ? row.tinh_thanh.replace(/_/g, " ") : "";
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
        "id, tieu_de, mo_ta_ngan, loai_hinh, tinh_thanh, lam_tu_xa, giai_doan_muc_tieu, hien_thi_co_hoi, org_to_chuc:org_to_chuc!inner(ten, slug), linh_vuc:linh_vuc(ten)",
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
      const loai = row.loai_hinh
        ? (LOAI_HINH_LABEL[row.loai_hinh] ?? row.loai_hinh)
        : "";
      const place = diaDiem(row);
      const lv = linhVucTen(row);
      const orgSlug = row.org_to_chuc?.slug ?? null;
      return {
        id: row.id,
        tieuDe: row.tieu_de,
        orgTen: row.org_to_chuc?.ten ?? "Tổ chức",
        orgSlug,
        sub: [row.org_to_chuc?.ten, lv, place, loai].filter(Boolean).join(" · "),
        href: orgSlug ? `/studio/${encodeURIComponent(orgSlug)}/tuyen-dung` : null,
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
