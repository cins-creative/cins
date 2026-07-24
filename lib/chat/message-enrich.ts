import "server-only";

import {
  CHAT_PIN_LIMIT,
  SOCIAL_LOAI_CHAT_TIN_NHAN,
} from "@/lib/chat/constants";
import { getAvatarUrl } from "@/lib/journey/profile";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type {
  ChatReactionActor,
  ChatReactionSummary,
} from "@/lib/chat/types";

type ReactionRow = {
  id_doi_tuong: string;
  emoji: string;
  id_nguoi_dung: string;
  tao_luc: string | null;
};

type ProfileRow = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
};

export async function loadReactionsForMessages(
  messageIds: string[],
  viewerId: string,
): Promise<Map<string, ChatReactionSummary[]>> {
  const result = new Map<string, ChatReactionSummary[]>();
  if (messageIds.length === 0) return result;

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("social_reaction")
    .select("id_doi_tuong, emoji, id_nguoi_dung, tao_luc")
    .eq("loai_doi_tuong", SOCIAL_LOAI_CHAT_TIN_NHAN)
    .in("id_doi_tuong", messageIds)
    .order("tao_luc", { ascending: false })
    .returns<ReactionRow[]>();

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((row) => row.id_nguoi_dung))];
  const profileById = new Map<string, ProfileRow>();

  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, avatar_id")
      .in("id", userIds)
      .returns<ProfileRow[]>();
    for (const profile of profiles ?? []) {
      profileById.set(profile.id, profile);
    }
  }

  type Bucket = {
    count: number;
    viewer: boolean;
    actors: ChatReactionActor[];
  };

  const buckets = new Map<string, Map<string, Bucket>>();
  for (const row of rows) {
    const id = row.id_doi_tuong;
    const emoji = row.emoji;
    if (!buckets.has(id)) buckets.set(id, new Map());
    const emojiMap = buckets.get(id)!;
    const cur = emojiMap.get(emoji) ?? {
      count: 0,
      viewer: false,
      actors: [],
    };
    cur.count += 1;
    if (row.id_nguoi_dung === viewerId) cur.viewer = true;

    const profile = profileById.get(row.id_nguoi_dung);
    cur.actors.push({
      userId: row.id_nguoi_dung,
      name: profile?.ten_hien_thi?.trim() || profile?.slug || "Thành viên",
      avatarUrl: getAvatarUrl(profile?.avatar_id ?? null),
    });
    emojiMap.set(emoji, cur);
  }

  for (const [id, emojiMap] of buckets) {
    result.set(
      id,
      [...emojiMap.entries()].map(([emoji, { count, viewer, actors }]) => ({
        emoji,
        count,
        viewerReacted: viewer,
        actors,
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
