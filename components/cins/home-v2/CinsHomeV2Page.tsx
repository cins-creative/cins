"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import "@/app/cins-home-v2-page.css";

type Props = {
  markup: string;
};

/**
 * Trang home v2: markup HTML từ thiết kế (1 file) + CSS trích từ cùng nguồn.
 * Hành vi (FAQ, filter, topbar, burger, tooltip) gắn sau mount — tương đương script gốc.
 */
export function CinsHomeV2Page({ markup }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onSidebarNavClick = (e: MouseEvent) => {
      const link = (e.target as Element).closest<HTMLAnchorElement>(
        "a.sb-item[href], a.tb-login[href], a.tb-signup[href]",
      );
      if (!link || !root.contains(link)) return;
      const href = link.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href.startsWith("//")) return;
      e.preventDefault();
      document.getElementById("sidebar")?.classList.remove("open");
      router.push(href);
    };
    root.addEventListener("click", onSidebarNavClick);

    const faqItems = root.querySelectorAll<HTMLDetailsElement>(".faq-item");
    const faqHandlers: Array<{
      el: HTMLDetailsElement;
      fn: () => void;
    }> = [];
    faqItems.forEach((item) => {
      const fn = () => {
        if (item.open) {
          faqItems.forEach((o) => {
            if (o !== item) o.open = false;
          });
        }
      };
      item.addEventListener("toggle", fn);
      faqHandlers.push({ el: item, fn });
    });

    const filterPills = root.querySelectorAll<HTMLElement>(".filter-pill");
    const onFilterClick = (e: MouseEvent) => {
      const p = e.currentTarget as HTMLElement;
      filterPills.forEach((x) => x.classList.remove("on"));
      p.classList.add("on");
    };
    filterPills.forEach((p) => p.addEventListener("click", onFilterClick));

    const courseFilters =
      root.querySelectorAll<HTMLElement>(".courses-filter");
    const onCourseFilterClick = (e: MouseEvent) => {
      const p = e.currentTarget as HTMLElement;
      courseFilters.forEach((x) => x.classList.remove("on"));
      p.classList.add("on");
    };
    courseFilters.forEach((p) =>
      p.addEventListener("click", onCourseFilterClick),
    );

    const topbar = document.getElementById("topbar");
    const onScroll = () => {
      if (topbar)
        topbar.classList.toggle("scrolled", window.scrollY > 4);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const burger = document.getElementById("tb-burger");
    const sidebar = document.getElementById("sidebar");
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
    burger?.addEventListener("click", onBurger);
    document.addEventListener("click", onDocClick);

    let tip: HTMLDivElement | null = null;
    const sbListeners: Array<{
      el: HTMLElement;
      enter: (e: MouseEvent) => void;
      move: (e: MouseEvent) => void;
      leave: () => void;
    }> = [];

    const mq = window.matchMedia("(max-width:960px)");
    if (!mq.matches) {
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

      root.querySelectorAll<HTMLElement>(".sb-item[data-tip]").forEach(
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
      root.removeEventListener("click", onSidebarNavClick);
      faqHandlers.forEach(({ el, fn }) =>
        el.removeEventListener("toggle", fn),
      );
      filterPills.forEach((p) =>
        p.removeEventListener("click", onFilterClick),
      );
      courseFilters.forEach((p) =>
        p.removeEventListener("click", onCourseFilterClick),
      );
      window.removeEventListener("scroll", onScroll);
      burger?.removeEventListener("click", onBurger);
      document.removeEventListener("click", onDocClick);
      sbListeners.forEach(({ el, enter, move, leave }) => {
        el.removeEventListener("mouseenter", enter);
        el.removeEventListener("mousemove", move);
        el.removeEventListener("mouseleave", leave);
      });
      tip?.remove();
    };
  }, [markup, router]);

  return (
    <div
      ref={rootRef}
      className="cins-home-v2-page"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
