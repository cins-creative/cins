import type { MilestonePostComment } from "@/lib/journey/milestone-post-types";

export function addCommentToThreads(
  threads: MilestonePostComment[],
  comment: MilestonePostComment,
): MilestonePostComment[] {
  const next = { ...comment, replies: comment.replies ?? [] };
  if (!comment.idCha) return [...threads, next];
  return threads.map((t) =>
    t.id === comment.idCha
      ? { ...t, replies: [...(t.replies ?? []), next] }
      : t,
  );
}

export function updateCommentInThreads(
  threads: MilestonePostComment[],
  id: string,
  patch: Partial<MilestonePostComment>,
): MilestonePostComment[] {
  return threads.map((t) => {
    if (t.id === id) return { ...t, ...patch };
    if (!t.replies?.length) return t;
    const replies = t.replies.map((r) =>
      r.id === id ? { ...r, ...patch } : r,
    );
    if (replies !== t.replies) return { ...t, replies };
    return t;
  });
}

export function removeCommentFromThreads(
  threads: MilestonePostComment[],
  id: string,
): MilestonePostComment[] {
  return threads
    .filter((t) => t.id !== id)
    .map((t) => ({
      ...t,
      replies: (t.replies ?? []).filter((r) => r.id !== id),
    }));
}

export function countCommentThreads(threads: ReadonlyArray<MilestonePostComment>): number {
  return threads.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0);
}
