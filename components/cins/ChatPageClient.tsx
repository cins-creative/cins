"use client";

import { useEffect } from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";

/**
 * Slot trang `/chat` — provider tự mở overlay page-mode.
 * Giữ chiều cao main để layout shell ổn định trước khi portal sẵn sàng.
 */
export function ChatPageClient() {
  const { open, openChat } = useCinsChat();

  useEffect(() => {
    if (!open) void openChat();
  }, [open, openChat]);

  return <div className="cins-chat-page-slot" aria-hidden />;
}
