import { NextResponse } from "next/server";

import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";

type RouteCtx = { params: Promise<{ id: string }> };

/** Đã gỡ — tag cộng đồng tự tạo, admin không verify nữa. */
export async function PATCH(_req: Request, _ctx: RouteCtx) {
  const isAdmin = await getCurrentUserIsCinsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  return NextResponse.json(
    {
      error:
        "Đã gỡ verify CINs cho tag — cộng đồng tự tạo, không xác thực admin.",
    },
    { status: 410 },
  );
}
