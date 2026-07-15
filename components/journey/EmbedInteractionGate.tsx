"use client";

import { Hand, X } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import {
  embedIframeAllowAttr,
  embedIframeTitle,
  type EmbedProviderId,
} from "@/lib/editor/embed-providers";
import { PlayCanvasScaleFit } from "@/components/journey/PlayCanvasScaleFit";

/**
 * Provider cần "chạm để tương tác" trên timeline — iframe vẫn load theo
 * ViewportGatedEmbed (~2 post), nhưng pointer-events tắt tới khi user click.
 * Chỉ 1 gate active tại một thời điểm.
 */
const GATED_PROVIDERS = new Set<EmbedProviderId>([
  "spline",
  "playcanvas",
  "canva",
  "figma",
  "rive",
]);

const ACTIVATE_EVENT = "cins:embed-gate-activate";

export function embedNeedsInteractionGate(
  provider: EmbedProviderId | string,
): boolean {
  return GATED_PROVIDERS.has(provider as EmbedProviderId);
}

type Props = {
  provider: EmbedProviderId;
  iframeSrc: string;
};

type LockedScrollEl = {
  el: HTMLElement;
  overflow: string;
  overflowX: string;
  overflowY: string;
  overscrollBehavior: string;
  scrollTop: number;
  scrollLeft: number;
};

function isScrollableOverflow(value: string): boolean {
  return value === "auto" || value === "scroll" || value === "overlay";
}

/**
 * Khoá ancestor đang cuộn (timeline/shell) — không `position:fixed` trên body.
 * Fixed body làm sập grid `.j-shell` → sidebar sticky biến mất.
 * Bỏ qua `.j-sidebar` để cột hồ sơ vẫn độc lập.
 */
function lockScrollChain(from: HTMLElement | null): () => void {
  const locked: LockedScrollEl[] = [];
  const seen = new Set<HTMLElement>();

  const lockEl = (el: HTMLElement) => {
    if (seen.has(el)) return;
    if (el.classList.contains("j-sidebar")) return;
    seen.add(el);
    locked.push({
      el,
      overflow: el.style.overflow,
      overflowX: el.style.overflowX,
      overflowY: el.style.overflowY,
      overscrollBehavior: el.style.overscrollBehavior,
      scrollTop: el.scrollTop,
      scrollLeft: el.scrollLeft,
    });
    el.style.overflow = "hidden";
    el.style.overflowX = "hidden";
    el.style.overflowY = "hidden";
    el.style.overscrollBehavior = "none";
  };

  let node: HTMLElement | null = from;
  while (node) {
    const style = getComputedStyle(node);
    const canY =
      isScrollableOverflow(style.overflowY) &&
      node.scrollHeight > node.clientHeight + 1;
    const canX =
      isScrollableOverflow(style.overflowX) &&
      node.scrollWidth > node.clientWidth + 1;
    if (canY || canX) lockEl(node);
    node = node.parentElement;
  }

  const body = document.body;
  const html = document.documentElement;
  const prevBodyOverflow = body.style.overflow;
  const prevHtmlOverflow = html.style.overflow;
  lockEl(body);
  lockEl(html);
  body.style.overflow = "hidden";
  html.style.overflow = "hidden";

  return () => {
    for (let i = locked.length - 1; i >= 0; i -= 1) {
      const item = locked[i];
      item.el.style.overflow = item.overflow;
      item.el.style.overflowX = item.overflowX;
      item.el.style.overflowY = item.overflowY;
      item.el.style.overscrollBehavior = item.overscrollBehavior;
      item.el.scrollTop = item.scrollTop;
      item.el.scrollLeft = item.scrollLeft;
    }
    body.style.overflow = prevBodyOverflow;
    html.style.overflow = prevHtmlOverflow;
  };
}

/**
 * Bọc iframe embed trên timeline. Mặc định iframe `pointer-events: none` để cuộn
 * feed mượt xuyên qua; user chạm 1 lần mới bật tương tác (khoá scroll trang trên
 * thiết bị cảm ứng để xoay/pan). Nút thoát trả lại trạng thái cuộn. Reset khi đổi
 * src (hoặc khi ViewportGatedEmbed unmount lúc rời khung).
 */
export function EmbedInteractionGate({ provider, iframeSrc }: Props) {
  const [active, setActive] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const gateId = useId();
  const title = embedIframeTitle(provider);
  const allow = embedIframeAllowAttr(provider);
  const referrerPolicy =
    provider === "youtube" || provider === "vimeo"
      ? "strict-origin-when-cross-origin"
      : undefined;

  useEffect(() => {
    setActive(false);
  }, [iframeSrc]);

  useEffect(() => {
    const onActivate = (event: Event) => {
      const otherId = (event as CustomEvent<string>).detail;
      if (otherId !== gateId) setActive(false);
    };
    window.addEventListener(ACTIVATE_EVENT, onActivate);
    return () => window.removeEventListener(ACTIVATE_EVENT, onActivate);
  }, [gateId]);

  /**
   * Khoá scroll khi đang tương tác (thiết bị cảm ứng). Spline iframe cross-origin
   * không chặn được 1 ngón kéo feed — feed cuộn → ViewportGatedEmbed unmount →
   * "kéo một nhịp rồi rớt". Hai ngón (pan/zoom) không cuộn trang nên vẫn mượt.
   *
   * Chỉ `overflow:hidden` trên ancestor (không `position:fixed` body — tránh
   * sidebar `.j-sidebar` biến mất). Dùng `useLayoutEffect` để khoá trước paint.
   */
  useLayoutEffect(() => {
    if (!active || typeof window === "undefined") return;
    const touchLike =
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(hover: none)").matches ||
      window.matchMedia("(any-pointer: coarse)").matches;
    if (!touchLike) return;
    return lockScrollChain(rootRef.current);
  }, [active]);

  const iframe = (
    <iframe
      src={iframeSrc}
      title={title}
      allow={allow}
      referrerPolicy={referrerPolicy}
      allowFullScreen
      loading="lazy"
      tabIndex={
        embedNeedsInteractionGate(provider) ? (active ? 0 : -1) : undefined
      }
    />
  );
  const framed =
    provider === "playcanvas" ? (
      <PlayCanvasScaleFit>{iframe}</PlayCanvasScaleFit>
    ) : (
      iframe
    );

  if (!embedNeedsInteractionGate(provider)) {
    return framed;
  }

  const activate = () => {
    setActive(true);
    window.dispatchEvent(
      new CustomEvent(ACTIVATE_EVENT, { detail: gateId }),
    );
  };

  return (
    <div
      ref={rootRef}
      className={"jcard-embed-gate-root" + (active ? " is-active" : "")}
      data-active={active ? "true" : "false"}
    >
      {framed}
      {active ? (
        <button
          type="button"
          className="jcard-embed-exit"
          onClick={() => setActive(false)}
          aria-label="Thoát tương tác để cuộn tiếp"
        >
          <X size={18} strokeWidth={2.4} aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          className="jcard-embed-gate"
          onClick={activate}
          aria-label={`Bật tương tác với ${title}`}
        >
          <span className="jcard-embed-gate-hint" aria-hidden>
            <Hand
              className="jcard-embed-gate-hand"
              size={18}
              strokeWidth={2.2}
            />
          </span>
        </button>
      )}
    </div>
  );
}
