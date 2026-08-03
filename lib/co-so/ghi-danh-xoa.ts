import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";
import { coSoQuanLyPath } from "@/lib/to-chuc/co-so-routes";
import type {
  XoaBlocker,
  XoaCanhBao,
  XoaPreflight,
} from "@/lib/to-chuc/khoa-lop-xoa-types";

type XoaFail =
  | { ok: false; error: string; status?: number }
  | {
      ok: false;
      error: string;
      status: 409;
      blockers: XoaBlocker[];
      canhBao: XoaCanhBao[];
    };

function countLabel(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

async function canManageHocVien(
  orgId: string,
  actorId: string,
): Promise<boolean> {
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  return (await getCoSoModuleQuyen(orgId, actorId, vaiTro, "hoc-vien")) === "sua";
}

/** Ghi danh phải thuộc một khóa của chính cơ sở này. */
async function fetchGhiDanhCuaOrg(
  orgId: string,
  hocVienLopId: string,
): Promise<{ id: string; khoaId: string } | null> {
  const admin = createServiceRoleClient();
  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id, id_khoa_hoc")
    .eq("id", hocVienLopId)
    .maybeSingle();
  if (!hvl?.id) return null;

  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id")
    .eq("id", hvl.id_khoa_hoc as string)
    .eq("id_to_chuc", orgId)
    .maybeSingle();
  if (!khoa?.id) return null;

  return { id: hvl.id as string, khoaId: hvl.id_khoa_hoc as string };
}

async function countTable(
  table: string,
  hocVienLopId: string,
): Promise<number> {
  const admin = createServiceRoleClient();
  const { count } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("id_hoc_vien_lop", hocVienLopId);
  return count ?? 0;
}

async function countDon(
  hocVienLopId: string,
  trangThai: string,
): Promise<number> {
  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("org_don_hoc_phi")
    .select("id", { count: "exact", head: true })
    .eq("id_hoc_vien_lop", hocVienLopId)
    .eq("trang_thai", trangThai);
  return count ?? 0;
}

async function fetchOrgSlug(orgId: string): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("slug")
    .eq("id", orgId)
    .eq("loai_to_chuc", "co_so_dao_tao")
    .maybeSingle();
  return (data?.slug as string | null) ?? null;
}

/**
 * Preflight gỡ ghi danh — thuần đọc.
 *
 * FK `org_don_hoc_phi.id_hoc_vien_lop` là ON DELETE CASCADE và doanh thu được
 * cộng trực tiếp từ bảng đơn, nên chỉ cần một đơn `da_nhan_tien` là chặn cứng:
 * xóa ghi danh sẽ làm tiền đã thu biến mất khỏi báo cáo.
 */
export async function kiemTraXoaGhiDanh(
  orgId: string,
  hocVienLopId: string,
  actorId: string,
): Promise<XoaPreflight | { ok: false; error: string }> {
  if (!(await canManageHocVien(orgId, actorId))) {
    return { ok: false, error: "Bạn không có quyền gỡ ghi danh." };
  }

  const ghiDanh = await fetchGhiDanhCuaOrg(orgId, hocVienLopId);
  if (!ghiDanh) {
    return { ok: false, error: "Không tìm thấy ghi danh trong cơ sở này." };
  }

  const orgSlug = await fetchOrgSlug(orgId);
  const blockers: XoaBlocker[] = [];
  const canhBao: XoaCanhBao[] = [];

  const soDonDaThu = await countDon(hocVienLopId, "da_nhan_tien");
  if (soDonDaThu > 0) {
    blockers.push({
      loai: "don_da_nhan_tien",
      soLuong: soDonDaThu,
      nhan: `Học viên đã có ${countLabel(
        soDonDaThu,
        "đơn học phí đã thu tiền",
        "đơn học phí đã thu tiền",
      )} — gỡ ghi danh sẽ xóa mất doanh thu này`,
      duongDan: orgSlug ? coSoQuanLyPath(orgSlug, "hoc-phi") : null,
    });
  }

  const soDonCho = await countDon(hocVienLopId, "cho_thanh_toan");
  if (soDonCho > 0) {
    canhBao.push({
      loai: "don_cho_thanh_toan",
      soLuong: soDonCho,
      nhan: `${countLabel(
        soDonCho,
        "đơn chờ thanh toán",
        "đơn chờ thanh toán",
      )} sẽ bị xóa (chưa thu tiền nên không ảnh hưởng doanh thu)`,
    });
  }

  const soKyHoc = await countTable("org_ky_hoc", hocVienLopId);
  if (soKyHoc > 0) {
    canhBao.push({
      loai: "ky_hoc",
      soLuong: soKyHoc,
      nhan: `${countLabel(soKyHoc, "kỳ học", "kỳ học")} (ngày học đã cộng) sẽ bị xóa`,
    });
  }

  const soNopBai = await countTable("org_nop_bai", hocVienLopId);
  if (soNopBai > 0) {
    canhBao.push({
      loai: "nop_bai",
      soLuong: soNopBai,
      nhan: `${countLabel(soNopBai, "bài đã nộp", "bài đã nộp")} sẽ bị xóa`,
    });
  }

  const soTienDo = await countTable("org_tien_do_bai", hocVienLopId);
  if (soTienDo > 0) {
    canhBao.push({
      loai: "tien_do_bai",
      soLuong: soTienDo,
      nhan: `${countLabel(
        soTienDo,
        "dòng tiến độ bài học",
        "dòng tiến độ bài học",
      )} sẽ bị xóa`,
    });
  }

  return { coTheXoa: blockers.length === 0, blockers, canhBao };
}

/** Gỡ ghi danh vĩnh viễn (hard delete) sau khi qua guard. */
export async function xoaGhiDanh(
  orgId: string,
  hocVienLopId: string,
  actorId: string,
): Promise<{ ok: true } | XoaFail> {
  const pre = await kiemTraXoaGhiDanh(orgId, hocVienLopId, actorId);
  if ("ok" in pre) {
    return {
      ok: false,
      error: pre.error,
      status: pre.error.includes("quyền") ? 403 : 404,
    };
  }
  if (!pre.coTheXoa) {
    return {
      ok: false,
      error: "Không gỡ được ghi danh — còn dữ liệu ràng buộc.",
      status: 409,
      blockers: pre.blockers,
      canhBao: pre.canhBao,
    };
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("user_hoc_vien_lop")
    .delete()
    .eq("id", hocVienLopId);
  if (error) {
    return { ok: false, error: error.message, status: 500 };
  }
  return { ok: true };
}
