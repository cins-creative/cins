"use client";

import { Check, Crop, RotateCw, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

/** Vùng cắt tính theo pixel gốc của ảnh. */
type CropRect = { x: number; y: number; w: number; h: number };

type ResizeDir = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

type AspectPreset = { id: string; label: string; ratio: number | null };

const ASPECT_PRESETS: AspectPreset[] = [
  { id: "free", label: "Tự do", ratio: null },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
];

/** Cạnh dài tối đa của ảnh xuất ra — tránh canvas quá lớn gây tốn bộ nhớ. */
const MAX_OUTPUT_EDGE = 4096;
/** Kích thước tối thiểu (px gốc) của vùng cắt. */
const MIN_CROP_PX = 24;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Vùng cắt lớn nhất giữ đúng tỉ lệ, canh giữa ảnh. */
function maxCropForAspect(
  natW: number,
  natH: number,
  ratio: number | null,
): CropRect {
  if (ratio == null) return { x: 0, y: 0, w: natW, h: natH };
  let w = natW;
  let h = w / ratio;
  if (h > natH) {
    h = natH;
    w = h * ratio;
  }
  return { x: (natW - w) / 2, y: (natH - h) / 2, w, h };
}

function outputExtForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export type ImageCropModalProps = {
  /** Object URL / data URL / URL ảnh đã upload. */
  src: string;
  /** Cần crossOrigin khi ảnh từ domain khác để canvas không bị "tainted". */
  crossOrigin?: boolean;
  /** Tên file gốc (không có đuôi cũng được). */
  fileName?: string;
  /** MIME xuất ra — mặc định image/jpeg. */
  mimeType?: string;
  title?: string;
  /** Tỉ lệ mặc định khi mở (null = tự do). */
  defaultAspect?: number | null;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

export function ImageCropModal({
  src,
  crossOrigin = false,
  fileName = "image",
  mimeType = "image/jpeg",
  title = "Cắt ảnh",
  defaultAspect = null,
  onCancel,
  onConfirm,
}: ImageCropModalProps) {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [aspectId, setAspectId] = useState<string>(() => {
    const match = ASPECT_PRESETS.find((p) => p.ratio === defaultAspect);
    return match?.id ?? "free";
  });
  const [scale, setScale] = useState(1);
  const [saving, setSaving] = useState(false);

  const imgElRef = useRef<HTMLImageElement | null>(null);
  const stageImgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<
    | {
        mode: "move" | "resize";
        dir?: ResizeDir;
        startX: number;
        startY: number;
        startCrop: CropRect;
      }
    | null
  >(null);

  const activeRatio =
    ASPECT_PRESETS.find((p) => p.id === aspectId)?.ratio ?? null;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tải ảnh gốc (giữ ngoài DOM) để đo kích thước thật + vẽ canvas khi cắt.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      imgElRef.current = img;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setNatural({ w, h });
      setCrop(maxCropForAspect(w, h, defaultAspect));
      setStatus("ready");
    };
    img.onerror = () => {
      if (cancelled) return;
      setStatus("error");
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, crossOrigin, defaultAspect]);

  // Tỉ lệ hiển thị (display px / natural px) — dùng để quy đổi con trỏ.
  const measureScale = useCallback(() => {
    const el = stageImgRef.current;
    if (!el || !natural) return;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setScale(rect.width / natural.w);
  }, [natural]);

  useLayoutEffect(() => {
    if (status !== "ready") return;
    measureScale();
    const el = stageImgRef.current;
    if (!el || typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureScale);
      return () => window.removeEventListener("resize", measureScale);
    }
    const ro = new ResizeObserver(() => measureScale());
    ro.observe(el);
    window.addEventListener("resize", measureScale);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measureScale);
    };
  }, [status, measureScale]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const applyAspect = useCallback(
    (preset: AspectPreset) => {
      setAspectId(preset.id);
      if (!natural) return;
      setCrop((prev) => {
        if (!prev || preset.ratio == null) {
          return preset.ratio == null
            ? prev ?? maxCropForAspect(natural.w, natural.h, null)
            : maxCropForAspect(natural.w, natural.h, preset.ratio);
        }
        // Giữ tâm vùng cắt hiện tại, ép về tỉ lệ mới, gọn trong ảnh.
        const cx = prev.x + prev.w / 2;
        const cy = prev.y + prev.h / 2;
        let w = prev.w;
        let h = w / preset.ratio;
        if (h > natural.h) {
          h = natural.h;
          w = h * preset.ratio;
        }
        if (w > natural.w) {
          w = natural.w;
          h = w / preset.ratio;
        }
        let x = cx - w / 2;
        let y = cy - h / 2;
        x = clamp(x, 0, natural.w - w);
        y = clamp(y, 0, natural.h - h);
        return { x, y, w, h };
      });
    },
    [natural],
  );

  const onPointerDownBox = useCallback(
    (e: ReactPointerEvent) => {
      if (!crop) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      dragRef.current = {
        mode: "move",
        startX: e.clientX,
        startY: e.clientY,
        startCrop: crop,
      };
    },
    [crop],
  );

  const onPointerDownHandle = useCallback(
    (e: ReactPointerEvent, dir: ResizeDir) => {
      if (!crop) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      dragRef.current = {
        mode: "resize",
        dir,
        startX: e.clientX,
        startY: e.clientY,
        startCrop: crop,
      };
    },
    [crop],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const drag = dragRef.current;
      if (!drag || !natural || scale <= 0) return;
      const ndx = (e.clientX - drag.startX) / scale;
      const ndy = (e.clientY - drag.startY) / scale;
      const s = drag.startCrop;

      if (drag.mode === "move") {
        const x = clamp(s.x + ndx, 0, natural.w - s.w);
        const y = clamp(s.y + ndy, 0, natural.h - s.h);
        setCrop({ x, y, w: s.w, h: s.h });
        return;
      }

      const dir = drag.dir!;
      if (activeRatio != null) {
        // Giữ tỉ lệ: neo ở góc đối diện, con trỏ kéo góc còn lại.
        const anchorRight = dir.includes("w");
        const anchorBottom = dir.includes("n");
        const anchorX = anchorRight ? s.x + s.w : s.x;
        const anchorY = anchorBottom ? s.y + s.h : s.y;
        const movingX0 = anchorRight ? s.x : s.x + s.w;
        const movingY0 = anchorBottom ? s.y : s.y + s.h;
        const px = clamp(movingX0 + ndx, 0, natural.w);
        const py = clamp(movingY0 + ndy, 0, natural.h);
        const dx = Math.abs(px - anchorX);
        const dy = Math.abs(py - anchorY);
        let w = Math.max(dx, dy * activeRatio);
        let h = w / activeRatio;
        const maxW = anchorRight ? anchorX : natural.w - anchorX;
        const maxH = anchorBottom ? anchorY : natural.h - anchorY;
        if (w > maxW) {
          w = maxW;
          h = w / activeRatio;
        }
        if (h > maxH) {
          h = maxH;
          w = h * activeRatio;
        }
        w = Math.max(w, MIN_CROP_PX);
        h = w / activeRatio;
        const x = anchorRight ? anchorX - w : anchorX;
        const y = anchorBottom ? anchorY - h : anchorY;
        setCrop({ x, y, w, h });
        return;
      }

      // Tự do: chỉnh từng cạnh độc lập.
      let left = s.x;
      let top = s.y;
      let right = s.x + s.w;
      let bottom = s.y + s.h;
      if (dir.includes("w")) left = clamp(s.x + ndx, 0, right - MIN_CROP_PX);
      if (dir.includes("e"))
        right = clamp(s.x + s.w + ndx, left + MIN_CROP_PX, natural.w);
      if (dir.includes("n")) top = clamp(s.y + ndy, 0, bottom - MIN_CROP_PX);
      if (dir.includes("s"))
        bottom = clamp(s.y + s.h + ndy, top + MIN_CROP_PX, natural.h);
      setCrop({ x: left, y: top, w: right - left, h: bottom - top });
    },
    [natural, scale, activeRatio],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleConfirm = useCallback(async () => {
    const img = imgElRef.current;
    if (!img || !crop) return;
    setSaving(true);
    try {
      let outW = Math.round(crop.w);
      let outH = Math.round(crop.h);
      const longest = Math.max(outW, outH);
      if (longest > MAX_OUTPUT_EDGE) {
        const k = MAX_OUTPUT_EDGE / longest;
        outW = Math.round(outW * k);
        outH = Math.round(outH * k);
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, outW);
      canvas.height = Math.max(1, outH);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Trình duyệt không hỗ trợ canvas.");
      if (mimeType === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        crop.x,
        crop.y,
        crop.w,
        crop.h,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), mimeType, 0.92);
      });
      if (!blob) throw new Error("Không tạo được ảnh đã cắt.");
      const base = fileName.replace(/\.[^.]+$/, "") || "image";
      const file = new File([blob], `${base}-cropped.${outputExtForMime(mimeType)}`, {
        type: mimeType,
      });
      onConfirm(file);
    } catch {
      setStatus("error");
      setSaving(false);
    }
  }, [crop, fileName, mimeType, onConfirm]);

  if (!mounted || typeof document === "undefined") return null;

  const dispCrop =
    crop && scale > 0
      ? {
          x: crop.x * scale,
          y: crop.y * scale,
          w: crop.w * scale,
          h: crop.h * scale,
        }
      : null;

  const handles: ResizeDir[] = activeRatio
    ? ["nw", "ne", "se", "sw"]
    : ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  return createPortal(
    <div
      className="ed-crop-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="ed-crop-modal">
        <div className="ed-crop-head">
          <span className="ed-crop-icon" aria-hidden>
            <Crop size={18} strokeWidth={1.8} />
          </span>
          <div className="ed-crop-titles">
            <h3 className="ed-crop-title">{title}</h3>
            <p className="ed-crop-sub">
              Chọn tỉ lệ có sẵn hoặc cắt tự do — kéo khung để chỉnh vùng ảnh.
            </p>
          </div>
          <button
            type="button"
            className="ed-crop-close"
            onClick={onCancel}
            aria-label="Đóng"
          >
            <X size={18} strokeWidth={1.9} aria-hidden />
          </button>
        </div>

        <div className="ed-crop-presets">
          {ASPECT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`ed-crop-preset${preset.id === aspectId ? " is-active" : ""}`}
              onClick={() => applyAspect(preset)}
              disabled={status !== "ready"}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="ed-crop-stage-wrap">
          {status === "loading" ? (
            <div className="ed-crop-state">
              <RotateCw size={22} strokeWidth={1.8} className="mc-spin" aria-hidden />
              <span>Đang tải ảnh…</span>
            </div>
          ) : null}
          {status === "error" ? (
            <div className="ed-crop-state ed-crop-state--error">
              <span>Không tải hoặc xử lý được ảnh này để cắt.</span>
              <span className="ed-crop-state-hint">
                Ảnh có thể chặn truy cập chéo — thử tải ảnh mới rồi cắt.
              </span>
            </div>
          ) : null}
          {status === "ready" ? (
            <div className="ed-crop-stage">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={stageImgRef}
                src={src}
                alt=""
                className="ed-crop-img"
                draggable={false}
                onLoad={measureScale}
                {...(crossOrigin ? { crossOrigin: "anonymous" as const } : {})}
              />
              {dispCrop ? (
                <div
                  className="ed-crop-overlay"
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                >
                  <div
                    className="ed-crop-shade"
                    style={{
                      clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${dispCrop.x}px ${dispCrop.y}px, ${dispCrop.x}px ${dispCrop.y + dispCrop.h}px, ${dispCrop.x + dispCrop.w}px ${dispCrop.y + dispCrop.h}px, ${dispCrop.x + dispCrop.w}px ${dispCrop.y}px, ${dispCrop.x}px ${dispCrop.y}px)`,
                    }}
                  />
                  <div
                    className="ed-crop-box"
                    style={{
                      left: dispCrop.x,
                      top: dispCrop.y,
                      width: dispCrop.w,
                      height: dispCrop.h,
                    }}
                    onPointerDown={onPointerDownBox}
                  >
                    <span className="ed-crop-third ed-crop-third--v1" />
                    <span className="ed-crop-third ed-crop-third--v2" />
                    <span className="ed-crop-third ed-crop-third--h1" />
                    <span className="ed-crop-third ed-crop-third--h2" />
                    {handles.map((dir) => (
                      <span
                        key={dir}
                        className={`ed-crop-handle ed-crop-handle--${dir}`}
                        onPointerDown={(e) => onPointerDownHandle(e, dir)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="ed-crop-foot">
          {crop && natural ? (
            <span className="ed-crop-dims">
              {Math.round(crop.w)} × {Math.round(crop.h)} px
            </span>
          ) : (
            <span className="ed-crop-dims" />
          )}
          <div className="ed-crop-foot-actions">
            <button
              type="button"
              className="ed-crop-btn ed-crop-btn--ghost"
              onClick={onCancel}
            >
              Huỷ
            </button>
            <button
              type="button"
              className="ed-crop-btn ed-crop-btn--primary"
              onClick={handleConfirm}
              disabled={status !== "ready" || saving || !crop}
            >
              {saving ? (
                <RotateCw size={15} strokeWidth={2} className="mc-spin" aria-hidden />
              ) : (
                <Check size={15} strokeWidth={2.2} aria-hidden />
              )}
              {saving ? "Đang cắt…" : "Cắt & dùng ảnh"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
