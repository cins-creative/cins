"use client";

import {
  Image as ImageIcon,
  ImageUp,
  Loader2,
  RotateCcw,
  RotateCw,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { updateCover } from "@/app/[slug]/journey/actions";

import "./journey-avatar-editor.css";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ JourneyCoverEditor                                               ║
   ║                                                                  ║
   ║ Modal upload / crop / xoay cover (banner sidebar) → Cloudflare    ║
   ║ Images → lưu `cover_id` vào `user_nguoi_dung`. Cùng UX với        ║
   ║ JourneyAvatarEditor nhưng khung crop rectangle 3:1 (output       ║
   ║ canvas 1500×500) thay cho square.                                 ║
   ║                                                                  ║
   ║ Tách file riêng để giữ code rõ ràng, vì avatar editor có vài     ║
   ║ chỗ assume frame vuông (mask radial, ring tròn) — không reuse   ║
   ║ một component qua prop được mà không tăng độ phức tạp.           ║
   ╚══════════════════════════════════════════════════════════════════╝ */

const ACCEPT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp";
const MAX_BYTES = 5 * 1024 * 1024;
const OUTPUT_W = 1500;
const OUTPUT_H = 500;
const CROP_DISPLAY_W = 480;
const CROP_DISPLAY_H = 160;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type Props = {
  open: boolean;
  onClose: () => void;
  currentCoverUrl: string | null;
  hasCover: boolean;
};

type Offset = { x: number; y: number };

export function JourneyCoverEditor({
  open,
  onClose,
  currentCoverUrl,
  hasCover,
}: Props) {
  const router = useRouter();
  const titleId = useId();
  const fileInputId = useId();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [step, setStep] = useState<"pick" | "edit">("pick");
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"upload" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });

  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setStep("pick");
      setImageSrc(null);
      setImgEl(null);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setError(null);
      setBusy(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, busy]);

  /* baseScale: cover khung crop rectangle bằng cách chọn axis hẹp hơn.
     Ảnh portrait → fit theo width, landscape → fit theo height. */
  const swapAxis = rotation === 90 || rotation === 270;
  const naturalW = imgEl?.naturalWidth ?? 0;
  const naturalH = imgEl?.naturalHeight ?? 0;
  const effW = swapAxis ? naturalH : naturalW;
  const effH = swapAxis ? naturalW : naturalH;
  const baseScale = useMemo(() => {
    if (!effW || !effH) return 1;
    return Math.max(CROP_DISPLAY_W / effW, CROP_DISPLAY_H / effH);
  }, [effW, effH]);
  const totalScale = baseScale * zoom;

  const clampOffset = useCallback(
    (next: Offset): Offset => {
      const halfW = (effW * totalScale) / 2;
      const halfH = (effH * totalScale) / 2;
      const limitX = Math.max(halfW - CROP_DISPLAY_W / 2, 0);
      const limitY = Math.max(halfH - CROP_DISPLAY_H / 2, 0);
      return {
        x: Math.min(limitX, Math.max(-limitX, next.x)),
        y: Math.min(limitY, Math.max(-limitY, next.y)),
      };
    },
    [effW, effH, totalScale],
  );

  useEffect(() => {
    setOffset((prev) => clampOffset(prev));
  }, [clampOffset]);

  const acceptFile = useCallback((file: File) => {
    setError(null);
    if (!ACCEPT_TYPES.includes(file.type)) {
      setError("Định dạng chưa hỗ trợ. Hãy chọn JPG, PNG hoặc WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Ảnh quá lớn (giới hạn 5MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : null;
      if (!src) {
        setError("Không đọc được file. Thử lại nhé.");
        return;
      }
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setImgEl(img);
        setZoom(1);
        setRotation(0);
        setOffset({ x: 0, y: 0 });
        setStep("edit");
      };
      img.onerror = () => setError("Ảnh hỏng hoặc không decode được.");
      img.src = src;
    };
    reader.onerror = () => setError("Không đọc được file.");
    reader.readAsDataURL(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
    e.target.value = "";
  };

  const onDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) acceptFile(file);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!imgEl) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: offset.x,
      baseY: offset.y,
    };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    const next = clampOffset({
      x: state.baseX + (e.clientX - state.startX),
      y: state.baseY + (e.clientY - state.startY),
    });
    setOffset(next);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId === e.pointerId) {
      dragStateRef.current = null;
    }
  };

  const handleSave = useCallback(async () => {
    if (!imgEl) return;
    setError(null);
    setBusy("upload");

    /* Crop math:
       Frame rectangle CROP_DISPLAY_W × CROP_DISPLAY_H. Output canvas
       OUTPUT_W × OUTPUT_H — cùng ratio nên scale một số `outScale`
       chung cho cả x lẫn y. */
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_W;
      canvas.height = OUTPUT_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas không khả dụng");

      const outScale = OUTPUT_W / CROP_DISPLAY_W;
      ctx.save();
      ctx.translate(OUTPUT_W / 2, OUTPUT_H / 2);
      ctx.translate(offset.x * outScale, offset.y * outScale);
      ctx.rotate((rotation * Math.PI) / 180);
      const drawW = naturalW * totalScale * outScale;
      const drawH = naturalH * totalScale * outScale;
      ctx.drawImage(imgEl, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const blob = await new Promise<Blob | null>((res) => {
        canvas.toBlob((b) => res(b), "image/jpeg", 0.9);
      });
      if (!blob) throw new Error("Không tạo được ảnh để upload.");

      const fd = new FormData();
      fd.append("file", new File([blob], "cover.jpg", { type: "image/jpeg" }));

      const res = await fetch("/api/cover/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json().catch(() => null)) as {
        imageId?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.imageId) {
        throw new Error(json?.error || "Upload thất bại. Thử lại sau.");
      }

      const saveRes = await updateCover(json.imageId);
      if (!saveRes.ok) {
        throw new Error(saveRes.error || "Lưu cover thất bại.");
      }

      startTransition(() => {
        router.refresh();
      });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra.";
      setError(msg);
      setBusy(null);
    }
  }, [
    imgEl,
    naturalW,
    naturalH,
    totalScale,
    offset.x,
    offset.y,
    rotation,
    onClose,
    router,
  ]);

  const handleDelete = useCallback(async () => {
    if (
      !confirm("Xoá cover hiện tại? Bạn có thể upload ảnh khác bất kỳ lúc nào.")
    ) {
      return;
    }
    setError(null);
    setBusy("delete");
    try {
      const res = await updateCover(null);
      if (!res.ok) throw new Error(res.error);
      startTransition(() => {
        router.refresh();
      });
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Không xoá được cover.";
      setError(msg);
      setBusy(null);
    }
  }, [onClose, router]);

  if (!open || !mounted) return null;

  const imgStyle: React.CSSProperties = imgEl
    ? {
        width: naturalW * totalScale,
        height: naturalH * totalScale,
        transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
        transformOrigin: "center center",
      }
    : {};

  const node = (
    <div
      className="ja-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="ja-sheet ja-sheet--cover">
        <header className="ja-head">
          <h2 id={titleId}>
            <ImageIcon size={18} strokeWidth={1.8} aria-hidden /> Ảnh bìa
          </h2>
          <button
            type="button"
            className="ja-close"
            onClick={onClose}
            disabled={!!busy}
            aria-label="Đóng"
          >
            <X size={18} strokeWidth={1.8} aria-hidden />
          </button>
        </header>

        {step === "pick" ? (
          <div
            className="ja-drop"
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add("is-over");
            }}
            onDragLeave={(e) => e.currentTarget.classList.remove("is-over")}
            onDrop={(e) => {
              e.currentTarget.classList.remove("is-over");
              onDropFile(e);
            }}
          >
            <div className="ja-drop-icon" aria-hidden>
              <ImageUp size={36} strokeWidth={1.4} />
            </div>
            <div className="ja-drop-title">Kéo thả ảnh bìa vào đây</div>
            <div className="ja-drop-sub">hoặc</div>
            <label htmlFor={fileInputId} className="ja-btn ja-btn-primary">
              <ImageUp size={14} strokeWidth={1.8} aria-hidden /> Chọn ảnh từ
              máy
            </label>
            <input
              id={fileInputId}
              type="file"
              accept={ACCEPT_ATTR}
              onChange={onFileChange}
              hidden
            />
            <div className="ja-hint">
              JPG · PNG · WEBP, tối đa 5MB · khuyến nghị 1500×500
            </div>

            {hasCover ? (
              <button
                type="button"
                className="ja-btn ja-btn-danger ja-btn-ghost"
                onClick={handleDelete}
                disabled={!!busy}
              >
                {busy === "delete" ? (
                  <Loader2
                    size={14}
                    className="ja-spin"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                ) : (
                  <Trash2 size={14} strokeWidth={1.8} aria-hidden />
                )}
                Xoá cover hiện tại
              </button>
            ) : null}

            {currentCoverUrl ? (
              <div className="ja-current ja-current--cover">
                <span>Cover hiện tại</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentCoverUrl} alt="Cover hiện tại" />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="ja-edit">
            <div
              className="ja-frame ja-frame--cover"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{ width: CROP_DISPLAY_W, height: CROP_DISPLAY_H }}
            >
              {imageSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={imageSrc}
                  alt=""
                  className="ja-frame-img"
                  draggable={false}
                  style={imgStyle}
                />
              ) : null}
              <div className="ja-frame-ring ja-frame-ring--cover" aria-hidden />
            </div>

            <div className="ja-controls">
              <div className="ja-zoom">
                <button
                  type="button"
                  className="ja-icon-btn"
                  onClick={() =>
                    setZoom((z) =>
                      Math.max(MIN_ZOOM, Number((z - 0.1).toFixed(2))),
                    )
                  }
                  aria-label="Thu nhỏ"
                >
                  <ZoomOut size={16} strokeWidth={1.8} aria-hidden />
                </button>
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  aria-label="Mức zoom"
                />
                <button
                  type="button"
                  className="ja-icon-btn"
                  onClick={() =>
                    setZoom((z) =>
                      Math.min(MAX_ZOOM, Number((z + 0.1).toFixed(2))),
                    )
                  }
                  aria-label="Phóng to"
                >
                  <ZoomIn size={16} strokeWidth={1.8} aria-hidden />
                </button>
              </div>

              <div className="ja-rotate">
                <button
                  type="button"
                  className="ja-icon-btn"
                  onClick={() =>
                    setRotation(
                      (r) =>
                        ((r - 90 + 360) % 360) as 0 | 90 | 180 | 270,
                    )
                  }
                  aria-label="Xoay trái 90°"
                >
                  <RotateCcw size={16} strokeWidth={1.8} aria-hidden />
                </button>
                <button
                  type="button"
                  className="ja-icon-btn"
                  onClick={() =>
                    setRotation(
                      (r) => ((r + 90) % 360) as 0 | 90 | 180 | 270,
                    )
                  }
                  aria-label="Xoay phải 90°"
                >
                  <RotateCw size={16} strokeWidth={1.8} aria-hidden />
                </button>
                <button
                  type="button"
                  className="ja-btn-link"
                  onClick={() => {
                    setZoom(1);
                    setRotation(0);
                    setOffset({ x: 0, y: 0 });
                  }}
                >
                  Đặt lại
                </button>
              </div>
            </div>

            <div className="ja-edit-tips">
              Kéo để dịch ảnh · Thanh trượt để zoom · Nút mũi tên để xoay
            </div>
          </div>
        )}

        {error ? (
          <div className="ja-error" role="alert">
            {error}
          </div>
        ) : null}

        <footer className="ja-foot">
          {step === "edit" ? (
            <>
              <button
                type="button"
                className="ja-btn ja-btn-ghost"
                onClick={() => setStep("pick")}
                disabled={!!busy}
              >
                Đổi ảnh khác
              </button>
              <div className="ja-foot-spacer" />
              <button
                type="button"
                className="ja-btn"
                onClick={onClose}
                disabled={!!busy}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="ja-btn ja-btn-primary"
                onClick={handleSave}
                disabled={!!busy || pending}
              >
                {busy === "upload" ? (
                  <>
                    <Loader2
                      size={14}
                      className="ja-spin"
                      strokeWidth={1.8}
                      aria-hidden
                    />
                    Đang lưu…
                  </>
                ) : (
                  "Lưu cover"
                )}
              </button>
            </>
          ) : (
            <>
              <div className="ja-foot-spacer" />
              <button
                type="button"
                className="ja-btn"
                onClick={onClose}
                disabled={!!busy}
              >
                Đóng
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
