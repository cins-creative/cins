import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  loadCongDongLinhVucs,
  updateCongDongLinhVucs,
} from "@/lib/cong-dong/linh-vuc";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string }> };

async function getCongDongOrg(orgId: string) {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id")
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{ id: string }>();
  return data;
}

/** GET /api/cong-dong/:id/linh-vuc */
export async function GET(_req: Request, ctx: RouteContext) {
  const { id: orgId } = await ctx.params;
  if (!(await getCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }
  const linhVucs = await loadCongDongLinhVucs(orgId);
  return NextResponse.json({ linhVucs });
}

/** PATCH /api/cong-dong/:id/linh-vuc — admin cập nhật lĩnh vực (tối đa 3). */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  if (!(await getCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }

  let body: { linhVucIds?: string[]; linh_vuc?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const linhVucIds = Array.isArray(body.linhVucIds)
    ? body.linhVucIds
    : Array.isArray(body.linh_vuc)
      ? body.linh_vuc
      : [];

  const result = await updateCongDongLinhVucs({
    orgId,
    adminId: session.profile.id,
    linhVucIds,
  });

  if (!result.ok) {
    const status = result.error.includes("admin") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, linhVucs: result.linhVucs });
}
