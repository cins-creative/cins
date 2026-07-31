"use client";

import {
  MonitorUp,
  Phone,
  PhoneMissed,
  PhoneOff,
  Video,
} from "lucide-react";

import { mediaCallLabel, type MediaCallMode } from "@/lib/media/call-mode";
import {
  formatCallDuration,
  type ChatCuocGoiNotice,
} from "@/lib/media/call-signal-types";

function ModeIcon({ mode }: { mode: MediaCallMode }) {
  if (mode === "video") return <Video size={15} strokeWidth={2} />;
  if (mode === "screen") return <MonitorUp size={15} strokeWidth={2} />;
  return <Phone size={15} strokeWidth={2} />;
}

export function ChatCuocGoiNoticeBubble({
  notice,
  fallbackBody,
  fromMe,
}: {
  notice: ChatCuocGoiNotice;
  fallbackBody?: string;
  fromMe?: boolean;
}) {
  const label = mediaCallLabel(notice.mode);
  let statusText = fallbackBody || label;
  let statusClass = notice.trangThai;

  if (notice.trangThai === "dang_goi") {
    statusText = fromMe ? `Đang gọi · ${label}` : `${label} đến`;
  } else if (notice.trangThai === "dang_dien_ra") {
    statusText = `Đang trong ${label.toLowerCase()}`;
  } else if (notice.trangThai === "nho") {
    statusText = `Cuộc gọi nhỡ · ${label}`;
  } else if (notice.trangThai === "tu_choi") {
    statusText = `Đã từ chối · ${label}`;
  } else if (notice.trangThai === "ket_thuc") {
    statusText =
      typeof notice.thoiLuongS === "number"
        ? `${label} · ${formatCallDuration(notice.thoiLuongS)}`
        : label;
  }

  const Icon =
    notice.trangThai === "nho" || notice.trangThai === "tu_choi"
      ? PhoneMissed
      : notice.trangThai === "ket_thuc"
        ? PhoneOff
        : null;

  return (
    <div className={`cins-chat-cuoc-goi is-${statusClass}`}>
      <span className="cins-chat-cuoc-goi-icon" aria-hidden>
        {Icon ? (
          <Icon size={15} strokeWidth={2} />
        ) : (
          <ModeIcon mode={notice.mode} />
        )}
      </span>
      <span className="cins-chat-cuoc-goi-text">{statusText}</span>
    </div>
  );
}
