"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Props = {
  careerId: string;
  thumbnailUrl: string | null;
  editorEnabled: boolean;
};

export function CareerHubCardThumb({
  careerId,
  thumbnailUrl,
  editorEnabled,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const token = process.env.NEXT_PUBLIC_CAREER_THUMB_UPLOAD_TOKEN;
  const canEdit =
    editorEnabled && typeof token === "string" && token.length > 0;

  const displaySrc = preview ?? thumbnailUrl ?? undefined;

  const uploadFile = async (file: File) => {
    if (!canEdit || busy) return;
    setLocalError(null);
    setBusy(true);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("careerId", careerId);

      const res = await fetch("/api/career-thumbnail", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };

      URL.revokeObjectURL(objectUrl);

      if (!res.ok) {
        setPreview(null);
        setLocalError(data.error ?? `Lỗi ${res.status}`);
        return;
      }

      setPreview(null);
      router.refresh();
    } catch {
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
      setLocalError("Mạng hoặc máy chủ không phản hồi.");
    } finally {
      setBusy(false);
    }
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void uploadFile(f);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if (!canEdit || busy) return;
    const f = e.clipboardData.files?.[0];
    if (f && f.type.startsWith("image/")) {
      e.preventDefault();
      e.stopPropagation();
      void uploadFile(f);
    }
  };

  const onThumbClick = (e: React.MouseEvent) => {
    if (!canEdit || busy || thumbnailUrl) return;
    e.preventDefault();
    e.stopPropagation();
    inputRef.current?.click();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!canEdit || busy || thumbnailUrl) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      inputRef.current?.click();
    }
  };

  return (
    <div className="career-hub-card-thumb">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={onPickFiles}
      />
      {displaySrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displaySrc}
          alt=""
          className="career-hub-card-img"
        />
      ) : (
        <div
          className={
            canEdit
              ? "career-hub-card-ph career-hub-card-ph--editor"
              : "career-hub-card-ph"
          }
          tabIndex={canEdit && !thumbnailUrl ? 0 : undefined}
          role={canEdit && !thumbnailUrl ? "button" : undefined}
          aria-label={
            canEdit && !thumbnailUrl
              ? "Chọn hoặc dán ảnh đại diện nghề"
              : undefined
          }
          onClick={onThumbClick}
          onKeyDown={onKeyDown}
          onPaste={canEdit ? onPaste : undefined}
        >
          {canEdit && !thumbnailUrl ? (
            <span className="career-hub-card-ph-hint">
              {busy ? "Đang tải lên…" : "Bấm chọn ảnh hoặc dán (Ctrl+V)"}
            </span>
          ) : null}
        </div>
      )}
      {localError ? (
        <p className="career-hub-card-ph-err" role="alert">
          {localError}
        </p>
      ) : null}
      {editorEnabled && !token ? (
        <p className="career-hub-card-ph-err">
          Thiếu NEXT_PUBLIC_CAREER_THUMB_UPLOAD_TOKEN (trùng giá trị
          CAREER_THUMB_UPLOAD_TOKEN trên server).
        </p>
      ) : null}
    </div>
  );
}
