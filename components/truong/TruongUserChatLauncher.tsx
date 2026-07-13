"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import { useAuthGate } from "@/components/auth/AuthGateProvider";
import { useCinsChatContext } from "@/components/cins/CinsChatProvider";
import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import type { ChatOrgKind } from "@/lib/chat/types";
import { truongDetailHref } from "@/lib/nganh/truong-shared";
import { CO_SO_DEFAULT_TAB, coSoTabPath } from "@/lib/to-chuc/co-so-routes";
import { STUDIO_DEFAULT_TAB, studioTabPath } from "@/lib/to-chuc/studio-routes";
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

function orgPageHref(
  school: Pick<TruongListItem, "slug" | "org_loai">,
  pathname: string,
): string {
  if (school.org_loai === "co_so_dao_tao") {
    return coSoTabPath(school.slug, CO_SO_DEFAULT_TAB);
  }
  if (pathname.startsWith("/studio/")) {
    return studioTabPath(school.slug, STUDIO_DEFAULT_TAB);
  }
  return truongDetailHref(school.slug);
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

/** Nút nhắn tin cho khách — mở CinsChatOverlay (cần đăng nhập). */
export function TruongUserChatLauncher() {
  const ctx = useTruongInlineEdit();
  const pathname = usePathname() ?? "";
  const { isAuthenticated, openAuthModal } = useAuthGate();
  const chat = useCinsChatContext();
  const [messaging, setMessaging] = useState(false);

  if (!ctx) return null;
  if (ctx.canEdit && ctx.isEditing) return null;

  const { orgId, school } = ctx;
  const isStudio = pathname.startsWith("/studio/");

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
        nguCanh: isStudio
          ? undefined
          : {
              loai: "tuyen_sinh",
              id: school.id,
              tieuDe: school.ten,
              moTa: school.mo_ta?.trim() || null,
              href: orgPageHref(school, pathname),
              orgTen: school.ten,
            },
      });
    } catch {
      /* openChat đã đóng overlay khi lỗi */
    } finally {
      setMessaging(false);
    }
  }

  return (
    <button
      type="button"
      className="ss-btn primary ss-btn-user-chat"
      onClick={() => void handleMessage()}
      disabled={messaging || !chat}
      aria-label="Nhắn tin"
      title="Nhắn tin"
    >
      <MessageIcon />
      <span className="ss-btn-user-chat-label">
        {messaging ? "Đang mở…" : "Nhắn tin"}
      </span>
    </button>
  );
}
