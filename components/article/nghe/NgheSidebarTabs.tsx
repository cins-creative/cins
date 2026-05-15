"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";

export type NgheSidebarTabId = "keyword" | "nghe" | "nganh";

type TabPanel = {
  header: ReactNode;
  body: ReactNode;
};

type Props = {
  keyword: TabPanel;
  nghe: TabPanel;
  nganh: TabPanel;
};

const TAB_META: { id: NgheSidebarTabId; label: string }[] = [
  { id: "nganh", label: "Ngành học" },
  { id: "keyword", label: "Kỹ thuật" },
  { id: "nghe", label: "Nghề liên quan" },
];

export function NgheSidebarTabs({ keyword, nghe, nganh }: Props) {
  const uid = useId().replace(/:/g, "");
  const [active, setActive] = useState<NgheSidebarTabId>("nganh");

  const panels: Record<NgheSidebarTabId, TabPanel> = {
    keyword,
    nghe,
    nganh,
  };

  return (
    <div className="nghe-side-tabs">
      <div
        className="nghe-side-tablist"
        role="tablist"
        aria-label="Thông tin liên quan trong sidebar"
      >
        {TAB_META.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`${uid}-tab-${id}`}
            aria-selected={active === id}
            aria-controls={`${uid}-panel-${id}`}
            tabIndex={active === id ? 0 : -1}
            className={`nghe-side-tab${active === id ? " nghe-side-tab--active" : ""}`}
            onClick={() => setActive(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {TAB_META.map(({ id }) => (
        <div
          key={id}
          role="tabpanel"
          id={`${uid}-panel-${id}`}
          aria-labelledby={`${uid}-tab-${id}`}
          className={`side-card nghe-side-tab-panel${active !== id ? " nghe-side-tab-panel--inactive-desktop" : ""}`}
        >
          {panels[id].header}
          {panels[id].body}
        </div>
      ))}
    </div>
  );
}
