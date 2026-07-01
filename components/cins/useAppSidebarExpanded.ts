"use client";

import { useEffect, useState } from "react";

const MOBILE_MQ = "(max-width: 960px)";

/** Theo dõi sidebar mở rộng (hover / focus / user menu / mobile `.open`). */
export function useAppSidebarExpanded(sidebarId = "app-sidebar"): boolean {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const sidebar = document.getElementById(sidebarId);
    if (!sidebar) return;

    const mq = window.matchMedia(MOBILE_MQ);

    const read = () => {
      if (mq.matches) {
        setExpanded(sidebar.classList.contains("open"));
        return;
      }
      const userOpen = Boolean(sidebar.querySelector(".sb-user.open"));
      setExpanded(
        sidebar.matches(":hover") ||
          sidebar.matches(":focus-within") ||
          userOpen,
      );
    };

    sidebar.addEventListener("mouseenter", read);
    sidebar.addEventListener("mouseleave", read);
    sidebar.addEventListener("focusin", read);
    sidebar.addEventListener("focusout", read);

    const mo = new MutationObserver(read);
    mo.observe(sidebar, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: true,
    });

    mq.addEventListener("change", read);
    read();

    return () => {
      sidebar.removeEventListener("mouseenter", read);
      sidebar.removeEventListener("mouseleave", read);
      sidebar.removeEventListener("focusin", read);
      sidebar.removeEventListener("focusout", read);
      mo.disconnect();
      mq.removeEventListener("change", read);
    };
  }, [sidebarId]);

  return expanded;
}
