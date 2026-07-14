"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Maximize2, Minimize2 } from "lucide-react";

/**
 * PlayCanvas FILL_WINDOW sizing theo kích thước iframe. Trên feed (~900px) HUD
 * pixel/screen-space thường bị phóng to + cắt. Wrapper này báo cho game một
 * viewport ảo rộng hơn (DESIGN_W) rồi CSS `scale` thu cả canvas vào khung —
 * scale-to-fit contain, không letterbox khi tỉ lệ khớp khung cha.
 *
 * Fullscreen / lightbox: bỏ scale ảo, iframe fill native để focus chơi.
 */
const DESIGN_W = 1600;

type Props = {
  children: ReactNode;
  className?: string;
};

type Stage = { scale: number; w: number; h: number };

function getFsElement(): Element | null {
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
  };
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

async function requestFs(el: HTMLElement): Promise<boolean> {
  const anyEl = el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return true;
    }
    if (anyEl.webkitRequestFullscreen) {
      await anyEl.webkitRequestFullscreen();
      return true;
    }
  } catch {
    /* iOS / policy — dùng lightbox */
  }
  return false;
}

async function exitFs(): Promise<void> {
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void> | void;
  };
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
      return;
    }
    if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    }
  } catch {
    /* ignore */
  }
}

export function PlayCanvasScaleFit({ children, className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage>({
    scale: 1,
    w: DESIGN_W,
    h: DESIGN_W * 0.75,
  });
  const [isNativeFs, setIsNativeFs] = useState(false);
  const [isLightbox, setIsLightbox] = useState(false);
  const focused = isNativeFs || isLightbox;

  const measure = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (cw < 2 || ch < 2) return;

    const nativeFs = getFsElement() === el;
    const fillNative =
      nativeFs || el.classList.contains("is-lightbox");

    const next: Stage = fillNative
      ? { scale: 1, w: cw, h: ch }
      : { scale: cw / DESIGN_W, w: DESIGN_W, h: ch / (cw / DESIGN_W) };

    setStage((prev) =>
      prev.scale === next.scale && prev.w === next.w && prev.h === next.h
        ? prev
        : next,
    );
  }, []);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, focused]);

  useEffect(() => {
    // Sau khi vào/thoát lightbox, đo lại ngay (ResizeObserver có thể chưa kịp).
    measure();
  }, [focused, measure]);

  useEffect(() => {
    const onFsChange = () => {
      const el = rootRef.current;
      const on = Boolean(el && getFsElement() === el);
      setIsNativeFs(on);
      if (on) setIsLightbox(false);
      // Đo lại sau khi layout fullscreen ổn định.
      requestAnimationFrame(measure);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, [measure]);

  useEffect(() => {
    if (!isLightbox) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsLightbox(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isLightbox]);

  async function toggleFocus() {
    const el = rootRef.current;
    if (!el) return;

    if (isNativeFs) {
      await exitFs();
      return;
    }
    if (isLightbox) {
      setIsLightbox(false);
      return;
    }

    const ok = await requestFs(el);
    if (!ok) setIsLightbox(true);
  }

  return (
    <div
      ref={rootRef}
      className={
        "jcard-pc-scale" +
        (isLightbox ? " is-lightbox" : "") +
        (focused ? " is-focused" : "") +
        (className ? ` ${className}` : "")
      }
    >
      <div
        className="jcard-pc-scale-stage"
        style={{
          width: stage.w,
          height: stage.h,
          transform: `scale(${stage.scale})`,
        }}
      >
        {children}
      </div>
      <button
        type="button"
        className="jcard-pc-fs-btn"
        onClick={(e) => {
          e.stopPropagation();
          void toggleFocus();
        }}
        aria-label={focused ? "Thoát toàn màn hình" : "Toàn màn hình PlayCanvas"}
        title={focused ? "Thoát toàn màn hình" : "Toàn màn hình"}
      >
        {focused ? (
          <Minimize2 size={16} strokeWidth={2.4} aria-hidden />
        ) : (
          <Maximize2 size={16} strokeWidth={2.4} aria-hidden />
        )}
      </button>
    </div>
  );
}
