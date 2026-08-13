import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { xoaHangLoatChoXuLy } from "@/lib/co-so/ghi-danh-xoa";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/co-so/:id/hoc-vien/xoa-hang-loat — gỡ nhiều ghi danh chờ xử lý. */
export async function POST(req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { ids?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = await xoaHangLoatChoXuLy(orgId, body.ids ?? [], actorId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 400 },
    );
  }
  return NextResponse.json({
    deleted: result.deleted,
    skipped: result.skipped,
  });
}
