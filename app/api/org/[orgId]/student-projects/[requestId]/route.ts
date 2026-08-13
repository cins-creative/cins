import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { updateOrgDoanProjectDisplay } from "@/lib/journey/org-milestone-tag";

type RouteContext = {
  params: Promise<{ orgId: string; requestId: string }>;
};

/** PATCH — bật/tắt hiển thị công khai + điểm sắp xếp. */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { orgId, requestId } = await ctx.params;

  let body: { hienThiSanPham?: boolean; diemSapXep?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const patch: { hienThiSanPham?: boolean; diemSapXep?: number } = {};
  if (typeof body.hienThiSanPham === "boolean") {
    patch.hienThiSanPham = body.hienThiSanPham;
  }
  if (body.diemSapXep !== undefined) {
    const n = Number(body.diemSapXep);
    if (!Number.isFinite(n) || n < 0 || n > 9999) {
      return NextResponse.json({ error: "Điểm không hợp lệ." }, { status: 400 });
    }
    patch.diemSapXep = Math.round(n);
  }

  if (
    patch.hienThiSanPham === undefined &&
    patch.diemSapXep === undefined
  ) {
    return NextResponse.json({ error: "Không có thay đổi." }, { status: 400 });
  }

  const result = await updateOrgDoanProjectDisplay(
    orgId,
    requestId,
    session.profile.id,
    patch,
  );

  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ item: result.item });
}
