import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  listOrgStudentMessagesForStaff,
  sendOrgMessageToStudent,
} from "@/lib/chat/org-message";

type RouteContext = {
  params: Promise<{ orgId: string; studentUserId: string }>;
};

/** GET — lịch sử nhắn org ↔ sinh viên (góc nhìn staff). */
export async function GET(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { orgId, studentUserId } = await context.params;
  if (!orgId?.trim() || !studentUserId?.trim()) {
    return NextResponse.json({ error: "Thiếu thông tin." }, { status: 400 });
  }

  const url = new URL(req.url);
  const result = await listOrgStudentMessagesForStaff({
    orgId: orgId.trim(),
    studentUserId: studentUserId.trim(),
    staffUserId: session.profile.id,
    roomId: url.searchParams.get("roomId"),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  return NextResponse.json({
    roomId: result.roomId,
    messages: result.messages,
  });
}

/** POST — staff gửi tin (text / ảnh / meme) tới sinh viên. */
export async function POST(req: Request, context: RouteContext) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  const { orgId, studentUserId } = await context.params;
  if (!orgId?.trim() || !studentUserId?.trim()) {
    return NextResponse.json({ error: "Thiếu thông tin." }, { status: 400 });
  }

  let body: {
    noi_dung?: string;
    cloudflare_image_id?: string;
    id_emoji_muc?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const result = await sendOrgMessageToStudent({
    orgId: orgId.trim(),
    studentUserId: studentUserId.trim(),
    staffUserId: session.profile.id,
    body: body.noi_dung ?? "",
    cloudflareImageId: body.cloudflare_image_id,
    emojiMucId: body.id_emoji_muc,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    roomId: result.roomId,
    message: result.message,
  });
}
