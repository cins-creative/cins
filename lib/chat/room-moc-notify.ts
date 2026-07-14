import "server-only";

import { mapMessageFromRow } from "@/lib/chat/direct-message";
import type { ChatMessage, ChatMocNoticeSuKien } from "@/lib/chat/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type MocNotifyRow = {
  id: string;
  id_phong: string;
  ten: string;
  mo_ta: string | null;
  thoi_diem: string;
  url: string | null;
  nhac_truoc_phut: number;
  id_nguoi_tao: string;
  id_tin_tao: string | null;
  id_tin_nhac_truoc: string | null;
  id_tin_den_han: string | null;
};

const MOC_NOTIFY_SELECT =
  "id, id_phong, ten, mo_ta, thoi_diem, url, nhac_truoc_phut, id_nguoi_tao, id_tin_tao, id_tin_nhac_truoc, id_tin_den_han";

function columnForSuKien(
  suKien: ChatMocNoticeSuKien,
): "id_tin_tao" | "id_tin_nhac_truoc" | "id_tin_den_han" {
  if (suKien === "tao") return "id_tin_tao";
  if (suKien === "nhac_truoc") return "id_tin_nhac_truoc";
  return "id_tin_den_han";
}

function bodyForSuKien(suKien: ChatMocNoticeSuKien, ten: string): string {
  if (suKien === "tao") return `Đã thêm mốc: ${ten}`;
  if (suKien === "nhac_truoc") return `Nhắc nhở: ${ten}`;
  return `Đến hạn: ${ten}`;
}

function buildNguCanh(moc: MocNotifyRow, suKien: ChatMocNoticeSuKien) {
  return {
    loai: "moc",
    id: moc.id,
    tieuDe: moc.ten,
    moTa: moc.mo_ta,
    href: moc.url,
    mocSuKien: suKien,
    thoiDiem: moc.thoi_diem,
  };
}

async function removeMocRemindNotice(
  admin: ReturnType<typeof createServiceRoleClient>,
  remindMessageId: string | null,
): Promise<string | null> {
  if (!remindMessageId) return null;
  const { error } = await admin
    .from("chat_tin_nhan")
    .delete()
    .eq("id", remindMessageId);
  if (error) {
    console.error("[chat-moc-notify] remove remind failed", error.message);
    return null;
  }
  return remindMessageId;
}

async function insertMocNoticeMessage(
  moc: MocNotifyRow,
  suKien: ChatMocNoticeSuKien,
  viewerId: string,
): Promise<{ message: ChatMessage; removedMessageId: string | null } | null> {
  const col = columnForSuKien(suKien);
  if (moc[col]) return null;

  const admin = createServiceRoleClient();
  const { data: message, error } = await admin
    .from("chat_tin_nhan")
    .insert({
      id_phong: moc.id_phong,
      id_nguoi_gui: moc.id_nguoi_tao,
      noi_dung: bodyForSuKien(suKien, moc.ten),
      loai_tin: "system",
      ngu_canh: buildNguCanh(moc, suKien),
      da_xoa: false,
    })
    .select(
      "id, id_phong, id_nguoi_gui, noi_dung, loai_tin, id_dinh_kem, id_tin_tra_loi, ngu_canh, tao_luc, da_xoa, da_sua, sua_luc",
    )
    .single();

  if (error || !message?.id) {
    console.error("[chat-moc-notify] insert failed", error?.message);
    return null;
  }

  const { data: claimed } = await admin
    .from("chat_moc")
    .update({ [col]: message.id, cap_nhat_luc: new Date().toISOString() })
    .eq("id", moc.id)
    .is(col, null)
    .select("id")
    .maybeSingle();

  if (!claimed) {
    await admin.from("chat_tin_nhan").delete().eq("id", message.id);
    return null;
  }

  let removedMessageId: string | null = null;
  if (suKien === "den_han") {
    removedMessageId = await removeMocRemindNotice(
      admin,
      moc.id_tin_nhac_truoc,
    );
    if (removedMessageId) {
      moc.id_tin_nhac_truoc = null;
    }
  }

  await admin
    .from("chat_phong")
    .update({ cap_nhat_luc: new Date().toISOString() })
    .eq("id", moc.id_phong);

  return {
    message: mapMessageFromRow(message, viewerId),
    removedMessageId,
  };
}

/** Gửi tin «đã thêm mốc» ngay khi tạo. */
export async function notifyMocCreated(
  mocId: string,
  viewerId: string,
): Promise<ChatMessage | null> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("chat_moc")
    .select(MOC_NOTIFY_SELECT)
    .eq("id", mocId)
    .maybeSingle<MocNotifyRow>();
  if (!data) return null;
  const result = await insertMocNoticeMessage(data, "tao", viewerId);
  return result?.message ?? null;
}

/**
 * Quét mốc tới hạn nhắc / đến giờ — tạo tin system còn thiếu.
 * Gọi từ API tick (client poll khi mở chat) hoặc cron sau này.
 */
export async function tickDueMocNotices(input?: {
  roomId?: string;
  viewerId?: string;
  limit?: number;
}): Promise<{
  messages: ChatMessage[];
  fired: number;
  removedMessageIds: string[];
}> {
  const admin = createServiceRoleClient();
  const now = new Date();
  const limit = Math.min(Math.max(input?.limit ?? 40, 1), 80);
  const viewerId = input?.viewerId ?? "";
  const removedMessageIds: string[] = [];

  // Dọn tin «Nhắc nhở» còn sót khi đã có «Đến hạn».
  let staleQuery = admin
    .from("chat_moc")
    .select("id, id_tin_nhac_truoc")
    .not("id_tin_den_han", "is", null)
    .not("id_tin_nhac_truoc", "is", null)
    .limit(80);
  if (input?.roomId) staleQuery = staleQuery.eq("id_phong", input.roomId);
  const { data: stale } = await staleQuery.returns<
    Array<{ id: string; id_tin_nhac_truoc: string }>
  >();
  for (const row of stale ?? []) {
    const removed = await removeMocRemindNotice(admin, row.id_tin_nhac_truoc);
    if (removed) removedMessageIds.push(removed);
  }

  let query = admin
    .from("chat_moc")
    .select(MOC_NOTIFY_SELECT)
    .or("id_tin_nhac_truoc.is.null,id_tin_den_han.is.null")
    .order("thoi_diem", { ascending: true })
    .limit(200);

  if (input?.roomId) {
    query = query.eq("id_phong", input.roomId);
  }

  const { data, error } = await query.returns<MocNotifyRow[]>();
  if (error || !data?.length) {
    return { messages: [], fired: 0, removedMessageIds };
  }

  const messages: ChatMessage[] = [];
  let fired = 0;

  for (const moc of data) {
    if (fired >= limit) break;
    const thoiDiem = new Date(moc.thoi_diem);
    if (Number.isNaN(thoiDiem.getTime())) continue;

    const remindAt = new Date(
      thoiDiem.getTime() - Math.max(0, moc.nhac_truoc_phut) * 60_000,
    );

    if (!moc.id_tin_nhac_truoc && now >= remindAt && now < thoiDiem) {
      const result = await insertMocNoticeMessage(
        moc,
        "nhac_truoc",
        viewerId || moc.id_nguoi_tao,
      );
      if (result) {
        messages.push(result.message);
        fired += 1;
        moc.id_tin_nhac_truoc = result.message.id;
      }
    }

    if (fired >= limit) break;

    if (!moc.id_tin_den_han && now >= thoiDiem) {
      const result = await insertMocNoticeMessage(
        moc,
        "den_han",
        viewerId || moc.id_nguoi_tao,
      );
      if (result) {
        messages.push(result.message);
        fired += 1;
        moc.id_tin_den_han = result.message.id;
        if (result.removedMessageId) {
          removedMessageIds.push(result.removedMessageId);
        }
      }
    }
  }

  return { messages, fired, removedMessageIds };
}

/** Khi sửa thời điểm / phút nhắc — cho phép gửi lại tin nhắc chưa tới hạn. */
export async function resetMocScheduleNotices(mocId: string): Promise<void> {
  const admin = createServiceRoleClient();
  await admin
    .from("chat_moc")
    .update({
      id_tin_nhac_truoc: null,
      id_tin_den_han: null,
      cap_nhat_luc: new Date().toISOString(),
    })
    .eq("id", mocId);
}
