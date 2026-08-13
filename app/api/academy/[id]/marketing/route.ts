import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getMarketingFunnel } from "@/lib/co-so/ops-dashboard";
import { getViewerCoSoVaiTro } from "@/lib/to-chuc/co-so-membership";
import { canAccessCoSoQuanLyAsync } from "@/lib/to-chuc/co-so-quan-ly-access";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id: orgId } = await ctx.params;
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vaiTro = await getViewerCoSoVaiTro(actorId, orgId);
  if (!(await canAccessCoSoQuanLyAsync(orgId, actorId, vaiTro))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const funnel = await getMarketingFunnel(orgId);
  return NextResponse.json({ funnel });
}
