import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  getTruongSettings,
  updateTruongSettings,
  type UpdateTruongSettingsInput,
} from "@/lib/truong/truong-settings";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/truong/:id/settings */
export async function GET(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  const result = await getTruongSettings(orgId, session.profile.id);
  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 404;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ settings: result.settings });
}

/** PATCH /api/truong/:id/settings */
export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id: orgId } = await ctx.params;
  let body: UpdateTruongSettingsInput;
  try {
    body = (await req.json()) as UpdateTruongSettingsInput;
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const result = await updateTruongSettings(orgId, session.profile.id, body);
  if (!result.ok) {
    const status = result.error.includes("quyền") ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ settings: result.settings });
}
