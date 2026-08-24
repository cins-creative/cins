import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { dangKyFcmThietBi } from "@/lib/push/dang-ky";
import { isPushNenTang } from "@/lib/push/types";

/**
 * POST /api/push/register
 * Body: { token: string, nenTang: "ios"|"android", userAgent?: string }
 * Đăng ký FCM token thiết bị cho user đang đăng nhập.
 * Legacy VN `/api/push/dang-ky` → 308 `/api/push/register` (PLAN_URL_ENGLISH).
 */
export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { token?: unknown; nenTang?: unknown; userAgent?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const nenTang = body.nenTang;
  if (!token) {
    return NextResponse.json({ error: "Thiếu token." }, { status: 400 });
  }
  if (!isPushNenTang(nenTang) || nenTang === "web") {
    return NextResponse.json(
      { error: "nenTang phải là ios hoặc android." },
      { status: 400 },
    );
  }

  const userAgent =
    typeof body.userAgent === "string"
      ? body.userAgent.slice(0, 500)
      : req.headers.get("user-agent");

  const result = await dangKyFcmThietBi({
    userId: session.profile.id,
    token,
    nenTang,
    userAgent,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
