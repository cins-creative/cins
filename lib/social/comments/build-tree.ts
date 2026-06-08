import type {
  CommentReactionSummary,
  MilestonePostCommentV1,
} from "@/lib/social/comments/types";

type RawRow = {
  id: string;
  nguoi_binh_luan: string;
  noi_dung: string;
  id_cha: string | null;
  tao_luc: string;
  da_xoa: boolean;
  ghim_luc: string | null;
  anh_dinh_kem?: string[] | null;
};

/** Resolve root id — flatten reply-to-reply về root. */
export function resolveCommentRootId(
  row: RawRow,
  byId: Map<string, RawRow>,
): string {
  if (!row.id_cha) return row.id;
  let current: RawRow | undefined = row;
  const seen = new Set<string>();
  while (current?.id_cha) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    const parent = byId.get(current.id_cha);
    if (!parent) break;
    if (!parent.id_cha) return parent.id;
    current = parent;
  }
  return row.id_cha ?? row.id;
}

export function sortCommentRows(rows: RawRow[]): RawRow[] {
  return [...rows].sort((a, b) => {
    const aPin = a.ghim_luc ? 1 : 0;
    const bPin = b.ghim_luc ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;
    if (a.ghim_luc && b.ghim_luc) {
      return b.ghim_luc.localeCompare(a.ghim_luc);
    }
    return a.tao_luc.localeCompare(b.tao_luc);
  });
}

export function buildCommentThreads(
  rows: RawRow[],
  mapRow: (row: RawRow, replies: MilestonePostCommentV1[]) => MilestonePostCommentV1,
): MilestonePostCommentV1[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const roots = rows.filter((r) => !r.id_cha);
  const sortedRoots = sortCommentRows(roots);

  return sortedRoots
    .map((root) => {
      const replyRows = rows
        .filter((r) => r.id !== root.id && resolveCommentRootId(r, byId) === root.id)
        .sort((a, b) => a.tao_luc.localeCompare(b.tao_luc));

      const visibleReplies = replyRows.filter((r) => !r.da_xoa);
      if (root.da_xoa && visibleReplies.length === 0) return null;

      const replies = replyRows
        .filter((r) => !r.da_xoa)
        .map((r) => mapRow(r, []));

      return mapRow(root, replies);
    })
    .filter(Boolean) as MilestonePostCommentV1[];
}

export function countVisibleCommentThreads(threads: MilestonePostCommentV1[]): number {
  return threads.length;
}

export function flattenCommentIds(threads: MilestonePostCommentV1[]): string[] {
  const ids: string[] = [];
  for (const t of threads) {
    ids.push(t.id);
    for (const r of t.replies) ids.push(r.id);
  }
  return ids;
}

export type ReactionRow = {
  comment_id: string;
  emoji: string;
  so_luong: number;
  toi_da_react: boolean;
};

export function groupReactionsByComment(
  rows: Array<{
    id_doi_tuong: string;
    emoji: string;
    id_nguoi_dung?: string;
  }>,
  viewerId: string | null,
): Map<string, CommentReactionSummary[]> {
  // Mỗi user chỉ tính một emoji / comment (row cuối thắng — dọn dữ liệu cũ nhiều emoji).
  const onePerUser = new Map<string, { commentId: string; userId: string; emoji: string }>();
  for (const row of rows) {
    const commentId = row.id_doi_tuong;
    const userId = row.id_nguoi_dung ?? "";
    onePerUser.set(`${commentId}:${userId}`, {
      commentId,
      userId,
      emoji: row.emoji,
    });
  }

  const grouped = new Map<string, Map<string, { count: number; viewer: boolean }>>();

  for (const { commentId, userId, emoji } of onePerUser.values()) {
    let byEmoji = grouped.get(commentId);
    if (!byEmoji) {
      byEmoji = new Map();
      grouped.set(commentId, byEmoji);
    }
    const prev = byEmoji.get(emoji) ?? { count: 0, viewer: false };
    byEmoji.set(emoji, {
      count: prev.count + 1,
      viewer: prev.viewer || (viewerId != null && userId === viewerId),
    });
  }

  const out = new Map<string, CommentReactionSummary[]>();
  for (const [cid, byEmoji] of grouped) {
    out.set(
      cid,
      [...byEmoji.entries()]
        .map(([emoji, v]) => ({
          emoji,
          count: v.count,
          viewerReacted: v.viewer,
        }))
        .filter((r) => r.count > 0)
        .sort((a, b) => b.count - a.count),
    );
  }
  return out;
}
