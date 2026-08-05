"use client";

import { GraduationCap } from "lucide-react";

import { useCinsChat } from "@/components/cins/CinsChatProvider";
import type { ChatPhongLopInvite } from "@/lib/chat/types";

type Props = {
  invite: ChatPhongLopInvite;
  label?: string;
};

export function ChatPhongLopInviteBubble({ invite, label = "Tham gia phòng học" }: Props) {
  const { openChat } = useCinsChat();

  return (
    <div className="cins-chat-phong-lop-invite">
      {invite.tenPhong ? (
        <span className="cins-chat-phong-lop-invite-meta">{invite.tenPhong}</span>
      ) : null}
      <button
        type="button"
        className="cins-chat-phong-lop-invite-btn"
        onClick={() => {
          void openChat({
            roomId: invite.roomId,
            tab: "to_chuc",
            toChucFilter: "cua_toi",
          });
        }}
      >
        <GraduationCap size={16} strokeWidth={2.2} aria-hidden />
        <span>{label}</span>
      </button>
    </div>
  );
}
