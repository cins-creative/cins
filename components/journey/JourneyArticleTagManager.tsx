"use client";

import { Tag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { PostTagFields } from "@/components/tag/PostTagFields";
import type { ArticleTagRef } from "@/lib/editor/article-tag";

type Props = {
  tacPhamId: string;
  initialTags: ReadonlyArray<ArticleTagRef>;
};

export function JourneyArticleTagManager({ tacPhamId, initialTags }: Props) {
  const router = useRouter();
  const headingId = useId();
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<ArticleTagRef[]>(() => [...initialTags]);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setTags([...initialTags]);
      setMessage(null);
    }
  }, [open, initialTags]);

  const close = useCallback(() => {
    setOpen(false);
    setMessage(null);
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

  const persist = (next: ArticleTagRef[]) => {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch(`/api/tac-pham/${tacPhamId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTags([...initialTags]);
        setMessage(
          typeof json.error === "string"
            ? json.error
            : "Không lưu được tag.",
        );
        return;
      }
      setTags(next);
      router.refresh();
    });
  };

  const openModal = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    setOpen(true);
  }, []);

  const modal = open ? (
    <div
      className="j-article-tag-modal-backdrop"
      role="presentation"
      onClick={close}
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
            tags={tags}
            onChange={(next) => {
              setTags(next);
              persist(next);
            }}
            disabled={pending}
          />
        </div>
        {message ? (
          <p className="ed-coauthor-hint ed-coauthor-modal-feedback">{message}</p>
        ) : null}
        <div className="ed-coauthor-modal-actions">
          <span>
            {pending
              ? "Đang lưu…"
              : "Tag giúp bài viết xuất hiện trong gallery của bài được gắn."}
          </span>
          <button
            type="button"
            className="ed-coauthor-save"
            disabled={pending}
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
        {initialTags.length > 0 ? (
          <span className="j-article-tag-count">{initialTags.length}</span>
        ) : null}
      </button>

      {typeof document !== "undefined" && open
        ? createPortal(modal, document.body)
        : null}
    </div>
  );
}
