import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { openUserOrgRoom } from "@/lib/chat/org-message";
import type { ChatContextCard } from "@/lib/chat/types";

type Body = {
  orgId?: string;
  nguCanh?: Partial<ChatContextCard> | null;
};

function sanitizeNguCanh(raw: Body["nguCanh"]): ChatContextCard | null {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const tieuDe = typeof raw.tieuDe === "string" ? raw.tieuDe.trim() : "";
  const loai = typeof raw.loai === "string" ? raw.loai.trim() : "";
  if (!id || !tieuDe || !loai) return null;
  const clip = (v: unknown, max: number) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
  return {
    loai,
    id,
    tieuDe: tieuDe.slice(0, 300),
    moTa: clip(raw.moTa, 500),
    anh: clip(raw.anh, 500),
    href: clip(raw.href, 500),
    orgTen: clip(raw.orgTen, 200),
  };
}

export async function POST(req: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Cần đăng nhập." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  const orgId = body.orgId?.trim();
  if (!orgId) {
    return NextResponse.json({ error: "Thiếu orgId." }, { status: 400 });
  }

  const result = await openUserOrgRoom(orgId, session.profile.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Card ngữ cảnh KHÔNG được lưu ở bước mở phòng — trả lại để client giữ "chờ"
  // trong ô soạn, chỉ gửi kèm tin nhắn đầu tiên.
  return NextResponse.json({
    thread: result.thread,
    nguCanh: sanitizeNguCanh(body.nguCanh),
  });
}
