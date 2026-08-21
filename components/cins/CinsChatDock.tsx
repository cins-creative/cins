"use client";

import { usePathname } from "next/navigation";

import { CinsChatFloatingStack } from "@/components/cins/CinsChatFloatingStack";
import { CinsChatLauncher } from "@/components/cins/CinsChatLauncher";
import { useCinsChatContext } from "@/components/cins/CinsChatProvider";
import { isPersonalPostViewPath } from "@/lib/journey/post-view-path";
import { useT } from "@/lib/i18n/use-t";

/** FAB + unread bubbles + mini chat — neo góc dưới phải. */
export function CinsChatDock() {
  const t = useT();
  const pathname = usePathname() ?? "";
  const chat = useCinsChatContext();
  if (isPersonalPostViewPath(pathname)) return null;
  /* Panel đang mở (fill shell, z thấp hơn dock). */
  if (chat?.open) return null;

  return (
    <div className="j-chat-dock" aria-label={t("chat.quickAria")}>
      <CinsChatFloatingStack launcher={<CinsChatLauncher />} />
    </div>
  );
}
