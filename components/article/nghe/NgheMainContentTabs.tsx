"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";

type TabId = "content" | "discussion";

type Props = {
  content: ReactNode;
  discussion: ReactNode;
  contentLabel?: string;
  discussionLabel?: string;
};

/** Hai tab chính: nội dung bài & thảo luận/tác phẩm cộng đồng. */
export function NgheMainContentTabs({
  content,
  discussion,
  contentLabel = "Nội dung",
  discussionLabel = "Thảo luận",
}: Props) {
  const uid = useId().replace(/:/g, "");
  const [active, setActive] = useState<TabId>("content");

  return (
    <div className="ent-tabs">
      <div className="ent-tablist" role="tablist" aria-label="Nội dung bài viết">
        <button
          type="button"
          role="tab"
          id={`${uid}-tab-content`}
          aria-selected={active === "content"}
          aria-controls={`${uid}-panel-content`}
          tabIndex={active === "content" ? 0 : -1}
          className={`ent-tab${active === "content" ? " ent-tab--active" : ""}`}
          onClick={() => setActive("content")}
        >
          {contentLabel}
        </button>
        <button
          type="button"
          role="tab"
          id={`${uid}-tab-discussion`}
          aria-selected={active === "discussion"}
          aria-controls={`${uid}-panel-discussion`}
          tabIndex={active === "discussion" ? 0 : -1}
          className={`ent-tab${
            active === "discussion" ? " ent-tab--active" : ""
          }`}
          onClick={() => setActive("discussion")}
        >
          {discussionLabel}
        </button>
      </div>

      <div
        role="tabpanel"
        id={`${uid}-panel-content`}
        aria-labelledby={`${uid}-tab-content`}
        className="ent-panel"
        hidden={active !== "content"}
      >
        {content}
      </div>
      <div
        role="tabpanel"
        id={`${uid}-panel-discussion`}
        aria-labelledby={`${uid}-tab-discussion`}
        className="ent-panel"
        hidden={active !== "discussion"}
      >
        {discussion}
      </div>
    </div>
  );
}
