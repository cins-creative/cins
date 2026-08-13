import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listHocVienCuaOrg } from "@/lib/co-so/hoc-vien-list";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { getCoSoModuleQuyen } from "@/lib/to-chuc/co-so-quan-ly-access";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Ctx = { params: Promise<{ id: string; khoaId: string }> };

/**
 * GET /api/co-so/:id/khoa-hoc/:khoaId/hoc-vien
 * Danh sách ghi danh của 1 khóa (mặc định `dang_hoc`) — panel catalog quản lý.
 */
export async function GET(req: Request, ctx: Ctx) {
  const { id: orgId, khoaId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  const quyenKhoa = await getCoSoModuleQuyen(orgId, actorId, vaiTro, "khoa-lop");
  const quyenHv = await getCoSoModuleQuyen(orgId, actorId, vaiTro, "hoc-vien");
  if (quyenKhoa === "an" && quyenHv === "an") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  const { data: khoa } = await admin
    .from("org_khoa_hoc")
    .select("id")
    .eq("id", khoaId)
    .eq("id_to_chuc", orgId)
    .maybeSingle();
  if (!khoa?.id) {
    return NextResponse.json({ error: "Không tìm thấy khóa." }, { status: 404 });
  }

  const url = new URL(req.url);
  const trangThai = url.searchParams.get("trangThai") ?? "dang_hoc";
  const page = Number(url.searchParams.get("page") || "1");
  const pageSize = Number(url.searchParams.get("pageSize") || "100");

  try {
    const list = await listHocVienCuaOrg(orgId, {
      khoaId,
      trangThai,
      page,
      pageSize,
    });
    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi tải học viên." },
      { status: 500 },
    );
  }
}
