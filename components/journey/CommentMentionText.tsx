"use client";

import { useMemo } from "react";

import {
  CommentMentionChip,
  useMentionPreviews,
} from "@/components/journey/CommentMentionChip";
import {
  commentTextHasMentions,
  parseCommentMentionSegments,
} from "@/lib/social/comments/mention-parse";

type Props = {
  text: string;
  className?: string;
};

export function CommentMentionText({ text, className = "post-comments-text" }: Props) {
  const hasMentions = useMemo(() => commentTextHasMentions(text), [text]);
  const segments = useMemo(
    () => (hasMentions ? parseCommentMentionSegments(text) : []),
    [hasMentions, text],
  );
  const mentionSlugs = useMemo(
    () =>
      segments
        .filter((s) => s.type === "mention")
        .map((s) => (s.type === "mention" ? s.slug : "")),
    [segments],
  );
  const previews = useMentionPreviews(mentionSlugs);

  if (!hasMentions) {
    return <p className={className}>{text}</p>;
  }

  return (
    <p className={className}>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={`t-${index}`}>{segment.value}</span>;
        }
        return (
          <CommentMentionChip
            key={`m-${segment.slug}-${index}`}
            slug={segment.slug}
            preview={previews[segment.slug] ?? null}
          />
        );
      })}
    </p>
  );
}
