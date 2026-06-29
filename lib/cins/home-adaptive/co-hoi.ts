import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type CoHoiItem = {
  id: string;
  tieuDe: string;
  orgTen: string;
  orgSlug: string | null;
  sub: string;
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
  loai_hinh: string | null;
  tinh_thanh: string | null;
  lam_tu_xa: boolean | null;
  org_to_chuc: { ten: string | null; slug: string | null } | null;
};

function diaDiem(row: Row): string {
  if (row.lam_tu_xa) return "Remote";
  return row.tinh_thanh ? row.tinh_thanh.replace(/_/g, " ") : "";
}

/**
 * Tin tuyển dụng đang mở cho module `co_hoi` (cụm LÀM, brief §8).
 * Bảng `org_tuyen_dung` có thể chưa tồn tại (migration chưa chạy) → trả rỗng.
 */
export async function loadCoHoiForHome(limit = 4): Promise<CoHoiItem[]> {
  const admin = createServiceRoleClient();
  try {
    const { data, error } = await admin
      .from("org_tuyen_dung")
      .select(
        "id, tieu_de, loai_hinh, tinh_thanh, lam_tu_xa, org_to_chuc:org_to_chuc!inner(ten, slug)",
      )
      .eq("da_xoa", false)
      .eq("trang_thai", "dang_mo")
      .order("tao_luc", { ascending: false })
      .limit(limit)
      .returns<Row[]>();

    if (error || !data) return [];

    return data.map((row) => {
      const loai = row.loai_hinh
        ? (LOAI_HINH_LABEL[row.loai_hinh] ?? row.loai_hinh)
        : "";
      const place = diaDiem(row);
      return {
        id: row.id,
        tieuDe: row.tieu_de,
        orgTen: row.org_to_chuc?.ten ?? "Tổ chức",
        orgSlug: row.org_to_chuc?.slug ?? null,
        sub: [row.org_to_chuc?.ten, place, loai].filter(Boolean).join(" · "),
      };
    });
  } catch {
    return [];
  }
}
