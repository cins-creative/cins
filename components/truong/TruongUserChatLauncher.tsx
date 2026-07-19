"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { useCinsChatContext } from "@/components/cins/CinsChatProvider";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import type { ChatOrgKind } from "@/lib/chat/types";
import type { TruongListItem } from "@/lib/truong/types";

const AUTH_MESSAGE_CHAT = "Đăng nhập để nhắn tin cho tổ chức trên CINs.";

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

function mapSchoolOrgKind(
  school: Pick<TruongListItem, "org_loai">,
  pathname: string,
): ChatOrgKind | undefined {
  if (school.org_loai === "co_so_dao_tao") return "co_so_dao_tao";
  if (school.org_loai === "truong_dai_hoc") return "truong_dai_hoc";
  if (pathname.startsWith("/studio/")) return "studio";
  return "truong_dai_hoc";
}

type Props = {
  /** Chỉ icon — hàng CTA đồng bộ JourneyUserPopoverActions. */
  iconOnly?: boolean;
};

/** Nút nhắn tin cho khách — mở CinsChatOverlay với org (cần đăng nhập), không kèm card ngữ cảnh. */
export function TruongUserChatLauncher({ iconOnly = false }: Props) {
  const ctx = useTruongInlineEdit();
  const pathname = usePathname() ?? "";
  const { isAuthenticated, openAuthModal } = useAuthGate();
  const chat = useCinsChatContext();
  const [messaging, setMessaging] = useState(false);

  if (!ctx) return null;
  if (ctx.canEdit && ctx.isEditing) return null;

  const { orgId, school } = ctx;

  async function handleMessage() {
    if (!isAuthenticated) {
      openAuthModal(AUTH_MESSAGE_CHAT);
      return;
    }
    if (!chat || messaging) return;

    setMessaging(true);
    try {
      await chat.openChat({
        orgId,
        orgPreview: {
          name: school.ten,
          avatarUrl: school.avatar_src ?? null,
          orgKind: mapSchoolOrgKind(school, pathname),
        },
      });
    } catch {
      /* openChat đã đóng overlay khi lỗi */
    } finally {
      setMessaging(false);
    }
  }

  const label = messaging ? "Đang mở…" : "Nhắn tin";

  return (
    <button
      type="button"
      className={`ss-btn primary ss-btn-user-chat${iconOnly ? " is-icon" : ""}`}
      onClick={() => void handleMessage()}
      disabled={messaging || !chat}
      aria-label={label}
      title="Nhắn tin"
    >
      {iconOnly ? (
        <MessageCircle size={17} strokeWidth={2} aria-hidden />
      ) : (
        <MessageIcon />
      )}
      {iconOnly ? null : (
        <span className="ss-btn-user-chat-label">{label}</span>
      )}
    </button>
  );
}
