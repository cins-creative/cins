"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

import {
  AVATAR_CROP_VIEWPORT,
  cropImageToSquareFile,
  type NaturalSize,
  type SquareCropState,
} from "@/lib/images/crop-square";

type Props = {
  open: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onApplyPreview: (file: File, previewUrl: string) => void;
  onPickAnother: () => void;
};

const DEFAULT_CROP: SquareCropState = { zoom: 1, offsetX: 0, offsetY: 0 };

export function TruongAvatarCropModal({
  open,
  imageSrc,
  onClose,
  onApplyPreview,
  onPickAnother,
}: Props) {
  const [natural, setNatural] = useState<NaturalSize | null>(null);
  const [crop, setCrop] = useState<SquareCropState>(DEFAULT_CROP);
  const [busy, setBusy] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setCrop(DEFAULT_CROP);
    setNatural(null);
  }, [open, imageSrc]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!natural) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        baseX: crop.offsetX,
        baseY: crop.offsetY,
      };
    },
    [crop.offsetX, crop.offsetY, natural],
  );

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    setCrop((c) => ({
      ...c,
      offsetX: d.baseX + (e.clientX - d.startX),
      offsetY: d.baseY + (e.clientY - d.startY),
    }));
  }, []);

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  async function applyCrop() {
    if (!imageSrc || !natural) return;
    setBusy(true);
    try {
      const { file, previewUrl } = await cropImageToSquareFile(
        imageSrc,
        crop,
        natural,
      );
      onApplyPreview(file, previewUrl);
      onClose();
    } catch {
      /* parent may toast */
    } finally {
      setBusy(false);
    }
  }

  if (!open || !imageSrc || typeof document === "undefined") return null;

  const baseScale = natural
    ? Math.max(
        AVATAR_CROP_VIEWPORT / natural.width,
        AVATAR_CROP_VIEWPORT / natural.height,
      )
    : 1;
  const scale = baseScale * crop.zoom;
  const imgW = natural ? natural.width * scale : AVATAR_CROP_VIEWPORT;
  const imgH = natural ? natural.height * scale : AVATAR_CROP_VIEWPORT;

  return createPortal(
    <div
      className="tdh-inline-modal-backdrop tdh-avatar-crop-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="tdh-inline-modal tdh-avatar-crop-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tdh-avatar-crop-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="tdh-avatar-crop-title" className="tdh-inline-modal-title">
          Cắt logo trường
        </h2>
        <p className="tdh-avatar-crop-lead">
          Kéo để căn chỉnh, zoom để phóng to. Bấm «Áp dụng» để xem trước trên
          trang — chưa đăng lên máy chủ.
        </p>

        <div
          className="tdh-avatar-crop-stage"
          style={{ width: AVATAR_CROP_VIEWPORT, height: AVATAR_CROP_VIEWPORT }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img
            src={imageSrc}
            alt=""
            className="tdh-avatar-crop-img"
            draggable={false}
            style={{
              width: imgW,
              height: imgH,
              transform: `translate(calc(-50% + ${crop.offsetX}px), calc(-50% + ${crop.offsetY}px))`,
            }}
            onLoad={(e) => {
              const el = e.currentTarget;
              setNatural({ width: el.naturalWidth, height: el.naturalHeight });
            }}
          />
          <div className="tdh-avatar-crop-frame" aria-hidden />
        </div>

        <label className="tdh-avatar-crop-zoom">
          <span>Phóng to</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.02}
            value={crop.zoom}
            onChange={(e) =>
              setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))
            }
          />
        </label>

        <div className="tdh-inline-modal-actions tdh-avatar-crop-actions">
          <button
            type="button"
            className="tdh-inline-btn ghost"
            onClick={onClose}
            disabled={busy}
          >
            Hủy
          </button>
          <button
            type="button"
            className="tdh-inline-btn ghost"
            onClick={onPickAnother}
            disabled={busy}
          >
            Thay đổi
          </button>
          <button
            type="button"
            className="tdh-inline-btn primary"
            onClick={() => void applyCrop()}
            disabled={busy || !natural}
          >
            {busy ? "Đang xử lý…" : "Áp dụng"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
