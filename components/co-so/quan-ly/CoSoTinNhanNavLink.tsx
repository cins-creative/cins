"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { coSoQuanLyPath } from "@/lib/to-chuc/co-so-routes";
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

type Props = {
  orgId: string;
  orgSlug: string;
  active: boolean;
};

export function CoSoTinNhanNavLink({ orgId, orgSlug, active }: Props) {
  const [threads, setThreads] = useState<OrgInboxThread[]>([]);

  const loadBadge = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        const res = await fetch(`/api/org/${orgId}/inbox/threads`, {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          threads?: OrgInboxThread[];
        };
        if (!res.ok) return;
        setThreads(Array.isArray(json.threads) ? json.threads : []);
      } catch {
        if (!options?.silent) setThreads([]);
      }
    },
    [orgId],
  );

  useEffect(() => {
    void loadBadge({ silent: true });
    const onFocus = () => void loadBadge({ silent: true });
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadBadge({ silent: true });
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const intervalId = window.setInterval(() => void loadBadge({ silent: true }), 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(intervalId);
    };
  }, [loadBadge]);

  const badgeCount = useMemo(
    () =>
      threads.reduce((sum, t) => sum + (t.unread ? t.unreadCount : 0), 0) +
      threads.filter((t) => t.pendingVerification).length +
      threads.filter((t) => t.pendingDonHocPhi).length,
    [threads],
  );

  const href = coSoQuanLyPath(orgSlug, "tin-nhan");

  return (
    <Link
      href={href}
      className={`cso-ql-nav-tool ss-btn-messages${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
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
    </Link>
  );
}
