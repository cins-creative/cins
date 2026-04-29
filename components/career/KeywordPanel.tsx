"use client";

import Link from "next/link";
import { useState } from "react";

import type { RelatedCareerCard } from "@/lib/career/types";

const TABS = [
  { id: "vi-tri" as const, label: "Vị trí" },
  { id: "phan-mem" as const, label: "Phần mềm" },
  { id: "keyword" as const, label: "Keyword" },
];

type TabId = (typeof TABS)[number]["id"];

type Props = {
  related: RelatedCareerCard[];
};

export function KeywordPanel({ related }: Props) {
  const [tab, setTab] = useState<TabId>("vi-tri");

  return (
    <div className="career-kw-panel career-surface">
      <div className="career-kw-tabs" role="tablist" aria-label="Bảng từ khoá">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`career-kw-tab${tab === t.id ? " is-active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="career-kw-body" role="tabpanel">
        {tab === "vi-tri" && (
          <ul className="career-kw-list">
            {related.length === 0 ? (
              <li className="career-kw-empty">Chưa có vị trí liên quan.</li>
            ) : (
              related.map((r) => (
                <li key={r.id}>
                  <Link href={`/nghe-nghiep/${r.slug}`}>
                    {r.title_eng ?? r.title_vietnam ?? r.slug}
                  </Link>
                </li>
              ))
            )}
          </ul>
        )}
        {tab === "phan-mem" && (
          <p className="career-kw-placeholder cins-body">
            Danh sách phần mềm đang được cập nhật.
          </p>
        )}
        {tab === "keyword" && (
          <p className="career-kw-placeholder cins-body">
            Từ khoá đang được cập nhật.
          </p>
        )}
      </div>
    </div>
  );
}
