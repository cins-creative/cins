import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listMutualFriendProfilesPage } from "@/lib/social/ket-ban";

export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);

  const page = await listMutualFriendProfilesPage(session.profile.id, { offset });
  return NextResponse.json(page);
}
