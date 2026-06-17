"use client";

import type { ChatReactionSummary } from "@/lib/chat/types";

type Props = {
  reactions: ChatReactionSummary[];
  onToggle: (emoji: string, active: boolean) => void;
  placement?: "inline" | "corner";
};

export function ChatMessageReactions({
  reactions,
  onToggle,
  placement = "inline",
}: Props) {
  if (reactions.length === 0) return null;

  const visibleReactions =
    placement === "corner"
      ? [...reactions].sort((a, b) => b.count - a.count).slice(0, 3)
      : reactions;

  return (
    <div
      className={`cins-chat-reactions${placement === "corner" ? " is-corner" : ""}`}
      role="group"
      aria-label="Reaction"
    >
      {visibleReactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          className={`cins-chat-reaction-chip${reaction.viewerReacted ? " is-mine" : ""}`}
          aria-pressed={reaction.viewerReacted}
          onClick={() => onToggle(reaction.emoji, !reaction.viewerReacted)}
        >
          <span aria-hidden>{reaction.emoji}</span>
          {placement !== "corner" && reaction.count > 1 ? (
            <span className="cins-chat-reaction-count">{reaction.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
