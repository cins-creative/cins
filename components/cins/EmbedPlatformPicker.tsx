"use client";

import "@/app/cins-embed-picker.css";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

import {
  TIER1_EMBED_PLATFORMS,
  type Tier1EmbedPlatformId,
} from "@/lib/editor/embed-providers";

const EMBED_PLATFORM_LOGO: Record<Tier1EmbedPlatformId, string> = {
  youtube: "/assets/embed-platforms/youtube.png",
  vimeo: "/assets/embed-platforms/vimeo.png",
  figma: "/assets/embed-platforms/figma.png",
  framer: "/assets/embed-platforms/framer.png",
  sketchfab: "/assets/embed-platforms/sketchfab.png",
  rive: "/assets/embed-platforms/rive.png",
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (platform: Tier1EmbedPlatformId) => void;
};

export function EmbedPlatformPicker({ open, onClose, onSelect }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="cins-embed-picker-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="cins-embed-picker-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Chọn nền tảng nhúng"
      >
        <header className="cins-embed-picker-head">
          <div>
            <h2 className="cins-embed-picker-title">Nhúng tác phẩm</h2>
            <p className="cins-embed-picker-sub">
              Dán link embed từ nền tảng sáng tạo khác để xây dựng portfolio của
              bạn
            </p>
          </div>
          <button
            type="button"
            className="cins-embed-picker-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>
        <ul className="cins-embed-picker-list">
          {TIER1_EMBED_PLATFORMS.map((platform) => (
            <li key={platform.id} className="cins-embed-picker-list-item">
              <button
                type="button"
                className={`cins-embed-picker-item cins-embed-picker-item--${platform.id}`}
                onClick={() => {
                  onSelect(platform.id);
                  onClose();
                }}
              >
                <span className="cins-embed-picker-item-mark" aria-hidden>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={EMBED_PLATFORM_LOGO[platform.id]}
                    alt=""
                    width={34}
                    height={34}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className="cins-embed-picker-item-body">
                  <span className="cins-embed-picker-item-label">
                    {platform.label}
                  </span>
                  <span className="cins-embed-picker-item-hint">
                    {platform.hint}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
