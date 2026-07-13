"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellPlus, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import { useCinsChat } from "@/components/cins/CinsChatProvider";
import type { ChatOrgKind } from "@/lib/chat/types";

/** Loại org có card hành động đầy đủ (theo dõi + nhắn tin) — như sidebar trang org. */
export type OrgActionKind = "co_so_dao_tao" | "truong" | "studio";

type Props = {
  orgId: string;
  orgKind: OrgActionKind;
  orgName: string;
  avatarUrl: string | null;
  href: string;
  primaryLabel: string;
  onClose?: () => void;
};

const CHAT_ORG_KIND: Record<OrgActionKind, ChatOrgKind> = {
  co_so_dao_tao: "co_so_dao_tao",
  truong: "truong_dai_hoc",
  studio: "studio",
};

const FOLLOW_AUTH_MESSAGE = "Đăng nhập để theo dõi tổ chức này trên CINs.";
const CHAT_AUTH_MESSAGE = "Đăng nhập để nhắn tin cho tổ chức trên CINs.";

/**
 * Hàng hành động cho card org preview (JourneyOrgPopover) — theo dõi + nhắn tin
 * + CTA sang trang org. Tự chứa: follow qua `/api/follow` (loại `org`), nhắn tin
 * qua `openChat({ orgId })`. Không giả định viewer là quản trị org.
 */
export function JourneyOrgPopoverActions({
  orgId,
  orgKind,
  orgName,
  avatarUrl,
  href,
  primaryLabel,
  onClose,
}: Props) {
  const router = useRouter();
  const authGate = useOptionalAuthGate();
  const { openChat } = useCinsChat();
  const [following, setFollowing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const qs = new URLSearchParams({
      id_doi_tuong: orgId,
      loai_doi_tuong: "org",
    });
    void fetch(`/api/follow?${qs.toString()}`, { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { dang_theo_doi?: boolean } | null) => {
        if (json) setFollowing(Boolean(json.dang_theo_doi));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [orgId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requireAuth = useCallback(
    (message: string): boolean => {
      if (authGate?.isAuthenticated) return true;
      if (authGate) authGate.openAuthModal(message);
      else router.push("/login");
      return false;
    },
    [authGate, router],
  );

  const toggleFollow = () => {
    if (!requireAuth(FOLLOW_AUTH_MESSAGE)) return;
    startTransition(async () => {
      const res = await fetch("/api/follow", {
        method: following ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id_doi_tuong: orgId, loai_doi_tuong: "org" }),
      });
      const json = (await res.json().catch(() => null)) as {
        dang_theo_doi?: boolean;
      } | null;
      if (res.ok) setFollowing(Boolean(json?.dang_theo_doi));
    });
  };

  const openMessage = () => {
    if (!requireAuth(CHAT_AUTH_MESSAGE)) return;
    if (messaging) return;
    setError(null);
    setMessaging(true);
    void openChat({
      orgId,
      orgPreview: { name: orgName, avatarUrl, orgKind: CHAT_ORG_KIND[orgKind] },
    })
      .then(() => onClose?.())
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Không mở được hội thoại.",
        );
      })
      .finally(() => setMessaging(false));
  };

  const followLabel = following ? "Đang theo dõi" : "Theo dõi";

  return (
    <div className="j-org-pop-actions j-org-pop-actions--rich">
      <div className="j-org-pop-actions-row">
        <button
          type="button"
          className="j-org-pop-message"
          disabled={messaging}
          onClick={openMessage}
        >
          <MessageSquare size={15} strokeWidth={2} aria-hidden />
          {messaging ? "Đang mở…" : "Nhắn tin"}
        </button>
        <button
          type="button"
          className={`j-org-pop-follow${following ? " is-following" : ""}`}
          aria-pressed={following}
          disabled={!loaded || pending}
          onClick={toggleFollow}
        >
          {following ? (
            <Bell size={15} strokeWidth={2} aria-hidden />
          ) : (
            <BellPlus size={15} strokeWidth={2} aria-hidden />
          )}
          {followLabel}
        </button>
      </div>
      {error ? (
        <p className="j-friend-action-error" role="alert">
          {error}
        </p>
      ) : null}
      <Link href={href} className="j-org-pop-primary" onClick={() => onClose?.()}>
        {primaryLabel}
      </Link>
    </div>
  );
}
