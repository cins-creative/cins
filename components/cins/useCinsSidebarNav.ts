"use client";

import { useEffect } from "react";

const MOBILE_MQ = "(max-width: 960px)";

function isDesktopSidebarRail(): boolean {
  return window.matchMedia("(min-width: 961px)").matches;
}

/** Bỏ focus trong sidebar — tránh `:focus-within` giữ rail 240px sau khi rê chuột ra. */
function blurSidebarFocus(sidebar: HTMLElement | null) {
  if (!sidebar || !isDesktopSidebarRail()) return;
  const active = document.activeElement;
  if (active instanceof HTMLElement && sidebar.contains(active)) {
    active.blur();
  }
}

/** Tooltip theo con trỏ + burger mobile — giống home v2. */
export function useCinsSidebarNav(
  sidebarId = "app-sidebar",
  pathname?: string | null,
) {
  // Client navigation (mobile drawer) — class `.open` còn lại khiến sidebar không thu.
  useEffect(() => {
    if (pathname == null) return;
    document.getElementById(sidebarId)?.classList.remove("open");
  }, [sidebarId, pathname]);

  useEffect(() => {
    const desktopMq = window.matchMedia("(min-width: 961px)");
    const mobileMq = window.matchMedia(MOBILE_MQ);
    let raf = 0;

    const getSidebar = () => document.getElementById(sidebarId);
    const getTopbar = () => document.getElementById("app-topbar");
    const getBurger = () => document.getElementById("app-tb-burger");

    const syncTopbar = () => {
      raf = 0;
      const topbar = getTopbar();
      if (!topbar) return;
      const y = Math.max(0, window.scrollY);
      topbar.classList.toggle("scrolled", y > 4);
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(syncTopbar);
    };

    syncTopbar();
    window.addEventListener("scroll", onScroll, { passive: true });
    mobileMq.addEventListener("change", syncTopbar);

    let ignoreOutsideCloseUntil = 0;

    /* Chỉ #app-tb-burger — không cả .tb-left (page-slot portal nằm trong đó).
       Query lúc click: topbar là RSC + Suspense; gắn node lúc fallback
       → burger thật mount sau thì nút chết (đứt listener). */
    const isBurgerClick = (t: EventTarget | null) => {
      const burger = getBurger();
      return Boolean(burger && t instanceof Node && burger.contains(t));
    };

    const onDocClick = (e: MouseEvent) => {
      const sidebar = getSidebar();
      if (!sidebar) return;
      if (isBurgerClick(e.target)) {
        e.preventDefault();
        sidebar.classList.toggle("open");
        if (sidebar.classList.contains("open")) {
          /* Ghost click sau touchend đập vào scrim (::after) → đóng ngay. */
          ignoreOutsideCloseUntil = Date.now() + 450;
        }
        return;
      }
      if (Date.now() < ignoreOutsideCloseUntil) return;
      const t = e.target as Node;
      if (!sidebar.contains(t)) {
        sidebar.classList.remove("open");
      }
    };
    // Trên mobile: chạm vào một link điều hướng phải đóng drawer (nếu không,
    // class .open còn lại sau khi client-side navigation → sidebar không thu).
    const onSidebarClick = (e: MouseEvent) => {
      if (window.innerWidth > 960) return;
      const link = (e.target as HTMLElement).closest("a[href]");
      if (link) getSidebar()?.classList.remove("open");
    };
    const onSidebarMouseLeave = () => {
      /* Delay nhẹ — tránh blur ngay khi rê/click vào subitem khiến rail thu
         giữa mousedown→click và nuốt navigation. */
      window.setTimeout(() => blurSidebarFocus(getSidebar()), 0);
    };
    const onDocPointerDown = (e: PointerEvent) => {
      const sidebar = getSidebar();
      if (!sidebar || !desktopMq.matches) return;
      const t = e.target as Node;
      if (!sidebar.contains(t)) blurSidebarFocus(sidebar);
    };
    const onDesktopMqChange = () => {
      if (desktopMq.matches) getSidebar()?.classList.remove("open");
    };

    const sidebarEl = getSidebar();
    document.addEventListener("click", onDocClick);
    sidebarEl?.addEventListener("click", onSidebarClick);
    sidebarEl?.addEventListener("mouseleave", onSidebarMouseLeave);
    document.addEventListener("pointerdown", onDocPointerDown, {
      capture: true,
    });
    desktopMq.addEventListener("change", onDesktopMqChange);

    let tip: HTMLDivElement | null = null;
    const sbListeners: Array<{
      el: HTMLElement;
      enter: (e: MouseEvent) => void;
      move: (e: MouseEvent) => void;
      leave: () => void;
    }> = [];

    const mq = window.matchMedia("(max-width: 960px)");
    if (!mq.matches && sidebarEl) {
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

      sidebarEl.querySelectorAll<HTMLElement>(".sb-item[data-tip]").forEach(
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
      mobileMq.removeEventListener("change", syncTopbar);
      if (raf) window.cancelAnimationFrame(raf);
      document.removeEventListener("click", onDocClick);
      sidebarEl?.removeEventListener("click", onSidebarClick);
      sidebarEl?.removeEventListener("mouseleave", onSidebarMouseLeave);
      document.removeEventListener("pointerdown", onDocPointerDown, {
        capture: true,
      });
      desktopMq.removeEventListener("change", onDesktopMqChange);
      sbListeners.forEach(({ el, enter, move, leave }) => {
        el.removeEventListener("mouseenter", enter);
        el.removeEventListener("mousemove", move);
        el.removeEventListener("mouseleave", leave);
      });
      tip?.remove();
    };
  }, [sidebarId]);
}
