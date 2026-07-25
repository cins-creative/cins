import "server-only";

import {
  daysRemaining,
  isEnrollmentNotFrozen,
  isMessageVisibleInKy,
  type KyHocInterval,
  todayYmdVn,
} from "@/lib/co-so/ky-hoc";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type LopRoomAccess = {
  isLopRoom: boolean;
  lopId: string | null;
  orgId: string | null;
  orgSlug: string | null;
  orgTen: string | null;
  frozen: boolean;
  soNgayConLai: number;
  ngayCuoiKy: string | null;
  /** Staff org / admin phòng → thấy full, gửi được khi freeze. */
  isStaff: boolean;
  canSend: boolean;
  canReadGap: boolean;
};

const EMPTY: LopRoomAccess = {
  isLopRoom: false,
  lopId: null,
  orgId: null,
  orgSlug: null,
  orgTen: null,
  frozen: false,
  soNgayConLai: 0,
  ngayCuoiKy: null,
  isStaff: false,
  canSend: true,
  canReadGap: true,
};

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

  const [{ data: org }, { data: membership }, { data: chatMem }] =
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
    ]);

  const staffRoles = new Set([
    "owner",
    "admin",
    "quan_ly_tuyen_sinh",
    "quan_ly_noi_dung",
    "giao_vien",
    "nhan_vien",
  ]);
  const orgStaff = (membership ?? []).some((m) =>
    staffRoles.has(m.vai_tro as string),
  );
  const roomAdmin = chatMem?.vai_tro === "admin" || chatMem?.vai_tro === "owner";
  const isStaff = orgStaff || roomAdmin;

  if (isStaff) {
    return {
      isLopRoom: true,
      lopId,
      orgId,
      orgSlug: (org?.slug as string | null) ?? null,
      orgTen: (org?.ten as string | null) ?? null,
      frozen: false,
      soNgayConLai: 0,
      ngayCuoiKy: null,
      isStaff: true,
      canSend: true,
      canReadGap: true,
    };
  }

  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id")
    .eq("id_nguoi_dung", viewerId)
    .eq("id_lop_hoc", lopId)
    .maybeSingle();

  if (!hvl?.id) {
    return {
      isLopRoom: true,
      lopId,
      orgId,
      orgSlug: (org?.slug as string | null) ?? null,
      orgTen: (org?.ten as string | null) ?? null,
      frozen: true,
      soNgayConLai: 0,
      ngayCuoiKy: null,
      isStaff: false,
      canSend: false,
      canReadGap: false,
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
  const frozen = !isEnrollmentNotFrozen(intervals, today);
  let ngayCuoiKy: string | null = null;
  for (const k of intervals) {
    if (!ngayCuoiKy || k.ngayCuoi > ngayCuoiKy) ngayCuoiKy = k.ngayCuoi;
  }

  return {
    isLopRoom: true,
    lopId,
    orgId,
    orgSlug: (org?.slug as string | null) ?? null,
    orgTen: (org?.ten as string | null) ?? null,
    frozen,
    soNgayConLai: daysRemaining(intervals, today),
    ngayCuoiKy,
    isStaff: false,
    canSend: !frozen,
    canReadGap: false,
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
