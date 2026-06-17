import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  listRoomMessages,
  sendRoomMessage,
} from "@/lib/chat/direct-message";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

export async function GET(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;
  if (!roomId) {
    return NextResponse.json({ error: "Thiếu roomId." }, { status: 400 });
  }

  const url = new URL(req.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "30", 10) || 30, 1),
    80,
  );
  const before = url.searchParams.get("before")?.trim() || undefined;

  try {
    const result = await listRoomMessages(roomId, session.profile.id, {
      limit,
      before,
      markRead: !before,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Không tải được tin nhắn." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { roomId } = await context.params;
  if (!roomId) {
    return NextResponse.json({ error: "Thiếu roomId." }, { status: 400 });
  }

  let body: { noi_dung?: string; cloudflare_image_id?: string; id_tin_tra_loi?: string };
  try {
    body = (await req.json()) as {
      noi_dung?: string;
      cloudflare_image_id?: string;
      id_tin_tra_loi?: string;
    };
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const result = await sendRoomMessage(roomId, session.profile.id, {
    body: body.noi_dung,
    cloudflareImageId: body.cloudflare_image_id,
    replyToId: body.id_tin_tra_loi,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ message: result.message });
}
