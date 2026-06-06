import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  followTarget,
  listFollowAcceptedNotifications,
  listPendingFollowRequests,
  logFollowRequestHandled,
  notifyFollowAccepted,
  removeIncomingUserFollow,
} from "@/lib/social/follow";
import { loadNotificationFeed } from "@/lib/social/notifications";

export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const [requests, accepted] = await Promise.all([
    listPendingFollowRequests(session.profile.id),
    listFollowAcceptedNotifications(session.profile.id, { unreadOnly: true }),
  ]);
  return NextResponse.json({ requests, accepted });
}

export async function PATCH(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { id_nguoi_dung?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const targetId = body.id_nguoi_dung?.trim();
  const action = body.action;
  if (!targetId || (action !== "accept" && action !== "decline")) {
    return NextResponse.json(
      { error: "Thiếu id_nguoi_dung hoặc action không hợp lệ." },
      { status: 400 },
    );
  }

  const result =
    action === "accept"
      ? await followTarget(session.profile.id, targetId, "user")
      : await removeIncomingUserFollow(session.profile.id, targetId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (action === "accept") {
    await notifyFollowAccepted(targetId, session.profile.id);
  }

  await logFollowRequestHandled(session.profile.id, targetId, action);

  const feed = await loadNotificationFeed(session.profile.id, "unread");
  return NextResponse.json({ ok: true, ...feed });
}
