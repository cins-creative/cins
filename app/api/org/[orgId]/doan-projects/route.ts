import { NextResponse } from "next/server";

import { listApprovedOrgDoanProjects } from "@/lib/journey/org-milestone-tag";

type RouteContext = { params: Promise<{ orgId: string }> };

/** GET /api/org/:orgId/doan-projects — đồ án đã duyệt (public read). */
export async function GET(_req: Request, ctx: RouteContext) {
  const { orgId } = await ctx.params;
  const projects = await listApprovedOrgDoanProjects(orgId);
  return NextResponse.json({ projects });
}
