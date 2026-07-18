"use client";

import { type ReactNode, useMemo } from "react";

import {
  chatTextHasMentions,
  parseCommentMentionSegments,
} from "@/lib/chat/mentions";
import type { ChatMentionRef } from "@/lib/chat/types";
import { trimUrlTrailingPunctuation } from "@/lib/link/og-preview";

type Props = {
  text: string;
  mentions?: ChatMentionRef[];
  viewerUserId?: string | null;
  tone?: "me" | "them";
};

const URL_IN_TEXT_RE = /https?:\/\/[^\s<>"']+/gi;

function linkifyPlainText(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = new RegExp(URL_IN_TEXT_RE.source, "gi");
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(text.slice(last, m.index));
    }
    const raw = m[0]!;
    const href = trimUrlTrailingPunctuation(raw);
    const trailing = raw.slice(href.length);
    nodes.push(
      <a
        key={`${keyPrefix}-a${i++}`}
        className="cins-chat-msg-link"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {href}
      </a>,
    );
    if (trailing) nodes.push(trailing);
    last = m.index + raw.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  if (nodes.length === 0 && text) nodes.push(text);
  return nodes;
}

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
    return <>{linkifyPlainText(text, "t")}</>;
  }

  const segments = parseCommentMentionSegments(text);

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return (
            <span key={`t-${index}`}>
              {linkifyPlainText(segment.value, `t-${index}`)}
            </span>
          );
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
