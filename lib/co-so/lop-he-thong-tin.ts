import "server-only";

/**
 * Gửi tin hệ thống pedagogy vào phòng lớp.
 */

import {
  noiDungLopBaiStaff,
} from "@/lib/chat/lop-bai-notice";
import type { ChatLopBaiNotice } from "@/lib/chat/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type { ChatLopBaiNotice as LopBaiNguCanh };
export {
  parseLopBaiNguCanh,
  noiDungLopBaiChoHocVien,
  noiDungLopBaiStaff,
  shouldShowLopBaiTin,
} from "@/lib/chat/lop-bai-notice";

export type LopBaiHeThongLoai = ChatLopBaiNotice["loai"];

export async function guiTinHeThongLopBai(input: {
  lopId: string;
  actorId: string;
  loai: LopBaiHeThongLoai;
  idNguoiDung: string;
  idHocVienLop: string;
  idBaiTap: string;
  tenBai: string;
  idNopBai?: string;
  idCotMoc?: string;
  slug?: string;
}): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data: lop } = await admin
    .from("org_lop_hoc")
    .select("id_chat_phong")
    .eq("id", input.lopId)
    .maybeSingle();
  const roomId = lop?.id_chat_phong as string | null;
  if (!roomId) return null;

  const { data: user } = await admin
    .from("user_nguoi_dung")
    .select("ten_hien_thi")
    .eq("id", input.idNguoiDung)
    .maybeSingle();
  const tenHv = (user?.ten_hien_thi as string)?.trim() || "học viên";

  const nguCanh: ChatLopBaiNotice = {
    loai: input.loai,
    idNguoiDung: input.idNguoiDung,
    idHocVienLop: input.idHocVienLop,
    idBaiTap: input.idBaiTap,
    tenBai: input.tenBai,
    idNopBai: input.idNopBai,
    idCotMoc: input.idCotMoc,
    slug: input.slug,
  };

  const { data: tin, error } = await admin
    .from("chat_tin_nhan")
    .insert({
      id_phong: roomId,
      id_nguoi_gui: input.actorId,
      loai_tin: "system",
      noi_dung: noiDungLopBaiStaff(input.loai, input.tenBai, tenHv),
      ngu_canh: nguCanh,
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !tin) return null;
  return tin.id;
}
