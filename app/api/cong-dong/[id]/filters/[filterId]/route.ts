import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  deleteCongDongFilter,
  updateCongDongFilter,
} from "@/lib/cong-dong/filters";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteContext = { params: Promise<{ id: string; filterId: string }> };

async function getCongDongOrg(orgId: string) {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("org_to_chuc")
    .select("id, loai_to_chuc")
    .eq("id", orgId)
    .eq("loai_to_chuc", "cong_dong")
    .maybeSingle<{ id: string; loai_to_chuc: string }>();
  return data;
}

/** PATCH /api/cong-dong/:id/filters/:filterId */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, filterId } = await ctx.params;
  if (!(await getCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }

  let body: { ten?: string; slug?: string; mau?: string; thu_tu?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const result = await updateCongDongFilter({
    orgId,
    filterId,
    adminId: session.profile.id,
    ten: body.ten,
    slug: body.slug,
    mau: body.mau,
    thuTu: body.thu_tu,
  });

  if (!result.ok) {
    const status = result.error.includes("admin") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, filter: result.data });
}

/** DELETE /api/cong-dong/:id/filters/:filterId */
export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId, filterId } = await ctx.params;
  if (!(await getCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }

  const result = await deleteCongDongFilter({
    orgId,
    filterId,
    adminId: session.profile.id,
  });

  if (!result.ok) {
    const status = result.error.includes("admin") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
