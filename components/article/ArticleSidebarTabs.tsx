"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";

export type ArticleSidebarTab = {
  id: string;
  /** Nhãn trên nút tab (ngắn). */
  label: string;
  header: ReactNode;
  body: ReactNode;
};

type Props = {
  tabs: ArticleSidebarTab[];
  /** Tab mặc định khi mở (id); nếu không có thì tab đầu tiên. */
  defaultTabId?: string;
};

export function ArticleSidebarTabs({ tabs, defaultTabId }: Props) {
  const uid = useId().replace(/:/g, "");
  const initial =
    (defaultTabId && tabs.some((t) => t.id === defaultTabId)
      ? defaultTabId
      : tabs[0]?.id) ?? "";
  const [active, setActive] = useState(initial);

  if (tabs.length === 0) return null;

  if (tabs.length === 1) {
    const only = tabs[0]!;
    return (
      <div className="side-card side-card--related">
        {only.header}
        {only.body}
      </div>
    );
  }

  return (
    <div className="arv2-side-tabs">
      <div
        className="arv2-side-tablist"
        role="tablist"
        aria-label="Bài viết liên quan"
      >
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`${uid}-tab-${id}`}
            aria-selected={active === id}
            aria-controls={`${uid}-panel-${id}`}
            tabIndex={active === id ? 0 : -1}
            className={`arv2-side-tab${active === id ? " arv2-side-tab--active" : ""}`}
            onClick={() => setActive(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tabs.map(({ id, header, body }) => (
        <div
          key={id}
          role="tabpanel"
          id={`${uid}-panel-${id}`}
          aria-labelledby={`${uid}-tab-${id}`}
          className={`side-card side-card--related arv2-side-tab-panel${
            active !== id ? " arv2-side-tab-panel--inactive-desktop" : ""
          }`}
        >
          {header}
          {body}
        </div>
      ))}
    </div>
  );
}
