"use client";

type Props = {
  progress: number;
};

export function JourneyThemeUploadProgress({ progress }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const finishing = pct >= 100;

  return (
    <div
      className="j-theme-upload-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={finishing ? "Đang hoàn tất ảnh" : "Đang tải ảnh"}
    >
      <div className="j-theme-upload-progress-track" aria-hidden>
        <div
          className="j-theme-upload-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="j-theme-upload-progress-pct">
        {finishing ? "…" : `${pct}%`}
      </span>
    </div>
  );
}
