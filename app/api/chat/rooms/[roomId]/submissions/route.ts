import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { assertRoomMember } from "@/lib/chat/direct-message";
import {
  boLuuBaiNop,
  duyetNopBai,
  luuBaiNop,
  nopBaiHienTai,
} from "@/lib/co-so/nop-bai";
import { getLopRoomAccess } from "@/lib/co-so/lop-room-access";
import { guiTinHeThongLopBai } from "@/lib/co-so/lop-he-thong-tin";
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

  const access = await getLopRoomAccess(roomId, userId);
  if (!access.isLopRoom || !access.lopId) {
    return NextResponse.json({ error: "Chỉ dùng trong phòng lớp." }, { status: 400 });
  }
  if (!access.hocVienLopId) {
    return NextResponse.json({ error: "Chỉ học viên mới nộp được." }, { status: 403 });
  }
  if (access.frozen || !access.canSend) {
    return NextResponse.json({ error: "Kỳ học đã đóng — không nộp được." }, { status: 403 });
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

  const admin = createServiceRoleClient();
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
    lopId: access.lopId,
    tinNhanId: msg.id as string,
    mediaId: (msg.id_dinh_kem as string | null) ?? null,
    ghiChu: body.ghiChu,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { data: tienDo } = await admin
    .from("org_tien_do_bai")
    .select("id_bai_tap")
    .eq("id_hoc_vien_lop", access.hocVienLopId)
    .maybeSingle();
  if (tienDo?.id_bai_tap) {
    const { data: bai } = await admin
      .from("org_bai_tap")
      .select("ten_bai_tap")
      .eq("id", tienDo.id_bai_tap as string)
      .maybeSingle();
    await guiTinHeThongLopBai({
      lopId: access.lopId,
      actorId: userId,
      loai: "nop_bai",
      idNguoiDung: userId,
      idHocVienLop: access.hocVienLopId,
      idBaiTap: tienDo.id_bai_tap as string,
      tenBai: (bai?.ten_bai_tap as string) || "Bài tập",
      idNopBai: result.nopId,
    });
  }

  return NextResponse.json({ nopId: result.nopId });
}

/** Staff duyệt / lưu bài. */
export async function PATCH(req: Request, ctx: Ctx) {
  const session = await getCurrentSessionAndProfile();
  const actorId = session?.profile?.id;
  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { roomId } = await ctx.params;
  try {
    await assertRoomMember(roomId, actorId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const access = await getLopRoomAccess(roomId, actorId);
  if (!access.isLopRoom || !access.orgId) {
    return NextResponse.json({ error: "Không phải phòng lớp." }, { status: 400 });
  }
  if (!access.canGanTienDo) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    nopId?: string;
    tinNhanId?: string;
    action?: "duyet" | "luu" | "bo_luu";
    trangThai?: "dat" | "lam_lai";
    diem?: number | null;
    ghiChu?: string | null;
    baiTiepId?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.action) {
    return NextResponse.json({ error: "Thiếu action." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  let nopId = body.nopId;

  if (!nopId && body.tinNhanId && (body.action === "luu" || body.action === "bo_luu")) {
    const { data: byTin } = await admin
      .from("org_nop_bai")
      .select("id, id_hoc_vien_lop")
      .eq("id_tin_nhan", body.tinNhanId)
      .order("tao_luc", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!byTin?.id) {
      return NextResponse.json(
        { error: "Tin này chưa được nộp làm bài." },
        { status: 400 },
      );
    }
    nopId = byTin.id as string;
  }

  if (!nopId) {
    return NextResponse.json({ error: "Thiếu nopId." }, { status: 400 });
  }

  // IDOR: nop phải thuộc lớp này
  const { data: nop } = await admin
    .from("org_nop_bai")
    .select("id, id_hoc_vien_lop")
    .eq("id", nopId)
    .maybeSingle();
  if (!nop) {
    return NextResponse.json({ error: "Không tìm thấy." }, { status: 404 });
  }
  const { data: hvl } = await admin
    .from("user_hoc_vien_lop")
    .select("id_lop_hoc")
    .eq("id", nop.id_hoc_vien_lop as string)
    .maybeSingle();
  if (!hvl || hvl.id_lop_hoc !== access.lopId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (body.action === "luu") {
    const result = await luuBaiNop({
      orgId: access.orgId,
      nopId,
      actorId,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, nopId });
  }

  if (body.action === "bo_luu") {
    const result = await boLuuBaiNop({
      orgId: access.orgId,
      nopId,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "duyet") {
    if (!body.trangThai) {
      return NextResponse.json({ error: "Thiếu trangThai." }, { status: 400 });
    }
    const result = await duyetNopBai({
      orgId: access.orgId,
      nopId,
      actorId,
      trangThai: body.trangThai,
      diem: body.diem,
      ghiChu: body.ghiChu,
      baiTiepId: body.baiTiepId,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "action không hợp lệ." }, { status: 400 });
}
