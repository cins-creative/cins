import "server-only";

import {
  CHAT_PIN_LIMIT,
  SOCIAL_LOAI_CHAT_TIN_NHAN,
} from "@/lib/chat/constants";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type { ChatReactionSummary } from "@/lib/chat/types";

export async function loadReactionsForMessages(
  messageIds: string[],
  viewerId: string,
): Promise<Map<string, ChatReactionSummary[]>> {
  const result = new Map<string, ChatReactionSummary[]>();
  if (messageIds.length === 0) return result;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("social_reaction")
    .select("id_doi_tuong, emoji, id_nguoi_dung")
    .eq("loai_doi_tuong", SOCIAL_LOAI_CHAT_TIN_NHAN)
    .in("id_doi_tuong", messageIds);

  const buckets = new Map<string, Map<string, { count: number; viewer: boolean }>>();
  for (const row of data ?? []) {
    const id = row.id_doi_tuong as string;
    const emoji = row.emoji as string;
    if (!buckets.has(id)) buckets.set(id, new Map());
    const emojiMap = buckets.get(id)!;
    const cur = emojiMap.get(emoji) ?? { count: 0, viewer: false };
    cur.count += 1;
    if (row.id_nguoi_dung === viewerId) cur.viewer = true;
    emojiMap.set(emoji, cur);
  }

  for (const [id, emojiMap] of buckets) {
    result.set(
      id,
      [...emojiMap.entries()].map(([emoji, { count, viewer }]) => ({
        emoji,
        count,
        viewerReacted: viewer,
      })),
    );
  }

  return result;
}

export async function loadPinnedMessageIds(roomId: string): Promise<Set<string>> {
  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("chat_ghim")
    .select("id_tin_nhan")
    .eq("id_phong", roomId);

  return new Set((data ?? []).map((row) => row.id_tin_nhan as string));
}

export async function getPeerReadMessageId(
  roomId: string,
  viewerId: string,
): Promise<string | null> {
  const admin = createServiceRoleClient();
  const { data: members } = await admin
    .from("chat_thanh_vien")
    .select("id_nguoi_dung")
    .eq("id_phong", roomId)
    .is("roi_luc", null)
    .neq("id_nguoi_dung", viewerId)
    .limit(1);

  const peerId = members?.[0]?.id_nguoi_dung as string | undefined;
  if (!peerId) return null;

  const { data: readRow } = await admin
    .from("chat_da_doc")
    .select("id_tin_nhan_cuoi_doc")
    .eq("id_phong", roomId)
    .eq("id_nguoi_dung", peerId)
    .maybeSingle<{ id_tin_nhan_cuoi_doc: string }>();

  return readRow?.id_tin_nhan_cuoi_doc ?? null;
}

export async function assertPinLimit(roomId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { count } = await admin
    .from("chat_ghim")
    .select("id", { count: "exact", head: true })
    .eq("id_phong", roomId);

  if ((count ?? 0) >= CHAT_PIN_LIMIT) {
    throw new Error("PIN_LIMIT");
  }
}

export { SOCIAL_LOAI_CHAT_TIN_NHAN };
