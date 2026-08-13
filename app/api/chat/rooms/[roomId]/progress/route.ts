import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { assertRoomMember } from "@/lib/chat/direct-message";
import { getLopRoomAccess } from "@/lib/co-so/lop-room-access";
import {
  listTienDoLop,
  moBaiChoHocVien,
  moBaiChoLop,
  setDongBoTienDoKhoa,
} from "@/lib/co-so/tien-do-bai";

type Ctx = { params: Promise<{ roomId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
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
  if (!access.isLopRoom || !access.lopId) {
    return NextResponse.json({ error: "Không phải phòng lớp." }, { status: 400 });
  }
  if (!access.canQuanLyHocVien) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await listTienDoLop(access.lopId);
  return NextResponse.json({
    ...data,
    canGanTienDo: access.canGanTienDo,
    orgId: access.orgId,
  });
}

export async function POST(req: Request, ctx: Ctx) {
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
  if (!access.isLopRoom || !access.lopId || !access.orgId) {
    return NextResponse.json({ error: "Không phải phòng lớp." }, { status: 400 });
  }
  if (!access.canGanTienDo) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    action?: string;
    hocVienLopId?: string | "all";
    baiTapIds?: string[];
    dongBo?: boolean;
    khoaId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "set_dong_bo") {
    if (!access.khoaId && !body.khoaId) {
      return NextResponse.json({ error: "Thiếu khoaId." }, { status: 400 });
    }
    const result = await setDongBoTienDoKhoa({
      orgId: access.orgId,
      khoaId: (body.khoaId || access.khoaId) as string,
      dongBo: Boolean(body.dongBo),
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, dongBo: Boolean(body.dongBo) });
  }

  const baiTapIds = Array.isArray(body.baiTapIds)
    ? body.baiTapIds.filter((id): id is string => typeof id === "string")
    : [];
  if (baiTapIds.length === 0) {
    return NextResponse.json({ error: "Thiếu baiTapIds." }, { status: 400 });
  }

  // Đồng bộ khóa hoặc hocVienLopId=all → cả lớp
  if (access.dongBoTienDo || body.hocVienLopId === "all") {
    const result = await moBaiChoLop({
      orgId: access.orgId,
      lopId: access.lopId,
      baiTapIds,
      actorId: viewerId,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result);
  }

  if (!body.hocVienLopId || typeof body.hocVienLopId !== "string") {
    return NextResponse.json({ error: "Thiếu hocVienLopId." }, { status: 400 });
  }

  // IDOR guard
  const { createServiceRoleClient } = await import(
    "@/lib/supabase/service-role"
  );
  const admin = createServiceRoleClient();
  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id")
    .eq("id", body.hocVienLopId)
    .eq("id_lop_hoc", access.lopId)
    .maybeSingle();
  if (!hvl?.id) {
    return NextResponse.json({ error: "HV không thuộc lớp." }, { status: 400 });
  }

  const result = await moBaiChoHocVien({
    orgId: access.orgId,
    hocVienLopId: body.hocVienLopId,
    baiTapIds,
    actorId: viewerId,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
