import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  PHONE_OTP_RESEND_COOLDOWN_SEC,
  PHONE_OTP_TTL_SEC,
  generatePhoneOtp,
  hashPhoneOtp,
  isDevOtpEcho,
  normalizeVietnamPhone,
  sendPhoneOtpStub,
} from "@/lib/auth/phone-otp";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ POST /api/user/bao-mat-2-lop/gui-ma                                ║
   ║ Body: { phone }                                                    ║
   ║ Validate SĐT VN → cooldown → sinh OTP (lưu ma_hash) → gửi (stub). ║
   ╚══════════════════════════════════════════════════════════════════╝ */

type Body = { phone?: unknown };

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
  if (!phone) {
    return NextResponse.json(
      { error: "Số điện thoại không hợp lệ. Nhập SĐT di động Việt Nam." },
      { status: 422 },
    );
  }

  const admin = createServiceRoleClient();

  // Cooldown: chặn gửi lại quá nhanh (rate-limit cơ bản theo người dùng).
  const { data: recent } = await admin
    .from("auth_otp_dien_thoai")
    .select("tao_luc")
    .eq("id_nguoi_dung", session.profile.id)
    .order("tao_luc", { ascending: false })
    .limit(1)
    .maybeSingle<{ tao_luc: string }>();

  if (recent?.tao_luc) {
    const elapsedSec = (Date.now() - new Date(recent.tao_luc).getTime()) / 1000;
    const remain = Math.ceil(PHONE_OTP_RESEND_COOLDOWN_SEC - elapsedSec);
    if (remain > 0) {
      return NextResponse.json(
        {
          error: `Bạn vừa yêu cầu mã. Vui lòng đợi ${remain}s rồi thử lại.`,
          cooldownSec: remain,
        },
        { status: 429 },
      );
    }
  }

  const code = generatePhoneOtp();
  const hetHan = new Date(Date.now() + PHONE_OTP_TTL_SEC * 1000).toISOString();

  const { error: insertErr } = await admin.from("auth_otp_dien_thoai").insert({
    id_nguoi_dung: session.profile.id,
    so_dien_thoai: phone,
    ma_hash: hashPhoneOtp(phone, code),
    het_han_luc: hetHan,
  });

  if (insertErr) {
    console.error("[bao-mat-2-lop/gui-ma] insert err:", insertErr.message);
    return NextResponse.json(
      { error: "Tính năng đang phát triển, bạn đợi thêm nhé" },
      { status: 500 },
    );
  }

  const sent = await sendPhoneOtpStub(phone, code);
  if (!sent.ok) {
    return NextResponse.json({ error: sent.message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    cooldownSec: PHONE_OTP_RESEND_COOLDOWN_SEC,
    ttlSec: PHONE_OTP_TTL_SEC,
    // TODO: gỡ khi ráp SMS provider thật. Chỉ lộ ở non-production để dev test.
    ...(isDevOtpEcho() ? { devCode: code } : {}),
  });
}
