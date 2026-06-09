import { NextResponse } from "next/server";

import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";
import { fetchScheduledBaiDang } from "@/lib/truong/fetch-scheduled-bai-dang";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/truong/:id/bai-dang/scheduled — bài hẹn đăng (admin tab bài đăng). */
export async function GET(request: Request, context: RouteContext) {
  const { id: orgId } = await context.params;
  if (!orgId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(request, orgId);
  if (denied) return denied;

  try {
    const posts = await fetchScheduledBaiDang(orgId);
    return NextResponse.json({ posts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
