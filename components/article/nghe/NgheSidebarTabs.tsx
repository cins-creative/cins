"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";

export type NgheSidebarTabId = "keyword" | "nghe" | "nganh";

type TabPanel = {
  header: ReactNode;
  body: ReactNode;
};

export type NgheSidebarTabConfig = {
  id: string;
  label: string;
  header: ReactNode;
  body: ReactNode;
};

type LegacyProps = {
  keyword: TabPanel;
  nghe: TabPanel;
  nganh: TabPanel;
  tabs?: never;
  defaultTabId?: never;
};

type DynamicProps = {
  tabs: NgheSidebarTabConfig[];
  defaultTabId?: string;
  keyword?: never;
  nghe?: never;
  nganh?: never;
};

type Props = LegacyProps | DynamicProps;

const LEGACY_TAB_META: { id: NgheSidebarTabId; label: string }[] = [
  { id: "nganh", label: "Ngành học" },
  { id: "keyword", label: "Kỹ thuật" },
  { id: "nghe", label: "Nghề liên quan" },
];

function legacyToTabs(props: LegacyProps): NgheSidebarTabConfig[] {
  return LEGACY_TAB_META.map(({ id, label }) => ({
    id,
    label,
    header: props[id].header,
    body: props[id].body,
  }));
}

export function NgheSidebarTabs(props: Props) {
  const tabs = "tabs" in props && props.tabs ? props.tabs : legacyToTabs(props);
  const defaultTabId =
    "defaultTabId" in props && props.defaultTabId
      ? props.defaultTabId
      : ("nganh" as const);

  const uid = useId().replace(/:/g, "");
  const initial =
    tabs.some((t) => t.id === defaultTabId) ? defaultTabId : (tabs[0]?.id ?? "");
  const [active, setActive] = useState(initial);

  if (tabs.length === 0) return null;

  if (tabs.length === 1) {
    const only = tabs[0]!;
    return (
      <div className="nghe-side-tabs nghe-side-tabs--single">
        <div className="side-card nghe-side-tab-panel">
          {only.header}
          {only.body}
        </div>
      </div>
    );
  }

  return (
    <div className="nghe-side-tabs">
      <div
        className="nghe-side-tablist"
        role="tablist"
        aria-label="Thông tin liên quan trong sidebar"
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
            className={`nghe-side-tab${active === id ? " nghe-side-tab--active" : ""}`}
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
          className={`side-card nghe-side-tab-panel${
            active !== id ? " nghe-side-tab-panel--inactive-desktop" : ""
          }`}
        >
          {header}
          {body}
        </div>
      ))}
    </div>
  );
}
