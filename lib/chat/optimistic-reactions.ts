import type { ChatReactionSummary } from "@/lib/chat/types";

export function applyOptimisticReaction(
  reactions: ChatReactionSummary[] | undefined,
  emoji: string,
  active: boolean,
): ChatReactionSummary[] {
  const list = [...(reactions ?? [])];
  const index = list.findIndex((item) => item.emoji === emoji);

  if (active) {
    if (index >= 0) {
      list[index] = {
        ...list[index],
        count: list[index].count + 1,
        viewerReacted: true,
      };
    } else {
      list.push({ emoji, count: 1, viewerReacted: true });
    }
    return list;
  }

  if (index < 0) return list;

  const nextCount = list[index].count - 1;
  if (nextCount <= 0) {
    list.splice(index, 1);
  } else {
    list[index] = { ...list[index], count: nextCount, viewerReacted: false };
  }

  return list;
}
