"use client";

import { useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";

function MessageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/** Nút nhắn tin cho khách — gửi câu hỏi tới trường (mock). */
export function TruongUserChatLauncher() {
  const ctx = useTruongInlineEdit();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  if (!ctx) return null;
  if (ctx.canEdit && ctx.isEditing) return null;

  function send() {
    if (!ctx) return;
    if (!body.trim()) return;
    ctx.showToast("Đã gửi tin nhắn tới trường (mock). Trường sẽ phản hồi qua Journey.");
    setSubject("");
    setBody("");
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="ss-btn primary ss-btn-user-chat"
        onClick={() => setOpen(true)}
        aria-label="Nhắn tin"
        title="Nhắn tin"
      >
        <MessageIcon />
        <span className="ss-btn-user-chat-label">Nhắn tin</span>
      </button>

      <TruongInlineModal
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="tdh-user-chat-title"
      >
        <h3 id="tdh-user-chat-title" className="tdh-inline-modal-title">
          Nhắn tin tới {ctx.school.ten}
        </h3>
        <p className="tdh-user-chat-lead">
          Gửi câu hỏi tuyển sinh hoặc về ngành học. Trường phản hồi qua tài khoản CINs
          của bạn. (Mock)
        </p>
        <label className="tdh-user-chat-field">
          <span className="tdh-user-chat-label">Chủ đề</span>
          <input
            type="text"
            className="tdh-user-chat-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ví dụ: Hỏi khối thi ngành Đồ họa"
          />
        </label>
        <label className="tdh-user-chat-field">
          <span className="tdh-user-chat-label">Nội dung</span>
          <textarea
            className="tdh-user-chat-textarea"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Viết câu hỏi của bạn…"
          />
        </label>
        <div className="tdh-inline-modal-actions">
          <button
            type="button"
            className="tdh-inline-btn ghost"
            onClick={() => setOpen(false)}
          >
            Hủy
          </button>
          <button
            type="button"
            className="tdh-inline-btn primary"
            disabled={!body.trim()}
            onClick={send}
          >
            Gửi
          </button>
        </div>
      </TruongInlineModal>
    </>
  );
}
