import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { assertRoomMember } from "@/lib/chat/direct-message";
import { nopBaiHienTai } from "@/lib/co-so/nop-bai";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Ctx = { params: Promise<{ roomId: string }> };

/** HV nộp bài đang mở, gắn tin chat trong phòng lớp. */
export async function POST(req: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  const userId = session?.profile?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { roomId } = await ctx.params;
  try {
    await assertRoomMember(roomId, userId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  const { data: room } = await admin
    .from("chat_phong")
    .select("loai_phong, id_context")
    .eq("id", roomId)
    .maybeSingle();
  if (!room || room.loai_phong !== "lop_hoc" || !room.id_context) {
    return NextResponse.json({ error: "Chỉ dùng trong phòng lớp." }, { status: 400 });
  }

  let body: { tinNhanId?: string; ghiChu?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.tinNhanId) {
    return NextResponse.json({ error: "Thiếu tinNhanId." }, { status: 400 });
  }

  const { data: msg } = await admin
    .from("chat_tin_nhan")
    .select("id, id_phong, id_nguoi_gui, id_dinh_kem")
    .eq("id", body.tinNhanId)
    .maybeSingle();
  if (
    !msg ||
    msg.id_phong !== roomId ||
    msg.id_nguoi_gui !== userId
  ) {
    return NextResponse.json({ error: "Tin không hợp lệ." }, { status: 400 });
  }

  const result = await nopBaiHienTai({
    studentUserId: userId,
    lopId: room.id_context as string,
    tinNhanId: msg.id as string,
    mediaId: (msg.id_dinh_kem as string | null) ?? null,
    ghiChu: body.ghiChu,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ nopId: result.nopId });
}
