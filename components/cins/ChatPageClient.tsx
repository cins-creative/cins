"use client";

import { useEffect, useRef } from "react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";

/**
 * Slot trang `/chat` — provider tự mở overlay page-mode.
 * Giữ chiều cao main để layout shell ổn định trước khi portal sẵn sàng.
 */
export function ChatPageClient() {
  const { open, openChat } = useCinsChat();
  /* Chỉ mở một lần khi vào trang: đóng panel (Esc / nút đóng) sẽ điều hướng
     khỏi `/chat`, mở lại theo `open` sẽ chặn thao tác đóng đó. */
  const openedRef = useRef(false);

  useEffect(() => {
    if (open) {
      openedRef.current = true;
      return;
    }
    if (openedRef.current) return;
    openedRef.current = true;
    void openChat();
  }, [open, openChat]);

  return <div className="cins-chat-page-slot" aria-hidden />;
}
