"use client";

import { useMemo } from "react";

import {
  chatTextHasMentions,
  parseCommentMentionSegments,
} from "@/lib/chat/mentions";
import type { ChatMentionRef } from "@/lib/chat/types";

type Props = {
  text: string;
  mentions?: ChatMentionRef[];
  viewerUserId?: string | null;
  tone?: "me" | "them";
};

export function ChatMentionText({
  text,
  mentions,
  viewerUserId,
  tone = "them",
}: Props) {
  const hasMentions = useMemo(() => chatTextHasMentions(text), [text]);
  const bySlug = useMemo(() => {
    const map = new Map<string, ChatMentionRef>();
    for (const m of mentions ?? []) {
      map.set(m.slug.toLowerCase(), m);
    }
    return map;
  }, [mentions]);

  if (!hasMentions) {
    return <>{text}</>;
  }

  const segments = parseCommentMentionSegments(text);

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={`t-${index}`}>{segment.value}</span>;
        }
        const ref = bySlug.get(segment.slug);
        const isSelf = Boolean(
          viewerUserId && ref?.id && ref.id === viewerUserId,
        );
        const label = ref?.ten?.trim() || segment.slug;
        return (
          <span
            key={`m-${segment.slug}-${index}`}
            className={`cins-chat-mention-chip${isSelf ? " is-self" : ""}${tone === "me" ? " is-me" : ""}`}
            title={`@${segment.slug}`}
          >
            @{label}
          </span>
        );
      })}
    </>
  );
}
