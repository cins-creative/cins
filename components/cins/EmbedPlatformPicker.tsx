"use client";

import "@/app/cins-embed-picker.css";

import { ChevronRight, Code2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  EMBED_PLATFORM_GROUPS,
  getTier1PlatformsByGroup,
  type Tier1EmbedPlatformId,
  type Tier1EmbedPlatformMeta,
} from "@/lib/editor/embed-providers";
import { EMBED_PLATFORM_LOGO } from "@/lib/editor/embed-platform-logos";

export type EmbedPlatformPickerSelection =
  | { type: "platform"; platform: Tier1EmbedPlatformId }
  | { type: "rive-file"; file: File };

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (selection: EmbedPlatformPickerSelection) => void;
};

function PlatformRow({
  platform,
  onPick,
}: {
  platform: Tier1EmbedPlatformMeta;
  onPick: (id: Tier1EmbedPlatformId) => void;
}) {
  return (
    <li className="cins-embed-picker-list-item">
      <button
        type="button"
        className={`cins-embed-picker-item cins-embed-picker-item--${platform.id}`}
        onClick={() => onPick(platform.id)}
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
          <span className="cins-embed-picker-item-label">{platform.label}</span>
          <span className="cins-embed-picker-item-hint">{platform.hint}</span>
        </span>
      </button>
    </li>
  );
}

export function EmbedPlatformPicker({ open, onClose, onSelect }: Props) {
  const riveFileInputRef = useRef<HTMLInputElement>(null);
  const [riveExpanded, setRiveExpanded] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setRiveExpanded(false);
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const pickPlatform = (platform: Tier1EmbedPlatformId) => {
    onSelect({ type: "platform", platform });
    onClose();
  };

  const pickRiveFile = (file: File) => {
    onSelect({ type: "rive-file", file });
    onClose();
  };

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
        <div className="cins-embed-picker-body">
          {EMBED_PLATFORM_GROUPS.map((group) => {
            const platforms = getTier1PlatformsByGroup(group.id);
            if (platforms.length === 0) return null;
            return (
              <section
                key={group.id}
                className="cins-embed-picker-group"
                aria-labelledby={`embed-group-${group.id}`}
              >
                <h3
                  id={`embed-group-${group.id}`}
                  className="cins-embed-picker-group-label"
                >
                  {group.label}
                </h3>
                <ul className="cins-embed-picker-list">
                  {platforms.map((platform) => {
                    if (platform.id === "rive") {
                      return (
                        <li
                          key={platform.id}
                          className={`cins-embed-picker-list-item cins-embed-picker-list-item--rive${riveExpanded ? " is-expanded" : ""}`}
                        >
                          <div className="cins-embed-picker-rive-anchor">
                            <button
                              type="button"
                              className="cins-embed-picker-item cins-embed-picker-item--rive cins-embed-picker-item--has-flyout"
                              aria-expanded={riveExpanded}
                              aria-haspopup="menu"
                              onClick={() =>
                                setRiveExpanded((prev) => !prev)
                              }
                            >
                              <span
                                className="cins-embed-picker-item-mark"
                                aria-hidden
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={EMBED_PLATFORM_LOGO.rive}
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
                              <ChevronRight
                                size={16}
                                strokeWidth={2}
                                className="cins-embed-picker-item-chevron"
                                aria-hidden
                              />
                            </button>
                            <div
                              className="cins-embed-picker-rive-flyout"
                              role="menu"
                              aria-label="Chọn cách nhúng Rive"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                className="cins-embed-picker-rive-option"
                                onClick={() => pickPlatform("rive")}
                              >
                                <span
                                  className="cins-embed-picker-rive-option-icon"
                                  aria-hidden
                                >
                                  <Code2 size={16} strokeWidth={2} />
                                </span>
                                <span className="cins-embed-picker-rive-option-body">
                                  <span className="cins-embed-picker-rive-option-label">
                                    Link embed HTML
                                  </span>
                                  <span className="cins-embed-picker-rive-option-hint">
                                    Dán link từ rive.app
                                  </span>
                                </span>
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                className="cins-embed-picker-rive-option"
                                onClick={() =>
                                  riveFileInputRef.current?.click()
                                }
                              >
                                <span
                                  className="cins-embed-picker-rive-option-icon"
                                  aria-hidden
                                >
                                  <Upload size={16} strokeWidth={2} />
                                </span>
                                <span className="cins-embed-picker-rive-option-body">
                                  <span className="cins-embed-picker-rive-option-label">
                                    Tải file .riv
                                  </span>
                                  <span className="cins-embed-picker-rive-option-hint">
                                    Chạy animation trực tiếp trên CINs
                                  </span>
                                </span>
                              </button>
                            </div>
                          </div>
                          <input
                            ref={riveFileInputRef}
                            type="file"
                            accept=".riv,application/octet-stream"
                            hidden
                            aria-hidden
                            tabIndex={-1}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (!file) return;
                              pickRiveFile(file);
                            }}
                          />
                        </li>
                      );
                    }

                    return (
                      <PlatformRow
                        key={platform.id}
                        platform={platform}
                        onPick={pickPlatform}
                      />
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
