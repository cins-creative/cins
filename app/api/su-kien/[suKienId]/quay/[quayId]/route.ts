import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { duyetQuay } from "@/lib/shop/quay";

type Ctx = { params: Promise<{ suKienId: string; quayId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const { quayId } = await ctx.params;
  let body: { action?: unknown; lyDoTuChoi?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  if (body.action !== "approve" && body.action !== "reject") {
    return NextResponse.json({ error: "action không hợp lệ." }, { status: 422 });
  }
  try {
    const item = await duyetQuay(
      session.profile.id,
      quayId,
      body.action,
      typeof body.lyDoTuChoi === "string" ? body.lyDoTuChoi : null,
    );
    return NextResponse.json({ item });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Không có quyền duyệt." }, { status: 403 });
    }
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
    }
    return NextResponse.json({ error: "Không cập nhật được." }, { status: 500 });
  }
}
