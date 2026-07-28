import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getNguoiNhan } from "@/lib/shop/nguoi-nhan";

/** Prefill thông tin nhận hàng đã lưu của người mua (dùng ở form checkout). */
export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  try {
    const nguoiNhan = await getNguoiNhan(session.profile.id);
    return NextResponse.json({ nguoiNhan });
  } catch {
    return NextResponse.json(
      { error: "Không tải được thông tin nhận hàng." },
      { status: 500 },
    );
  }
}
