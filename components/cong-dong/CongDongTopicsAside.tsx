"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import { CongDongCategoryRowLink } from "@/components/cong-dong/CongDongCategoryRowLink";
import { CongDongLinhVucRowLink } from "@/components/cong-dong/CongDongLinhVucRowLink";
import type { CongDongCategory, CongDongLinhVuc } from "@/lib/cong-dong/types";

type Props = {
  linhVucs: CongDongLinhVuc[];
  categories: CongDongCategory[];
};

/**
 * Aside cộng đồng — gom Lĩnh vực + Ngành liên quan thành 1 khối,
 * mặc định thu gọn để sidebar gọn hơn.
 */
export function CongDongTopicsAside({ linhVucs, categories }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const hasLinhVuc = linhVucs.length > 0;
  const hasCategories = categories.length > 0;
  if (!hasLinhVuc && !hasCategories) return null;

  const summaryParts: string[] = [];
  if (hasLinhVuc) summaryParts.push(`${linhVucs.length} lĩnh vực`);
  if (hasCategories) summaryParts.push(`${categories.length} ngành`);

  return (
    <section
      className={`cd-v4-categories-block cd-v4-topics-aside${open ? " is-open" : ""}`}
      aria-label="Lĩnh vực và ngành liên quan"
    >
      <div className="cd-v4-divider cd-v4-divider--tight" />
      <button
        type="button"
        className="cd-v4-topics-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="cd-v4-topics-toggle-copy">
          <span className="cd-v4-topics-toggle-title">Lĩnh vực & ngành</span>
          {!open ? (
            <span className="cd-v4-topics-toggle-meta">
              {summaryParts.join(" · ")}
            </span>
          ) : null}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2.2}
          className="cd-v4-topics-toggle-chev"
          aria-hidden
        />
      </button>

      {open ? (
        <div id={panelId} className="cd-v4-topics-panel">
          {hasLinhVuc ? (
            <div className="cd-v4-topics-group">
              <h3 className="cd-v4-topics-group-title">Lĩnh vực</h3>
              <ul className="cd-v4-categories">
                {linhVucs.map((item) => (
                  <li key={item.id}>
                    <CongDongLinhVucRowLink item={item} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {hasCategories ? (
            <div className="cd-v4-topics-group">
              <h3 className="cd-v4-topics-group-title">Ngành liên quan</h3>
              <ul className="cd-v4-categories">
                {categories.map((item) => (
                  <li key={item.id}>
                    <CongDongCategoryRowLink item={item} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
