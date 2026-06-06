import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { loadCoAuthorCreditsForTacPham } from "@/lib/journey/coauthor-credits";
import {
  listPendingCoAuthorReviews,
  respondCoAuthorReview,
} from "@/lib/social/co-author";
import { loadNotificationFeed } from "@/lib/social/notifications";

export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const reviews = await listPendingCoAuthorReviews(session.profile.id);
  return NextResponse.json({ reviews });
}

export async function PATCH(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { notification_id?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const notificationId = body.notification_id?.trim();
  const action = body.action;
  if (!notificationId || (action !== "accept" && action !== "decline")) {
    return NextResponse.json(
      { error: "Thiếu notification_id hoặc action không hợp lệ." },
      { status: 400 },
    );
  }

  const result = await respondCoAuthorReview(
    notificationId,
    session.profile.id,
    action,
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const feed = await loadNotificationFeed(session.profile.id, "unread");
  const coAuthorCredits =
    action === "accept"
      ? await loadCoAuthorCreditsForTacPham(result.tacPhamId)
      : undefined;
  return NextResponse.json({
    ok: true,
    ...feed,
    tacPhamId: result.tacPhamId,
    coAuthorCredits,
  });
}
