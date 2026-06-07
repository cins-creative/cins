import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  loadPersonalFilterRefsForCotMoc,
  setMilestonePersonalFilters,
} from "@/lib/filter/gan";

type RouteContext = { params: Promise<{ milestoneId: string }> };

/** GET /api/milestone/:milestoneId/filters — nhãn gắn trên cột mốc (public read). */
export async function GET(_req: Request, ctx: RouteContext) {
  const { milestoneId } = await ctx.params;
  const filters = await loadPersonalFilterRefsForCotMoc(milestoneId);
  return NextResponse.json({ filters });
}

/** PUT /api/milestone/:milestoneId/filters — set danh sách nhãn (chủ cột mốc). */
export async function PUT(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { milestoneId } = await ctx.params;

  let body: { id_filter?: string[]; filterIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const filterIds = body.id_filter ?? body.filterIds ?? [];
  if (!Array.isArray(filterIds)) {
    return NextResponse.json({ error: "id_filter phải là mảng." }, { status: 400 });
  }

  const result = await setMilestonePersonalFilters({
    milestoneId,
    userId: session.profile.id,
    filterIds: filterIds.map(String),
  });

  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, filters: result.filters });
}
