"use client";

import { useCallback, useRef, useState } from "react";

const MAX_RIVE_BYTES = 15 * 1024 * 1024;

type UploadResponse = {
  url?: string;
  key?: string;
  error?: string;
};

export function useEditorRiveFileUpload() {
  const [riveAssetUrl, setRiveAssetUrl] = useState("");
  const [riveUploading, setRiveUploading] = useState(false);
  const [riveUploadError, setRiveUploadError] = useState<string | null>(null);
  const [riveUploadProgress, setRiveUploadProgress] = useState(0);
  const uploadSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const uploadRiveFile = useCallback(async (file: File) => {
    const fileName = file.name.trim().toLowerCase();

    if (!fileName.endsWith(".riv")) {
      setRiveUploadError("File không phải .riv.");
      setRiveUploading(false);
      return;
    }
    if (file.size > MAX_RIVE_BYTES) {
      setRiveUploadError("File .riv quá lớn (giới hạn 15MB).");
      setRiveUploading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++uploadSeqRef.current;

    setRiveUploading(true);
    setRiveUploadError(null);
    setRiveAssetUrl("");
    setRiveUploadProgress(0);

    try {
      const form = new FormData();
      form.append("file", file, file.name || "animation.riv");

      const res = await fetch("/api/post-rive/upload", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });

      if (controller.signal.aborted || seq !== uploadSeqRef.current) return;

      const json = (await res.json()) as UploadResponse;
      if (!res.ok || !json.url) {
        throw new Error(json.error || "Upload file .riv thất bại.");
      }

      setRiveAssetUrl(json.url);
      setRiveUploadProgress(100);
    } catch (e) {
      if (controller.signal.aborted || seq !== uploadSeqRef.current) return;
      if (e instanceof DOMException && e.name === "AbortError") return;
      setRiveUploadError(
        e instanceof Error ? e.message : "Upload file .riv thất bại.",
      );
      setRiveUploadProgress(0);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      if (!controller.signal.aborted && seq === uploadSeqRef.current) {
        setRiveUploading(false);
      }
    }
  }, []);

  return {
    riveAssetUrl,
    riveUploading,
    riveUploadError,
    riveUploadProgress,
    uploadRiveFile,
  };
}
