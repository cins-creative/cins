import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { logFollowRequestHandled } from "@/lib/social/follow";
import {
  acceptFriendRequest,
  declineFriendRequest,
  removeByRecordId,
} from "@/lib/social/ket-ban";
import { loadNotificationFeed } from "@/lib/social/notifications";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id } = await ctx.params;

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const action = body.action;
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "action phải là accept hoặc decline." }, { status: 400 });
  }

  if (action === "accept") {
    const result = await acceptFriendRequest(id, session.profile.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    await logFollowRequestHandled(
      session.profile.id,
      result.data.idNguoiGui,
      "accept",
    );
  } else {
    const admin = createServiceRoleClient();
    const { data: row } = await admin
      .from("user_ket_ban")
      .select("id_nguoi_gui")
      .eq("id", id)
      .maybeSingle<{ id_nguoi_gui: string }>();

    const result = await declineFriendRequest(id, session.profile.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (row?.id_nguoi_gui) {
      await logFollowRequestHandled(
        session.profile.id,
        row.id_nguoi_gui,
        "decline",
      );
    }
  }

  const feed = await loadNotificationFeed(session.profile.id, "unread");
  return NextResponse.json({ ok: true, ...feed });
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const result = await removeByRecordId(id, session.profile.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
