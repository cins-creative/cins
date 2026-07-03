import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createGopY } from "@/lib/gop-y/gop-y";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

/** POST /api/gop-y — gửi góp ý (ai cũng gửi được, kể cả khách). */
export async function POST(req: Request) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { error: "Server chưa cấu hình để nhận góp ý." },
      { status: 503 },
    );
  }

  let body: {
    noiDung?: string;
    trangUrl?: string;
    email?: string;
    hoTen?: string;
  } | null = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const noiDung = body?.noiDung?.trim();
  if (!noiDung) {
    return NextResponse.json({ error: "Vui lòng nhập nội dung góp ý." }, { status: 400 });
  }

  const session = await getCurrentSessionAndProfile();
  const profile = session?.profile ?? null;

  const result = await createGopY({
    idNguoiDung: profile?.id ?? null,
    hoTen: body?.hoTen ?? profile?.ten_hien_thi ?? null,
    email: body?.email ?? session?.email ?? null,
    noiDung,
    trangUrl: body?.trangUrl ?? null,
    userAgent: req.headers.get("user-agent"),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
