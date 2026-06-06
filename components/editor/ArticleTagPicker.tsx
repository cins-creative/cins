"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  articleTagLabel,
  articleTagLoaiClass,
  type ArticleTagRef,
} from "@/lib/editor/article-tag";
import {
  loadAllArticlesForTagPicker,
  searchArticlesForTag,
} from "@/lib/editor/search-articles-action";

const loaiLabel = articleTagLabel;
const loaiClass = articleTagLoaiClass;

function normalizeVi(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

const TAG_CACHE_KEY = "cins:tagpicker:all:v1";
const TAG_CACHE_TTL_MS = 10 * 60 * 1000;
const TAG_PAGE_SIZE = 50;

type TagCacheEntry = { ts: number; rows: ArticleTagRef[] };

function readTagCache(): TagCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(TAG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TagCacheEntry;
    if (
      !parsed ||
      typeof parsed.ts !== "number" ||
      !Array.isArray(parsed.rows)
    ) {
      return null;
    }
    if (Date.now() - parsed.ts > TAG_CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeTagCache(rows: ArticleTagRef[]) {
  if (typeof window === "undefined") return;
  try {
    const entry: TagCacheEntry = { ts: Date.now(), rows };
    window.sessionStorage.setItem(TAG_CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* sessionStorage quota / disabled */
  }
}

type IndexedTag = ArticleTagRef & { _n: string };

function indexAll(rows: ReadonlyArray<ArticleTagRef>): IndexedTag[] {
  return rows.map((r) => ({ ...r, _n: normalizeVi(r.tieu_de) }));
}

export function ArticleTagPicker({
  tags,
  onAdd,
  onRemove,
  extraAction,
  layout = "inline",
  initialPickerOpen = false,
}: {
  tags: ArticleTagRef[];
  onAdd: (t: ArticleTagRef) => void;
  onRemove: (id: string) => void;
  extraAction?: ReactNode;
  /** `modal` — picker neo tĩnh trong dialog Journey, không đóng khi click ngoài. */
  layout?: "inline" | "modal";
  initialPickerOpen?: boolean;
}) {
  const isModal = layout === "modal";
  const [open, setOpen] = useState(isModal || initialPickerOpen);
  const [query, setQuery] = useState("");
  const [allIndexed, setAllIndexed] = useState<IndexedTag[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(TAG_PAGE_SIZE);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    if (allIndexed) return;

    let cancelled = false;
    const cached = readTagCache();
    if (cached) {
      queueMicrotask(() => {
        if (!cancelled) setAllIndexed(indexAll(cached.rows));
      });
    } else {
      queueMicrotask(() => {
        if (!cancelled) setLoading(true);
      });
    }

    (async () => {
      try {
        const data = await loadAllArticlesForTagPicker();
        if (cancelled) return;
        if (data.length > 0) {
          writeTagCache(data);
          setAllIndexed(indexAll(data));
        } else if (!cached) {
          const fb = await searchArticlesForTag("");
          if (!cancelled) setAllIndexed(indexAll(fb));
        }
      } catch {
        if (!cancelled && !cached) {
          const fb = await searchArticlesForTag("").catch(
            () => [] as ArticleTagRef[],
          );
          if (!cancelled) setAllIndexed(indexAll(fb));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, allIndexed]);

  useEffect(() => {
    if (!open || isModal) return;
    function onDoc(ev: globalThis.MouseEvent) {
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(ev.target as Node)) return;
      setOpen(false);
    }
    function onKey(ev: globalThis.KeyboardEvent) {
      if (ev.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, isModal]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    queueMicrotask(() => setVisibleCount(TAG_PAGE_SIZE));
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [query]);

  const selectedIds = useMemo(() => new Set(tags.map((t) => t.id)), [tags]);

  const filtered = useMemo<IndexedTag[]>(() => {
    if (!allIndexed) return [];
    const q = normalizeVi(query.trim());
    if (!q) return allIndexed;
    return allIndexed.filter((t) => t._n.includes(q));
  }, [allIndexed, query]);

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );
  const hasMore = visible.length < filtered.length;

  const onListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!hasMore) return;
      const t = e.currentTarget;
      if (t.scrollHeight - (t.scrollTop + t.clientHeight) < 80) {
        setVisibleCount((c) => c + TAG_PAGE_SIZE);
      }
    },
    [hasMore],
  );

  return (
    <div
      className={`meta-chips${isModal ? " is-modal-layout" : ""}`}
      ref={wrapRef}
    >
      {tags.map((t) => {
        const cls = loaiClass(t.loai_bai_viet);
        return (
          <span key={t.id} className={`meta-chip meta-chip-tag ${cls}`}>
            <span className="meta-chip-loai" aria-hidden>
              {loaiLabel(t.loai_bai_viet)}
            </span>
            <span className="meta-chip-name">{t.tieu_de}</span>
            <button
              type="button"
              className="meta-chip-x"
              aria-label={`Bỏ tag ${t.tieu_de}`}
              onClick={() => onRemove(t.id)}
            >
              ×
            </button>
          </span>
        );
      })}

      {!isModal ? (
        <button
          type="button"
          className={`meta-chip add${open ? " open" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          + Thêm tag
        </button>
      ) : null}
      {extraAction}

      {open ? (
        <div className="tag-picker" role="dialog" aria-label="Chọn bài viết để tag">
          <div className="tag-picker-head">
            <input
              ref={inputRef}
              type="text"
              className="tag-picker-input"
              placeholder="Tìm bài viết theo tên…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {allIndexed ? (
              <div className="tag-picker-count">
                {filtered.length} bài
                {filtered.length !== allIndexed.length
                  ? ` / ${allIndexed.length}`
                  : ""}
              </div>
            ) : null}
          </div>
          <div
            className="tag-picker-list"
            role="listbox"
            ref={listRef}
            onScroll={onListScroll}
          >
            {loading && !allIndexed ? (
              <div className="tag-picker-empty">Đang tải danh sách…</div>
            ) : filtered.length === 0 ? (
              <div className="tag-picker-empty">
                {query.trim()
                  ? "Không có bài viết khớp."
                  : "Chưa có bài viết nào."}
              </div>
            ) : (
              <>
                {visible.map((r) => {
                  const picked = selectedIds.has(r.id);
                  const cls = loaiClass(r.loai_bai_viet);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={`tag-picker-item${picked ? " picked" : ""}`}
                      role="option"
                      aria-selected={picked}
                      disabled={picked}
                      onClick={() => {
                        onAdd(r);
                        setQuery("");
                      }}
                    >
                      <span className={`tag-picker-loai ${cls}`}>
                        {loaiLabel(r.loai_bai_viet)}
                      </span>
                      <span className="tag-picker-name">{r.tieu_de}</span>
                      {picked ? (
                        <span className="tag-picker-check" aria-hidden>
                          ✓
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {hasMore ? (
                  <div className="tag-picker-more" aria-hidden>
                    Cuộn để xem thêm…
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
