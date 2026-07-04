"use client";

import { useEffect } from "react";

/** Tooltip theo con trỏ + burger mobile — giống home v2. */
export function useCinsSidebarNav(sidebarId = "app-sidebar") {
  useEffect(() => {
    const sidebar = document.getElementById(sidebarId);
    const topbar = document.getElementById("app-topbar");
    const burger = document.getElementById("app-tb-burger");

    const onScroll = () => {
      const y = window.scrollY;
      if (!topbar) return;
      topbar.classList.toggle("scrolled", y > 4);
    };
    topbar?.classList.remove("is-hidden");
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const onBurger = (e: MouseEvent) => {
      e.stopPropagation();
      sidebar?.classList.toggle("open");
    };
    const onDocClick = (e: MouseEvent) => {
      if (!sidebar || !burger) return;
      const t = e.target as Node;
      if (!sidebar.contains(t) && !burger.contains(t)) {
        sidebar.classList.remove("open");
      }
    };
    // Trên mobile: chạm vào một link điều hướng phải đóng drawer (nếu không,
    // class .open còn lại sau khi client-side navigation → sidebar không thu).
    const onSidebarClick = (e: MouseEvent) => {
      if (window.innerWidth > 960) return;
      const link = (e.target as HTMLElement).closest("a[href]");
      if (link) sidebar?.classList.remove("open");
    };
    burger?.addEventListener("click", onBurger);
    document.addEventListener("click", onDocClick);
    sidebar?.addEventListener("click", onSidebarClick);

    let tip: HTMLDivElement | null = null;
    const sbListeners: Array<{
      el: HTMLElement;
      enter: (e: MouseEvent) => void;
      move: (e: MouseEvent) => void;
      leave: () => void;
    }> = [];

    const mq = window.matchMedia("(max-width: 960px)");
    if (!mq.matches && sidebar) {
      tip = document.createElement("div");
      tip.className = "sb-tooltip";
      tip.innerHTML =
        '<div class="tt-title"></div><div class="tt-desc"></div>';
      document.body.appendChild(tip);
      const tT = tip.querySelector(".tt-title");
      const tD = tip.querySelector(".tt-desc");

      const place = (x: number, y: number) => {
        if (!tip) return;
        const w = tip.offsetWidth;
        const h = tip.offsetHeight;
        let nx = x + 18;
        let ny = y + 16;
        if (nx + w > window.innerWidth - 12) nx = x - w - 14;
        if (ny + h > window.innerHeight - 12) ny = y - h - 14;
        tip.style.left = `${nx}px`;
        tip.style.top = `${ny}px`;
      };

      sidebar.querySelectorAll<HTMLElement>(".sb-item[data-tip]").forEach(
        (item) => {
          const enter = (e: MouseEvent) => {
            const lbl = item.querySelector(".sb-label");
            if (tT) tT.textContent = lbl?.textContent?.trim() ?? "";
            if (tD) tD.textContent = item.dataset.tip ?? "";
            place(e.clientX, e.clientY);
            tip?.classList.add("show");
          };
          const move = (e: MouseEvent) => place(e.clientX, e.clientY);
          const leave = () => tip?.classList.remove("show");
          item.addEventListener("mouseenter", enter);
          item.addEventListener("mousemove", move);
          item.addEventListener("mouseleave", leave);
          sbListeners.push({ el: item, enter, move, leave });
        },
      );
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      burger?.removeEventListener("click", onBurger);
      document.removeEventListener("click", onDocClick);
      sidebar?.removeEventListener("click", onSidebarClick);
      sbListeners.forEach(({ el, enter, move, leave }) => {
        el.removeEventListener("mouseenter", enter);
        el.removeEventListener("mousemove", move);
        el.removeEventListener("mouseleave", leave);
      });
      tip?.remove();
    };
  }, [sidebarId]);
}
