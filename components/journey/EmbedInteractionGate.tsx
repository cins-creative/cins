"use client";

import { Hand, X } from "lucide-react";
import { useEffect, useLayoutEffect, useState } from "react";

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

  /**
   * Khoá scroll trang khi đang tương tác (chỉ trên thiết bị cảm ứng). Với iframe
   * cross-origin (Spline), một ngón kéo vẫn khiến trang cuộn — trang cuộn thì
   * embed rời viewport và `ViewportGatedEmbed` unmount iframe → "chạm 1 nhịp rồi
   * mất tương tác". Khoá scroll giúp một ngón kéo chỉ xoay/pan scene, không cuộn
   * trang; hai ngón (pan/zoom) vốn không cuộn trang nên không bị ảnh hưởng.
   * Desktop dùng chuột, không khoá để tránh chặn cuộn trang.
   *
   * Dùng `useLayoutEffect` (chạy đồng bộ trước khi trình duyệt paint):
   * - Bật: khoá được áp NGAY khi `active` = true, trước khi user kịp kéo. Nếu
   *   dùng `useEffect` (chạy sau paint), nhịp kéo đầu tiên vẫn cuộn trang một
   *   chút → embed rời khung → `ViewportGatedEmbed` unmount iframe giữa cử chỉ →
   *   "kéo được một nhịp rồi rớt". Khoá đồng bộ giữ cử chỉ liên tục tới khi nhấc.
   * - Thoát: gỡ `position: fixed` và `scrollTo` cùng một nhịp trước paint nên
   *   không thấy trang "giựt lên đầu rồi cuộn lại".
   */
  useLayoutEffect(() => {
    if (!active || typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [active]);

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
