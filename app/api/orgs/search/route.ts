import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { searchOrgsForMilestoneTag } from "@/lib/journey/org-milestone-tag";

/** GET /api/orgs/search?q= — tìm trường / cơ sở đào tạo (ưu tiên org đang theo dõi). */
export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ orgs: [] });
  }

  const orgs = await searchOrgsForMilestoneTag(q, session?.profile?.id ?? null);
  return NextResponse.json({ orgs });
}
