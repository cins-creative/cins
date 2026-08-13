import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listChiNhanh } from "@/lib/co-so/ops-dashboard";
import { canViewerManageKhoaHoc } from "@/lib/to-chuc/khoa-hoc";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/co-so/:id/khoa-hoc/dia-diem
 * Chi nhánh đang hoạt động — picker địa điểm khóa (quyền quản lý khóa).
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await canViewerManageKhoaHoc(actorId, orgId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const all = await listChiNhanh(orgId);
    const rows = all
      .filter((r) => r.dangHoatDong && r.ten.trim() && r.diaChi?.trim())
      .map((r) => ({
        id: r.id,
        ten: r.ten,
        diaChi: r.diaChi,
        tinhThanh: r.tinhThanh,
      }));
    return NextResponse.json({ rows });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không tải được chi nhánh.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
