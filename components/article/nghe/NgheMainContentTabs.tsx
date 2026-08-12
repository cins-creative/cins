"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";

type TabId = "content" | "contribution" | "discussion";

function resolveDefaultTab(
  defaultTab: TabId | undefined,
  showContentTab: boolean,
  hasContribution: boolean,
): TabId {
  const preferred =
    defaultTab ?? (showContentTab ? "content" : "discussion");
  if (preferred === "content" && !showContentTab) return "discussion";
  if (preferred === "contribution" && !hasContribution) {
    return showContentTab ? "content" : "discussion";
  }
  return preferred;
}

type Props = {
  content: ReactNode;
  discussion: ReactNode;
  contribution?: ReactNode;
  contentLabel?: string;
  contributionLabel?: string;
  discussionLabel?: string;
  /** Tab Nội dung chưa có bài chính — ẩn tab, mặc định mở Thảo luận. */
  canonicalEmpty?: boolean;
  /** Tab mở mặc định khi không có `?tab=` (mặc định: Nội dung nếu có tab Nội dung). */
  defaultTab?: TabId;
  /** Nhãn loại entity — vd. «Khái niệm», «Nghề» (giữ prop cho caller cũ). */
  entityKindLabel?: string;
  isLoggedIn?: boolean;
  loginNext?: string;
};

/** Tab entity: Nội dung · Đóng góp (tuỳ chọn) · Thảo luận. */
export function NgheMainContentTabs({
  content,
  discussion,
  contribution,
  contentLabel = "Nội dung",
  contributionLabel = "Đóng góp",
  discussionLabel = "Thảo luận",
  canonicalEmpty = false,
  defaultTab,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const hasContribution = contribution != null;
  const showContentTab = !canonicalEmpty;

  const tabs = useMemo(() => {
    const next: Array<{ id: TabId; label: string; panel: ReactNode }> = [];
    if (showContentTab) {
      next.push({ id: "content", label: contentLabel, panel: content });
    }
    if (hasContribution) {
      next.push({
        id: "contribution",
        label: contributionLabel,
        panel: contribution,
      });
    }
    next.push({ id: "discussion", label: discussionLabel, panel: discussion });
    return next;
  }, [
    showContentTab,
    content,
    contentLabel,
    hasContribution,
    contribution,
    contributionLabel,
    discussion,
    discussionLabel,
  ]);

  const [active, setActive] = useState<TabId>(() =>
    resolveDefaultTab(defaultTab, showContentTab, hasContribution),
  );

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "contribution" && hasContribution) {
      setActive("contribution");
      return;
    }
    if (tab === "discussion") {
      setActive("discussion");
      return;
    }
    if (tab === "content" && showContentTab) {
      setActive("content");
    }
  }, [hasContribution, showContentTab]);

  const activeTab =
    tabs.find((tab) => tab.id === active)?.id ??
    tabs.find((tab) => tab.id === "discussion")?.id ??
    tabs[0]?.id ??
    "discussion";

  return (
    <div className="ent-tabs">
      <div className="ent-tablist" role="tablist" aria-label="Nội dung bài viết">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${uid}-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`${uid}-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`ent-tab${activeTab === tab.id ? " ent-tab--active" : ""}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${uid}-panel-${tab.id}`}
          aria-labelledby={`${uid}-tab-${tab.id}`}
          className="ent-panel"
          hidden={activeTab !== tab.id}
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
