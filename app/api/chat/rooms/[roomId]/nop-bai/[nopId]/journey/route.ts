import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { assertRoomMember } from "@/lib/chat/direct-message";
import { dangJourneyTuBaiNop } from "@/lib/co-so/nop-bai-journey";
import { getLopRoomAccess } from "@/lib/co-so/lop-room-access";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type Ctx = { params: Promise<{ roomId: string; nopId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  const viewerId = session?.profile?.id;
  if (!viewerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { roomId, nopId } = await ctx.params;
  try {
    await assertRoomMember(roomId, viewerId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const access = await getLopRoomAccess(roomId, viewerId);
  if (!access.isLopRoom || !access.hocVienLopId) {
    return NextResponse.json({ error: "Chỉ học viên trong lớp." }, { status: 403 });
  }

  // Guard nop thuộc enrollment của viewer
  const admin = createServiceRoleClient();
  const { data: nop } = await admin
    .from("org_nop_bai")
    .select("id, id_hoc_vien_lop")
    .eq("id", nopId)
    .maybeSingle();
  if (!nop || nop.id_hoc_vien_lop !== access.hocVienLopId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    cheDo?: "public" | "chi_minh";
    tieuDe?: string;
    moTa?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    /* empty ok */
  }

  const result = await dangJourneyTuBaiNop({
    nopId,
    viewerId,
    cheDo: body.cheDo,
    tieuDe: body.tieuDe,
    moTa: body.moTa,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
