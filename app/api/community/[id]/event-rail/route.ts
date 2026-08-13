import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  loadCongDongEventRail,
  updateCongDongEventRail,
} from "@/lib/cong-dong/event-rail";
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

/** GET /api/cong-dong/:id/event-rail */
export async function GET(_req: Request, ctx: RouteContext) {
  const { id: orgId } = await ctx.params;
  if (!(await getCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }
  const eventRail = await loadCongDongEventRail(orgId);
  return NextResponse.json(eventRail);
}

/** PATCH /api/cong-dong/:id/event-rail — admin cập nhật banner */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  if (!(await getCongDongOrg(orgId))) {
    return NextResponse.json({ error: "Không tìm thấy cộng đồng." }, { status: 404 });
  }

  let body: {
    kind?: "default" | "scheduled" | "cancel_scheduled";
    tieuDe?: string;
    moTa?: string | null;
    coverId?: string | null;
    batDau?: string;
    ketThuc?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  if (
    body.kind !== "default" &&
    body.kind !== "scheduled" &&
    body.kind !== "cancel_scheduled"
  ) {
    return NextResponse.json({ error: "kind không hợp lệ." }, { status: 400 });
  }

  const result = await updateCongDongEventRail({
    orgId,
    adminId: session.profile.id,
    kind: body.kind,
    tieuDe: body.tieuDe,
    moTa: body.moTa,
    coverId: body.coverId,
    batDau: body.batDau,
    ketThuc: body.ketThuc,
  });

  if (!result.ok) {
    const status = result.error.includes("admin") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    config: result.config,
    display: result.display,
  });
}
