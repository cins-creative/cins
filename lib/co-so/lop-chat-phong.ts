import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

const LOP_ROOM = "lop_hoc";

type EnsureInput = {
  orgId: string;
  lopId: string;
  /** Tên hiển thị phòng (mã lớp / tên khóa). */
  tenPhong?: string | null;
  /** GV CINS → member admin phòng. */
  giaoVienUserId?: string | null;
};

type EnsureResult =
  | { ok: true; roomId: string; created: boolean }
  | { ok: false; error: string };

/**
 * Đảm bảo lớp có phòng chat cố định `loai_phong=lop_hoc` và ghi `org_lop_hoc.id_chat_phong`.
 */
export async function ensureLopChatPhong(
  input: EnsureInput,
): Promise<EnsureResult> {
  const admin = createServiceRoleClient();

  const { data: lop, error: lopErr } = await admin
    .from("org_lop_hoc")
    .select("id, ma_lop, id_chat_phong, giao_vien_phu_trach")
    .eq("id", input.lopId)
    .maybeSingle<{
      id: string;
      ma_lop: string;
      id_chat_phong: string | null;
      giao_vien_phu_trach: string | null;
    }>();

  if (lopErr || !lop) {
    return { ok: false, error: lopErr?.message ?? "Không tìm thấy lớp." };
  }

  if (lop.id_chat_phong) {
    await ensureTeacherMember(
      admin,
      lop.id_chat_phong,
      input.giaoVienUserId ?? lop.giao_vien_phu_trach,
    );
    return { ok: true, roomId: lop.id_chat_phong, created: false };
  }

  const ten =
    input.tenPhong?.trim() ||
    lop.ma_lop?.trim() ||
    "Lớp học";

  const { data: room, error: roomErr } = await admin
    .from("chat_phong")
    .insert({
      loai_phong: LOP_ROOM,
      loai_context: "lop_hoc",
      id_context: input.lopId,
      id_org_dai_dien: input.orgId,
      ten_phong: ten.slice(0, 120),
      trang_thai: "active",
    })
    .select("id")
    .single<{ id: string }>();

  if (roomErr || !room?.id) {
    return {
      ok: false,
      error: roomErr?.message ?? "Không tạo được phòng chat lớp.",
    };
  }

  const { error: linkErr } = await admin
    .from("org_lop_hoc")
    .update({ id_chat_phong: room.id })
    .eq("id", input.lopId);

  if (linkErr) {
    return { ok: false, error: linkErr.message };
  }

  await ensureTeacherMember(
    admin,
    room.id,
    input.giaoVienUserId ?? lop.giao_vien_phu_trach,
  );

  return { ok: true, roomId: room.id, created: true };
}

async function ensureTeacherMember(
  admin: ReturnType<typeof createServiceRoleClient>,
  roomId: string,
  teacherId: string | null | undefined,
): Promise<void> {
  if (!teacherId) return;
  const { data: existing } = await admin
    .from("chat_thanh_vien")
    .select("id")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", teacherId)
    .is("roi_luc", null)
    .maybeSingle();
  if (existing?.id) return;
  await admin.from("chat_thanh_vien").insert({
    id_phong: roomId,
    id_nguoi_dung: teacherId,
    vai_tro: "admin",
  });
}

export async function ensureLopChatPhongAndJoinStudent(input: {
  orgId: string;
  lopId: string;
  studentUserId: string;
  sendWelcome?: boolean;
}): Promise<
  | { ok: true; roomId: string; joined: boolean }
  | { ok: false; error: string }
> {
  const ensured = await ensureLopChatPhong({
    orgId: input.orgId,
    lopId: input.lopId,
  });
  if (!ensured.ok) return ensured;

  const admin = createServiceRoleClient();
  const { data: existing } = await admin
    .from("chat_thanh_vien")
    .select("id")
    .eq("id_phong", ensured.roomId)
    .eq("id_nguoi_dung", input.studentUserId)
    .is("roi_luc", null)
    .maybeSingle();

  let joined = false;
  if (!existing?.id) {
    const { error } = await admin.from("chat_thanh_vien").insert({
      id_phong: ensured.roomId,
      id_nguoi_dung: input.studentUserId,
      vai_tro: "thanh_vien",
    });
    if (error) return { ok: false, error: error.message };
    joined = true;
  }

  if (input.sendWelcome && joined) {
    await admin.from("chat_tin_nhan").insert({
      id_phong: ensured.roomId,
      id_nguoi_gui: input.studentUserId,
      loai_tin: "system",
      noi_dung: "Chào mừng học viên mới đến với lớp học.",
      ngu_canh: { loai: "chao_lop", suKien: "join" },
    });
  }

  return { ok: true, roomId: ensured.roomId, joined };
}
