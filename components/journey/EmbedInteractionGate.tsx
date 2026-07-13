"use client";

import { Hand, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  embedIframeAllowAttr,
  embedIframeTitle,
  type EmbedProviderId,
} from "@/lib/editor/embed-providers";

/**
 * Provider cần "chạm để tương tác": kéo/xoay/pan làm xung đột scroll feed trên
 * mobile (3D scene xoay tự do). Chỉ Spline cần gate; các nền tảng khác (Canva,
 * Figma, Sketchfab, video/âm thanh/animation…) không cần.
 */
const GATED_PROVIDERS = new Set<EmbedProviderId>(["spline"]);

export function embedNeedsInteractionGate(
  provider: EmbedProviderId | string,
): boolean {
  return GATED_PROVIDERS.has(provider as EmbedProviderId);
}

type Props = {
  provider: EmbedProviderId;
  iframeSrc: string;
};

/**
 * Bọc iframe embed trên timeline. Mặc định iframe `pointer-events: none` để cuộn
 * feed mượt xuyên qua; user chạm 1 lần mới bật tương tác (khoá scroll trong khung
 * để xoay/pan). Nút thoát trả lại trạng thái cuộn. Reset khi đổi src (hoặc khi
 * ViewportGatedEmbed unmount lúc rời khung).
 */
export function EmbedInteractionGate({ provider, iframeSrc }: Props) {
  const [active, setActive] = useState(false);
  const title = embedIframeTitle(provider);
  const allow = embedIframeAllowAttr(provider);
  const referrerPolicy =
    provider === "youtube" || provider === "vimeo"
      ? "strict-origin-when-cross-origin"
      : undefined;

  useEffect(() => {
    setActive(false);
  }, [iframeSrc]);

  if (!embedNeedsInteractionGate(provider)) {
    return (
      <iframe
        src={iframeSrc}
        title={title}
        allow={allow}
        referrerPolicy={referrerPolicy}
        allowFullScreen
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={"jcard-embed-gate-root" + (active ? " is-active" : "")}
      data-active={active ? "true" : "false"}
    >
      <iframe
        src={iframeSrc}
        title={title}
        allow={allow}
        referrerPolicy={referrerPolicy}
        allowFullScreen
        loading="lazy"
        tabIndex={active ? 0 : -1}
      />
      {active ? (
        <button
          type="button"
          className="jcard-embed-exit"
          onClick={() => setActive(false)}
          aria-label="Thoát tương tác để cuộn tiếp"
        >
          <X size={15} strokeWidth={2.4} aria-hidden />
          <span>Thoát</span>
        </button>
      ) : (
        <button
          type="button"
          className="jcard-embed-gate"
          onClick={() => setActive(true)}
          aria-label={`Bật tương tác với ${title}`}
        >
          <span className="jcard-embed-gate-hint">
            <Hand size={16} strokeWidth={2} aria-hidden />
            <span>chạm để tương tác</span>
          </span>
        </button>
      )}
    </div>
  );
}
