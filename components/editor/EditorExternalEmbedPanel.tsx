"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, X } from "lucide-react";
import {
  buildEmbedIframeSrcFromUrl,
  embedIframeAllowAttr,
  embedUrlMatchesPlatform,
  getTier1EmbedPlatformMeta,
  type Tier1EmbedPlatformId,
} from "@/lib/editor/embed-providers";
import { EMBED_PLATFORM_LOGO } from "@/lib/editor/embed-platform-logos";
import { PlayCanvasScaleFit } from "@/components/journey/PlayCanvasScaleFit";

type Props = {
  platform: Tier1EmbedPlatformId;
  embedUrl: string;
  onChangeEmbedUrl: (url: string) => void;
};

function SplinePlaySettingsGuideDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="ed-embed-guide-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ed-embed-guide-modal">
        <div className="ed-embed-guide-head">
          <div className="ed-embed-guide-titles">
            <h3 id={titleId} className="ed-embed-guide-title">
              Hướng dẫn cài đặt Spline đúng
            </h3>
            <p className="ed-embed-guide-sub">
              Để kéo xoay trên điện thoại bám theo tay, chỉnh Play Settings như
              ảnh dưới rồi bấm Update Public URL trước khi dán link vào CINs.
            </p>
          </div>
          <button
            type="button"
            className="ed-embed-guide-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} strokeWidth={1.9} aria-hidden />
          </button>
        </div>

        <figure className="ed-embed-guide-figure">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="ed-embed-guide-img"
            src="/assets/embed-platforms/spline-play-settings-guide.png"
            alt="Spline Export → Public URL → Play Settings: Orbit Yes, Soft Orbit No, Touch Orbit 1 Finger, Touch Page Scroll No, Orbit Limits tắt"
            width={880}
            height={1100}
            loading="lazy"
            decoding="async"
          />
          <figcaption className="ed-embed-guide-caption">
            Ví dụ Play Settings đúng (chú ý phần Touch Settings).
          </figcaption>
        </figure>

        <ol className="ed-embed-guide-steps">
          <li>
            Trong Spline, bấm <strong>Export</strong> → chọn{" "}
            <strong>Public URL</strong> → tab <strong>Play Settings</strong>.
          </li>
          <li>
            Phần camera:
            <ul>
              <li>
                <strong>Orbit</strong> = Yes
              </li>
              <li>
                <strong>Soft Orbit</strong> = No
              </li>
              <li>
                <strong>Orbit Limits</strong> = tắt (tránh xoay chút rồi bung về
                chỗ cũ)
              </li>
            </ul>
          </li>
          <li>
            Phần <strong>Touch Settings</strong>:
            <ul>
              <li>
                <strong>Orbit</strong> = 1 Finger
              </li>
              <li>
                <strong>Page Scroll</strong> = No
              </li>
              <li>
                <strong>Pan</strong> = 2 Fingers (tuỳ chọn)
              </li>
              <li>
                <strong>Zoom</strong> = Pinching hoặc None
              </li>
            </ul>
          </li>
          <li>
            Bấm <strong>Update Public URL</strong>, rồi dán lại link vào ô bên
            dưới (hoặc giữ nguyên nếu URL không đổi).
          </li>
        </ol>

        <p className="ed-embed-guide-note">
          Lưu ý: nếu bật Orbit Limits, đừng dùng Soft Limit Bounce/Ease — hai
          chế độ này cố ý kéo camera về vị trí ban đầu khi thả tay.
        </p>

        <div className="ed-embed-guide-actions">
          <button
            type="button"
            className="ed-embed-guide-done"
            onClick={onClose}
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function EditorExternalEmbedPanel({
  platform,
  embedUrl,
  onChangeEmbedUrl,
}: Props) {
  const meta = getTier1EmbedPlatformMeta(platform);
  const trimmed = embedUrl.trim();
  const valid = trimmed ? embedUrlMatchesPlatform(trimmed, platform) : false;
  const iframeSrc = valid ? buildEmbedIframeSrcFromUrl(trimmed) : null;
  const iframeAllow = embedIframeAllowAttr(platform);
  const logoSrc = EMBED_PLATFORM_LOGO[platform];
  const [guideOpen, setGuideOpen] = useState(false);
  const isSpline = platform === "spline";
  const inputId = useId();

  return (
    <div className="ed-embed-compose">
      <div className="ed-embed-compose-tab" data-platform={platform}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="ed-embed-compose-tab-logo"
          src={logoSrc}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
        />
        <span className="ed-embed-compose-tab-text">
          <span className="ed-embed-compose-tab-label">{meta.label}</span>
          <span className="ed-embed-compose-tab-hint">{meta.hint}</span>
        </span>
      </div>
      <div className="ed-embed-compose-field">
        <div className="ed-embed-compose-field-label-row">
          <label className="ed-embed-compose-field-label" htmlFor={inputId}>
            Link embed
          </label>
          {isSpline ? (
            <button
              type="button"
              className="ed-embed-compose-guide-btn"
              onClick={() => setGuideOpen(true)}
            >
              <BookOpen size={14} strokeWidth={2} aria-hidden />
              Hướng dẫn cài đặt Spline đúng
            </button>
          ) : null}
        </div>
        <input
          id={inputId}
          type="url"
          className="ed-embed-compose-input"
          placeholder={meta.placeholder}
          value={embedUrl}
          onChange={(e) => onChangeEmbedUrl(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {trimmed && !valid ? (
        <p className="ed-embed-compose-error" role="alert">
          {platform === "sketchfab"
            ? "Link không hợp lệ — dán URL trang model Sketchfab (https://sketchfab.com/3d-models/…), không dán code HTML."
            : platform === "lottie"
              ? "Link không hợp lệ — dán URL iframe từ Handoff (https://lottie.host/embed/…), không dán asset .lottie."
              : `Link không hợp lệ — cần URL ${meta.label} (https://…).`}
        </p>
      ) : (
        <p className="ed-embed-compose-help">
          {platform === "sketchfab"
            ? "Dán link trang model Sketchfab — CINs tự tạo iframe tương tác (xoay/zoom 3D). Không cần copy code HTML."
            : platform === "lottie"
              ? "Trong LottieFiles → Handoff → iFrame code, copy URL src (lottie.host/embed/…). Asset .lottie thì dùng Tải file."
              : isSpline
                ? "Dán Public URL từ Spline. Trên điện thoại, nhớ chỉnh Play Settings (Touch: Orbit 1 Finger, Page Scroll = No) rồi Update Public URL."
                : `Dán link chia sẻ / embed từ ${meta.label}. CINs tự nhúng khi link hợp lệ.`}
        </p>
      )}
      {iframeSrc ? (
        <div
          className="ed-embed-compose-preview"
          data-provider={platform}
        >
          {platform === "playcanvas" ? (
            <PlayCanvasScaleFit>
              <iframe
                src={iframeSrc}
                title={`${meta.label} embed preview`}
                loading="lazy"
                allow={iframeAllow}
                allowFullScreen
              />
            </PlayCanvasScaleFit>
          ) : (
            <iframe
              src={iframeSrc}
              title={`${meta.label} embed preview`}
              loading="lazy"
              allow={iframeAllow}
              allowFullScreen
            />
          )}
        </div>
      ) : null}
      {isSpline ? (
        <SplinePlaySettingsGuideDialog
          open={guideOpen}
          onClose={() => setGuideOpen(false)}
        />
      ) : null}
    </div>
  );
}
