import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  CONG_DONG_ROSTER_PAGE_SIZE,
  listCongDongMemberRoster,
} from "@/lib/cong-dong/roster";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/cong-dong/:id/roster — danh sách thành viên (xem theo shell). */
export async function GET(req: Request, ctx: RouteContext) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const url = new URL(req.url);
  const offsetRaw = Number(url.searchParams.get("offset") ?? "0");
  const limitRaw = Number(
    url.searchParams.get("limit") ?? String(CONG_DONG_ROSTER_PAGE_SIZE),
  );
  const offset = Number.isFinite(offsetRaw) ? offsetRaw : 0;
  const limit = Number.isFinite(limitRaw) ? limitRaw : CONG_DONG_ROSTER_PAGE_SIZE;

  const result = await listCongDongMemberRoster({
    orgId,
    viewerId: session?.profile?.id ?? null,
    offset,
    limit,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json(
    {
      members: result.members,
      total: result.total,
      nextOffset: result.nextOffset,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
