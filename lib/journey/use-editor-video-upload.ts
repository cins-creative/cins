"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  registerVideoUpload,
  releaseVideoUpload,
} from "@/lib/journey/video-upload-session";
import {
  probeVideoFileCanvasRatio,
  type VideoCanvasRatio,
} from "@/lib/journey/video-canvas-ratio";
import {
  createVideoTusUpload,
  prepareResponseIsStream,
  prepareResponseIsValid,
  type VideoPrepareResponse,
} from "@/lib/video/upload-tus";

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const ENCODE_POLL_MS = 5_000;

export function useEditorVideoUpload() {
  const [videoUrl, setVideoUrl] = useState("");
  const [bunnyVideoId, setBunnyVideoId] = useState<string | null>(null);
  const [videoProvider, setVideoProvider] = useState<"bunny" | "stream" | null>(
    null,
  );
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [videoEncodeReady, setVideoEncodeReady] = useState(false);
  const [localVideoPreviewUrl, setLocalVideoPreviewUrl] = useState<
    string | null
  >(null);
  const [videoCanvasRatio, setVideoCanvasRatio] =
    useState<VideoCanvasRatio | null>(null);

  const uploadSessionRef = useRef(0);
  const activeUploadRef = useRef<{ abort: () => void } | null>(null);
  const pendingBunnyRef = useRef<{ videoId: string; embedUrl: string } | null>(
    null,
  );
  const uploadLockRef = useRef(false);

  const abortActiveVideoUpload = useCallback(() => {
    activeUploadRef.current?.abort();
    activeUploadRef.current = null;
    const pending = pendingBunnyRef.current;
    if (pending) {
      releaseVideoUpload(pending.videoId);
      pendingBunnyRef.current = null;
    }
  }, []);

  const clearVideoUpload = useCallback(() => {
    uploadSessionRef.current += 1;
    abortActiveVideoUpload();
    uploadLockRef.current = false;
    setVideoUrl("");
    setBunnyVideoId(null);
    setVideoProvider(null);
    setVideoUploading(false);
    setVideoUploadProgress(0);
    setVideoUploadError(null);
    setVideoEncodeReady(false);
    setVideoCanvasRatio(null);
    setLocalVideoPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
  }, [abortActiveVideoUpload]);

  useEffect(
    () => () => {
      abortActiveVideoUpload();
      setLocalVideoPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
    },
    [abortActiveVideoUpload],
  );

  useEffect(() => {
    if (!bunnyVideoId || videoEncodeReady || videoUploading) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch(
          `/api/post-video/status?videoId=${encodeURIComponent(bunnyVideoId!)}${
            videoProvider ? `&provider=${videoProvider}` : ""
          }`,
          { cache: "no-store" },
        );
        if (!res.ok || cancelled) {
          schedule();
          return;
        }
        const json = (await res.json()) as { ready?: boolean };
        if (json.ready) {
          setVideoEncodeReady(true);
          return;
        }
      } catch {
        /* thử lại vòng sau */
      }
      schedule();
    }

    function schedule() {
      if (!cancelled) {
        timer = setTimeout(() => void poll(), ENCODE_POLL_MS);
      }
    }

    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [bunnyVideoId, videoProvider, videoEncodeReady, videoUploading]);

  const uploadVideoFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/")) {
        setVideoUploadError("File không phải video.");
        return;
      }
      if (file.size > MAX_VIDEO_BYTES) {
        setVideoUploadError("Video quá lớn (giới hạn 500MB).");
        return;
      }

      const session = ++uploadSessionRef.current;
      abortActiveVideoUpload();
      uploadLockRef.current = true;

      setVideoUploading(true);
      setVideoUploadError(null);
      setVideoUrl("");
      setBunnyVideoId(null);
      setVideoProvider(null);
      setVideoUploadProgress(0);
      setVideoEncodeReady(false);
      setVideoCanvasRatio(null);
      setLocalVideoPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });

      try {
        const canvasRatio = await probeVideoFileCanvasRatio(file);
        if (session !== uploadSessionRef.current) return;
        setVideoCanvasRatio(canvasRatio);

        const prepRes = await fetch("/api/post-video/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: file.name }),
        });
        const prep = (await prepRes.json()) as VideoPrepareResponse;
        if (session !== uploadSessionRef.current) return;
        if (!prepRes.ok || !prepareResponseIsValid(prep)) {
          throw new Error(prep.error || "Không chuẩn bị được upload video.");
        }

        const videoId = prep.videoId!;
        const embedUrl = prep.embedUrl!;
        const provider: "bunny" | "stream" = prepareResponseIsStream(prep)
          ? "stream"
          : "bunny";

        pendingBunnyRef.current = { videoId, embedUrl };

        /* Cho phép Journey preview / scrub dùng id + embed ngay — không chờ tus xong. */
        setVideoProvider(provider);
        setBunnyVideoId(videoId);
        setVideoUrl(embedUrl);

        const upload = await createVideoTusUpload(file, prep, {
          onProgress: (bytesUploaded, bytesTotal) => {
            if (session !== uploadSessionRef.current) return;
            if (bytesTotal <= 0) return;
            setVideoUploadProgress(
              Math.min(100, Math.round((bytesUploaded / bytesTotal) * 100)),
            );
          },
          onError: (err) => {
            if (session !== uploadSessionRef.current) return;
            releaseVideoUpload(videoId);
            pendingBunnyRef.current = null;
            activeUploadRef.current = null;
            uploadLockRef.current = false;
            setVideoUploading(false);
            setVideoUploadProgress(0);
            setVideoUploadError(
              err instanceof Error ? err.message : "Upload video thất bại.",
            );
          },
          onSuccess: () => {
            if (session !== uploadSessionRef.current) return;
            releaseVideoUpload(videoId);
            pendingBunnyRef.current = null;
            activeUploadRef.current = null;
            uploadLockRef.current = false;
            setVideoUploadProgress(100);
            setVideoProvider(provider);
            setBunnyVideoId(videoId);
            setVideoUrl(embedUrl);
            setVideoUploading(false);
            // Giữ blob local để pick thumbnail / scrub — không chờ encode.
          },
        });
        if (session !== uploadSessionRef.current) return;

        activeUploadRef.current = upload;
        registerVideoUpload(videoId, upload);
        upload.start();
      } catch (e) {
        if (session !== uploadSessionRef.current) return;
        pendingBunnyRef.current = null;
        activeUploadRef.current = null;
        uploadLockRef.current = false;
        setVideoUploadError(
          e instanceof Error ? e.message : "Upload video thất bại.",
        );
        setVideoUploading(false);
        setVideoUploadProgress(0);
      }
    },
    [abortActiveVideoUpload],
  );

  const videoEncoding =
    Boolean(bunnyVideoId) && !videoEncodeReady && !videoUploading;

  return {
    videoUrl,
    bunnyVideoId,
    videoId: bunnyVideoId,
    videoProvider,
    videoUploading,
    videoUploadProgress,
    videoUploadError,
    videoEncodeReady,
    videoEncoding,
    localVideoPreviewUrl,
    videoCanvasRatio,
    uploadVideoFile,
    abortActiveVideoUpload,
    clearVideoUpload,
  };
}
