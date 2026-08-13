import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { loadMutualFriendProfiles, mutualFriends } from "@/lib/social/ket-ban";

export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idNguoi = searchParams.get("id_nguoi")?.trim();
  if (!idNguoi) {
    return NextResponse.json({ error: "Thiếu id_nguoi." }, { status: 400 });
  }

  const ids = await mutualFriends(session.profile.id, idNguoi);
  const users = await loadMutualFriendProfiles(ids, 20);

  return NextResponse.json({ count: ids.length, users });
}
