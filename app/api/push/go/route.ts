import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { goPushKhiLogout } from "@/lib/push/go-khi-logout";

/**
 * POST /api/push/go
 * Body: { token?: string } — gỡ FCM khi logout (có token = đúng máy; không = mọi FCM của user).
 */
export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { token?: unknown } = {};
  try {
    const text = await req.text();
    if (text.trim()) {
      body = JSON.parse(text) as { token?: unknown };
    }
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : null;
  const result = await goPushKhiLogout({
    userId: session.profile.id,
    token,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, updated: result.updated });
}
