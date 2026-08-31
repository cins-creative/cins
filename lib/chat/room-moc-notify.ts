import "server-only";

import { mapMessageFromRow, type MessageRow } from "@/lib/chat/direct-message";
import {
  CHAT_MESSAGE_ROW_COLS,
  insertChatMessageRow,
} from "@/lib/chat/insert-message";
import { advanceLichLopMocAfterDue } from "@/lib/chat/room-moc-lop-lich";
import { normalizeMocNguon } from "@/lib/chat/room-moc-nguon";
import {
  advanceMocThoiDiemPast,
  normalizeMocLoaiLap,
} from "@/lib/chat/room-moc-schedule";
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
  loai_lap: string | null;
  nguon: string | null;
  id_nguoi_tao: string;
  id_tin_tao: string | null;
  id_tin_nhac_truoc: string | null;
  id_tin_den_han: string | null;
};

const MOC_NOTIFY_SELECT =
  "id, id_phong, ten, mo_ta, thoi_diem, url, nhac_truoc_phut, loai_lap, nguon, id_nguoi_tao, id_tin_tao, id_tin_nhac_truoc, id_tin_den_han";

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

function pointerIdsExcept(
  moc: Pick<
    MocNotifyRow,
    "id_tin_tao" | "id_tin_nhac_truoc" | "id_tin_den_han"
  >,
  keepMessageId?: string | null,
): string[] {
  const ids: string[] = [];
  for (const id of [moc.id_tin_tao, moc.id_tin_nhac_truoc, moc.id_tin_den_han]) {
    if (id && id !== keepMessageId) ids.push(id);
  }
  return ids;
}

async function deleteMocNoticeMessages(
  admin: ReturnType<typeof createServiceRoleClient>,
  ids: string[],
): Promise<string[]> {
  const unique = [...new Set(ids)];
  if (!unique.length) return [];
  const { error } = await admin.from("chat_tin_nhan").delete().in("id", unique);
  if (error) {
    console.error("[chat-moc-notify] remove older notices failed", error.message);
    return [];
  }
  return unique;
}

/** Xóa tin nhắc giai đoạn cũ của cùng mốc — chỉ giữ `keepMessageId`. */
async function removeOlderMocNotices(
  admin: ReturnType<typeof createServiceRoleClient>,
  moc: Pick<
    MocNotifyRow,
    | "id"
    | "id_phong"
    | "id_tin_tao"
    | "id_tin_nhac_truoc"
    | "id_tin_den_han"
  >,
  keepMessageId: string,
): Promise<string[]> {
  const ids = pointerIdsExcept(moc, keepMessageId);

  const { data: extras } = await admin
    .from("chat_tin_nhan")
    .select("id")
    .eq("id_phong", moc.id_phong)
    .eq("loai_tin", "system")
    .contains("ngu_canh", { loai: "moc", id: moc.id })
    .neq("id", keepMessageId)
    .limit(40);

  for (const row of extras ?? []) {
    if (row.id) ids.push(row.id);
  }

  const removed = await deleteMocNoticeMessages(admin, ids);
  if (removed.includes(moc.id_tin_tao ?? "")) moc.id_tin_tao = null;
  if (removed.includes(moc.id_tin_nhac_truoc ?? "")) {
    moc.id_tin_nhac_truoc = null;
  }
  if (removed.includes(moc.id_tin_den_han ?? "")) moc.id_tin_den_han = null;
  return removed;
}

async function insertMocNoticeMessage(
  moc: MocNotifyRow,
  suKien: ChatMocNoticeSuKien,
  viewerId: string,
): Promise<{ message: ChatMessage; removedMessageIds: string[] } | null> {
  const col = columnForSuKien(suKien);
  if (moc[col]) return null;

  const admin = createServiceRoleClient();
  /* Một cửa ghi tin. Bump `cap_nhat_luc` giữ ở dưới — chỉ sau khi claim mốc. */
  const { data: message, error } = await insertChatMessageRow<MessageRow>(
    {
      id_phong: moc.id_phong,
      id_nguoi_gui: moc.id_nguoi_tao,
      noi_dung: bodyForSuKien(suKien, moc.ten),
      loai_tin: "system",
      ngu_canh: buildNguCanh(moc, suKien),
      da_xoa: false,
    },
    { select: CHAT_MESSAGE_ROW_COLS, admin },
  );

  if (error || !message?.id) {
    console.error("[chat-moc-notify] insert failed", error);
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

  moc[col] = message.id;
  const removedMessageIds = await removeOlderMocNotices(
    admin,
    moc,
    message.id,
  );

  await admin
    .from("chat_phong")
    .update({ cap_nhat_luc: new Date().toISOString() })
    .eq("id", moc.id_phong);

  return {
    message: mapMessageFromRow(message, viewerId),
    removedMessageIds,
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

  // Dọn tin giai đoạn cũ còn sót (Mốc mới / Nhắc nhở) khi đã có tin mới hơn.
  let staleQuery = admin
    .from("chat_moc")
    .select("id, id_phong, id_tin_tao, id_tin_nhac_truoc, id_tin_den_han")
    .or("id_tin_nhac_truoc.not.is.null,id_tin_den_han.not.is.null")
    .limit(80);
  if (input?.roomId) staleQuery = staleQuery.eq("id_phong", input.roomId);
  const { data: stale } = await staleQuery.returns<
    Array<{
      id: string;
      id_phong: string;
      id_tin_tao: string | null;
      id_tin_nhac_truoc: string | null;
      id_tin_den_han: string | null;
    }>
  >();
  for (const row of stale ?? []) {
    const keepId = row.id_tin_den_han ?? row.id_tin_nhac_truoc;
    if (!keepId) continue;
    const older = pointerIdsExcept(row, keepId);
    if (!older.length) continue;
    const removed = await deleteMocNoticeMessages(admin, older);
    removedMessageIds.push(...removed);
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
        if (result.removedMessageIds.length) {
          removedMessageIds.push(...result.removedMessageIds);
        }
        void pushMocLopToRoom(moc, "nhac_truoc");
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
        if (result.removedMessageIds.length) {
          removedMessageIds.push(...result.removedMessageIds);
        }
        void pushMocLopToRoom(moc, "den_han");

        const nguon = normalizeMocNguon(moc.nguon);
        if (nguon === "lich_lop") {
          const nextIso = await advanceLichLopMocAfterDue(
            moc.id,
            moc.id_phong,
            now,
          );
          if (nextIso) {
            moc.thoi_diem = nextIso;
            moc.id_tin_nhac_truoc = null;
            moc.id_tin_den_han = null;
          }
        } else {
          const loaiLap = normalizeMocLoaiLap(moc.loai_lap);
          if (loaiLap !== "mot_lan") {
            const nextIso = advanceMocThoiDiemPast(moc.thoi_diem, loaiLap, now);
            if (nextIso) {
              await admin
                .from("chat_moc")
                .update({
                  thoi_diem: nextIso,
                  id_tin_nhac_truoc: null,
                  id_tin_den_han: null,
                  cap_nhat_luc: new Date().toISOString(),
                })
                .eq("id", moc.id);
              moc.thoi_diem = nextIso;
              moc.id_tin_nhac_truoc = null;
              moc.id_tin_den_han = null;
            }
          }
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

/** O17 — FCM nhắc mốc (không gửi lúc «tao»). */
async function pushMocLopToRoom(
  moc: MocNotifyRow,
  suKien: Extract<ChatMocNoticeSuKien, "nhac_truoc" | "den_han">,
): Promise<void> {
  try {
    const { firePushMocLop, listAllRoomMemberIds } = await import(
      "@/lib/push/su-kien"
    );
    const userIds = await listAllRoomMemberIds(moc.id_phong);
    if (!userIds.length) return;
    firePushMocLop({
      userIds,
      title: suKien === "nhac_truoc" ? "Nhắc mốc" : "Đến hạn mốc",
      body: bodyForSuKien(suKien, moc.ten),
      roomId: moc.id_phong,
      mocId: moc.id,
    });
  } catch (e) {
    console.error(
      "[chat-moc-notify] push",
      e instanceof Error ? e.message : e,
    );
  }
}
