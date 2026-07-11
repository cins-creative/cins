"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type TocItem = {
  id: string;
  label: string;
  index: string;
};

type TocGroup = {
  id: string;
  title: string;
  items: TocItem[];
};

const ARTICLE_SELECTOR =
  ".nghe-lead-panel h2, .entity-lead-panel h2, .nghe-lead-panel .arc-h2, .entity-lead-panel .arc-h2";
const RELATED_SELECTOR =
  ".ent-section-title, .ent-reading-body .section-h, #nghe-sec-community";

/** Hero `#entity-sec-intro` / `#nghe-sec-intro` không vào TOC — textContent cả header. */
const TOC_SKIP_IDS = new Set(["entity-sec-intro", "nghe-sec-intro"]);

function slugBase(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function readHeadingLabel(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".num, em").forEach((node) => node.remove());
  return (
    clone.textContent
      ?.replace(/\s+/g, " ")
      .replace(/^\d+\s*/, "")
      .trim() || "Mục"
  );
}

function ensureId(
  el: HTMLElement,
  label: string,
  seen: Set<string>,
): string {
  if (el.id && !seen.has(el.id)) {
    seen.add(el.id);
    return el.id;
  }

  const base = slugBase(label) || "muc";
  let id = el.id || `nghe-sec-${base}`;
  let n = 2;
  while (seen.has(id) || document.getElementById(id)) {
    id = `nghe-sec-${base}-${n}`;
    n += 1;
  }
  el.id = id;
  seen.add(id);
  return id;
}

function collectGroup(
  root: HTMLElement,
  selector: string,
  seen: Set<string>,
): TocItem[] {
  const items: TocItem[] = [];

  for (const el of root.querySelectorAll<HTMLElement>(selector)) {
    if (TOC_SKIP_IDS.has(el.id)) continue;

    const label = readHeadingLabel(el);
    if (!label) continue;

    const id = ensureId(el, label, seen);
    if (TOC_SKIP_IDS.has(id)) continue;

    items.push({ id, label, index: "" });
  }

  return items.map((item, i) => ({
    ...item,
    index: String(i + 1).padStart(2, "0"),
  }));
}

function buildGroups(root: HTMLElement): TocGroup[] {
  const seen = new Set<string>();

  const articleItems = collectGroup(root, ARTICLE_SELECTOR, seen);
  const relatedItems = collectGroup(root, RELATED_SELECTOR, seen);

  const groups: TocGroup[] = [];
  if (articleItems.length > 0) {
    groups.push({ id: "article", title: "Trong bài", items: articleItems });
  }
  if (relatedItems.length > 0) {
    groups.push({ id: "related", title: "Liên quan", items: relatedItems });
  }
  return groups;
}

function totalItems(groups: TocGroup[]): number {
  return groups.reduce((sum, g) => sum + g.items.length, 0);
}

export function NgheArticleToc() {
  const [groups, setGroups] = useState<TocGroup[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const flatItems = useMemo(
    () => groups.flatMap((group) => group.items),
    [groups],
  );

  useEffect(() => {
    const root =
      document.querySelector<HTMLElement>(".ent-shell") ??
      document.querySelector<HTMLElement>(".nghe-article-body");
    if (!root) return;

    const refresh = () => setGroups(buildGroups(root));

    refresh();
    const timer = window.setTimeout(refresh, 400);

    const observer = new MutationObserver(() => refresh());
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (flatItems.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target;
        if (top?.id) setActiveId(top.id);
      },
      {
        root: null,
        rootMargin: "-18% 0px -58% 0px",
        threshold: [0, 0.12, 0.35, 1],
      },
    );

    for (const item of flatItems) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [flatItems]);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = 76;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
    setActiveId(id);
  }, []);

  if (totalItems(groups) < 2) return null;

  return (
    <nav className="nghe-article-toc" aria-label="Mục lục bài viết">
      <div className="nghe-article-toc-card">
        <div className="nghe-article-toc-head">
          <span className="nghe-article-toc-kicker">Mục lục</span>
          <span className="nghe-article-toc-count">{flatItems.length}</span>
        </div>

        {groups.map((group) => (
          <div key={group.id} className="nghe-article-toc-group">
            <p className="nghe-article-toc-group-title">{group.title}</p>
            <ol className="nghe-article-toc-list">
              {group.items.map((item) => {
                const isActive = activeId === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={
                        "nghe-article-toc-link" +
                        (isActive ? " is-active" : "")
                      }
                      aria-current={isActive ? "true" : undefined}
                      onClick={() => scrollTo(item.id)}
                    >
                      <span className="nghe-article-toc-index">{item.index}</span>
                      <span className="nghe-article-toc-label">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </nav>
  );
}
