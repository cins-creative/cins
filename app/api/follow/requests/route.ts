import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  acceptFriendRequest,
  declineFriendRequest,
  findPendingRecordId,
} from "@/lib/social/ket-ban";
import { loadNotificationFeed } from "@/lib/social/notifications";

/** @deprecated Dùng `/api/ket-ban/:id` PATCH — giữ tạm cho client cũ. */
export async function PATCH(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: { id_nguoi_dung?: string; action?: string; ket_ban_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  const targetId = body.id_nguoi_dung?.trim();
  const action = body.action;
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "action không hợp lệ." }, { status: 400 });
  }

  const recordId =
    body.ket_ban_id?.trim() ??
    (targetId
      ? await findPendingRecordId(session.profile.id, targetId)
      : null);

  if (!recordId) {
    return NextResponse.json({ error: "Không tìm thấy lời mời." }, { status: 404 });
  }

  if (action === "accept") {
    const acceptResult = await acceptFriendRequest(recordId, session.profile.id);
    if (!acceptResult.ok) {
      return NextResponse.json({ error: acceptResult.error }, { status: 400 });
    }
  } else {
    const declineResult = await declineFriendRequest(recordId, session.profile.id);
    if (!declineResult.ok) {
      return NextResponse.json({ error: declineResult.error }, { status: 400 });
    }
  }

  const feed = await loadNotificationFeed(session.profile.id, "unread");
  return NextResponse.json({ ok: true, ...feed });
}
