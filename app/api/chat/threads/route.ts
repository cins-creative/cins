import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { listAllChatThreads } from "@/lib/chat/org-message";

export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  try {
    const threads = await listAllChatThreads(session.profile.id);
    const totalUnread = threads.reduce((sum, thread) => sum + thread.unread, 0);
    return NextResponse.json({ threads, totalUnread });
  } catch {
    return NextResponse.json(
      { error: "Không tải được danh sách hội thoại." },
      { status: 500 },
    );
  }
}
