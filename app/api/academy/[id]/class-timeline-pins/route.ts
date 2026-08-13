import { NextResponse } from "next/server";

import { listCoSoLopTimelinePins } from "@/lib/to-chuc/co-so-timeline-lop-pins";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/co-so/:id/timeline-lop-pins — lớp đang mở để ghim timeline. */
export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const { id: orgId } = await ctx.params;
    const pins = await listCoSoLopTimelinePins(orgId);
    return NextResponse.json({ pins });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không tải được lịch lớp học.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
