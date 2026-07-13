import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { maskPhone } from "@/lib/auth/phone-otp";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ GET    /api/user/bao-mat-2-lop → trạng thái 2FA + SĐT đã che       ║
   ║ DELETE /api/user/bao-mat-2-lop → tắt 2FA, gỡ SĐT đã lưu            ║
   ║                                                                    ║
   ║ Cột: user_nguoi_dung.bao_mat_2_lop_bat / so_dien_thoai.           ║
   ╚══════════════════════════════════════════════════════════════════╝ */

type Row = {
  bao_mat_2_lop_bat: boolean | null;
  so_dien_thoai: string | null;
};

export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_nguoi_dung")
    .select("bao_mat_2_lop_bat, so_dien_thoai")
    .eq("id", session.profile.id)
    .maybeSingle<Row>();

  if (error) {
    console.error("[bao-mat-2-lop] read err:", error.message);
    return NextResponse.json({ error: "Không đọc được hồ sơ." }, { status: 500 });
  }

  const enabled = data?.bao_mat_2_lop_bat === true;
  return NextResponse.json({
    enabled,
    phoneMasked: enabled && data?.so_dien_thoai ? maskPhone(data.so_dien_thoai) : null,
  });
}

export async function DELETE() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("user_nguoi_dung")
    .update({
      bao_mat_2_lop_bat: false,
      so_dien_thoai: null,
      so_dien_thoai_xac_minh_luc: null,
    })
    .eq("id", session.profile.id);

  if (error) {
    console.error("[bao-mat-2-lop] disable err:", error.message);
    return NextResponse.json({ error: "Không tắt được bảo mật 2 lớp." }, { status: 500 });
  }

  // Dọn mọi thử-thách OTP còn treo của người dùng này.
  await admin
    .from("auth_otp_dien_thoai")
    .delete()
    .eq("id_nguoi_dung", session.profile.id);

  return NextResponse.json({ enabled: false, phoneMasked: null });
}
