"use client";

import { Loader2, Pencil, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { ChatThread } from "@/lib/chat/types";

type Props = {
  open: boolean;
  thread: ChatThread | null;
  onClose: () => void;
  onRenamed: (thread: ChatThread) => void;
};

export function ChatRenameGroupModal({
  open,
  thread,
  onClose,
  onRenamed,
}: Props) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isProject = Boolean(thread?.parentRoomId);
  const title = isProject ? "Đổi tên project" : "Đổi tên nhóm";
  const label = isProject ? "Tên project" : "Tên nhóm";
  const placeholder = isProject
    ? "VD: Sprint tháng 7"
    : "Để trống = tên từ thành viên";

  useEffect(() => {
    if (!open || !thread) return;
    setName(thread.name);
    setError(null);
    setSubmitting(false);
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, thread]);

  const dirty = Boolean(thread) && name.trim() !== thread!.name.trim();

  const handleSubmit = useCallback(async () => {
    if (!thread || submitting) return;
    const next = name.trim();
    if (next === thread.name.trim()) {
      onClose();
      return;
    }
    if (next.length > 80) {
      setError("Tên tối đa 80 ký tự.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/rooms/${thread.roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenPhong: next || null }),
      });
      const json = (await res.json().catch(() => null)) as {
        thread?: ChatThread;
        error?: string;
      } | null;
      if (!res.ok || !json?.thread) {
        throw new Error(json?.error ?? "Không lưu được tên.");
      }
      onRenamed(json.thread);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được tên.");
    } finally {
      setSubmitting(false);
    }
  }, [name, onClose, onRenamed, submitting, thread]);

  if (!open || !thread) return null;

  return (
    <div className="cins-chat-group-modal-root" role="presentation">
      <button
        type="button"
        className="cins-chat-group-modal-backdrop"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        className="cins-chat-group-modal is-rename"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="cins-chat-group-modal-head">
          <span className="cins-chat-group-modal-icon" aria-hidden>
            <Pencil size={18} strokeWidth={1.8} />
          </span>
          <div>
            <h3 id={titleId}>{title}</h3>
            <p>Chỉ chủ nhóm hoặc admin mới đổi được tên.</p>
          </div>
          <button
            type="button"
            className="cins-chat-icon-btn"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} strokeWidth={1.8} aria-hidden />
          </button>
        </header>

        <label className="cins-chat-group-name">
          <span>{label}</span>
          <input
            ref={inputRef}
            type="text"
            value={name}
            maxLength={80}
            disabled={submitting}
            placeholder={placeholder}
            aria-label={label}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSubmit();
              }
              if (e.key === "Escape") onClose();
            }}
          />
        </label>

        {error ? (
          <p className="cins-chat-group-rename-error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="cins-chat-group-modal-foot">
          <button
            type="button"
            className="cins-chat-group-cancel"
            disabled={submitting}
            onClick={onClose}
          >
            Huỷ
          </button>
          <button
            type="button"
            className="cins-chat-group-submit"
            disabled={submitting || !dirty}
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <Loader2 size={14} className="cins-chat-spin" aria-hidden />
            ) : null}
            Lưu
          </button>
        </footer>
      </div>
    </div>
  );
}
