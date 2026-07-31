import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import {
  adminXacNhanPhiKy,
  baoDaTraPhiKy,
  listPhiKyChoAdmin,
  listPhiKyForSeller,
} from "@/lib/shop/phi";

/** GET /api/shop/phi/ky — kỳ phí của seller; ?admin=1 → hàng chờ xác nhận. */
export async function GET(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const adminMode = new URL(request.url).searchParams.get("admin") === "1";
  if (adminMode) {
    const isAdmin = await getCurrentUserIsCinsAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const items = await listPhiKyChoAdmin();
    return NextResponse.json({ items });
  }
  try {
    const items = await listPhiKyForSeller(session.profile.id);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Không tải kỳ phí." }, { status: 500 });
  }
}
