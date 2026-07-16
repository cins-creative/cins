import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { assertTruongOrgWriteApi } from "@/lib/truong/inline-api-auth";
import {
  deleteTruongOrgFilter,
  updateTruongOrgFilter,
} from "@/lib/truong/org-bai-dang-filters";

type RouteContext = { params: Promise<{ id: string; filterId: string }> };

/** PATCH /api/truong/:id/filters/:filterId — đổi tên / màu nhãn (slug giữ nguyên). */
export async function PATCH(req: Request, ctx: RouteContext) {
  const { id: orgId, filterId } = await ctx.params;
  if (!orgId?.trim() || !filterId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(req, orgId);
  if (denied) return denied;

  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { ten?: string; mau?: string; thu_tu?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const result = await updateTruongOrgFilter({
    orgId,
    filterId,
    adminId: session.profile.id,
    ten: body.ten,
    mau: body.mau,
    thuTu: body.thu_tu,
  });

  if (!result.ok) {
    const status =
      result.error.includes("admin") || result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, filter: result.filter });
}

/** DELETE /api/truong/:id/filters/:filterId */
export async function DELETE(req: Request, ctx: RouteContext) {
  const { id: orgId, filterId } = await ctx.params;
  if (!orgId?.trim() || !filterId?.trim()) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const denied = await assertTruongOrgWriteApi(req, orgId);
  if (denied) return denied;

  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const result = await deleteTruongOrgFilter({
    orgId,
    filterId,
    adminId: session.profile.id,
  });

  if (!result.ok) {
    const status =
      result.error.includes("admin") || result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true });
}
