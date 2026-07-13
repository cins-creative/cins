"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";

import {
  cfImagePublicUrl,
  shareOgSwatchStyle,
  SHARE_OG_PRESETS,
  type ShareOgPresetId,
  type ShareOgTheme,
  type ShareOgThemeState,
} from "@/lib/journey/share-og-theme";

type Props = {
  state: ShareOgThemeState;
  saving?: boolean;
  onSelectPreset: (id: ShareOgPresetId) => void;
  onSelectCustom: (imageId: string) => void;
  onUpload: (file: File) => Promise<void>;
  onRemoveCustom: (imageId: string) => void;
};

export function JourneyShareThemePicker({
  state,
  saving = false,
  onSelectPreset,
  onSelectCustom,
  onUpload,
  onRemoveCustom,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const active = state.active;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="j-share-theme" aria-label="Chọn theme thẻ">
      <div className="j-share-theme-label">
        <span>Theme</span>
        {saving || uploading ? (
          <span className="j-share-theme-status">Đang lưu…</span>
        ) : null}
      </div>
      <div className="j-share-theme-row" role="listbox" aria-label="Preset nền">
        {SHARE_OG_PRESETS.map((preset) => {
          const selected =
            active.kind === "preset" && active.id === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={
                "j-share-theme-swatch" + (selected ? " is-active" : "")
              }
              title={preset.label}
              aria-label={preset.label}
              style={shareOgSwatchStyle(preset.id)}
              onClick={() => onSelectPreset(preset.id)}
            />
          );
        })}

        {state.customs.map((entry) => {
          const url = cfImagePublicUrl(entry.imageId);
          const selected =
            active.kind === "custom" && active.imageId === entry.imageId;
          return (
            <div
              key={entry.imageId}
              className={
                "j-share-theme-custom" + (selected ? " is-active" : "")
              }
            >
              <button
                type="button"
                role="option"
                aria-selected={selected}
                className="j-share-theme-swatch j-share-theme-swatch--img"
                title="Nền cá nhân"
                style={
                  url
                    ? {
                        backgroundImage: `url(${url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
                onClick={() => onSelectCustom(entry.imageId)}
              />
              <button
                type="button"
                className="j-share-theme-remove"
                aria-label="Xóa nền này"
                title="Xóa nền"
                onClick={() => onRemoveCustom(entry.imageId)}
              >
                <X size={12} strokeWidth={2.2} aria-hidden />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          className="j-share-theme-add"
          disabled={uploading}
          title="Tải nền cá nhân lên"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus size={16} strokeWidth={1.8} aria-hidden />
          <span>{uploading ? "Đang tải…" : "Tải nền lên"}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>
      <p className="j-share-theme-hint">
        Tải ảnh nền của bạn (PNG, JPG, WebP · tối đa 5MB) để tạo thẻ theo phong
        cách riêng.
      </p>
    </div>
  );
}

export type { ShareOgTheme };
