"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import { useT } from "@/lib/i18n/use-t";

export function CinsChatLauncher() {
  const t = useT();
  const router = useRouter();
  const { open, totalUnread, openChat, viewerProfileId } = useCinsChat();

  return (
    <button
      type="button"
      className={[
        "j-chat-fab",
        open ? "is-open" : "",
        totalUnread > 0 ? "has-unread" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={
        totalUnread > 0
          ? t("chat.fabUnread", { n: totalUnread })
          : t("chat.messages")
      }
      aria-expanded={open}
      aria-hidden={open}
      onClick={() => {
        if (!viewerProfileId) {
          router.push("/login?next=/chat");
          return;
        }
        if (open) return;
        void openChat();
      }}
    >
      <span className="j-chat-fab-glow" aria-hidden />
      <span className="j-chat-fab-icon" aria-hidden>
        <MessageCircle size={22} strokeWidth={2} />
      </span>
      {totalUnread > 0 ? (
        <span className="j-chat-fab-count">
          {totalUnread > 99 ? "99+" : totalUnread}
        </span>
      ) : null}
    </button>
  );
}
