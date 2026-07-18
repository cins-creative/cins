import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  isLoaiPhanHoiSuKien,
  type LoaiPhanHoiSuKien,
} from "@/lib/to-chuc/su-kien-dang-ky";
import { canViewerManageSuKien } from "@/lib/to-chuc/su-kien";
import type {
  SuKienQuanLyPayload,
  SuKienQuanLyThanhVien,
} from "@/lib/to-chuc/su-kien-quan-ly-types";

export type {
  SuKienQuanLyPayload,
  SuKienQuanLyStats,
  SuKienQuanLyThanhVien,
} from "@/lib/to-chuc/su-kien-quan-ly-types";

const TRANG_THAI_HUY = new Set(["tu_choi", "huy"]);
const ATTENDEE_LIMIT = 50;

export async function loadSuKienQuanLy(
  actorId: string,
  orgId: string,
  suKienId: string,
): Promise<
  | { ok: true; data: SuKienQuanLyPayload }
  | { ok: false; error: string; status: number }
> {
  if (!(await canViewerManageSuKien(actorId, orgId))) {
    return { ok: false, error: "Không có quyền quản lý sự kiện.", status: 403 };
  }

  const admin = createServiceRoleClient();
  const { data: sk } = await admin
    .from("org_su_kien")
    .select("id, id_to_chuc, slot_toi_da")
    .eq("id", suKienId)
    .maybeSingle<{
      id: string;
      id_to_chuc: string;
      slot_toi_da: number | null;
    }>();

  if (!sk) {
    return { ok: false, error: "Không tìm thấy sự kiện.", status: 404 };
  }
  if (sk.id_to_chuc !== orgId) {
    return { ok: false, error: "Sự kiện không thuộc tổ chức này.", status: 404 };
  }

  const [{ data: dangKyRows }, { data: quayRows }] = await Promise.all([
    admin
      .from("org_dang_ky_su_kien")
      .select("id_nguoi_dung, loai_phan_hoi, trang_thai, tao_luc")
      .eq("id_su_kien", suKienId)
      .order("tao_luc", { ascending: false })
      .limit(200),
    admin
      .from("shop_quay_su_kien")
      .select("trang_thai")
      .eq("id_su_kien", suKienId)
      .limit(200),
  ]);

  let soSeThamGia = 0;
  let soQuanTam = 0;
  const activeRows: Array<{
    id_nguoi_dung: string;
    loai_phan_hoi: string;
    tao_luc: string;
  }> = [];

  for (const row of dangKyRows ?? []) {
    const r = row as {
      id_nguoi_dung?: string;
      loai_phan_hoi?: string;
      trang_thai?: string;
      tao_luc?: string;
    };
    if (!r.id_nguoi_dung || !r.loai_phan_hoi || !r.tao_luc) continue;
    if (TRANG_THAI_HUY.has(r.trang_thai ?? "")) continue;
    if (!isLoaiPhanHoiSuKien(r.loai_phan_hoi)) continue;
    if (r.loai_phan_hoi === "se_tham_gia") soSeThamGia += 1;
    if (r.loai_phan_hoi === "quan_tam") soQuanTam += 1;
    activeRows.push({
      id_nguoi_dung: r.id_nguoi_dung,
      loai_phan_hoi: r.loai_phan_hoi,
      tao_luc: r.tao_luc,
    });
  }

  let soChoDuyetNoiDung = 0;
  let soDaDuyetNoiDung = 0;
  for (const row of quayRows ?? []) {
    const tt = (row as { trang_thai?: string }).trang_thai;
    if (tt === "cho_xu_ly") soChoDuyetNoiDung += 1;
    if (tt === "da_duyet") soDaDuyetNoiDung += 1;
  }

  const slice = activeRows.slice(0, ATTENDEE_LIMIT);
  const userIds = [...new Set(slice.map((r) => r.id_nguoi_dung))];
  const umap = new Map<
    string,
    { ten_hien_thi: string | null; slug: string | null }
  >();
  if (userIds.length) {
    const { data: users } = await admin
      .from("user_nguoi_dung")
      .select("id, ten_hien_thi, slug")
      .in("id", userIds);
    for (const u of (users ?? []) as Array<{
      id: string;
      ten_hien_thi: string | null;
      slug: string | null;
    }>) {
      umap.set(u.id, { ten_hien_thi: u.ten_hien_thi, slug: u.slug });
    }
  }

  const thanhVien: SuKienQuanLyThanhVien[] = slice.map((r) => {
    const u = umap.get(r.id_nguoi_dung);
    return {
      id: r.id_nguoi_dung,
      ten: u?.ten_hien_thi ?? null,
      slug: u?.slug ?? null,
      loai: r.loai_phan_hoi as LoaiPhanHoiSuKien,
      taoLuc: r.tao_luc,
    };
  });

  return {
    ok: true,
    data: {
      stats: {
        soSeThamGia,
        soQuanTam,
        soChoDuyetNoiDung,
        soDaDuyetNoiDung,
        slotToiDa:
          typeof sk.slot_toi_da === "number" && sk.slot_toi_da > 0
            ? sk.slot_toi_da
            : null,
      },
      thanhVien,
    },
  };
}
