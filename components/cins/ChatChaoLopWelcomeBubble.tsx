"use client";

import { PartyPopper } from "lucide-react";

const CONFETTI_PIECES = [
  { x: "8%", delay: "0s", dur: "1.9s", hue: 0, dx: "-18px" },
  { x: "18%", delay: "0.12s", dur: "2.1s", hue: 1, dx: "14px" },
  { x: "28%", delay: "0.05s", dur: "1.7s", hue: 2, dx: "-8px" },
  { x: "38%", delay: "0.22s", dur: "2.0s", hue: 3, dx: "22px" },
  { x: "48%", delay: "0.08s", dur: "1.85s", hue: 0, dx: "-4px" },
  { x: "58%", delay: "0.18s", dur: "2.15s", hue: 1, dx: "16px" },
  { x: "68%", delay: "0.03s", dur: "1.95s", hue: 2, dx: "-20px" },
  { x: "78%", delay: "0.28s", dur: "1.75s", hue: 3, dx: "10px" },
  { x: "88%", delay: "0.15s", dur: "2.05s", hue: 0, dx: "-12px" },
  { x: "14%", delay: "0.35s", dur: "2.2s", hue: 2, dx: "24px" },
  { x: "52%", delay: "0.4s", dur: "1.8s", hue: 3, dx: "-16px" },
  { x: "82%", delay: "0.32s", dur: "2.0s", hue: 1, dx: "6px" },
  { x: "42%", delay: "0.48s", dur: "2.3s", hue: 0, dx: "18px" },
  { x: "72%", delay: "0.52s", dur: "1.9s", hue: 2, dx: "-10px" },
] as const;

type Props = {
  body?: string;
};

export function ChatChaoLopWelcomeBubble({
  body = "Chào mừng bạn đến với lớp học!",
}: Props) {
  return (
    <div className="cins-chat-chao-lop" role="status">
      <div className="cins-chat-chao-lop-confetti" aria-hidden>
        {CONFETTI_PIECES.map((piece, i) => (
          <span
            key={i}
            className={`cins-chat-chao-lop-piece is-h${piece.hue}`}
            style={{
              left: piece.x,
              animationDelay: piece.delay,
              animationDuration: piece.dur,
              ["--chao-dx" as string]: piece.dx,
            }}
          />
        ))}
      </div>
      <div className="cins-chat-chao-lop-glow" aria-hidden />
      <div className="cins-chat-chao-lop-inner">
        <span className="cins-chat-chao-lop-badge">
          <PartyPopper size={18} strokeWidth={2.2} aria-hidden />
        </span>
        <p className="cins-chat-chao-lop-eyebrow">Chào mừng học viên mới</p>
        <strong className="cins-chat-chao-lop-title">{body}</strong>
        <p className="cins-chat-chao-lop-sub">
          Chúc bạn học vui và gắn kết với lớp nhé.
        </p>
      </div>
    </div>
  );
}
