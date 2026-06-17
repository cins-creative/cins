"use client";

import { MessageCircle } from "lucide-react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";

export function CinsChatLauncher() {
  const { open, totalUnread, openChat } = useCinsChat();

  return (
    <button
      type="button"
      className={[
        "j-chat-fab",
        open ? "is-open" : "",
        totalUnread > 0 ? "has-unread" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={totalUnread > 0 ? `${totalUnread} tin nhắn chưa đọc` : "Tin nhắn"}
      aria-expanded={open}
      aria-hidden={open}
      onClick={() => void openChat()}
    >
      <span className="j-chat-fab-glow" aria-hidden />
      <span className="j-chat-fab-icon" aria-hidden>
        <MessageCircle size={22} strokeWidth={2} />
      </span>
      {totalUnread > 0 ? (
        <span className="j-chat-fab-count">
          {totalUnread > 99 ? "99+" : totalUnread}
        </span>
      ) : null}
    </button>
  );
}
