"use client";

import "@/app/cins-embed-picker.css";

import { ChevronDown, Code2, Upload, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
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
  | { type: "rive-file"; file: File }
  | { type: "lottie-file"; file: File };

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (selection: EmbedPlatformPickerSelection) => void;
};

type FlyoutOption = {
  id: string;
  label: string;
  hint: string;
  icon: ReactNode;
  onPick: () => void;
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

function MotionEmbedFlyoutItem({
  platform,
  flyoutId,
  expanded,
  onExpandedChange,
  menuLabel,
  options,
  fileInputRef,
  accept,
  onFile,
}: {
  platform: Tier1EmbedPlatformMeta;
  flyoutId: "rive" | "lottie";
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
  menuLabel: string;
  options: FlyoutOption[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  accept: string;
  onFile: (file: File) => void;
}) {
  return (
    <li
      className={`cins-embed-picker-list-item cins-embed-picker-list-item--${flyoutId}${expanded ? " is-expanded" : ""}`}
    >
      <div className="cins-embed-picker-rive-anchor">
        <button
          type="button"
          className={`cins-embed-picker-item cins-embed-picker-item--${flyoutId} cins-embed-picker-item--has-flyout`}
          aria-expanded={expanded}
          aria-haspopup="menu"
          onClick={() => onExpandedChange(!expanded)}
        >
          <span className="cins-embed-picker-item-mark" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={EMBED_PLATFORM_LOGO[flyoutId]}
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
            <span className="cins-embed-picker-item-hint">{platform.hint}</span>
          </span>
          <ChevronDown
            size={16}
            strokeWidth={2}
            className="cins-embed-picker-item-chevron"
            aria-hidden
          />
        </button>
        <div
          className="cins-embed-picker-rive-flyout"
          role="menu"
          aria-label={menuLabel}
          aria-hidden={!expanded}
        >
          <div className="cins-embed-picker-rive-flyout-panel">
            <p className="cins-embed-picker-rive-flyout-title">
              Chọn cách thêm
            </p>
            <div className="cins-embed-picker-rive-flyout-grid">
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="menuitem"
                  className="cins-embed-picker-rive-option"
                  tabIndex={expanded ? 0 : -1}
                  onClick={option.onPick}
                >
                  <span
                    className="cins-embed-picker-rive-option-icon"
                    aria-hidden
                  >
                    {option.icon}
                  </span>
                  <span className="cins-embed-picker-rive-option-body">
                    <span className="cins-embed-picker-rive-option-label">
                      {option.label}
                    </span>
                    <span className="cins-embed-picker-rive-option-hint">
                      {option.hint}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        hidden
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          onFile(file);
        }}
      />
    </li>
  );
}

export function EmbedPlatformPicker({ open, onClose, onSelect }: Props) {
  const riveFileInputRef = useRef<HTMLInputElement>(null);
  const lottieFileInputRef = useRef<HTMLInputElement>(null);
  const [riveExpanded, setRiveExpanded] = useState(false);
  const [lottieExpanded, setLottieExpanded] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setRiveExpanded(false);
      setLottieExpanded(false);
    }
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

  const pickLottieFile = (file: File) => {
    onSelect({ type: "lottie-file", file });
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
                        <MotionEmbedFlyoutItem
                          key={platform.id}
                          platform={platform}
                          flyoutId="rive"
                          expanded={riveExpanded}
                          onExpandedChange={(next) => {
                            setRiveExpanded(next);
                            if (next) setLottieExpanded(false);
                          }}
                          menuLabel="Chọn cách nhúng Rive"
                          fileInputRef={riveFileInputRef}
                          accept=".riv,application/octet-stream"
                          onFile={pickRiveFile}
                          options={[
                            {
                              id: "rive-link",
                              label: "Link embed",
                              hint: "Dán từ rive.app",
                              icon: <Code2 size={18} strokeWidth={2} />,
                              onPick: () => pickPlatform("rive"),
                            },
                            {
                              id: "rive-file",
                              label: "Tải file .riv",
                              hint: "Chạy trên CINs",
                              icon: <Upload size={18} strokeWidth={2} />,
                              onPick: () => riveFileInputRef.current?.click(),
                            },
                          ]}
                        />
                      );
                    }

                    if (platform.id === "lottie") {
                      return (
                        <MotionEmbedFlyoutItem
                          key={platform.id}
                          platform={platform}
                          flyoutId="lottie"
                          expanded={lottieExpanded}
                          onExpandedChange={(next) => {
                            setLottieExpanded(next);
                            if (next) setRiveExpanded(false);
                          }}
                          menuLabel="Chọn cách nhúng Lottie"
                          fileInputRef={lottieFileInputRef}
                          accept=".lottie,.json,application/json,application/zip"
                          onFile={pickLottieFile}
                          options={[
                            {
                              id: "lottie-link",
                              label: "Link embed",
                              hint: "lottie.host/embed/…",
                              icon: <Code2 size={18} strokeWidth={2} />,
                              onPick: () => pickPlatform("lottie"),
                            },
                            {
                              id: "lottie-file",
                              label: "Tải file",
                              hint: ".lottie hoặc .json",
                              icon: <Upload size={18} strokeWidth={2} />,
                              onPick: () =>
                                lottieFileInputRef.current?.click(),
                            },
                          ]}
                        />
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
