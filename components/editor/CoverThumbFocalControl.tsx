"use client";

import { Move, ZoomIn } from "lucide-react";
import {
  useCallback,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from "react";

import {
  clampCoverThumbZoom,
  COVER_THUMB_ZOOM_MAX,
  COVER_THUMB_ZOOM_MIN,
  type CoverThumbMeta,
  type CoverThumbRatio,
} from "@/lib/journey/cover-thumb";

type Props = {
  meta: CoverThumbMeta;
  onChange: (next: CoverThumbMeta) => void;
  /** Ảnh bìa (EditorComposeImage) — pan/zoom trên đúng khung này. */
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

function clampPct(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
}

/**
 * Một khung ảnh bìa: kéo pan điểm neo, lăn/pinch/thanh zoom để phóng.
 * Không còn preview riêng bên dưới.
 */
export function CoverThumbFocalControl({
  meta,
  onChange,
  children,
  className = "",
  style,
}: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
  } | null>(null);
  const pinchRef = useRef<{
    distance: number;
    zoom: number;
  } | null>(null);
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setRatio = useCallback((ratio: CoverThumbRatio) => {
    const current = metaRef.current;
    if (ratio === current.ratio) return;
    onChangeRef.current({ ...current, ratio });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    const current = metaRef.current;
    const next = clampCoverThumbZoom(zoom);
    if (next === clampCoverThumbZoom(current.zoom ?? 1)) return;
    onChangeRef.current({ ...current, zoom: next });
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement | null;
    if (
      target?.closest(
        "button, a, input, label, .cover-actions, .ed-cover-thumb-chrome",
      )
    ) {
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;

    if (dragRef.current && e.pointerId !== dragRef.current.pointerId) {
      const first = dragRef.current;
      const dist = Math.hypot(e.clientX - first.lastX, e.clientY - first.lastY);
      pinchRef.current = {
        distance: Math.max(dist, 1),
        zoom: clampCoverThumbZoom(metaRef.current.zoom ?? 1),
      };
      stage.setPointerCapture?.(e.pointerId);
      return;
    }

    e.preventDefault();
    dragRef.current = {
      pointerId: e.pointerId,
      lastX: e.clientX,
      lastY: e.clientY,
    };
    pinchRef.current = null;
    stage.setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const stage = stageRef.current;
      const drag = dragRef.current;
      if (!stage || !drag) return;

      if (pinchRef.current && e.pointerId !== drag.pointerId) {
        const dist = Math.hypot(e.clientX - drag.lastX, e.clientY - drag.lastY);
        const base = pinchRef.current;
        setZoom(base.zoom * (dist / base.distance));
        return;
      }

      if (e.pointerId !== drag.pointerId) return;
      if (pinchRef.current) {
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        return;
      }

      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;

      const current = metaRef.current;
      const zoom = clampCoverThumbZoom(current.zoom ?? 1);
      const sensitivity = 100 / zoom;
      const x = clampPct(current.x - (dx / rect.width) * sensitivity);
      const y = clampPct(current.y - (dy / rect.height) * sensitivity);
      if (x === current.x && y === current.y) return;
      onChangeRef.current({ ...current, x, y });
    },
    [setZoom],
  );

  const endPointer = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      pinchRef.current = null;
    } else if (pinchRef.current) {
      pinchRef.current = null;
    }
  }, []);

  const onWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const current = metaRef.current;
      const zoom = clampCoverThumbZoom(current.zoom ?? 1);
      setZoom(zoom + (e.deltaY > 0 ? -0.08 : 0.08));
    },
    [setZoom],
  );

  const zoom = clampCoverThumbZoom(meta.zoom ?? 1);
  const stageStyle: CSSProperties = {
    ...style,
    ["--cover-thumb-x" as string]: `${meta.x}%`,
    ["--cover-thumb-y" as string]: `${meta.y}%`,
    ["--cover-thumb-zoom" as string]: String(zoom),
  };

  return (
    <div
      ref={stageRef}
      className={`cover-img-wrap ed-cover-thumb-stage${className ? ` ${className}` : ""}`}
      style={stageStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onWheel={onWheel}
      role="group"
      aria-label="Kéo để căn ảnh, lăn chuột để phóng to thumbnail"
    >
      {children}

      <span className="ed-cover-thumb-affordance" aria-hidden>
        <Move size={20} strokeWidth={1.9} />
        <ZoomIn size={14} strokeWidth={2} />
      </span>

      <div className="ed-cover-thumb-chrome">
        <div className="ed-cover-thumb-chrome-row">
          <div
            className="ed-cover-thumb-ratio-toggle"
            role="group"
            aria-label="Tỉ lệ thumbnail"
          >
            <button
              type="button"
              className={`ed-cover-thumb-ratio-btn${meta.ratio === "16:9" ? " is-active" : ""}`}
              onClick={() => setRatio("16:9")}
              aria-pressed={meta.ratio === "16:9"}
            >
              16:9
            </button>
            <button
              type="button"
              className={`ed-cover-thumb-ratio-btn${meta.ratio === "4:3" ? " is-active" : ""}`}
              onClick={() => setRatio("4:3")}
              aria-pressed={meta.ratio === "4:3"}
            >
              4:3
            </button>
          </div>

          <label className="ed-cover-thumb-zoom">
            <span className="ed-cover-thumb-zoom-label">Zoom</span>
            <input
              type="range"
              min={COVER_THUMB_ZOOM_MIN}
              max={COVER_THUMB_ZOOM_MAX}
              step={0.02}
              value={zoom}
              aria-label="Phóng to vùng thumbnail"
              onChange={(e) => setZoom(Number(e.target.value))}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
