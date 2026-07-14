"use client";

import { usePathname } from "next/navigation";

import { CinsChatFloatingStack } from "@/components/cins/CinsChatFloatingStack";
import { CinsChatLauncher } from "@/components/cins/CinsChatLauncher";
import { isPersonalPostViewPath } from "@/lib/journey/post-view-path";

/** FAB + unread bubbles + mini chat — neo góc dưới phải. */
export function CinsChatDock() {
  const pathname = usePathname() ?? "";
  if (isPersonalPostViewPath(pathname)) return null;

  return (
    <div className="j-chat-dock" aria-label="Tin nhắn nhanh">
      <CinsChatFloatingStack launcher={<CinsChatLauncher />} />
    </div>
  );
}
