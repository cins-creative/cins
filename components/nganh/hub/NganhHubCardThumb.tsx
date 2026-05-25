"use client";

import { useEffect, useRef, useState } from "react";

import { updateNganhHubCover } from "@/app/nganh/actions";
import {
  useNganhHubEdit,
  useNganhHubRefresh,
} from "@/components/nganh/hub/NganhHubEditContext";
import { rememberCfAccountHashFromDeliveryUrl } from "@/lib/cloudflare/account-hash";
import { getCoverUrl } from "@/lib/articles/cover";
import type { NganhHubItem } from "@/lib/nganh/types";

type Props = {
  item: NganhHubItem;
  title: string;
};

function thumbLabel(item: NganhHubItem, title: string): string {
  const code = item.ma_nganh?.trim();
  if (code) return code;
  const w = title.split(/\s+/).filter(Boolean);
  if (w.length >= 2) {
    return `${w[0]!.slice(0, 1)}${w[1]!.slice(0, 1)}`.toUpperCase();
  }
  return title.slice(0, 2).toUpperCase() || "NH";
}

function resolveThumbSrc(
  item: NganhHubItem,
  override: string | null,
): string | null {
  return override ?? item.cover_src ?? getCoverUrl(item.cover_id);
}

function imageFileFromClipboard(data: DataTransfer | null): File | null {
  if (!data) return null;
  const fromFiles = data.files?.[0];
  if (fromFiles?.type.startsWith("image/")) return fromFiles;
  for (const entry of data.items) {
    if (entry.type.startsWith("image/")) {
      const f = entry.getAsFile();
      if (f) return f;
    }
  }
  return null;
}

export function NganhHubCardThumb({ item, title }: Props) {
  const hub = useNganhHubEdit();
  const refresh = useNganhHubRefresh();
  const inputRef = useRef<HTMLInputElement>(null);
  const blobRef = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryUrl, setDeliveryUrl] = useState<string | null>(() =>
    resolveThumbSrc(item, null),
  );

  const canEdit = Boolean(hub?.isEditing);
  const thumbSrc = resolveThumbSrc(item, deliveryUrl);
  const hasThumb = Boolean(thumbSrc);

  useEffect(() => {
    const resolved = resolveThumbSrc(item, null);
    setDeliveryUrl(resolved);
    setError(null);
  }, [item.cover_id, item.cover_src]);

  useEffect(() => {
    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, []);

  const uploadFile = async (file: File) => {
    if (!canEdit || busy) return;
    setError(null);
    setBusy(true);

    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
    const objectUrl = URL.createObjectURL(file);
    blobRef.current = objectUrl;
    setDeliveryUrl(objectUrl);

    const fd = new FormData();
    fd.append("file", file);

    const res = await updateNganhHubCover(item.id, fd);

    if (!res.ok) {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      setDeliveryUrl(resolveThumbSrc(item, null));
      setError(res.message);
      hub?.showToast(res.message);
      setBusy(false);
      return;
    }

    rememberCfAccountHashFromDeliveryUrl(res.cover_url);
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
    setDeliveryUrl(res.cover_url);
    hub?.showToast("Đã cập nhật ảnh thẻ ngành.");
    refresh();
    setBusy(false);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void uploadFile(f);
  };

  const openPicker = (e?: React.SyntheticEvent) => {
    if (!canEdit || busy) return;
    e?.preventDefault();
    e?.stopPropagation();
    inputRef.current?.click();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if (!canEdit || busy) return;
    const f = imageFileFromClipboard(e.clipboardData);
    if (f) {
      e.preventDefault();
      e.stopPropagation();
      void uploadFile(f);
    }
  };

  return (
    <div
      className={[
        "hn-role-thumb",
        canEdit ? "hn-role-thumb--editable" : "",
        hasThumb ? "hn-role-thumb--has-img" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      tabIndex={canEdit ? 0 : undefined}
      onPaste={canEdit ? onPaste : undefined}
      onClick={canEdit && hasThumb ? () => openPicker() : undefined}
      onKeyDown={
        canEdit && hasThumb
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openPicker();
              }
            }
          : undefined
      }
      aria-label={
        canEdit
          ? hasThumb
            ? `Ảnh thẻ ngành: ${title}. Bấm để đổi ảnh hoặc dán ảnh mới (Ctrl+V).`
            : `Ảnh thẻ ngành: ${title}. Dán ảnh (Ctrl+V) hoặc chọn file.`
          : undefined
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={onPick}
      />

      {hasThumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbSrc!}
          alt=""
          className="career-hub-card-img hn-nganh-thumb-img"
          loading="lazy"
          decoding="async"
        />
      ) : canEdit ? (
        <div className="career-hub-card-ph hn-nganh-card-ph career-hub-card-ph--editor">
          <span className="hn-nganh-thumb-label">{thumbLabel(item, title)}</span>
          <span className="career-hub-card-ph-hint">
            {busy ? "Đang tải lên…" : "Dán ảnh (Ctrl+V) hoặc chọn file"}
          </span>
        </div>
      ) : (
        <div className="career-hub-card-ph hn-nganh-card-ph" aria-hidden>
          <span className="hn-nganh-thumb-label">{thumbLabel(item, title)}</span>
        </div>
      )}

      {canEdit ? (
        <div
          className={
            hasThumb
              ? "hn-hub-thumb-actions hn-hub-thumb-actions--overlay"
              : "hn-hub-thumb-actions"
          }
        >
          <button
            type="button"
            className="hn-hub-thumb-pick-btn"
            disabled={busy}
            onClick={openPicker}
          >
            {busy ? "Đang tải…" : hasThumb ? "Đổi ảnh" : "Chọn ảnh"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="hn-hub-thumb-err" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

