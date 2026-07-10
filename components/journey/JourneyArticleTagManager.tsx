"use client";

import { Tag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { PostTagFields } from "@/components/tag/PostTagFields";
import type { ArticleTagRef } from "@/lib/editor/article-tag";

type Props = {
  tacPhamId: string;
  initialTags: ReadonlyArray<ArticleTagRef>;
  /** Cập nhật UI cục bộ sau lưu — tránh `router.refresh()` kẹt modal (feed cộng đồng). */
  onTagsSaved?: (tags: ArticleTagRef[]) => void;
};

export function JourneyArticleTagManager({
  tacPhamId,
  initialTags,
  onTagsSaved,
}: Props) {
  const router = useRouter();
  const headingId = useId();
  const abortRef = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<ArticleTagRef[]>(() => [...initialTags]);
  const tagsRef = useRef(tags);
  tagsRef.current = tags;
  const [savedTags, setSavedTags] = useState<ArticleTagRef[]>(() => [
    ...initialTags,
  ]);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setTags([...initialTags]);
      setSavedTags([...initialTags]);
      setMessage(null);
    }
  }, [open, initialTags]);

  const close = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setOpen(false);
    setMessage(null);
    setSaving(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const persist = useCallback(
    async (next: ArticleTagRef[], previous: ArticleTagRef[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setMessage(null);
      setSaving(true);
      try {
        const res = await fetch(`/api/tac-pham/${tacPhamId}/tags`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags: next }),
          signal: controller.signal,
        });
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        if (abortRef.current !== controller) return;
        if (!res.ok) {
          setTags(previous);
          tagsRef.current = previous;
          setMessage(
            typeof json.error === "string"
              ? json.error
              : "Không lưu được tag.",
          );
          return;
        }
        setTags(next);
        tagsRef.current = next;
        setSavedTags(next);
        onTagsSaved?.(next);
        if (!onTagsSaved) {
          router.refresh();
        }
      } catch (err) {
        if (abortRef.current !== controller) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setTags(previous);
        tagsRef.current = previous;
        setMessage("Lỗi mạng khi lưu tag.");
      } finally {
        if (abortRef.current === controller) {
          setSaving(false);
        }
      }
    },
    [onTagsSaved, router, tacPhamId],
  );

  const openModal = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    setOpen(true);
  }, []);

  const modal = open ? (
    <div
      className="j-article-tag-modal-backdrop"
      role="presentation"
    >
      <div
        className="ed-coauthor-modal j-article-tag-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="ed-coauthor-modal-close"
          aria-label="Đóng"
          onClick={close}
        >
          <X size={16} aria-hidden />
        </button>
        <h2 id={headingId} className="j-article-tag-modal-title">
          Quản lý tag
        </h2>
        <div className="cins-editor-page is-tag-modal">
          <PostTagFields
            variant="modal"
            tags={tags}
            onChange={(next) => {
              const previous = tagsRef.current;
              setTags(next);
              tagsRef.current = next;
              void persist(next, previous);
            }}
          />
        </div>
        {message ? (
          <p className="ed-coauthor-hint ed-coauthor-modal-feedback">{message}</p>
        ) : null}
        <div className="ed-coauthor-modal-actions">
          <span>
            {saving
              ? "Đang lưu…"
              : "Tag giúp bài viết xuất hiện trong gallery của bài được gắn."}
          </span>
          <button
            type="button"
            className="ed-coauthor-save"
            onClick={close}
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div
      className="j-article-tag-manage"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="j-article-tag-trigger"
        onClick={openModal}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Quản lý tag"
        title="Quản lý tag"
      >
        <Tag size={15} strokeWidth={2} aria-hidden />
        {savedTags.length > 0 ? (
          <span className="j-article-tag-count">{savedTags.length}</span>
        ) : null}
      </button>

      {typeof document !== "undefined" && open
        ? createPortal(modal, document.body)
        : null}
    </div>
  );
}
