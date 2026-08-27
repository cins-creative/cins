"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

import { CinsChatFloatingStack } from "@/components/cins/CinsChatFloatingStack";
import { CinsChatLauncher } from "@/components/cins/CinsChatLauncher";
import { useCinsChatContext } from "@/components/cins/CinsChatProvider";
import { isPersonalPostViewPath } from "@/lib/journey/post-view-path";
import { useT } from "@/lib/i18n/use-t";

const MOBILE_MQ = "(max-width: 960px)";
const CHAT_SLOT_ID = "app-topbar-chat-slot";

function useMobileFabSlot(): HTMLElement | null {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);

    const sync = () => {
      if (!mq.matches) {
        setSlot(null);
        return;
      }
      const el = document.getElementById(CHAT_SLOT_ID);
      const usable =
        el instanceof HTMLElement &&
        el.isConnected &&
        Boolean(el.closest(".cins-app-topbar.is-authed"));
      setSlot(usable ? el : null);
    };

    sync();
    mq.addEventListener("change", sync);

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    return () => {
      mq.removeEventListener("change", sync);
      observer.disconnect();
    };
  }, []);

  return slot;
}

/** FAB + unread bubbles + mini chat — FAB vào botbar slot (mobile); bubbles neo fixed. */
export function CinsChatDock() {
  const t = useT();
  const pathname = usePathname() ?? "";
  const chat = useCinsChatContext();
  const fabSlot = useMobileFabSlot();

  if (isPersonalPostViewPath(pathname)) return null;
  /* Panel đang mở (fill shell, z thấp hơn dock). */
  if (chat?.open) return null;

  const canPortalFab = Boolean(fabSlot?.isConnected);
  const launcher = (
    <CinsChatLauncher variant={canPortalFab ? "botbar" : "dock"} />
  );

  return (
    <>
      {canPortalFab && fabSlot ? createPortal(launcher, fabSlot) : null}
      <div
        className={
          canPortalFab ? "j-chat-dock is-botbar-anchored" : "j-chat-dock"
        }
        aria-label={t("chat.quickAria")}
      >
        <CinsChatFloatingStack
          launcher={canPortalFab ? null : launcher}
          bubbleOpensFullChat={canPortalFab}
        />
      </div>
    </>
  );
}
