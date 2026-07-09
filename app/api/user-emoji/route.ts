import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { createUserEmojiBo } from "@/lib/user-emoji/create-bo";
import { listUserEmojiPacks } from "@/lib/user-emoji/list";

/** GET /api/user-emoji — danh sách bộ meme của user đăng nhập. */
export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const pack = await listUserEmojiPacks(session.profile.id);
  return NextResponse.json(pack);
}

/** POST /api/user-emoji — tạo bộ meme mới. */
export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { ten?: string; thu_tu?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const result = await createUserEmojiBo({
    userId: session.profile.id,
    ten: body.ten ?? "",
    thuTu: body.thu_tu,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, bo: result.bo });
}
