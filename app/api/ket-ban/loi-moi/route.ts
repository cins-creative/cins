import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listPendingReceived } from "@/lib/social/ket-ban";

export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const invites = await listPendingReceived(session.profile.id);
  return NextResponse.json({ invites, count: invites.length });
}
