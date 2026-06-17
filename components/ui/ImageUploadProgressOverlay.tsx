import { Check, Loader2 } from "lucide-react";

type Props = {
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
  /** Nhãn ngắn — mặc định hiện %. */
  label?: string;
};

export function ImageUploadProgressOverlay({
  progress,
  status,
  error,
  label,
}: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  if (status === "done") {
    return (
      <div
        className="img-upload-progress is-done"
        role="status"
        aria-live="polite"
      >
        <span className="img-upload-progress-label">
          <Check size={13} strokeWidth={2.5} aria-hidden />
          Đã tải xong
        </span>
      </div>
    );
  }

  const text =
    status === "error"
      ? error || "Lỗi tải ảnh"
      : label ?? (pct >= 100 ? "Đang hoàn tất…" : `Đang tải… ${pct}%`);

  return (
    <div
      className={`img-upload-progress${status === "error" ? " is-error" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy={status === "uploading"}
    >
      {status === "uploading" ? (
        <>
          <div className="img-upload-progress-track" aria-hidden>
            <div
              className="img-upload-progress-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="img-upload-progress-label">
            {pct >= 100 ? (
              <Loader2
                size={12}
                strokeWidth={2}
                className="ed-spin"
                aria-hidden
              />
            ) : null}
            {text}
          </span>
        </>
      ) : (
        <span className="img-upload-progress-label">{text}</span>
      )}
    </div>
  );
}
