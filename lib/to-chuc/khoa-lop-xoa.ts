import "server-only";

import { xoaLopChatPhongNeuTrong } from "@/lib/co-so/lop-chat-phong";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { coSoQuanLyPath } from "@/lib/to-chuc/co-so-routes";
import { canManageKhoaHoc } from "@/lib/to-chuc/co-so-vai-tro";
import { isScaffoldLopDbRow } from "@/lib/to-chuc/khoa-hoc-labels";
import type {
  XoaBlocker,
  XoaCanhBao,
  XoaPreflight,
} from "@/lib/to-chuc/khoa-lop-xoa-types";

export type { XoaBlocker, XoaCanhBao, XoaPreflight } from "@/lib/to-chuc/khoa-lop-xoa-types";

async function canManage(
  profileId: string | null | undefined,
  orgId: string,
): Promise<boolean> {
  if (!profileId) return false;
  const vaiTro = await getViewerCoSoVaiTro(profileId, orgId);
  return canManageKhoaHoc(vaiTro);
}

type XoaFail =
  | { ok: false; error: string; status?: number }
  | {
      ok: false;
      error: string;
      status: 409;
      blockers: XoaBlocker[];
      canhBao: XoaCanhBao[];
    };

type XoaOk = { ok: true };

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

function quanLyHref(
  orgSlug: string | null,
  section: "lop-hoc" | "hoc-vien" | "hoc-phi" | "diem-danh" | "giao-trinh" | "tin-nhan",
  query?: Record<string, string>,
): string | null {
  if (!orgSlug) return null;
  const base = coSoQuanLyPath(orgSlug, section);
  if (!query || Object.keys(query).length === 0) return base;
  const sp = new URLSearchParams(query);
  return `${base}?${sp.toString()}`;
}

function countLabel(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

async function countDonDaNhanTienChoEnrollmentIds(
  enrollmentIds: string[],
): Promise<number> {
  if (enrollmentIds.length === 0) return 0;
  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("org_don_hoc_phi")
    .select("id", { count: "exact", head: true })
    .in("id_hoc_vien_lop", enrollmentIds)
    .eq("trang_thai", "da_nhan_tien");
  return count ?? 0;
}

async function countDonChoThanhToanChoEnrollmentIds(
  enrollmentIds: string[],
): Promise<number> {
  if (enrollmentIds.length === 0) return 0;
  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("org_don_hoc_phi")
    .select("id", { count: "exact", head: true })
    .in("id_hoc_vien_lop", enrollmentIds)
    .eq("trang_thai", "cho_thanh_toan");
  return count ?? 0;
}

async function countUserChatMessages(roomId: string): Promise<number> {
  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("chat_tin_nhan")
    .select("id", { count: "exact", head: true })
    .eq("id_phong", roomId)
    .neq("loai_tin", "system");
  return count ?? 0;
}

/** Preflight xóa lớp — thuần đọc, không ghi. */
export async function kiemTraXoaLopHoc(
  orgId: string,
  khoaId: string,
  lopId: string,
  actorId: string,
): Promise<XoaPreflight | { ok: false; error: string }> {
  if (!(await canManage(actorId, orgId))) {
    return { ok: false, error: "Bạn không có quyền xóa lớp học." };
  }

  const admin = createServiceRoleClient();
  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id")
    .eq("id_to_chuc", orgId)
    .eq("id", khoaId)
    .maybeSingle();
  if (!khoa?.id) {
    return { ok: false, error: "Không tìm thấy khóa học." };
  }

  const { data: lop } = await admin
    .from("org_lop_hoc")
    .select("id, id_chat_phong")
    .eq("id", lopId)
    .eq("id_khoa_hoc", khoaId)
    .maybeSingle();
  if (!lop?.id) {
    return { ok: false, error: "Không tìm thấy lớp học." };
  }

  const orgSlug = await fetchOrgSlug(orgId);
  const blockers: XoaBlocker[] = [];
  const canhBao: XoaCanhBao[] = [];

  const { data: enrollRows } = await admin
    .from("user_hoc_vien_lop")
    .select("id")
    .eq("id_lop_hoc", lopId);
  const enrollIds = (enrollRows ?? []).map((r) => r.id as string);
  const soGhiDanh = enrollIds.length;

  if (soGhiDanh > 0) {
    blockers.push({
      loai: "ghi_danh",
      soLuong: soGhiDanh,
      nhan: countLabel(soGhiDanh, "học viên đang gắn lớp", "học viên đang gắn lớp"),
      duongDan: quanLyHref(orgSlug, "hoc-vien", {
        khoaId,
        lopId,
      }),
    });
  }

  const soDonDaTra = await countDonDaNhanTienChoEnrollmentIds(enrollIds);
  if (soDonDaTra > 0) {
    blockers.push({
      loai: "don_da_nhan_tien",
      soLuong: soDonDaTra,
      nhan: countLabel(
        soDonDaTra,
        "hóa đơn đã nhận tiền",
        "hóa đơn đã nhận tiền",
      ),
      duongDan: quanLyHref(orgSlug, "hoc-phi"),
    });
  }

  const roomId = (lop.id_chat_phong as string | null) ?? null;
  if (roomId) {
    const soTinUser = await countUserChatMessages(roomId);
    if (soTinUser > 0) {
      blockers.push({
        loai: "chat_noi_dung",
        soLuong: soTinUser,
        nhan: countLabel(
          soTinUser,
          "tin nhắn trong phòng chat lớp",
          "tin nhắn trong phòng chat lớp",
        ),
        duongDan: quanLyHref(orgSlug, "tin-nhan"),
      });
    }
  }

  const soDonCho = await countDonChoThanhToanChoEnrollmentIds(enrollIds);
  if (soDonCho > 0) {
    canhBao.push({
      loai: "don_cho_thanh_toan",
      soLuong: soDonCho,
      nhan: countLabel(
        soDonCho,
        "đơn đang chờ thanh toán (không chặn xóa)",
        "đơn đang chờ thanh toán (không chặn xóa)",
      ),
    });
  }

  const { count: soDiemDanh } = await admin
    .from("org_diem_danh")
    .select("id", { count: "exact", head: true })
    .eq("id_lop_hoc", lopId);
  if ((soDiemDanh ?? 0) > 0) {
    canhBao.push({
      loai: "diem_danh",
      soLuong: soDiemDanh ?? 0,
      nhan: `${soDiemDanh} bản ghi điểm danh sẽ bị xóa`,
    });
  }

  const { count: soCotMoc } = await admin
    .from("content_cot_moc")
    .select("id", { count: "exact", head: true })
    .eq("id_lop_hoc", lopId);
  if ((soCotMoc ?? 0) > 0) {
    canhBao.push({
      loai: "cot_moc",
      soLuong: soCotMoc ?? 0,
      nhan: `${soCotMoc} cột mốc Journey sẽ mất liên kết lớp`,
    });
  }

  return {
    coTheXoa: blockers.length === 0,
    blockers,
    canhBao,
  };
}

/** Hard delete lớp — chỉ khi guard sạch. */
export async function xoaLopHoc(
  orgId: string,
  khoaId: string,
  lopId: string,
  actorId: string,
): Promise<XoaOk | XoaFail> {
  const pre = await kiemTraXoaLopHoc(orgId, khoaId, lopId, actorId);
  if ("ok" in pre && pre.ok === false) {
    const status = pre.error.includes("quyền") ? 403 : 400;
    return { ok: false, error: pre.error, status };
  }
  const check = pre as XoaPreflight;
  if (!check.coTheXoa) {
    return {
      ok: false,
      error: "Không thể xóa lớp vì còn dữ liệu ràng buộc.",
      status: 409,
      blockers: check.blockers,
      canhBao: check.canhBao,
    };
  }

  const admin = createServiceRoleClient();
  const { data: lop } = await admin
    .from("org_lop_hoc")
    .select("id, id_chat_phong")
    .eq("id", lopId)
    .eq("id_khoa_hoc", khoaId)
    .maybeSingle();

  if (!lop?.id) {
    return { ok: true };
  }

  const roomId = (lop.id_chat_phong as string | null) ?? null;
  if (roomId) {
    await admin
      .from("org_lop_hoc")
      .update({ id_chat_phong: null })
      .eq("id", lopId)
      .eq("id_khoa_hoc", khoaId);
    await xoaLopChatPhongNeuTrong(roomId);
  }

  const { error } = await admin
    .from("org_lop_hoc")
    .delete()
    .eq("id", lopId)
    .eq("id_khoa_hoc", khoaId);

  if (error) {
    return { ok: false, error: error.message, status: 400 };
  }

  console.info("[cins:xoa-lop]", { orgId, khoaId, lopId, actorId });
  return { ok: true };
}

async function countVerifiedPublicCotMoc(khoaId: string): Promise<number> {
  const admin = createServiceRoleClient();
  const { data: mocRows } = await admin
    .from("content_cot_moc")
    .select("id")
    .eq("id_khoa_hoc", khoaId)
    .in("che_do_hien_thi", ["public", "feature", "cong_dong"]);
  const mocIds = (mocRows ?? []).map((r) => r.id as string);
  if (mocIds.length === 0) return 0;

  const { count } = await admin
    .from("verify_xac_nhan")
    .select("id", { count: "exact", head: true })
    .in("id_cot_moc", mocIds)
    .eq("trang_thai", "da_xac_nhan");
  return count ?? 0;
}

/** Preflight xóa khóa — thuần đọc. */
export async function kiemTraXoaKhoaHoc(
  orgId: string,
  khoaId: string,
  actorId: string,
): Promise<XoaPreflight | { ok: false; error: string }> {
  if (!(await canManage(actorId, orgId))) {
    return { ok: false, error: "Bạn không có quyền xóa khóa học." };
  }

  const admin = createServiceRoleClient();
  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id")
    .eq("id_to_chuc", orgId)
    .eq("id", khoaId)
    .maybeSingle();
  if (!khoa?.id) {
    return { ok: false, error: "Không tìm thấy khóa học." };
  }

  const orgSlug = await fetchOrgSlug(orgId);
  const blockers: XoaBlocker[] = [];
  const canhBao: XoaCanhBao[] = [];

  const { data: lopRows } = await admin
    .from("org_lop_hoc")
    .select("id, ma_lop, giao_vien_phu_trach, giao_vien_text")
    .eq("id_khoa_hoc", khoaId);

  const thatLops = lopRows ?? [];
  const thatLopIds = thatLops.map((r) => r.id as string);
  const thatRealLops = thatLops.filter((r) => !isScaffoldLopDbRow(r));
  const soLopThat = thatRealLops.length;

  if (soLopThat > 0) {
    blockers.push({
      loai: "lop",
      soLuong: soLopThat,
      nhan: `Vẫn còn ${soLopThat} lớp đang thuộc khóa học này`,
      duongDan: quanLyHref(orgSlug, "lop-hoc"),
    });
  }

  const { data: enrollRows } = await admin
    .from("user_hoc_vien_lop")
    .select("id")
    .eq("id_khoa_hoc", khoaId);
  const enrollIds = (enrollRows ?? []).map((r) => r.id as string);
  const soGhiDanh = enrollIds.length;

  if (soGhiDanh > 0) {
    blockers.push({
      loai: "ghi_danh",
      soLuong: soGhiDanh,
      nhan: countLabel(
        soGhiDanh,
        "học viên đang ghi danh khóa",
        "học viên đang ghi danh khóa",
      ),
      duongDan: quanLyHref(orgSlug, "hoc-vien", { khoaId }),
    });
  }

  const soDonDaTra = await countDonDaNhanTienChoEnrollmentIds(enrollIds);
  if (soDonDaTra > 0) {
    blockers.push({
      loai: "don_da_nhan_tien",
      soLuong: soDonDaTra,
      nhan: countLabel(
        soDonDaTra,
        "hóa đơn đã nhận tiền",
        "hóa đơn đã nhận tiền",
      ),
      duongDan: quanLyHref(orgSlug, "hoc-phi"),
    });
  }

  const { count: soCombo } = await admin
    .from("org_combo_thanh_phan")
    .select("id", { count: "exact", head: true })
    .eq("id_khoa_hoc", khoaId);
  if ((soCombo ?? 0) > 0) {
    blockers.push({
      loai: "combo",
      soLuong: soCombo ?? 0,
      nhan: countLabel(
        soCombo ?? 0,
        "combo học phí đang dùng khóa",
        "combo học phí đang dùng khóa",
      ),
      duongDan: quanLyHref(orgSlug, "hoc-phi")
        ? `${quanLyHref(orgSlug, "hoc-phi")}?tab=combo`
        : null,
    });
  }

  const soMocVerify = await countVerifiedPublicCotMoc(khoaId);
  if (soMocVerify > 0) {
    blockers.push({
      loai: "cot_moc_verify",
      soLuong: soMocVerify,
      nhan: countLabel(
        soMocVerify,
        "cột mốc Journey đã xác nhận gắn khóa",
        "cột mốc Journey đã xác nhận gắn khóa",
      ),
      duongDan: null,
    });
  }

  const soDonCho = await countDonChoThanhToanChoEnrollmentIds(enrollIds);
  if (soDonCho > 0) {
    canhBao.push({
      loai: "don_cho_thanh_toan",
      soLuong: soDonCho,
      nhan: countLabel(
        soDonCho,
        "đơn đang chờ thanh toán (không chặn xóa)",
        "đơn đang chờ thanh toán (không chặn xóa)",
      ),
    });
  }

  const { count: soBaiTap } = await admin
    .from("org_bai_tap")
    .select("id", { count: "exact", head: true })
    .eq("id_khoa_hoc", khoaId);
  if ((soBaiTap ?? 0) > 0) {
    canhBao.push({
      loai: "bai_tap",
      soLuong: soBaiTap ?? 0,
      nhan: `${soBaiTap} bài tập sẽ bị xóa`,
    });
  }

  const { count: soGiaoTrinh } = await admin
    .from("org_giao_trinh")
    .select("id", { count: "exact", head: true })
    .eq("id_khoa_hoc", khoaId);
  if ((soGiaoTrinh ?? 0) > 0) {
    canhBao.push({
      loai: "giao_trinh",
      soLuong: soGiaoTrinh ?? 0,
      nhan: `${soGiaoTrinh} mục giáo trình sẽ bị xóa`,
    });
  }

  const { count: soGoiLink } = await admin
    .from("org_goi_hoc_phi_khoa")
    .select("id", { count: "exact", head: true })
    .eq("id_khoa_hoc", khoaId);
  if ((soGoiLink ?? 0) > 0) {
    canhBao.push({
      loai: "goi_hoc_phi",
      soLuong: soGoiLink ?? 0,
      nhan: `${soGoiLink} liên kết gói học phí sẽ bị gỡ`,
    });
  }

  const { count: soCotMocAll } = await admin
    .from("content_cot_moc")
    .select("id", { count: "exact", head: true })
    .eq("id_khoa_hoc", khoaId);
  if ((soCotMocAll ?? 0) > 0 && soMocVerify === 0) {
    canhBao.push({
      loai: "cot_moc",
      soLuong: soCotMocAll ?? 0,
      nhan: `${soCotMocAll} cột mốc sẽ mất liên kết khóa`,
    });
  }

  const scaffoldCount = thatLops.length - soLopThat;
  if (scaffoldCount > 0) {
    canhBao.push({
      loai: "lop_scaffold",
      soLuong: scaffoldCount,
      nhan: `${scaffoldCount} lớp scaffold hệ thống sẽ bị xóa kèm`,
    });
  }

  void thatLopIds;
  return {
    coTheXoa: blockers.length === 0,
    blockers,
    canhBao,
  };
}

/** Hard delete khóa — chỉ khi guard sạch. */
export async function hardDeleteKhoaHoc(
  orgId: string,
  khoaId: string,
  actorId: string,
): Promise<XoaOk | XoaFail> {
  const pre = await kiemTraXoaKhoaHoc(orgId, khoaId, actorId);
  if ("ok" in pre && pre.ok === false) {
    const status = pre.error.includes("quyền") ? 403 : 400;
    return { ok: false, error: pre.error, status };
  }
  const check = pre as XoaPreflight;
  if (!check.coTheXoa) {
    return {
      ok: false,
      error: "Không thể xóa khóa vì còn dữ liệu ràng buộc.",
      status: 409,
      blockers: check.blockers,
      canhBao: check.canhBao,
    };
  }

  const admin = createServiceRoleClient();
  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id")
    .eq("id_to_chuc", orgId)
    .eq("id", khoaId)
    .maybeSingle();

  if (!khoa?.id) {
    return { ok: true };
  }

  const { data: lopRows } = await admin
    .from("org_lop_hoc")
    .select("id, id_chat_phong, ma_lop, giao_vien_phu_trach, giao_vien_text")
    .eq("id_khoa_hoc", khoaId);

  for (const lop of lopRows ?? []) {
    if (!isScaffoldLopDbRow(lop)) continue;
    const roomId = (lop.id_chat_phong as string | null) ?? null;
    const lopId = lop.id as string;
    if (roomId) {
      await admin
        .from("org_lop_hoc")
        .update({ id_chat_phong: null })
        .eq("id", lopId);
      await xoaLopChatPhongNeuTrong(roomId);
    }
  }

  const { error } = await admin
    .from("org_khoa_hoc")
    .delete()
    .eq("id_to_chuc", orgId)
    .eq("id", khoaId);

  if (error) {
    return { ok: false, error: error.message, status: 400 };
  }

  console.info("[cins:xoa-khoa]", { orgId, khoaId, actorId });
  return { ok: true };
}
