"use client";

import { ImagePlus, Loader2, ScanLine, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { captureVideoFrameAsFile } from "@/lib/journey/capture-video-frame";
import { videoCanvasRatioClass } from "@/lib/journey/video-canvas-ratio";
import type { VideoCanvasRatio } from "@/lib/journey/video-canvas-ratio";

type Props = {
  videoSrc: string | null;
  videoCanvasRatio?: VideoCanvasRatio | null;
  disabled?: boolean;
  disabledHint?: string | null;
  onCaptureFrame: (file: File) => void;
  onUploadImage: (file: File) => void;
  onError?: (message: string) => void;
  /** Hiện thumbnail (`cover_id`) trong thân bài khi xem. */
  showCoverInPost?: boolean;
  onShowCoverInPostChange?: (next: boolean) => void;
};

export function EditorVideoThumbnailPicker({
  videoSrc,
  videoCanvasRatio = null,
  disabled = false,
  disabledHint = null,
  onCaptureFrame,
  onUploadImage,
  onError,
  showCoverInPost = false,
  onShowCoverInPostChange,
}: Props) {
  const sliderId = useId();
  const showCoverToggleId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickingFrame, setPickingFrame] = useState(false);
  const [duration, setDuration] = useState(0);
  const [scrubTime, setScrubTime] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const canvasClass = videoCanvasRatioClass(videoCanvasRatio);
  const canScrub = Boolean(videoSrc?.trim()) && !disabled;

  useEffect(() => {
    setDuration(0);
    setScrubTime(0);
    setPickingFrame(false);
  }, [videoSrc]);

  const syncScrubToVideo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const safe =
      Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(Math.max(0, time), video.duration)
        : Math.max(0, time);
    if (Math.abs(video.currentTime - safe) > 0.04) {
      video.currentTime = safe;
    }
  }, []);

  async function handleUseCurrentFrame() {
    if (!videoSrc?.trim() || capturing) return;
    setCapturing(true);
    try {
      const file = await captureVideoFrameAsFile(videoSrc, scrubTime);
      onCaptureFrame(file);
    } catch (e) {
      onError?.(
        e instanceof Error
          ? e.message
          : "Không chọn được frame — thử tải ảnh thumbnail riêng.",
      );
    } finally {
      setCapturing(false);
    }
  }

  return (
    <div className="ed-minimal-video-thumb">
      <div className="ed-minimal-video-thumb-head">
        <ScanLine size={18} strokeWidth={1.8} aria-hidden />
        <span className="ed-minimal-video-thumb-head-text">
          <span className="ed-minimal-video-thumb-title">Thumbnail video</span>
          <span className="ed-minimal-video-thumb-hint">
            {pickingFrame
              ? "Kéo thanh để chọn frame — không bắt buộc"
              : "Chọn frame từ video hoặc tải ảnh riêng — không bắt buộc"}
          </span>
        </span>
      </div>

      {pickingFrame ? (
        <>
          {canScrub ? (
            <div className={`ed-minimal-video-thumb-scrub ${canvasClass}`.trim()}>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                className="ed-minimal-video-thumb-video"
                src={videoSrc!}
                crossOrigin={
                  videoSrc!.startsWith("blob:") ? undefined : "anonymous"
                }
                preload="metadata"
                muted
                playsInline
                onLoadedMetadata={(e) => {
                  const nextDuration = e.currentTarget.duration;
                  if (!Number.isFinite(nextDuration) || nextDuration <= 0) return;
                  setDuration(nextDuration);
                  setScrubTime(0);
                  e.currentTarget.currentTime = 0;
                }}
              />
              <label
                className="ed-minimal-video-thumb-slider-wrap"
                htmlFor={sliderId}
              >
                <span className="ed-minimal-video-thumb-slider-label">
                  Vị trí frame
                </span>
                <input
                  id={sliderId}
                  type="range"
                  className="ed-minimal-video-thumb-slider"
                  min={0}
                  max={duration > 0 ? duration : 1}
                  step={duration > 0 ? Math.max(0.05, duration / 200) : 0.1}
                  value={Math.min(scrubTime, duration > 0 ? duration : scrubTime)}
                  disabled={duration <= 0 || capturing}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setScrubTime(next);
                    syncScrubToVideo(next);
                  }}
                />
              </label>
            </div>
          ) : (
            <p className="ed-minimal-video-thumb-wait">
              {disabledHint ??
                "Video chưa sẵn sàng để chọn frame — thử lại sau hoặc tải ảnh riêng."}
            </p>
          )}

          <div className="ed-minimal-video-thumb-actions">
            <button
              type="button"
              className="ed-btn ghost ed-minimal-tool"
              disabled={!canScrub || capturing || duration <= 0}
              onClick={() => void handleUseCurrentFrame()}
            >
              {capturing ? (
                <Loader2
                  size={15}
                  strokeWidth={2}
                  className="ed-spin"
                  aria-hidden
                />
              ) : (
                <ScanLine size={15} strokeWidth={2} aria-hidden />
              )}
              Dùng frame này
            </button>
            <button
              type="button"
              className="ed-btn ghost ed-minimal-tool"
              disabled={capturing}
              onClick={() => {
                setPickingFrame(false);
                setDuration(0);
                setScrubTime(0);
              }}
            >
              <X size={15} strokeWidth={2} aria-hidden />
              Đóng
            </button>
          </div>
        </>
      ) : (
        <div className="ed-minimal-video-thumb-actions">
          <button
            type="button"
            className="ed-btn ghost ed-minimal-tool"
            disabled={capturing || !canScrub}
            title={
              !canScrub
                ? (disabledHint ?? "Chưa có video để chọn frame")
                : undefined
            }
            onClick={() => {
              if (!canScrub) return;
              setPickingFrame(true);
            }}
          >
            <ScanLine size={15} strokeWidth={2} aria-hidden />
            Dùng thumbnail video
          </button>
          <button
            type="button"
            className="ed-btn ghost ed-minimal-tool"
            disabled={capturing}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus size={15} strokeWidth={2} aria-hidden />
            Tải ảnh lên
          </button>
        </div>
      )}

      {onShowCoverInPostChange ? (
        <label
          className="ed-show-cover-in-post"
          htmlFor={showCoverToggleId}
        >
          <input
            id={showCoverToggleId}
            type="checkbox"
            className="ed-show-cover-in-post-input"
            checked={showCoverInPost}
            onChange={(e) => onShowCoverInPostChange(e.target.checked)}
          />
          <span className="ed-show-cover-in-post-text">
            Hiển thị thumbnail trong bài viết
          </span>
        </label>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: "none" }}
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onUploadImage(file);
        }}
      />
    </div>
  );
}
