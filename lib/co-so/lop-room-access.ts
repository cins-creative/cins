import "server-only";

import {
  daysRemaining,
  isEnrollmentNotFrozen,
  isMessageVisibleInKy,
  type KyHocInterval,
  todayYmdVn,
} from "@/lib/co-so/ky-hoc";
import { isTrangThaiNghiDb } from "@/lib/co-so/hoc-vien-trang-thai";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";
import {
  listingOrgStaffRoleLabel,
  pickCoSoStaffVaiTro,
} from "@/lib/to-chuc/co-so-vai-tro";

export type LopRoomAccess = {
  isLopRoom: boolean;
  lopId: string | null;
  orgId: string | null;
  orgSlug: string | null;
  orgTen: string | null;
  khoaId: string | null;
  dongBoTienDo: boolean;
  frozen: boolean;
  soNgayConLai: number;
  ngayCuoiKy: string | null;
  /** Staff org / admin phòng → thấy full, gửi được khi hết kỳ học. */
  isStaff: boolean;
  canSend: boolean;
  canReadGap: boolean;
  /** Enrollment của viewer nếu là HV trong lớp. */
  hocVienLopId: string | null;
  /** Nhãn vai trò của viewer trong phòng lớp (VD: "Học viên", "Giáo viên phụ trách"). */
  vaiTroLabel: string | null;
  /** Tên GV công khai của lớp (`ten_hien_thi` hoặc `giao_vien_text`). */
  giaoVienTenCongKhai: string | null;
  isGiaoVienPhuTrach: boolean;
  /** Thấy panel Quản lý học viên (kể cả read-only TVV). */
  canQuanLyHocVien: boolean;
  /** Mở bài / duyệt / lưu bài. */
  canGanTienDo: boolean;
};

const EMPTY: LopRoomAccess = {
  isLopRoom: false,
  lopId: null,
  orgId: null,
  orgSlug: null,
  orgTen: null,
  khoaId: null,
  dongBoTienDo: false,
  frozen: false,
  soNgayConLai: 0,
  ngayCuoiKy: null,
  isStaff: false,
  canSend: true,
  canReadGap: true,
  hocVienLopId: null,
  vaiTroLabel: null,
  giaoVienTenCongKhai: null,
  isGiaoVienPhuTrach: false,
  canQuanLyHocVien: false,
  canGanTienDo: false,
};

const STAFF_ROLES = new Set([
  "owner",
  "admin",
  "quan_ly_tuyen_sinh",
  "quan_ly_noi_dung",
  "giao_vien",
  "nhan_vien",
]);

export async function getLopRoomAccess(
  roomId: string,
  viewerId: string,
): Promise<LopRoomAccess> {
  const admin = createServiceRoleClient();
  const { data: room } = await admin
    .from("chat_phong")
    .select("id, loai_phong, id_context, id_org_dai_dien")
    .eq("id", roomId)
    .maybeSingle();

  if (!room || room.loai_phong !== "lop_hoc") {
    return EMPTY;
  }

  const lopId = (room.id_context as string | null) ?? null;
  const orgId = (room.id_org_dai_dien as string | null) ?? null;
  if (!lopId || !orgId) {
    return { ...EMPTY, isLopRoom: true, lopId, orgId };
  }

  const [{ data: org }, { data: membership }, { data: chatMem }, { data: lop }] =
    await Promise.all([
      admin
        .from("org_to_chuc")
        .select("slug, ten")
        .eq("id", orgId)
        .maybeSingle(),
      admin
        .from("user_thanh_vien_to_chuc")
        .select("vai_tro")
        .eq("id_to_chuc", orgId)
        .eq("id_nguoi_dung", viewerId)
        .eq("trang_thai", "active"),
      admin
        .from("chat_thanh_vien")
        .select("vai_tro")
        .eq("id_phong", roomId)
        .eq("id_nguoi_dung", viewerId)
        .is("roi_luc", null)
        .maybeSingle(),
      admin
        .from("org_lop_hoc")
        .select("id, id_khoa_hoc, giao_vien_phu_trach, giao_vien_text")
        .eq("id", lopId)
        .maybeSingle(),
    ]);

  const roles = (membership ?? []).map((m) => m.vai_tro as string);
  const orgStaff = roles.some((r) => STAFF_ROLES.has(r));
  const roomAdmin =
    chatMem?.vai_tro === "admin" || chatMem?.vai_tro === "owner";
  const isStaff = orgStaff || roomAdmin;

  const staffVaiTro = pickCoSoStaffVaiTro(roles);

  const isGiaoVienPhuTrach =
    Boolean(lop?.giao_vien_phu_trach) &&
    lop?.giao_vien_phu_trach === viewerId;

  let giaoVienTenCongKhai: string | null =
    (lop?.giao_vien_text as string | null)?.trim() || null;
  const giaoVienUserId = (lop?.giao_vien_phu_trach as string | null) ?? null;
  if (giaoVienUserId) {
    const { data: gvUser } = await admin
      .from("user_nguoi_dung")
      .select("ten_hien_thi")
      .eq("id", giaoVienUserId)
      .maybeSingle<{ ten_hien_thi: string | null }>();
    const ten = gvUser?.ten_hien_thi?.trim();
    if (ten) giaoVienTenCongKhai = ten;
  }

  let quyenHocVien: "an" | "xem" | "sua" = "an";
  if (isStaff && staffVaiTro) {
    quyenHocVien = await getCoSoModuleQuyen(
      orgId,
      viewerId,
      staffVaiTro,
      "hoc-vien",
    );
  }

  const canQuanLyHocVien =
    isGiaoVienPhuTrach || (isStaff && quyenHocVien !== "an");
  // TVV luôn read-only dù module = sua (Q6)
  const isTuVanVien = staffVaiTro === "quan_ly_tuyen_sinh";
  const canGanTienDo =
    isGiaoVienPhuTrach ||
    (isStaff &&
      !isTuVanVien &&
      (staffVaiTro === "owner" ||
        staffVaiTro === "admin" ||
        quyenHocVien === "sua"));

  let khoaId: string | null = (lop?.id_khoa_hoc as string | null) ?? null;
  let dongBoTienDo = false;
  if (khoaId) {
    const { data: khoa } = await admin
      .from("org_khoa_hoc")
      .select("dong_bo_tien_do")
      .eq("id", khoaId)
      .maybeSingle();
    dongBoTienDo = Boolean(khoa?.dong_bo_tien_do);
  }

  const staffVaiTroLabel = isGiaoVienPhuTrach
    ? "Giáo viên phụ trách"
    : (listingOrgStaffRoleLabel(staffVaiTro) ??
      (roomAdmin ? "Quản trị phòng" : null));

  const baseStaff = {
    isLopRoom: true as const,
    lopId,
    orgId,
    orgSlug: (org?.slug as string | null) ?? null,
    orgTen: (org?.ten as string | null) ?? null,
    khoaId,
    dongBoTienDo,
    giaoVienTenCongKhai,
    isGiaoVienPhuTrach,
    canQuanLyHocVien,
    canGanTienDo,
  };

  if (isStaff) {
    return {
      ...baseStaff,
      frozen: false,
      soNgayConLai: 0,
      ngayCuoiKy: null,
      isStaff: true,
      canSend: true,
      canReadGap: true,
      hocVienLopId: null,
      vaiTroLabel: staffVaiTroLabel,
    };
  }

  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id, trang_thai")
    .eq("id_nguoi_dung", viewerId)
    .eq("id_lop_hoc", lopId)
    .maybeSingle();

  if (!hvl?.id) {
    return {
      ...baseStaff,
      frozen: true,
      soNgayConLai: 0,
      ngayCuoiKy: null,
      isStaff: false,
      canSend: false,
      canReadGap: false,
      hocVienLopId: null,
      vaiTroLabel: staffVaiTroLabel,
      canQuanLyHocVien: false,
      canGanTienDo: false,
    };
  }

  const { data: kyRows } = await admin
    .from("org_ky_hoc")
    .select("id, ngay_dau, ngay_cuoi")
    .eq("id_hoc_vien_lop", hvl.id);

  const intervals: KyHocInterval[] = (kyRows ?? []).map((k) => ({
    id: k.id as string,
    ngayDau: k.ngay_dau as string,
    ngayCuoi: k.ngay_cuoi as string,
  }));

  const today = todayYmdVn();
  const nghi = isTrangThaiNghiDb((hvl.trang_thai as string) ?? "");
  const hetKy = !isEnrollmentNotFrozen(intervals, today);
  const frozen = nghi || hetKy;
  let ngayCuoiKy: string | null = null;
  for (const k of intervals) {
    if (!ngayCuoiKy || k.ngayCuoi > ngayCuoiKy) ngayCuoiKy = k.ngayCuoi;
  }

  return {
    ...baseStaff,
    frozen,
    soNgayConLai: daysRemaining(intervals, today),
    ngayCuoiKy,
    isStaff: false,
    canSend: !frozen,
    canReadGap: false,
    hocVienLopId: hvl.id as string,
    vaiTroLabel: "Học viên",
    canQuanLyHocVien: false,
    canGanTienDo: false,
  };
}

export function filterMessagesForKyVisibility<
  T extends { taoLuc?: string; createdAt?: string; id: string },
>(
  messages: T[],
  intervals: KyHocInterval[],
  getIso: (m: T) => string,
): T[] {
  if (intervals.length === 0) return [];
  return messages.filter((m) => isMessageVisibleInKy(getIso(m), intervals));
}

export async function loadKyIntervalsForViewerInLop(
  viewerId: string,
  lopId: string,
): Promise<KyHocInterval[]> {
  const admin = createServiceRoleClient();
  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id")
    .eq("id_nguoi_dung", viewerId)
    .eq("id_lop_hoc", lopId)
    .maybeSingle();
  if (!hvl?.id) return [];
  const { data: kyRows } = await admin
    .from("org_ky_hoc")
    .select("id, ngay_dau, ngay_cuoi")
    .eq("id_hoc_vien_lop", hvl.id);
  return (kyRows ?? []).map((k) => ({
    id: k.id as string,
    ngayDau: k.ngay_dau as string,
    ngayCuoi: k.ngay_cuoi as string,
  }));
}
