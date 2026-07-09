import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  loadNotificationFeed,
  markAllInfoNotificationsRead,
  markNotificationsRead,
} from "@/lib/social/notifications";
import type { NotificationFilter } from "@/lib/social/types";

function parseFilter(value: string | null): NotificationFilter {
  return value === "history" ? "history" : "unread";
}

/** GET /api/notifications?filter=unread|history */
export async function GET(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const filter = parseFilter(new URL(req.url).searchParams.get("filter"));
  const params = new URL(req.url).searchParams;
  const offset = Math.max(0, Number.parseInt(params.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(
    30,
    Math.max(1, Number.parseInt(params.get("limit") ?? "10", 10) || 10),
  );
  const feed = await loadNotificationFeed(session.profile.id, filter, {
    offset: filter === "history" ? offset : undefined,
    displayLimit: limit,
  });
  return NextResponse.json(feed);
}

/** PATCH /api/notifications — đánh dấu đã đọc */
export async function PATCH(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { notification_ids?: string[]; mark_all?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  if (body.mark_all) {
    const result = await markAllInfoNotificationsRead(session.profile.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const feed = await loadNotificationFeed(session.profile.id, "unread");
    return NextResponse.json({ ok: true, ...feed });
  }

  const ids = Array.isArray(body.notification_ids)
    ? body.notification_ids.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Thiếu notification_ids hoặc mark_all." },
      { status: 400 },
    );
  }

  const result = await markNotificationsRead(session.profile.id, ids);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const feed = await loadNotificationFeed(session.profile.id, "unread");
  return NextResponse.json({ ok: true, ...feed });
}
