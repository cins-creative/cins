"use client";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { Bookmark, CheckCircle2, Lock, Globe2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BOOKMARK_PRIVATE_NOTE_MAX_LENGTH,
  normalizeBookmarkPrivateNote,
} from "@/lib/journey/bookmark-private-note";

export type BookmarkVisibility = "public" | "private";

export type BookmarkSaveParams = {
  visibility: BookmarkVisibility;
  privateNote: string;
};

export type BookmarkSaveEndpoint = (params: BookmarkSaveParams) => {
  url: string;
  body?: Record<string, unknown>;
};

type Props = {
  milestoneId: string;
  title: string;
  initialSaved?: boolean;
  initialCount?: number;
  showCount?: boolean;
  buttonClassName?: string;
  iconSize?: number;
  iconStrokeWidth?: number;
  saveEndpoint?: BookmarkSaveEndpoint;
  resolveOpenBlock?: () => string | null;
  onRequireAuth?: (action: () => void) => void;
  modalZIndex?: number;
};

export function JourneyBookmarkButton({
  milestoneId,
  title,
  initialSaved = false,
  initialCount = 0,
  showCount = false,
  buttonClassName = "action-btn",
  iconSize = 16,
  iconStrokeWidth = 1.8,
  saveEndpoint,
  resolveOpenBlock,
  onRequireAuth,
  modalZIndex = 1000,
}: Props) {
  const { requireAuth: defaultRequireAuth } = useAuthGate();
  const requireAuth = onRequireAuth ?? defaultRequireAuth;
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<BookmarkVisibility>("public");
  const [privateNote, setPrivateNote] = useState("");
  const [saved, setSaved] = useState(initialSaved);
  const [count, setCount] = useState(initialCount);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveSnapshotRef = useRef({ saved: initialSaved, count: initialCount });

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
    if (!milestoneId) return;
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

  const dispatchSaved = (bookmarked: boolean, bookmarkCount?: number) => {
    if (!milestoneId) return;
    window.dispatchEvent(
      new CustomEvent("cins:social-action", {
        detail: {
          milestoneId,
          bookmarked,
          ...(typeof bookmarkCount === "number" ? { bookmarkCount } : {}),
        },
      }),
    );
  };

  const saveBookmark = async () => {
    if (isSaving) return;
    setError(null);
    setIsSaving(true);
    saveSnapshotRef.current = { saved, count };

    const endpoint = saveEndpoint?.({ visibility, privateNote }) ?? {
      url: "/api/bookmarks",
      body: {
        loai_doi_tuong: "cot_moc",
        id_doi_tuong: milestoneId,
        visibility,
        ghi_chu_rieng: normalizeBookmarkPrivateNote(privateNote),
      },
    };

    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(endpoint.body ?? {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const rollback = saveSnapshotRef.current;
        setSaved(rollback.saved);
        setCount(rollback.count);
        setError(typeof json.error === "string" ? json.error : "Không lưu được.");
        return;
      }
      const optimisticCount = saveSnapshotRef.current.saved
        ? saveSnapshotRef.current.count
        : saveSnapshotRef.current.count + 1;
      const syncedCount = Number(json.count ?? optimisticCount);
      setSaved(true);
      setCount(syncedCount);
      dispatchSaved(true, syncedCount);
      setSuccess(true);
      window.setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 1800);
    } catch {
      const rollback = saveSnapshotRef.current;
      setSaved(rollback.saved);
      setCount(rollback.count);
      setError("Không kết nối được máy chủ. Thử lại sau.");
    } finally {
      setIsSaving(false);
    }
  };

  const openModal = () => {
    const blockMsg = resolveOpenBlock?.() ?? null;
    if (blockMsg) {
      setBlockedMessage(blockMsg);
      setError(null);
      setOpen(true);
      return;
    }
    setBlockedMessage(null);
    setError(null);
    setPrivateNote("");
    setOpen(true);
  };

  const modal = open ? (
    <div
      className="j-bookmark-confirm-backdrop"
      role="presentation"
      style={{ zIndex: modalZIndex }}
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
        ) : blockedMessage ? (
          <>
            <button
              type="button"
              className="j-bookmark-confirm-close"
              aria-label="Đóng"
              onClick={() => setOpen(false)}
            >
              <X size={16} aria-hidden />
            </button>
            <p className="j-bookmark-confirm-error">{blockedMessage}</p>
            <div className="j-bookmark-confirm-actions">
              <button type="button" className="is-primary" onClick={() => setOpen(false)}>
                Đã hiểu
              </button>
            </div>
          </>
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
            <label className="j-bookmark-private-note">
              <span className="j-bookmark-private-note-label">
                Ghi chú riêng
                <small>Tuỳ chọn — chỉ bạn thấy, không đổi bài gốc</small>
              </span>
              <textarea
                value={privateNote}
                onChange={(e) => setPrivateNote(e.target.value)}
                maxLength={BOOKMARK_PRIVATE_NOTE_MAX_LENGTH}
                rows={3}
                placeholder="Vì sao bạn lưu bài này? Ghi chú cho Journey của bạn…"
                disabled={isSaving}
              />
            </label>
            {error ? <p className="j-bookmark-confirm-error">{error}</p> : null}
            <div className="j-bookmark-confirm-actions">
              <button type="button" onClick={() => setOpen(false)}>
                Huỷ
              </button>
              <button
                type="button"
                className="is-primary"
                disabled={isSaving}
                onClick={() => void saveBookmark()}
              >
                {isSaving ? "Đang lưu..." : "Xác nhận lưu"}
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
        className={`${buttonClassName}${saved ? " is-bookmarked" : ""}`}
        aria-label={saved ? "Đã lưu" : "Lưu"}
        aria-pressed={saved}
        onClick={() => requireAuth(openModal)}
      >
        <Bookmark
          size={iconSize}
          strokeWidth={iconStrokeWidth}
          fill={saved ? "currentColor" : "none"}
          aria-hidden
        />
        {showCount && count > 0 ? <span>{count}</span> : null}
      </button>
      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
