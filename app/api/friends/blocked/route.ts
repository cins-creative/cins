import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listBlockedProfilesPage } from "@/lib/social/ket-ban";

/** Danh sách người dùng mà viewer đã chặn (phân trang). */
export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);

  const page = await listBlockedProfilesPage(session.profile.id, { offset });
  return NextResponse.json(page);
}
