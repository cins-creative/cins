"use client";

import { useCallback, useEffect, useState } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import { OrgInboxPanel } from "@/components/truong/OrgInboxPanel";
import type { OrgInboxThread } from "@/lib/chat/org-inbox-types";

function ChatIcon() {
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

function badgeFromThreads(threads: OrgInboxThread[]): number {
  return (
    threads.reduce((sum, t) => sum + (t.unread ? t.unreadCount : 0), 0) +
    threads.filter((t) => t.pendingVerification).length +
    threads.filter((t) => t.pendingDonHocPhi).length
  );
}

type TruongMessageInboxProps = {
  /** Override org — dùng khi ngoài TruongInlineEdit. */
  orgId?: string;
  /** `nav` legacy — quan-ly dùng route `/tin-nhan`; giữ cho tương thích. */
  variant?: "sidebar" | "nav";
  /** Hiện luôn khi có orgId (không cần đang editing trang public). */
  alwaysAvailable?: boolean;
};

/** Modal inbox cho sidebar trường / studio. Quan-ly CSĐT dùng tab `/tin-nhan`. */
export function TruongMessageInbox({
  orgId: orgIdProp,
  variant = "sidebar",
  alwaysAvailable = false,
}: TruongMessageInboxProps = {}) {
  const ctx = useTruongInlineEdit();
  const orgId = orgIdProp ?? ctx?.orgId ?? null;
  const canUse = alwaysAvailable
    ? Boolean(orgId)
    : Boolean(ctx?.canEdit && ctx.isEditing && orgId);

  const toast = useCallback(
    (message: string) => {
      ctx?.showToast?.(message);
    },
    [ctx],
  );

  const [open, setOpen] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);

  const refreshBadge = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/org/${orgId}/inbox/threads`, {
        cache: "no-store",
      });
      const json = (await res.json()) as { threads?: OrgInboxThread[] };
      if (!res.ok) return;
      setBadgeCount(badgeFromThreads(json.threads ?? []));
    } catch {
      /* ignore */
    }
  }, [orgId]);

  useEffect(() => {
    if (!canUse || !orgId) return;
    void refreshBadge();
    const onFocus = () => void refreshBadge();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => void refreshBadge(), 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [canUse, orgId, refreshBadge]);

  if (!canUse || !orgId) return null;

  return (
    <>
      <button
        type="button"
        className={
          variant === "nav"
            ? "cso-ql-nav-tool ss-btn-messages"
            : "ss-btn ghost ss-btn-messages"
        }
        onClick={() => setOpen(true)}
        aria-label={
          badgeCount > 0
            ? `Tin nhắn — ${badgeCount} cần xử lý`
            : "Tin nhắn"
        }
      >
        <ChatIcon />
        <span className="ss-btn-messages-label">Tin nhắn</span>
        {badgeCount > 0 ? (
          <span className="ss-btn-messages-badge" aria-hidden>
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        ) : null}
      </button>

      <TruongInlineModal
        open={open}
        onClose={() => {
          setOpen(false);
          void refreshBadge();
        }}
        className="tdh-inline-modal--wide tdh-message-inbox-modal"
        labelledBy="tdh-message-inbox-title"
        showClose={false}
      >
        <div className="tdh-message-inbox-hdr">
          <div>
            <h3 id="tdh-message-inbox-title" className="tdh-inline-modal-title">
              Tin nhắn tuyển sinh
            </h3>
          </div>
          <button
            type="button"
            className="tdh-inline-btn ghost"
            onClick={() => {
              setOpen(false);
              void refreshBadge();
            }}
          >
            Đóng
          </button>
        </div>

        {open ? (
          <OrgInboxPanel
            orgId={orgId}
            onToast={toast}
            onThreadsChange={(threads) => setBadgeCount(badgeFromThreads(threads))}
          />
        ) : null}
      </TruongInlineModal>
    </>
  );
}
