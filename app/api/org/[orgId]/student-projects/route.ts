import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  canReviewOrgMilestoneTags,
  countOrgApprovedDoanTags,
  listApprovedOrgDoanProjects,
} from "@/lib/journey/org-milestone-tag";

type RouteContext = { params: Promise<{ orgId: string }> };

/** GET /api/org/:orgId/doan-projects — đồ án đã duyệt. */
export async function GET(req: Request, ctx: RouteContext) {
  const { orgId } = await ctx.params;
  const url = new URL(req.url);
  const featuredOnly = url.searchParams.get("featured") === "1";
  const khoaHocId = url.searchParams.get("khoaHocId")?.trim() || null;
  const withStats = url.searchParams.get("stats") === "1";

  const scope = url.searchParams.get("scope");
  const adminAll = scope === "admin";
  if (adminAll) {
    const session = await getCurrentSessionAndProfile();
    if (
      !session?.profile ||
      !(await canReviewOrgMilestoneTags(orgId, session.profile.id))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const projects = await listApprovedOrgDoanProjects(orgId, {
    featuredOnly: adminAll ? false : featuredOnly,
    khoaHocId,
  });

  if (withStats) {
    const totalApproved = await countOrgApprovedDoanTags(orgId);
    return NextResponse.json({ projects, totalApproved });
  }

  return NextResponse.json({ projects });
}
