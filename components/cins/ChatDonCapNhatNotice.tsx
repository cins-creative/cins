"use client";

import { BadgeCheck, CircleSlash, Clock, Van } from "lucide-react";

import {
  donCapNhatTieuDe,
  donCapNhatTone,
} from "@/lib/chat/don-cap-nhat";
import type { ChatDonCapNhat } from "@/lib/chat/types";

/**
 * Thông báo «đơn vừa đổi trạng thái» — dải hệ thống có viền + icon, cố tình
 * khác bong bóng tin nhắn thường để người xem không đọc lẫn là tin của đối phương.
 */
export function ChatDonCapNhatNotice({
  capNhat,
  boiNguoiXem,
}: {
  capNhat: ChatDonCapNhat;
  boiNguoiXem: boolean;
}) {
  const tone = donCapNhatTone(capNhat);
  const Icon =
    tone === "huy"
      ? CircleSlash
      : tone === "xong"
        ? BadgeCheck
        : capNhat.trangThai === "dang_giao"
          ? Van
          : Clock;

  return (
    <span className={`cins-chat-don-capnhat is-${tone}`} role="status">
      <span className="cins-chat-don-capnhat-head">
        <span className="cins-chat-don-capnhat-icon" aria-hidden>
          <Icon size={13} strokeWidth={2.2} />
        </span>
        <span className="cins-chat-don-capnhat-title">
          {donCapNhatTieuDe(capNhat, boiNguoiXem)}
        </span>
      </span>
      {capNhat.lyDo ? (
        <span className="cins-chat-don-capnhat-reason">
          <span className="cins-chat-don-capnhat-reason-label">Lý do</span>
          <span className="cins-chat-don-capnhat-reason-text">
            {capNhat.lyDo}
          </span>
        </span>
      ) : null}
    </span>
  );
}
