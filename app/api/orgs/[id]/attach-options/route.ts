import { NextResponse } from "next/server";

import { loadOrgAttachOptions } from "@/lib/journey/org-milestone-tag";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/orgs/:id/attach-options — khóa học (cơ sở) hoặc ngành (trường). */
export async function GET(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const result = await loadOrgAttachOptions(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({
    loaiToChuc: result.loaiToChuc,
    options: result.options,
  });
}
