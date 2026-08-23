import type { ChatThread } from "@/lib/chat/types";

function chatThreadLastAtMs(iso: string): number {
  const n = Date.parse(iso);
  return Number.isNaN(n) ? 0 : n;
}

export function indexChatThreadChildrenByParent(
  list: ChatThread[],
): Map<string, ChatThread[]> {
  const childrenByParent = new Map<string, ChatThread[]>();
  for (const t of list) {
    const parentId = t.parentRoomId?.trim();
    if (!parentId) continue;
    const arr = childrenByParent.get(parentId) ?? [];
    arr.push(t);
    childrenByParent.set(parentId, arr);
  }
  return childrenByParent;
}

/** lastAt của cha hoặc con mới nhất — tin mới ở chatbox con kéo cả group lên top. */
export function chatThreadFamilyActivityMs(
  root: ChatThread,
  childrenByParent: Map<string, ChatThread[]>,
): number {
  let max = chatThreadLastAtMs(root.lastAt);
  for (const kid of childrenByParent.get(root.roomId) ?? []) {
    const t = chatThreadLastAtMs(kid.lastAt);
    if (t > max) max = t;
  }
  return max;
}

function chatThreadSortActivityMs(
  thread: ChatThread,
  childrenByParent: Map<string, ChatThread[]>,
): number {
  if (thread.parentRoomId?.trim()) return chatThreadLastAtMs(thread.lastAt);
  return chatThreadFamilyActivityMs(thread, childrenByParent);
}

function comparePinnedThenFamilyActivity(
  a: ChatThread,
  b: ChatThread,
  pinnedRoomIds: string[] | undefined,
  childrenByParent: Map<string, ChatThread[]>,
): number {
  if (pinnedRoomIds?.length) {
    const aIdx = pinnedRoomIds.indexOf(a.roomId);
    const bIdx = pinnedRoomIds.indexOf(b.roomId);
    const aPinned = aIdx >= 0;
    const bPinned = bIdx >= 0;
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    if (aPinned && bPinned && aIdx !== bIdx) return aIdx - bIdx;
  }
  return (
    chatThreadSortActivityMs(b, childrenByParent) -
    chatThreadSortActivityMs(a, childrenByParent)
  );
}

export function sortChatThreadsByFamilyActivity(
  list: ChatThread[],
  pinnedRoomIds?: string[],
): ChatThread[] {
  const childrenByParent = indexChatThreadChildrenByParent(list);
  return [...list].sort((a, b) =>
    comparePinnedThenFamilyActivity(a, b, pinnedRoomIds, childrenByParent),
  );
}

type NestGroupThreadsOptions = {
  expandedParentIds?: Set<string>;
  pinnedRoomIds?: string[];
};

/** Sắp list: cha (nhóm / hub org) rồi con (project / lớp) indent ngay dưới. */
export function nestGroupThreads(
  list: ChatThread[],
  options?: NestGroupThreadsOptions,
): ChatThread[] {
  const childrenByParent = indexChatThreadChildrenByParent(list);
  const roots: ChatThread[] = [];

  for (const t of list) {
    if (!t.parentRoomId?.trim()) roots.push(t);
  }

  roots.sort((a, b) =>
    comparePinnedThenFamilyActivity(
      a,
      b,
      options?.pinnedRoomIds,
      childrenByParent,
    ),
  );

  const out: ChatThread[] = [];
  const usedChildIds = new Set<string>();
  const expanded = options?.expandedParentIds;

  for (const root of roots) {
    out.push(root);
    const kids = childrenByParent.get(root.roomId);
    if (!kids?.length) continue;
    if (expanded && !expanded.has(root.roomId)) continue;
    kids.sort(
      (a, b) =>
        chatThreadLastAtMs(b.lastAt) - chatThreadLastAtMs(a.lastAt),
    );
    for (const kid of kids) {
      out.push(kid);
      usedChildIds.add(kid.roomId);
    }
  }

  for (const [parentId, kids] of childrenByParent) {
    if (roots.some((r) => r.roomId === parentId)) continue;
    kids.sort(
      (a, b) =>
        chatThreadLastAtMs(b.lastAt) - chatThreadLastAtMs(a.lastAt),
    );
    for (const kid of kids) {
      if (!usedChildIds.has(kid.roomId)) out.push(kid);
    }
  }

  return out;
}

export function countActiveChildrenByParent(
  threads: ChatThread[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of threads) {
    const parentId = t.parentRoomId?.trim();
    if (!parentId) continue;
    if (t.roomTrangThai === "an") continue;
    map.set(parentId, (map.get(parentId) ?? 0) + 1);
  }
  return map;
}
