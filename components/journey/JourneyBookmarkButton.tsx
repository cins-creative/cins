"use client";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { Bookmark, CheckCircle2, Lock, Globe2, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";

type BookmarkVisibility = "public" | "private";

type Props = {
  milestoneId: string;
  title: string;
  initialSaved?: boolean;
  initialCount?: number;
  showCount?: boolean;
};

export function JourneyBookmarkButton({
  milestoneId,
  title,
  initialSaved = false,
  initialCount = 0,
  showCount = false,
}: Props) {
  const { requireAuth } = useAuthGate();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState<BookmarkVisibility>("public");
  const [saved, setSaved] = useState(initialSaved);
  const [count, setCount] = useState(initialCount);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setSaved(initialSaved);
      setCount(initialCount);
    });
  }, [initialSaved, initialCount]);

  useEffect(() => {
    const onSocial = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          milestoneId: string;
          bookmarked?: boolean;
          bookmarkCount?: number;
        }>
      ).detail;
      if (detail.milestoneId !== milestoneId) return;
      if (typeof detail.bookmarked === "boolean") setSaved(detail.bookmarked);
      if (typeof detail.bookmarkCount === "number") setCount(detail.bookmarkCount);
    };
    window.addEventListener("cins:social-action", onSocial);
    return () => window.removeEventListener("cins:social-action", onSocial);
  }, [milestoneId]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const saveBookmark = () => {
    setError(null);
    setSaved(true);
    const optimisticCount = saved ? count : count + 1;
    setCount(optimisticCount);
    window.dispatchEvent(
      new CustomEvent("cins:social-action", {
        detail: {
          milestoneId,
          bookmarked: true,
          bookmarkCount: optimisticCount,
        },
      }),
    );
    startTransition(async () => {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loai_doi_tuong: "cot_moc",
          id_doi_tuong: milestoneId,
          visibility,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaved(false);
        setCount(count);
        setError(typeof json.error === "string" ? json.error : "Không lưu được.");
        return;
      }
      const syncedCount = Number(json.count ?? optimisticCount);
      setSaved(true);
      setCount(syncedCount);
      window.dispatchEvent(
        new CustomEvent("cins:social-action", {
          detail: { milestoneId, bookmarked: true, bookmarkCount: syncedCount },
        }),
      );
      setSuccess(true);
      window.setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 1800);
    });
  };

  const modal = open ? (
    <div
      className="j-bookmark-confirm-backdrop"
      role="presentation"
      onClick={() => setOpen(false)}
    >
      <div
        className="j-bookmark-confirm"
        role="dialog"
        aria-modal="true"
        aria-label="Xác nhận lưu bài"
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          <div className="j-bookmark-success">
            <span className="j-bookmark-confirm-icon is-success" aria-hidden>
              <CheckCircle2 size={20} strokeWidth={1.9} />
            </span>
            <h2>Đã lưu thành công</h2>
            <p>Bạn có thể kiểm tra bài này trên Journey của mình.</p>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="j-bookmark-confirm-close"
              aria-label="Đóng"
              onClick={() => setOpen(false)}
            >
              <X size={16} aria-hidden />
            </button>
            <span className="j-bookmark-confirm-icon" aria-hidden>
              <Bookmark size={18} strokeWidth={1.8} />
            </span>
            <h2>Lưu bài này?</h2>
            <p>
              Chọn cách bài <strong>{title}</strong> sẽ hiển thị khi bạn lưu về
              Journey của mình.
            </p>
            <div className="j-bookmark-visibility" role="radiogroup">
              <button
                type="button"
                className={visibility === "public" ? "is-active" : ""}
                onClick={() => setVisibility("public")}
                aria-pressed={visibility === "public"}
              >
                <Globe2 size={15} aria-hidden />
                <span>
                  <strong>Công khai</strong>
                  <small>Hiện trên Journey của tôi</small>
                </span>
              </button>
              <button
                type="button"
                className={visibility === "private" ? "is-active" : ""}
                onClick={() => setVisibility("private")}
                aria-pressed={visibility === "private"}
              >
                <Lock size={15} aria-hidden />
                <span>
                  <strong>Chỉ mình tôi</strong>
                  <small>Lưu riêng, không hiện công khai</small>
                </span>
              </button>
            </div>
            {error ? <p className="j-bookmark-confirm-error">{error}</p> : null}
            <div className="j-bookmark-confirm-actions">
              <button type="button" onClick={() => setOpen(false)}>
                Huỷ
              </button>
              <button type="button" className="is-primary" disabled={pending} onClick={saveBookmark}>
                {pending ? "Đang lưu..." : "Xác nhận lưu"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        className={`action-btn${saved ? " is-bookmarked" : ""}`}
        aria-label={saved ? "Đã lưu" : "Lưu"}
        aria-pressed={saved}
        onClick={() =>
          requireAuth(() => setOpen(true))
        }
      >
        <Bookmark size={16} strokeWidth={1.8} fill={saved ? "currentColor" : "none"} aria-hidden />
        {showCount && count > 0 ? <span>{count}</span> : null}
      </button>
      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
