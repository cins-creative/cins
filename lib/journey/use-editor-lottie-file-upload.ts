"use client";

import { useCallback, useRef, useState } from "react";

const MAX_LOTTIE_BYTES = 15 * 1024 * 1024;

type UploadResponse = {
  url?: string;
  key?: string;
  error?: string;
};

export function useEditorLottieFileUpload() {
  const [lottieAssetUrl, setLottieAssetUrl] = useState("");
  const [lottieUploading, setLottieUploading] = useState(false);
  const [lottieUploadError, setLottieUploadError] = useState<string | null>(
    null,
  );
  const [lottieUploadProgress, setLottieUploadProgress] = useState(0);
  const uploadSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const uploadLottieFile = useCallback(async (file: File) => {
    const fileName = file.name.trim().toLowerCase();
    const okExt =
      fileName.endsWith(".lottie") || fileName.endsWith(".json");

    if (!okExt) {
      setLottieUploadError("File không phải .lottie hoặc .json.");
      setLottieUploading(false);
      return;
    }
    if (file.size > MAX_LOTTIE_BYTES) {
      setLottieUploadError("File Lottie quá lớn (giới hạn 15MB).");
      setLottieUploading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++uploadSeqRef.current;

    setLottieUploading(true);
    setLottieUploadError(null);
    setLottieAssetUrl("");
    setLottieUploadProgress(0);

    try {
      const form = new FormData();
      form.append("file", file, file.name || "animation.lottie");

      const res = await fetch("/api/post-lottie/upload", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });

      if (controller.signal.aborted || seq !== uploadSeqRef.current) return;

      const json = (await res.json()) as UploadResponse;
      if (!res.ok || !json.url) {
        throw new Error(json.error || "Upload file Lottie thất bại.");
      }

      setLottieAssetUrl(json.url);
      setLottieUploadProgress(100);
    } catch (e) {
      if (controller.signal.aborted || seq !== uploadSeqRef.current) return;
      if (e instanceof DOMException && e.name === "AbortError") return;
      setLottieUploadError(
        e instanceof Error ? e.message : "Upload file Lottie thất bại.",
      );
      setLottieUploadProgress(0);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      if (!controller.signal.aborted && seq === uploadSeqRef.current) {
        setLottieUploading(false);
      }
    }
  }, []);

  return {
    lottieAssetUrl,
    lottieUploading,
    lottieUploadError,
    lottieUploadProgress,
    uploadLottieFile,
  };
}
