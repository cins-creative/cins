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

/** Mobile botbar đã mount — FAB neo fixed giữa, không portal vào nav. */
function useMobileBotbarMode(): boolean {
  const [active, setActive] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);

    const sync = () => {
      if (!mq.matches) {
        setActive(false);
        return;
      }
      const topbar = document.getElementById("app-topbar");
      setActive(
        topbar instanceof HTMLElement &&
          topbar.classList.contains("is-authed"),
      );
    };

    sync();
    mq.addEventListener("change", sync);

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      mq.removeEventListener("change", sync);
      observer.disconnect();
    };
  }, []);

  return active;
}

/** FAB + unread bubbles + mini chat — neo góc dưới phải (desktop) / giữa botbar (mobile). */
export function CinsChatDock() {
  const t = useT();
  const pathname = usePathname() ?? "";
  const chat = useCinsChatContext();
  const mobileBotbar = useMobileBotbarMode();

  if (isPersonalPostViewPath(pathname)) return null;
  /* Panel đang mở (fill shell, z thấp hơn dock). */
  if (chat?.open) return null;

  const launcher = (
    <CinsChatLauncher variant={mobileBotbar ? "botbar" : "dock"} />
  );

  const dock = (
    <div
      className={
        mobileBotbar ? "j-chat-dock is-botbar-anchored" : "j-chat-dock"
      }
      aria-label={t("chat.quickAria")}
    >
      <CinsChatFloatingStack
        launcher={mobileBotbar ? null : launcher}
        bubbleOpensFullChat={mobileBotbar}
      />
    </div>
  );

  if (mobileBotbar) {
    return createPortal(
      <>
        {launcher}
        {dock}
      </>,
      document.body,
    );
  }

  return dock;
}
