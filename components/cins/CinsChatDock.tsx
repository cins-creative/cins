"use client";

import { CinsChatFloatingStack } from "@/components/cins/CinsChatFloatingStack";
import { CinsChatLauncher } from "@/components/cins/CinsChatLauncher";

/** FAB + unread bubbles + mini chat — neo góc dưới phải. */
export function CinsChatDock() {
  return (
    <div className="j-chat-dock" aria-label="Tin nhắn nhanh">
      <CinsChatFloatingStack launcher={<CinsChatLauncher />} />
    </div>
  );
}
