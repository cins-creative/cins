"use client";

import { useState, useTransition } from "react";

import type { ChatMessage, ChatPollSummary } from "@/lib/chat/types";

type Props = {
  message: ChatMessage;
  roomId: string;
  onPollUpdated: (messageId: string, poll: ChatPollSummary) => void;
};

export function ChatPollBubble({ message, roomId, onPollUpdated }: Props) {
  const poll = message.poll;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!poll || message.deleted) {
    return <p className="cins-chat-poll-fallback">Bình chọn</p>;
  }

  const total = Math.max(poll.totalVotes, 1);

  const vote = (optionId: string) => {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/chat/rooms/${roomId}/polls/${poll.id}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_lua_chon: optionId }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        poll?: ChatPollSummary;
        error?: string;
      } | null;
      if (!res.ok || !json?.poll) {
        setError(json?.error ?? "Không gửi được phiếu.");
        return;
      }
      onPollUpdated(message.id, json.poll);
    });
  };

  return (
    <div className="cins-chat-poll">
      <p className="cins-chat-poll-q">{poll.question}</p>
      <ul className="cins-chat-poll-options" role="list">
        {poll.options.map((opt) => {
          const selected = poll.viewerOptionId === opt.id;
          const pct =
            poll.totalVotes === 0
              ? 0
              : Math.round((opt.count / total) * 100);
          return (
            <li key={opt.id}>
              <button
                type="button"
                className={`cins-chat-poll-option${selected ? " is-selected" : ""}`}
                disabled={pending}
                onClick={() => vote(opt.id)}
              >
                <span
                  className="cins-chat-poll-option-fill"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
                <span className="cins-chat-poll-option-label">{opt.text}</span>
                <span className="cins-chat-poll-option-count">
                  {poll.totalVotes > 0 ? `${pct}%` : "—"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="cins-chat-poll-meta">
        {poll.totalVotes} phiếu · bấm để chọn / đổi phiếu
      </p>
      {error ? <p className="cins-chat-poll-error">{error}</p> : null}
    </div>
  );
}
