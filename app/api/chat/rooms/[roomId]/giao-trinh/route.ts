import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { assertRoomMember } from "@/lib/chat/direct-message";
import { getLopRoomAccess } from "@/lib/co-so/lop-room-access";
import { listGiaoTrinhChoHocVien } from "@/lib/co-so/tien-do-bai";

type Ctx = { params: Promise<{ roomId: string }> };

/** GET giáo trình cho HV (mặc định chính mình) hoặc staff xem theo ?hocVienLopId= */
export async function GET(req: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  const viewerId = session?.profile?.id;
  if (!viewerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { roomId } = await ctx.params;
  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const access = await getLopRoomAccess(roomId, viewerId);
  if (!access.isLopRoom) {
    return NextResponse.json({ error: "Không phải phòng lớp." }, { status: 400 });
  }

  const url = new URL(req.url);
  const qHvl = url.searchParams.get("hocVienLopId");
  let hocVienLopId = access.hocVienLopId;

  if (qHvl) {
    if (!access.canQuanLyHocVien) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Verify enrollment thuộc đúng lớp
    const { createServiceRoleClient } = await import(
      "@/lib/supabase/service-role"
    );
    const admin = createServiceRoleClient();
    const { data: hvl } = await admin
      .from("user_hoc_vien_lop")
      .select("id")
      .eq("id", qHvl)
      .eq("id_lop_hoc", access.lopId!)
      .maybeSingle();
    if (!hvl?.id) {
      return NextResponse.json({ error: "HV không thuộc lớp." }, { status: 400 });
    }
    hocVienLopId = hvl.id as string;
  }

  if (!hocVienLopId) {
    return NextResponse.json({ error: "Không có giáo trình." }, { status: 400 });
  }

  const data = await listGiaoTrinhChoHocVien(hocVienLopId);
  if (!data) {
    return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  }

  return NextResponse.json({
    ...data,
    frozen: access.frozen,
    canNop: access.canSend && Boolean(access.hocVienLopId),
    canGanTienDo: access.canGanTienDo,
  });
}
