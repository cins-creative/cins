import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getCurrentUserIsCinsAdmin } from "@/lib/auth/cins-admin-server";
import { adminXacNhanPhiKy, baoDaTraPhiKy } from "@/lib/shop/phi";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/shop/phi/ky/[id]/bao-da-tra — seller nộp biên lai. */
export async function POST(request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { id } = await ctx.params;
  let body: { bienLaiAnhUrl?: unknown; bienLaiAnhId?: unknown; action?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  /* Admin xác nhận qua cùng route với action=xac_nhan. */
  if (body.action === "xac_nhan") {
    const isAdmin = await getCurrentUserIsCinsAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    try {
      const ky = await adminXacNhanPhiKy(session.profile.id, id);
      return NextResponse.json({ ky });
    } catch {
      return NextResponse.json({ error: "Không xác nhận được." }, { status: 500 });
    }
  }

  try {
    const ky = await baoDaTraPhiKy(session.profile.id, id, {
      bienLaiAnhUrl:
        typeof body.bienLaiAnhUrl === "string" ? body.bienLaiAnhUrl : "",
      bienLaiAnhId:
        typeof body.bienLaiAnhId === "string" ? body.bienLaiAnhId : null,
    });
    return NextResponse.json({ ky });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "RECEIPT_REQUIRED") {
      return NextResponse.json(
        { error: "Cần ảnh biên lai chuyển khoản phí." },
        { status: 422 },
      );
    }
    if (msg === "UPDATE_FAILED") {
      return NextResponse.json(
        { error: "Không cập nhật được kỳ phí." },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: "Không báo đã trả." }, { status: 500 });
  }
}
