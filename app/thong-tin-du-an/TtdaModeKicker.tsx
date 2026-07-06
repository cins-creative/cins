"use client";

import { FileText, Map } from "lucide-react";

import { TtdaIcon } from "@/app/thong-tin-du-an/ttda-deck-shared";

export type TtdaHubMode = "du-an" | "lo-trinh";

const MODES: ReadonlyArray<{
  id: TtdaHubMode;
  label: string;
  icon: typeof FileText;
}> = [
  { id: "du-an", label: "Thông tin dự án", icon: FileText },
  { id: "lo-trinh", label: "Lộ trình phát triển", icon: Map },
];

type Props = {
  mode: TtdaHubMode;
  onModeChange: (mode: TtdaHubMode) => void;
  className?: string;
};

export function TtdaModeKicker({ mode, onModeChange, className }: Props) {
  return (
    <div
      className={`kicker kicker--mode${className ? ` ${className}` : ""}`}
      role="tablist"
      aria-label="Loại nội dung"
    >
      <span className="kicker-brand">CINs</span>
      <span className="kicker-sep" aria-hidden>
        ·
      </span>
      {MODES.map((item) => {
        const Icon = item.icon;
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            className={`kicker-mode-tab${active ? " is-active" : ""}`}
            aria-selected={active}
            onClick={() => onModeChange(item.id)}
          >
            <TtdaIcon>
              <Icon size={13} strokeWidth={1.6} />
            </TtdaIcon>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
