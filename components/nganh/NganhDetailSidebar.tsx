"use client";

import Link from "next/link";
import { useState } from "react";

import type { ArticleCard } from "@/lib/articles/types";
import { relInitials } from "@/lib/articles/rel-visual";

const AV_CLASSES = ["a", "b", "c", "d", "e"] as const;

type TabKey = "nganh" | "phan_mem" | "nghe";

type Props = {
  nganh: ArticleCard[];
  phanMem: ArticleCard[];
  nghe: ArticleCard[];
  keywords: ArticleCard[];
  nhomSubtitle?: string | null;
};

function articleHref(card: ArticleCard): string {
  if (String(card.loai_bai_viet) === "nganh_dao_tao") {
    return `/nganh-hoc/${card.slug}`;
  }
  if (String(card.loai_bai_viet) === "nghe") {
    return `/huong-nghiep/nghe/${encodeURIComponent(card.slug)}`;
  }
  return `/bai-viet/${card.slug}`;
}

export function NganhDetailSidebar({
  nganh,
  phanMem,
  nghe,
  keywords,
  nhomSubtitle,
}: Props) {
  const [tab, setTab] = useState<TabKey>("nganh");

  const list =
    tab === "nganh" ? nganh : tab === "phan_mem" ? phanMem : nghe;
  const title =
    tab === "nganh"
      ? "Ngành học liên quan"
      : tab === "phan_mem"
        ? "Phần mềm liên quan"
        : "Nghề liên quan";

  return (
    <>
      <div className="nct-side-tabs" role="tablist" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--r-lg, 20px)", padding: 4, gap: 2 }}>
        {(
          [
            ["nganh", "Ngành học", nganh.length],
            ["phan_mem", "Phần mềm", phanMem.length],
            ["nghe", "Nghề liên quan", nghe.length],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`nct-side-tab${tab === key ? " active" : ""}`}
            style={{
              padding: "9px 8px",
              borderRadius: "var(--r-sm, 10px)",
              fontSize: 11.5,
              fontWeight: 700,
              border: "none",
              cursor: count === 0 ? "not-allowed" : "pointer",
              opacity: count === 0 ? 0.45 : 1,
              background: tab === key ? "var(--cins-blue)" : "transparent",
              color: tab === key ? "#fff" : "var(--ink-body)",
            }}
            onClick={() => count > 0 && setTab(key)}
            disabled={count === 0}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length > 0 ? (
        <div className="nct-side-card">
          <div
            className="nct-side-head"
            style={{
              padding: "16px 18px 12px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <h4 style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>{title}</h4>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-muted)",
              }}
            >
              {list.length}
            </span>
          </div>
          {tab === "nganh" && nhomSubtitle ? (
            <p
              style={{
                padding: "0 18px 12px",
                fontSize: 12,
                color: "var(--ink-muted)",
                lineHeight: 1.45,
                margin: 0,
              }}
            >
              {nhomSubtitle}
            </p>
          ) : null}
          <div>
            {list.map((card, i) => (
              <Link
                key={card.id}
                href={articleHref(card)}
                className="nct-related-item"
              >
                <div
                  className={`av ${AV_CLASSES[i % AV_CLASSES.length]}`}
                  style={{
                    background:
                      i % 5 === 0
                        ? "var(--cins-yellow)"
                        : i % 5 === 1
                          ? "var(--cins-violet)"
                          : i % 5 === 2
                            ? "var(--cins-mint)"
                            : i % 5 === 3
                              ? "var(--cins-orange)"
                              : "var(--cins-pink, #ffc2d6)",
                    color: i % 5 === 1 ? "#fff" : "inherit",
                  }}
                >
                  {relInitials(card.tieu_de)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.25 }}>
                    {card.tieu_de}
                  </div>
                  {card.tom_tat ? (
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10.5,
                        color: "var(--ink-muted)",
                        marginTop: 2,
                      }}
                    >
                      {card.tom_tat.slice(0, 56)}
                      {card.tom_tat.length > 56 ? "…" : ""}
                    </div>
                  ) : null}
                </div>
                <span aria-hidden style={{ color: "var(--ink-muted)" }}>
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {keywords.length > 0 ? (
        <div className="nct-side-card">
          <div style={{ padding: "16px 18px 12px", fontWeight: 800, fontSize: 14.5 }}>
            Từ khóa kỹ thuật
          </div>
          <div className="nct-side-tags-wrap">
            {keywords.map((kw) => (
              <Link key={kw.id} href={articleHref(kw)} className="nct-side-tag">
                {kw.tieu_de}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="nct-side-quiz">
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            color: "var(--cins-blue-dark)",
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Quiz · 2 phút
        </p>
        <h4
          style={{
            fontWeight: 800,
            fontSize: 16,
            marginBottom: 6,
            lineHeight: 1.3,
          }}
        >
          Ngành này có hợp với bạn?
        </h4>
        <p style={{ fontSize: 12.5, marginBottom: 14, lineHeight: 1.55 }}>
          Làm bài quiz nhanh để so sánh với các ngành cùng nhóm.
        </p>
        <Link
          href="#"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12.5,
            fontWeight: 700,
            color: "#fff",
            background: "var(--cins-blue)",
            padding: "9px 16px",
            borderRadius: "999px",
          }}
        >
          Làm quiz miễn phí →
        </Link>
      </div>
    </>
  );
}
