import type { ChatThread } from "@/lib/chat/types";

/** Sắp list: cha (nhóm / hub org) rồi con (project / lớp) indent ngay dưới. */
export function nestGroupThreads(
  list: ChatThread[],
  options?: { expandedParentIds?: Set<string> },
): ChatThread[] {
  const childrenByParent = new Map<string, ChatThread[]>();
  const roots: ChatThread[] = [];

  for (const t of list) {
    const parentId = t.parentRoomId?.trim();
    if (parentId) {
      const arr = childrenByParent.get(parentId) ?? [];
      arr.push(t);
      childrenByParent.set(parentId, arr);
    } else {
      roots.push(t);
    }
  }

  const out: ChatThread[] = [];
  const usedChildIds = new Set<string>();
  const expanded = options?.expandedParentIds;

  for (const root of roots) {
    out.push(root);
    const kids = childrenByParent.get(root.roomId);
    if (!kids?.length) continue;
    if (expanded && !expanded.has(root.roomId)) continue;
    kids.sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
    );
    for (const kid of kids) {
      out.push(kid);
      usedChildIds.add(kid.roomId);
    }
  }

  for (const [parentId, kids] of childrenByParent) {
    if (roots.some((r) => r.roomId === parentId)) continue;
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
