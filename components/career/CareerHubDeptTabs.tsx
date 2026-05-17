"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TabItem = {
  id: string;
  title: string;
  count: number;
};

type Props = {
  groups: TabItem[];
};

function scrollAnchorOffset(): number {
  const nav =
    parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--site-nav-height",
      ),
      10,
    ) || 56;
  const tabs = document.querySelector<HTMLElement>(".hn-dept-tabs");
  const tabsH = tabs?.offsetHeight ?? 52;
  return nav + tabsH + 16;
}

export function CareerHubDeptTabs({ groups }: Props) {
  const [activeId, setActiveId] = useState(groups[0]?.id ?? "");
  const stripRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLAnchorElement>());

  const scrollActiveTabIntoView = useCallback((id: string, smooth: boolean) => {
    const tab = tabRefs.current.get(id);
    const strip = stripRef.current;
    if (!tab || !strip) return;

    const tabLeft = tab.offsetLeft;
    const tabWidth = tab.offsetWidth;
    const stripWidth = strip.clientWidth;
    const maxScroll = strip.scrollWidth - stripWidth;
    const target = Math.max(0, Math.min(maxScroll, tabLeft - (stripWidth - tabWidth) / 2));

    strip.scrollTo({
      left: target,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    if (!groups.length) return;
    if (!groups.some((g) => g.id === activeId)) {
      setActiveId(groups[0].id);
    }
  }, [groups, activeId]);

  useEffect(() => {
    if (!groups.length) return;

    const onScroll = () => {
      const y = window.scrollY + scrollAnchorOffset();
      let current = groups[0]?.id ?? "";
      for (const g of groups) {
        const el = document.getElementById(g.id);
        if (el && el.offsetTop <= y) current = g.id;
      }
      setActiveId((prev) => (prev === current ? prev : current));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [groups]);

  useEffect(() => {
    if (!activeId) return;
    scrollActiveTabIntoView(activeId, true);
  }, [activeId, scrollActiveTabIntoView]);

  if (groups.length === 0) return null;

  return (
    <div className="hn-dept-tabs" ref={stripRef} data-stuck>
      <div className="hn-dept-tabs-inner" role="tablist" aria-label="Bộ phận">
        {groups.map((g) => (
          <a
            key={g.id}
            ref={(el) => {
              if (el) tabRefs.current.set(g.id, el);
              else tabRefs.current.delete(g.id);
            }}
            href={`#${g.id}`}
            className={`hn-dept-tab${g.id === activeId ? " is-on" : ""}`}
            role="tab"
            aria-selected={g.id === activeId}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(g.id);
              if (el) {
                const top = el.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({
                  top: top - scrollAnchorOffset(),
                  behavior: "smooth",
                });
              }
              setActiveId(g.id);
              scrollActiveTabIntoView(g.id, true);
            }}
          >
            {g.title}
            <span className="num">{g.count}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
