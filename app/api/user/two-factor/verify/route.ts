import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  PHONE_OTP_LENGTH,
  PHONE_OTP_MAX_ATTEMPTS,
  hashPhoneOtp,
  maskPhone,
  normalizeVietnamPhone,
} from "@/lib/auth/phone-otp";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ POST /api/user/bao-mat-2-lop/xac-minh                              ║
   ║ Body: { phone, code }                                              ║
   ║ So ma_hash với thử-thách mới nhất chưa hết hạn → bật 2FA.         ║
   ╚══════════════════════════════════════════════════════════════════╝ */

type Body = { phone?: unknown; code?: unknown };

type Challenge = {
  id: string;
  ma_hash: string;
  het_han_luc: string;
  so_lan_thu: number;
};

export async function POST(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json(
      { error: "Phiên đăng nhập đã hết hạn." },
      { status: 401 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const phone =
    typeof body.phone === "string" ? normalizeVietnamPhone(body.phone) : null;
  const code =
    typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
  if (!phone) {
    return NextResponse.json(
      { error: "Số điện thoại không hợp lệ." },
      { status: 422 },
    );
  }
  if (code.length !== PHONE_OTP_LENGTH) {
    return NextResponse.json(
      { error: `Mã phải gồm ${PHONE_OTP_LENGTH} chữ số.` },
      { status: 422 },
    );
  }

  const admin = createServiceRoleClient();

  const { data: challenge, error: readErr } = await admin
    .from("auth_otp_dien_thoai")
    .select("id, ma_hash, het_han_luc, so_lan_thu")
    .eq("id_nguoi_dung", session.profile.id)
    .eq("so_dien_thoai", phone)
    .order("tao_luc", { ascending: false })
    .limit(1)
    .maybeSingle<Challenge>();

  if (readErr) {
    console.error("[bao-mat-2-lop/xac-minh] read err:", readErr.message);
    return NextResponse.json({ error: "Không xác minh được mã." }, { status: 500 });
  }

  if (!challenge) {
    return NextResponse.json(
      { error: "Chưa có mã cho số này. Bấm «Gửi mã» trước." },
      { status: 422 },
    );
  }

  if (new Date(challenge.het_han_luc).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Mã đã hết hạn. Bấm «Gửi lại mã» để nhận mã mới." },
      { status: 422 },
    );
  }

  if (challenge.so_lan_thu >= PHONE_OTP_MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Bạn đã nhập sai quá nhiều lần. Bấm «Gửi lại mã»." },
      { status: 429 },
    );
  }

  const matched = challenge.ma_hash === hashPhoneOtp(phone, code);

  if (!matched) {
    await admin
      .from("auth_otp_dien_thoai")
      .update({ so_lan_thu: challenge.so_lan_thu + 1 })
      .eq("id", challenge.id);
    return NextResponse.json({ error: "Mã không đúng. Kiểm tra lại." }, { status: 422 });
  }

  const { error: updateErr } = await admin
    .from("user_nguoi_dung")
    .update({
      so_dien_thoai: phone,
      bao_mat_2_lop_bat: true,
      so_dien_thoai_xac_minh_luc: new Date().toISOString(),
    })
    .eq("id", session.profile.id);

  if (updateErr) {
    console.error("[bao-mat-2-lop/xac-minh] enable err:", updateErr.message);
    return NextResponse.json({ error: "Không bật được bảo mật 2 lớp." }, { status: 500 });
  }

  // Xác minh xong → dọn mọi thử-thách còn treo.
  await admin
    .from("auth_otp_dien_thoai")
    .delete()
    .eq("id_nguoi_dung", session.profile.id);

  return NextResponse.json({ enabled: true, phoneMasked: maskPhone(phone) });
}
