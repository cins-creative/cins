"use client";

import { Calendar, ImageUp, Loader2, Sparkles, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import { congDongBannerImageUrl, congDongImageUrl } from "@/lib/cong-dong/images";
import type {
  CongDongEventRailConfig,
  CongDongEventRailDisplay,
  CongDongEventRailHistoryItem,
} from "@/lib/cong-dong/types";

type Tab = "default" | "scheduled" | "history";

/** Copy seed cũ — hiển thị form trống (placeholder) thay vì pre-fill. */
const LEGACY_DEFAULT_TITLE = "Sự kiện cộng đồng";
const LEGACY_DEFAULT_MOTA = "Workshop, talkshow và meetup từ nhóm.";

const EVENT_BANNER_IMAGE_HINT =
  "Ảnh dọc tỉ lệ 1:2 — khuyến nghị 520×1040 px (cột hiển thị ~260×520), JPG/PNG/WebP, tối đa 5MB.";

function toOptionalFormText(
  value: string | null | undefined,
  legacyDefault: string,
): string {
  const trimmed = value?.trim() ?? "";
  return trimmed === legacyDefault ? "" : trimmed;
}

type Props = {
  open: boolean;
  onClose: () => void;
  orgId: string;
  config: CongDongEventRailConfig;
  display: CongDongEventRailDisplay;
  onSaved: (next: {
    config: CongDongEventRailConfig;
    display: CongDongEventRailDisplay;
  }) => void;
};

function formatScheduledWhen(batDau: string, ketThuc: string): string {
  const fmt = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${fmt.format(new Date(batDau))} → ${fmt.format(new Date(ketThuc))}`;
}

function formatHistoryWhen(item: CongDongEventRailHistoryItem): string {
  const fmt = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${fmt.format(new Date(item.batDau))} → ${fmt.format(new Date(item.ketThuc))}`;
}

async function uploadBannerImage(
  file: File,
): Promise<{ imageId: string; url: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/cover/upload", { method: "POST", body: fd });
  const json = (await res.json().catch(() => null)) as {
    imageId?: string;
    url?: string;
    error?: string;
  } | null;
  if (!res.ok || !json?.imageId || !json.url) {
    throw new Error(json?.error ?? "Không tải được ảnh.");
  }
  return { imageId: json.imageId, url: json.url };
}

function BannerPreview({
  coverId,
  previewUrl,
  title,
  emptyLabel = "Ảnh mặc định",
}: {
  coverId: string | null;
  previewUrl?: string | null;
  title: string;
  emptyLabel?: string;
}) {
  const src =
    previewUrl?.trim() ||
    congDongBannerImageUrl(coverId);
  const label = title.trim() || emptyLabel;
  return (
    <div className={`cd-v4-event-edit-preview${src ? " has-img" : ""}`}>
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt={label} />
      ) : (
        <div className="cd-v4-event-edit-preview-fallback" aria-hidden>
          <Sparkles size={24} strokeWidth={1.6} />
          <span>{label}</span>
        </div>
      )}
    </div>
  );
}

export function CongDongEventRailEditorModal({
  open,
  onClose,
  orgId,
  config,
  display,
  onSaved,
}: Props) {
  const titleId = useId();
  const defaultFileId = useId();
  const scheduledFileId = useId();
  const [tab, setTab] = useState<Tab>("default");
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [defTitle, setDefTitle] = useState(() =>
    toOptionalFormText(config.macDinh.tieuDe, LEGACY_DEFAULT_TITLE),
  );
  const [defMoTa, setDefMoTa] = useState(() =>
    toOptionalFormText(config.macDinh.moTa, LEGACY_DEFAULT_MOTA),
  );
  const [defCoverId, setDefCoverId] = useState(config.macDinh.coverId);
  const [defPreviewUrl, setDefPreviewUrl] = useState<string | null>(null);

  const [schTitle, setSchTitle] = useState("");
  const [schMoTa, setSchMoTa] = useState("");
  const [schCoverId, setSchCoverId] = useState<string | null>(null);
  const [schPreviewUrl, setSchPreviewUrl] = useState<string | null>(null);
  const [schBatDau, setSchBatDau] = useState("");
  const [schKetThuc, setSchKetThuc] = useState("");

  useEffect(() => {
    if (!open) return;
    setTab("default");
    setErr(null);
    setDefTitle(toOptionalFormText(config.macDinh.tieuDe, LEGACY_DEFAULT_TITLE));
    setDefMoTa(
      toOptionalFormText(config.macDinh.moTa, LEGACY_DEFAULT_MOTA),
    );
    setDefCoverId(config.macDinh.coverId);
    setDefPreviewUrl(null);
    setSchTitle("");
    setSchMoTa("");
    setSchCoverId(null);
    setSchPreviewUrl(null);
    setSchBatDau("");
    setSchKetThuc("");
  }, [open, config]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const patch = useCallback(
    (body: Record<string, unknown>) => {
      setErr(null);
      startTransition(async () => {
        const res = await fetch(`/api/cong-dong/${orgId}/event-rail`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json().catch(() => null)) as {
          config?: CongDongEventRailConfig;
          display?: CongDongEventRailDisplay;
          error?: string;
        } | null;
        if (!res.ok || !json?.config || !json.display) {
          setErr(json?.error ?? "Không lưu được.");
          return;
        }
        onSaved({ config: json.config, display: json.display });
      });
    },
    [orgId, onSaved],
  );

  const onPickImage = async (
    file: File | undefined,
    target: "default" | "scheduled",
  ) => {
    if (!file) return;
    setErr(null);
    const localPreview = URL.createObjectURL(file);
    if (target === "default") setDefPreviewUrl(localPreview);
    else setSchPreviewUrl(localPreview);
    setUploading(true);
    try {
      const { imageId, url } = await uploadBannerImage(file);
      if (target === "default") {
        setDefCoverId(imageId);
        setDefPreviewUrl(url);
      } else {
        setSchCoverId(imageId);
        setSchPreviewUrl(url);
      }
    } catch (e) {
      if (target === "default") setDefPreviewUrl(null);
      else setSchPreviewUrl(null);
      setErr(e instanceof Error ? e.message : "Không tải được ảnh.");
    } finally {
      URL.revokeObjectURL(localPreview);
      setUploading(false);
    }
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="cd-v4-event-edit-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="cd-v4-event-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cd-v4-event-edit-head">
          <h2 id={titleId} className="cd-v4-event-edit-title">
            Banner sự kiện
          </h2>
          <button
            type="button"
            className="cd-v4-event-edit-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className="cd-v4-event-edit-tabs" role="tablist" aria-label="Phần chỉnh sửa">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "default"}
            className={tab === "default" ? "is-on" : undefined}
            onClick={() => setTab("default")}
          >
            Mặc định
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "scheduled"}
            className={tab === "scheduled" ? "is-on" : undefined}
            onClick={() => setTab("scheduled")}
          >
            Chiến dịch mới
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "history"}
            className={tab === "history" ? "is-on" : undefined}
            onClick={() => setTab("history")}
          >
            Lịch sử ({config.lichSu.length})
          </button>
        </div>

        <div className="cd-v4-event-edit-body">
          {tab === "default" ? (
            <form
              className="cd-v4-event-edit-form"
              onSubmit={(e) => {
                e.preventDefault();
                patch({
                  kind: "default",
                  tieuDe: defTitle.trim(),
                  moTa: defMoTa.trim() || null,
                  coverId: defCoverId,
                });
              }}
            >
              <div className="cd-v4-event-edit-form-layout">
                <div className="cd-v4-event-edit-preview-col">
                  <BannerPreview
                    coverId={defCoverId}
                    previewUrl={defPreviewUrl}
                    title={defTitle}
                    emptyLabel="Ảnh mặc định"
                  />
                  <label className="cd-v4-event-edit-upload">
                    <input
                      id={defaultFileId}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="cd-v4-sr-only"
                      disabled={uploading || pending}
                      onChange={(e) => {
                        void onPickImage(e.target.files?.[0], "default");
                        e.target.value = "";
                      }}
                    />
                    <ImageUp size={16} strokeWidth={2} aria-hidden />
                    {uploading ? "Đang tải…" : "Thay ảnh mặc định"}
                  </label>
                </div>
                <div className="cd-v4-event-edit-fields-col">
                  <p className="cd-v4-event-edit-hint">
                    Banner mặc định hiển thị khi không có chiến dịch đang chạy — không
                    cần ngày hết hạn. {EVENT_BANNER_IMAGE_HINT} Tiêu đề và mô tả là
                    tùy chọn; để trống thì chỉ hiện ảnh.
                  </p>
                  <label className="cd-v4-event-edit-field">
                    <span>Tiêu đề (tùy chọn)</span>
                    <input
                      value={defTitle}
                      onChange={(e) => setDefTitle(e.target.value)}
                      maxLength={120}
                      placeholder="VD: Workshop Motion Design"
                    />
                  </label>
                  <label className="cd-v4-event-edit-field">
                    <span>Mô tả ngắn (tùy chọn)</span>
                    <textarea
                      value={defMoTa}
                      onChange={(e) => setDefMoTa(e.target.value)}
                      rows={4}
                      maxLength={280}
                      placeholder="Thêm mô tả sự kiện nếu cần"
                    />
                  </label>
                  <button type="submit" className="cd-v4-event-edit-save" disabled={pending}>
                    {pending ? "Đang lưu…" : "Lưu banner mặc định"}
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          {tab === "scheduled" ? (
            <form
              className="cd-v4-event-edit-form"
              onSubmit={(e) => {
                e.preventDefault();
                patch({
                  kind: "scheduled",
                  tieuDe: schTitle,
                  moTa: schMoTa || null,
                  coverId: schCoverId,
                  batDau: schBatDau ? new Date(schBatDau).toISOString() : "",
                  ketThuc: schKetThuc ? new Date(schKetThuc).toISOString() : "",
                });
              }}
            >
              <div className="cd-v4-event-edit-form-layout">
                <div className="cd-v4-event-edit-preview-col">
                  <BannerPreview
                    coverId={schCoverId}
                    previewUrl={schPreviewUrl}
                    title={schTitle}
                    emptyLabel="Ảnh chiến dịch"
                  />
                  <label className="cd-v4-event-edit-upload">
                    <input
                      id={scheduledFileId}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="cd-v4-sr-only"
                      disabled={uploading || pending}
                      onChange={(e) => {
                        void onPickImage(e.target.files?.[0], "scheduled");
                        e.target.value = "";
                      }}
                    />
                    <ImageUp size={16} strokeWidth={2} aria-hidden />
                    {uploading ? "Đang tải…" : "Chọn ảnh chiến dịch *"}
                  </label>
                </div>
                <div className="cd-v4-event-edit-fields-col">
                  <p className="cd-v4-event-edit-hint">
                    Mỗi chiến dịch cần thời gian bắt đầu và kết thúc; hết hạn sẽ
                    tự lưu vào lịch sử. {EVENT_BANNER_IMAGE_HINT}
                  </p>
                  {config.dangChay ? (
                    <div className="cd-v4-event-edit-active">
                      <p className="cd-v4-event-edit-active-label">Đang lên lịch / chạy</p>
                      <strong>{config.dangChay.tieuDe}</strong>
                      <span>
                        {formatScheduledWhen(
                          config.dangChay.batDau,
                          config.dangChay.ketThuc,
                        )}
                      </span>
                      <button
                        type="button"
                        className="cd-v4-event-edit-cancel"
                        disabled={pending}
                        onClick={() => patch({ kind: "cancel_scheduled" })}
                      >
                        Hủy chiến dịch hiện tại
                      </button>
                    </div>
                  ) : null}
                  <label className="cd-v4-event-edit-field">
                    <span>Tiêu đề *</span>
                    <input
                      value={schTitle}
                      onChange={(e) => setSchTitle(e.target.value)}
                      maxLength={120}
                      required
                    />
                  </label>
                  <label className="cd-v4-event-edit-field">
                    <span>Mô tả</span>
                    <textarea
                      value={schMoTa}
                      onChange={(e) => setSchMoTa(e.target.value)}
                      rows={3}
                      maxLength={280}
                    />
                  </label>
                  <div className="cd-v4-event-edit-dates">
                    <label className="cd-v4-event-edit-field">
                      <span>Bắt đầu hiển thị *</span>
                      <input
                        type="datetime-local"
                        value={schBatDau}
                        onChange={(e) => setSchBatDau(e.target.value)}
                        required
                      />
                    </label>
                    <label className="cd-v4-event-edit-field">
                      <span>Kết thúc *</span>
                      <input
                        type="datetime-local"
                        value={schKetThuc}
                        onChange={(e) => setSchKetThuc(e.target.value)}
                        required
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="cd-v4-event-edit-save"
                    disabled={pending || !schCoverId}
                  >
                    {pending ? "Đang lưu…" : "Lên lịch chiến dịch"}
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          {tab === "history" ? (
            <div className="cd-v4-event-edit-history">
              {config.lichSu.length === 0 ? (
                <p className="cd-v4-event-edit-hint">
                  Chưa có chiến dịch nào kết thúc. Sau khi hết hạn, banner tự
                  chuyển vào đây.
                </p>
              ) : (
                <ul className="cd-v4-event-edit-history-list">
                  {config.lichSu.map((item) => {
                    const src = item.coverId
                      ? congDongImageUrl(item.coverId, "thumbnail")
                      : null;
                    return (
                      <li key={`${item.id}-${item.luuLuc}`}>
                        {src ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={src} alt="" className="cd-v4-event-edit-history-thumb" />
                        ) : (
                          <span className="cd-v4-event-edit-history-thumb is-empty" aria-hidden />
                        )}
                        <div>
                          <strong>{item.tieuDe}</strong>
                          <span>
                            <Calendar size={12} strokeWidth={2} aria-hidden />
                            {formatHistoryWhen(item)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}

          {display.source === "scheduled" ? (
            <p className="cd-v4-event-edit-live">
              Đang hiển thị: chiến dịch «{display.tieuDe}»
            </p>
          ) : null}

          {err ? <p className="cd-v4-event-edit-err">{err}</p> : null}
          {pending || uploading ? (
            <p className="cd-v4-event-edit-busy" aria-live="polite">
              <Loader2 size={14} className="cd-v4-spin" aria-hidden />
              Đang xử lý…
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
