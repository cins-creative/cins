"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { resolveEditorialImageUrl } from "@/lib/nganh/editorialImage";
import { uploadNganhInlineImage } from "@/lib/nganh/upload-inline-image";

export type InlineMultiImageGalleryProps = {
  images: string[];
  onChange: (images: string[]) => void;
  onNotify?: (message: string) => void;
  resolveImageUrl?: (src: string) => string;
  uploadImage?: (
    file: File,
  ) => Promise<{ ok: true; url: string } | { ok: false; message: string }>;
  maxImages?: number;
  className?: string;
  dropzoneLabel?: string;
  dropzoneHint?: string;
  /** Lắng nghe Ctrl+V trên toàn document (vd. khi modal đang mở). */
  globalPaste?: boolean;
};

function normalizeImages(items: string[]): string[] {
  return items.map((s) => s.trim()).filter(Boolean);
}

function imageFilesFromDataTransfer(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  const out: File[] = [];
  for (const file of dt.files) {
    if (file.type.startsWith("image/")) out.push(file);
  }
  return out;
}

function isFileDragEvent(e: React.DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes("Files");
}

function pasteTargetIsTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'input:not([type="file"]), textarea, select, [contenteditable="true"]',
    ),
  );
}

export function InlineMultiImageGallery({
  images,
  onChange,
  onNotify,
  resolveImageUrl = resolveEditorialImageUrl,
  uploadImage = uploadNganhInlineImage,
  maxImages,
  className,
  dropzoneLabel = "Thêm ảnh",
  dropzoneHint = "Kéo thả, dán (Ctrl+V) hoặc chọn file — tự tải lên Cloudflare",
  globalPaste = false,
}: InlineMultiImageGalleryProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const list = images;
  const canAddMore =
    maxImages === undefined ? true : list.length < maxImages;

  const commit = useCallback(
    (next: string[]) => {
      onChange(normalizeImages(next));
    },
    [onChange],
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || !canAddMore || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      const added: string[] = [];
      let lastError: string | null = null;
      const slotsLeft =
        maxImages === undefined ? files.length : maxImages - list.length;

      try {
        for (const file of files.slice(0, Math.max(0, slotsLeft))) {
          const r = await uploadImage(file);
          if (r.ok) added.push(r.url);
          else lastError = r.message;
        }

        if (added.length) {
          commit([...list, ...added]);
          onNotify?.(
            added.length === 1
              ? "Đã thêm 1 ảnh"
              : `Đã thêm ${added.length} ảnh`,
          );
        }
        if (lastError) onNotify?.(lastError);
      } catch (err) {
        const raw = err instanceof Error ? err.message : "";
        onNotify?.(
          raw === "Failed to fetch"
            ? "Không kết nối được dev server — reload trang hoặc chạy lại npm run dev."
            : raw || "Tải ảnh thất bại — thử lại",
        );
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [canAddMore, commit, list, maxImages, onNotify, uploadImage],
  );

  const uploadFilesRef = useRef(uploadFiles);
  uploadFilesRef.current = uploadFiles;

  const canAddMoreRef = useRef(canAddMore);
  canAddMoreRef.current = canAddMore;

  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    if (!globalPaste) return;

    function handleDocumentPaste(e: ClipboardEvent) {
      if (busyRef.current || !canAddMoreRef.current) return;
      if (pasteTargetIsTextField(e.target)) return;
      const files = imageFilesFromDataTransfer(e.clipboardData);
      if (!files.length) return;
      e.preventDefault();
      void uploadFilesRef.current(files);
    }

    document.addEventListener("paste", handleDocumentPaste);
    return () => document.removeEventListener("paste", handleDocumentPaste);
  }, [globalPaste]);

  function removeAt(index: number) {
    commit(list.filter((_, i) => i !== index));
  }

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
      return;
    }
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    commit(next);
  }

  function clearDragState() {
    setDragIndex(null);
    setDropIndex(null);
  }

  function onPaste(e: React.ClipboardEvent) {
    if (busy || !canAddMore) return;
    const files = imageFilesFromDataTransfer(e.clipboardData);
    if (!files.length) return;
    e.preventDefault();
    void uploadFiles(files);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (busy || !canAddMore) return;
    void uploadFiles(imageFilesFromDataTransfer(e.dataTransfer));
  }

  const rootClass = ["cins-multi-image", className].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      {list.length > 0 ? (
        <p className="cins-multi-image__count" aria-live="polite">
          {list.length} ảnh
          {maxImages !== undefined ? ` / tối đa ${maxImages}` : null}
          {maxImages !== 1 ? (
            <span className="cins-multi-image__count-hint">
              {" "}
              — kéo thumbnail để đổi thứ tự
            </span>
          ) : null}
        </p>
      ) : null}

      {list.length > 0 ? (
        <ul className="cins-multi-image__grid" role="list">
          {list.map((src, index) => (
            <li
              key={`${index}-${src.slice(-24)}`}
              className={[
                "cins-multi-image__item",
                dragIndex === index ? "is-dragging" : "",
                dropIndex === index && dragIndex !== index ? "is-drop-target" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onDragOver={(e) => {
                if (isFileDragEvent(e)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDropIndex(index);
              }}
              onDragEnter={(e) => {
                if (isFileDragEvent(e)) return;
                e.preventDefault();
                setDropIndex(index);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDropIndex((prev) => (prev === index ? null : prev));
              }}
              onDrop={(e) => {
                if (isFileDragEvent(e)) return;
                e.preventDefault();
                const from =
                  dragIndex ??
                  Number.parseInt(e.dataTransfer.getData("text/plain"), 10);
                if (!Number.isNaN(from)) reorder(from, index);
                clearDragState();
              }}
            >
              <div
                className="cins-multi-image__thumb"
                draggable={!busy}
                onDragStart={(e) => {
                  if (busy) {
                    e.preventDefault();
                    return;
                  }
                  setDragIndex(index);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(index));
                }}
                onDragEnd={clearDragState}
                aria-grabbed={dragIndex === index}
                title="Kéo để đổi thứ tự"
              >
                <span className="cins-multi-image__drag-grip" aria-hidden>
                  ⠿
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveImageUrl(src)}
                  alt=""
                  className="cins-multi-image__thumb-img"
                  draggable={false}
                />
                <span className="cins-multi-image__order" aria-hidden>
                  {index + 1}
                </span>
              </div>
              <div className="cins-multi-image__actions">
                <button
                  type="button"
                  className="cins-multi-image__btn cins-multi-image__btn--danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(index);
                  }}
                  aria-label="Xóa ảnh"
                  title="Xóa"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {canAddMore ? (
        <div
          className={[
            "cins-multi-image__dropzone",
            dragOver ? "is-dragover" : "",
            busy ? "is-busy" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          role="button"
          tabIndex={busy ? -1 : 0}
          aria-label={dropzoneLabel}
          aria-busy={busy}
          onPaste={onPaste}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => {
            if (!busy) fileRef.current?.click();
          }}
          onKeyDown={(e) => {
            if (busy) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
        >
          <span className="cins-multi-image__dropzone-icon" aria-hidden>
            +
          </span>
          <span className="cins-multi-image__dropzone-label">
            {busy ? "Đang tải lên…" : dropzoneLabel}
          </span>
          <span className="cins-multi-image__dropzone-hint">{dropzoneHint}</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="cins-multi-image__file-input"
            onChange={(e) => {
              const picked = e.target.files
                ? Array.from(e.target.files).filter((f) =>
                    f.type.startsWith("image/"),
                  )
                : [];
              e.target.value = "";
              if (picked.length) void uploadFiles(picked);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
