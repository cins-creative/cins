import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { loadSidebarLiveData } from "@/lib/cong-dong/sidebar-data";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

async function assertCongDongOrg(orgId: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id")
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle();
  return Boolean(data);
}

/** Face pile + bản đồ nghề — realtime, không cache. */
export async function GET(_req: Request, ctx: RouteContext) {
  const { id: orgId } = await ctx.params;
  if (!(await assertCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }

  const session = await getCurrentSessionAndProfile();
  const data = await loadSidebarLiveData(orgId, session?.profile?.id ?? null);

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
