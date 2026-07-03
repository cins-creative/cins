import { NextResponse } from "next/server";

import { revokeAdminToChuc, verifyAdminToChuc } from "@/lib/admin/to-chuc-crud";
import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, context: RouteContext) {
  const isAdmin = await getCurrentUserIsCinsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const result = await verifyAdminToChuc(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ row: result.row });
}

/** Gỡ Verified — khôi phục trạng thái trước khi cấp. */
export async function DELETE(_req: Request, context: RouteContext) {
  const isAdmin = await getCurrentUserIsCinsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const result = await revokeAdminToChuc(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ row: result.row });
}
