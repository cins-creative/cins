"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useTruongInlineEdit } from "@/components/truong/inline/TruongInlineEditContext";
import {
  HINH_ANH_LOAI_OPTIONS,
  normalizeHinhAnhLoai,
  type HinhAnhLoai,
} from "@/lib/truong/hinh-anh";
import { readTruongInlineError, truongInlineFetch } from "@/lib/truong/inline-api";
import type { TruongHinhAnh } from "@/lib/truong/types";

type UploadTask = {
  id: string;
  previewUrl: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

function imageFilesFromDataTransfer(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  return Array.from(dt.files).filter((f) => f.type.startsWith("image/"));
}

type Props = {
  onNotify: (msg: string) => void;
  defaultLoai?: HinhAnhLoai;
};

export function TruongHinhAnhUploadPanel({
  onNotify,
  defaultLoai = "khuon_vien",
}: Props) {
  const ctx = useTruongInlineEdit();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadLoai, setUploadLoai] = useState<HinhAnhLoai>(defaultLoai);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const nextThuTuRef = useRef(0);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  useEffect(() => {
    if (ctx) nextThuTuRef.current = ctx.hinhanh.length;
  }, [ctx, ctx?.hinhanh.length]);

  useEffect(() => {
    return () => {
      for (const t of tasksRef.current) {
        if (t.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(t.previewUrl);
        }
      }
    };
  }, []);

  const setProgress = useCallback((id: string, progress: number) => {
    setTasks((list) =>
      list.map((t) => (t.id === id ? { ...t, progress } : t)),
    );
  }, []);

  const uploadOne = useCallback(
    async (file: File, taskId: string) => {
      if (!ctx) return;

      const bump = (p: number) => setProgress(taskId, p);

      try {
        bump(12);
        const up = await ctx.uploadImage(file);
        if (!up) {
          onNotify("Tải ảnh Cloudflare thất bại");
          setTasks((list) =>
            list.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    status: "error",
                    error: "Tải Cloudflare thất bại",
                    progress: 0,
                  }
                : t,
            ),
          );
          return;
        }

        bump(48);
        const thu_tu = nextThuTuRef.current;
        const tmpId = `tmp-${taskId}`;
        const optimistic: TruongHinhAnh = {
          id: tmpId,
          cloudflare_id: up.imageId,
          caption: null,
          loai: uploadLoai,
          thu_tu,
          src: up.url,
        };
        const prev = ctx.hinhanh;
        ctx.setHinhanh((list) => [...list, optimistic]);
        nextThuTuRef.current = thu_tu + 1;

        bump(72);
        const res = await truongInlineFetch(ctx.orgId, "/hinh-anh", {
          method: "POST",
          body: JSON.stringify({
            cloudflare_id: up.imageId,
            loai: uploadLoai,
            thu_tu,
          }),
        });

        if (!res.ok) {
          ctx.setHinhanh(prev);
          nextThuTuRef.current = prev.length;
          const msg = await readTruongInlineError(res);
          onNotify(`Lưu ảnh thất bại: ${msg}`);
          setTasks((list) =>
            list.map((t) =>
              t.id === taskId
                ? { ...t, status: "error", error: msg, progress: 0 }
                : t,
            ),
          );
          return;
        }

        bump(92);
        const json = (await res.json()) as { photo: TruongHinhAnh };
        ctx.setHinhanh((list) =>
          list.map((p) =>
            p.id === tmpId ? { ...json.photo, src: up.url } : p,
          ),
        );

        setTasks((list) =>
          list.map((t) =>
            t.id === taskId
              ? { ...t, status: "done", progress: 100, previewUrl: up.url }
              : t,
          ),
        );
      } catch {
        setTasks((list) =>
          list.map((t) =>
            t.id === taskId
              ? { ...t, status: "error", error: "Lỗi mạng", progress: 0 }
              : t,
          ),
        );
      }
    },
    [ctx, onNotify, setProgress, uploadLoai],
  );

  const enqueueFiles = useCallback(
    (files: File[]) => {
      if (!files.length || !ctx) return;

      for (const file of files) {
        const id =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `up-${Date.now()}-${Math.random()}`;
        const previewUrl = URL.createObjectURL(file);
        setTasks((list) => [
          ...list,
          {
            id,
            previewUrl,
            progress: 0,
            status: "uploading",
          },
        ]);
        void uploadOne(file, id);
      }
    },
    [ctx, uploadOne],
  );

  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const files = imageFilesFromDataTransfer(e.clipboardData);
      if (!files.length) return;
      const t = e.target as HTMLElement | null;
      if (
        t?.closest(
          'input:not([type="file"]), textarea, select, [contenteditable="true"]',
        )
      ) {
        return;
      }
      e.preventDefault();
      enqueueFiles(files);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [enqueueFiles]);

  const busy = tasks.some((t) => t.status === "uploading");

  return (
    <div className="cins-multi-image tdh-hinhanh-upload-panel">
      <label className="tdh-hinhanh-upload-loai-field">
        <span>Loại hình ảnh</span>
        <select
          className="tdh-hinhanh-upload-loai-select"
          value={uploadLoai}
          disabled={busy}
          onChange={(e) =>
            setUploadLoai(normalizeHinhAnhLoai(e.target.value))
          }
        >
          {HINH_ANH_LOAI_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      {tasks.length > 0 ? (
        <ul className="tdh-hinhanh-upload-queue" aria-live="polite">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`tdh-hinhanh-upload-item tdh-hinhanh-upload-item--${task.status}`}
            >
              <div className="tdh-hinhanh-upload-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={task.previewUrl}
                  alt=""
                  className="tdh-hinhanh-upload-thumb-img"
                  style={{
                    opacity: task.status === "done" ? 1 : 0.5,
                  }}
                />
                {task.status === "uploading" ? (
                  <div className="tdh-hinhanh-upload-progress" aria-hidden>
                    <div
                      className="tdh-hinhanh-upload-progress-bar"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                ) : null}
                {task.status === "error" ? (
                  <span className="tdh-hinhanh-upload-error" title={task.error}>
                    Lỗi
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

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
        aria-label="+ Thêm ảnh"
        aria-busy={busy}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          enqueueFiles(imageFilesFromDataTransfer(e.dataTransfer));
        }}
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
          {busy ? "Đang tải lên…" : "+ Thêm ảnh"}
        </span>
        <span className="cins-multi-image__dropzone-hint">
          Kéo thả hoặc chọn file — dán ảnh (Ctrl+V) bất kỳ đâu trong hộp thoại
        </span>
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
            if (picked.length) enqueueFiles(picked);
          }}
        />
      </div>
    </div>
  );
}
