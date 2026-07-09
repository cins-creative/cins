"use client";

import {
  buildEmbedIframeSrcFromUrl,
  embedUrlMatchesPlatform,
  getTier1EmbedPlatformMeta,
  type Tier1EmbedPlatformId,
} from "@/lib/editor/embed-providers";

type Props = {
  platform: Tier1EmbedPlatformId;
  embedUrl: string;
  onChangeEmbedUrl: (url: string) => void;
};

export function EditorExternalEmbedPanel({
  platform,
  embedUrl,
  onChangeEmbedUrl,
}: Props) {
  const meta = getTier1EmbedPlatformMeta(platform);
  const trimmed = embedUrl.trim();
  const valid = trimmed ? embedUrlMatchesPlatform(trimmed, platform) : false;
  const iframeSrc = valid ? buildEmbedIframeSrcFromUrl(trimmed) : null;
  const iframeAllow =
    platform === "sketchfab"
      ? "autoplay; fullscreen; xr-spatial-tracking"
      : platform === "rive"
        ? "autoplay; encrypted-media; clipboard-write"
        : platform === "youtube" || platform === "vimeo"
          ? "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          : undefined;

  return (
    <div className="ed-embed-compose">
      <div className="ed-embed-compose-tab" data-platform={platform}>
        <span className="ed-embed-compose-tab-label">{meta.label}</span>
        <span className="ed-embed-compose-tab-hint">{meta.hint}</span>
      </div>
      <label className="ed-embed-compose-field">
        <span className="ed-embed-compose-field-label">Link embed</span>
        <input
          type="url"
          className="ed-embed-compose-input"
          placeholder={meta.placeholder}
          value={embedUrl}
          onChange={(e) => onChangeEmbedUrl(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      {trimmed && !valid ? (
        <p className="ed-embed-compose-error" role="alert">
          {platform === "sketchfab"
            ? "Link không hợp lệ — dán URL trang model Sketchfab (https://sketchfab.com/3d-models/…), không dán code HTML."
            : `Link không hợp lệ — cần URL ${meta.label} (https://…).`}
        </p>
      ) : (
        <p className="ed-embed-compose-help">
          {platform === "sketchfab"
            ? "Dán link trang model Sketchfab — CINs tự tạo iframe tương tác (xoay/zoom 3D). Không cần copy code HTML."
            : `Dán link chia sẻ / embed từ ${meta.label}. CINs tự nhúng khi link hợp lệ.`}
        </p>
      )}
      {iframeSrc ? (
        <div
          className="ed-embed-compose-preview"
          data-provider={platform}
        >
          <iframe
            src={iframeSrc}
            title={`${meta.label} embed preview`}
            loading="lazy"
            allow={iframeAllow}
            allowFullScreen
          />
        </div>
      ) : null}
    </div>
  );
}
