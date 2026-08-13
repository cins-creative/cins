import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { fetchOrgDoanMilestones } from "@/lib/truong/doan-milestones-fetch";
import type { TagAggSort } from "@/lib/tag/aggregation-types";

type RouteContext = { params: Promise<{ orgId: string }> };

const SORTS = new Set<TagAggSort>(["moi_nhat", "nhieu_tuong_tac", "a_z"]);

function parseSort(raw: string | null): TagAggSort {
  if (raw && SORTS.has(raw as TagAggSort)) return raw as TagAggSort;
  return "moi_nhat";
}

/** GET /api/org/:orgId/doan-milestones?sort= — timeline Journey cho đồ án đã duyệt. */
export async function GET(req: Request, ctx: RouteContext) {
  try {
    const { orgId } = await ctx.params;
    const sort = parseSort(new URL(req.url).searchParams.get("sort"));
    const session = await getCurrentSessionAndProfile();
    const milestones = await fetchOrgDoanMilestones(
      orgId,
      sort,
      session?.profile?.id ?? null,
    );
    return NextResponse.json({ milestones });
  } catch (error) {
    console.error("[doan-milestones]", error);
    return NextResponse.json(
      { milestones: [], error: "Không tải được dòng thời gian." },
      { status: 500 },
    );
  }
}
