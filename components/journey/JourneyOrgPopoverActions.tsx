"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Maximize2, MessageCircle } from "lucide-react";
import { useCallback, useState } from "react";

import { useOptionalAuthGate } from "@/components/auth/AuthGateProvider";
import { OrgFollowButton } from "@/components/cins/home-adaptive/OrgFollowButton";
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

const CHAT_AUTH_MESSAGE = "Đăng nhập để nhắn tin cho tổ chức trên CINs.";

/**
 * Hàng icon CTA org preview — đồng bộ JourneyUserPopoverActions
 * (Nhắn tin · Theo dõi · Xem trang).
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
  const [messaging, setMessaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requireAuth = useCallback(
    (message: string): boolean => {
      if (authGate?.isAuthenticated) return true;
      if (authGate) authGate.openAuthModal(message);
      else router.push("/login");
      return false;
    },
    [authGate, router],
  );

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

  return (
    <div className="j-friend-actions">
      <div className="j-friend-actions-row j-friend-actions-row--icons">
        <button
          type="button"
          className="j-friend-message is-icon"
          disabled={messaging}
          title="Nhắn tin"
          aria-label="Nhắn tin"
          onClick={openMessage}
        >
          <MessageCircle size={17} strokeWidth={2} aria-hidden />
        </button>
        <div className="j-friend-card-follow">
          <OrgFollowButton orgId={orgId} compact />
        </div>
        <Link
          href={href}
          className="j-friend-link is-icon"
          title={primaryLabel}
          aria-label={primaryLabel}
          onClick={() => onClose?.()}
        >
          <Maximize2 size={17} strokeWidth={2} aria-hidden />
        </Link>
      </div>
      {error ? (
        <p className="j-friend-action-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
