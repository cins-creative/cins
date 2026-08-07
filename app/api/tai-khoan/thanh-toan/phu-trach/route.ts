import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  addPhuTrach,
  findAccessibleTkForUser,
  listPhuTrach,
  removePhuTrach,
} from "@/lib/billing/tk";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** GET /api/tai-khoan/thanh-toan/phu-trach */
export async function GET() {
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const access = await findAccessibleTkForUser(actorId);
  if (!access) {
    return NextResponse.json({ items: [] });
  }
  if (!access.laChu) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const items = await listPhuTrach(access.tk.id);
  return NextResponse.json({ items });
}

/** POST { slug | userId } — thêm người phụ trách. */
export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const access = await findAccessibleTkForUser(actorId);
  if (!access?.laChu) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    slug?: string;
    userId?: string;
  } | null;

  let targetUserId = body?.userId?.trim() || "";
  if (!targetUserId && body?.slug?.trim()) {
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("user_nguoi_dung")
      .select("id")
      .eq("slug", body.slug.trim())
      .maybeSingle<{ id: string }>();
    targetUserId = data?.id ?? "";
  }
  if (!targetUserId) {
    return NextResponse.json(
      { error: "Thiếu slug hoặc userId." },
      { status: 400 },
    );
  }

  const result = await addPhuTrach({
    tkId: access.tk.id,
    actorId,
    targetUserId,
  });
  if (!result.ok) {
    const status = result.error === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  const items = await listPhuTrach(access.tk.id);
  return NextResponse.json({ ok: true, items });
}

/** DELETE { id } — gỡ người phụ trách. */
export async function DELETE(req: Request) {
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const access = await findAccessibleTkForUser(actorId);
  if (!access?.laChu) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  const rowId = body?.id?.trim();
  if (!rowId) {
    return NextResponse.json({ error: "Thiếu id." }, { status: 400 });
  }

  const result = await removePhuTrach({
    tkId: access.tk.id,
    actorId,
    rowId,
  });
  if (!result.ok) {
    const status = result.error === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  const items = await listPhuTrach(access.tk.id);
  return NextResponse.json({ ok: true, items });
}
