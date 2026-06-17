"use client";

import { MessageCircle } from "lucide-react";
import { useEffect } from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";

export function CinsChatLauncher() {
  const { open, totalUnread, openChat, refreshUnread } = useCinsChat();

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  return (
    <button
      type="button"
      className={`tb-ask j-chat-launcher${totalUnread > 0 ? " has-unread" : ""}`}
      aria-label={totalUnread > 0 ? `${totalUnread} tin nhắn chưa đọc` : "Tin nhắn"}
      aria-expanded={open}
      onClick={() => void openChat()}
    >
      <MessageCircle size={16} strokeWidth={1.9} aria-hidden />
      {totalUnread > 0 ? (
        <span className="j-chat-launcher-count">{totalUnread}</span>
      ) : null}
    </button>
  );
}
