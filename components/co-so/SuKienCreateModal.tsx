"use client";

import { ChevronLeft, ChevronRight, ClipboardPaste, ImagePlus, Loader2, Ticket, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState, type ClipboardEvent } from "react";

import { TruongInlineModal } from "@/components/truong/inline/TruongInlineModal";
import { GioiThieuContentEditor } from "@/components/truong/GioiThieuContentEditor";
import {
  emptyModularWhen,
  isoRangeToModularWhen,
  localDateToIso,
  ModularDateTimeField,
  type ModularWhen,
} from "@/components/common/ModularDateTimeField";
import {
  imageFilesFromClipboard,
  readImageFileFromClipboard,
} from "@/lib/files/clipboard-images";
import {
  LOAI_SU_KIEN_VALUES,
  LOAI_SU_KIEN_LABELS,
  type LoaiSuKien,
  type SuKienCardData,
} from "@/lib/to-chuc/su-kien-constants";
import {
  clearSuKienDraft,
  loadSuKienDraft,
  saveSuKienDraft,
  suKienDraftHasContent,
} from "@/lib/to-chuc/su-kien-draft-storage";
import {
  loaiVeDraftsFromCard,
  loaiVeDraftsToPayload,
  SuKienLoaiVeManager,
  type SuKienLoaiVeDraft,
} from "@/components/co-so/SuKienLoaiVeManager";
import {
  TINH_THANH_SELECT_OPTIONS,
  normalizeTinhThanhForDb,
} from "@/lib/truong/contact";

import "@/styles/article-draft-tiptap.css";
import "@/app/co-so/co-so-page.css";

type Props = {
  open: boolean;
  orgId: string;
  orgDiaChi?: string | null;
  orgTinhThanh?: string | null;
  editing?: SuKienCardData | null;
  onClose: () => void;
  onCreated?: (suKien: SuKienCardData) => void;
  onUpdated?: (suKien: SuKienCardData) => void;
  /** Xóa sự kiện đang sửa — chỉ hiện khi ở chế độ sửa. */
  onDelete?: () => void | Promise<void>;
};

type CoverDraft = {
  imageId: string | null;
  previewUrl: string | null;
  uploading: boolean;
};

export function SuKienCreateModal({
  open,
  orgId,
  orgDiaChi = null,
  orgTinhThanh = null,
  editing = null,
  onClose,
  onCreated,
  onUpdated,
  onDelete,
}: Props) {
  const isEdit = Boolean(editing);
  const titleId = useId();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const defaultTinhThanh =
    normalizeTinhThanhForDb(orgTinhThanh) ??
    TINH_THANH_SELECT_OPTIONS[0]?.value ??
    "hcm";
  const [ten, setTen] = useState("");
  const [loaiSuKien, setLoaiSuKien] = useState<LoaiSuKien>("workshop");
  const [when, setWhen] = useState<ModularWhen>(emptyModularWhen);
  const [tinhThanh, setTinhThanh] = useState(defaultTinhThanh);
  const [diaDiem, setDiaDiem] = useState("");
  const [mienPhi, setMienPhi] = useState(true);
  const [loaiVe, setLoaiVe] = useState<SuKienLoaiVeDraft[]>([]);
  const [cachMuaVe, setCachMuaVe] = useState("");
  const [vePanelOpen, setVePanelOpen] = useState(false);
  const [moTa, setMoTa] = useState("");
  const [noiDung, setNoiDung] = useState("<p></p>");
  const [slotToiDa, setSlotToiDa] = useState("");
  const [cover, setCover] = useState<CoverDraft>({
    imageId: null,
    previewUrl: null,
    uploading: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const reset = useCallback(() => {
    setTen("");
    setLoaiSuKien("workshop");
    setWhen(emptyModularWhen());
    setTinhThanh(defaultTinhThanh);
    setDiaDiem("");
    setMienPhi(true);
    setLoaiVe([]);
    setCachMuaVe("");
    setVePanelOpen(false);
    setMoTa("");
    setNoiDung("<p></p>");
    setSlotToiDa("");
    setCover({ imageId: null, previewUrl: null, uploading: false });
    setError(null);
  }, [defaultTinhThanh]);

  const buildDraftSnapshot = useCallback(
    () => ({
      ten,
      loaiSuKien,
      when,
      tinhThanh,
      diaDiem,
      mienPhi,
      giaVe: "",
      loaiVe: loaiVe.map((v) => ({
        key: v.key,
        ten: v.ten,
        moTa: v.moTa ?? "",
        gia: v.gia,
        coverImageId: v.coverId ?? null,
        coverPreviewUrl: v.coverPreviewUrl ?? null,
      })),
      cachMuaVe,
      moTa,
      noiDung,
      slotToiDa,
      coverImageId: cover.imageId,
      coverPreviewUrl: cover.previewUrl,
    }),
    [
      ten,
      loaiSuKien,
      when,
      tinhThanh,
      diaDiem,
      mienPhi,
      loaiVe,
      cachMuaVe,
      moTa,
      noiDung,
      slotToiDa,
      cover.imageId,
      cover.previewUrl,
    ],
  );

  async function handleCoverPick(file: File) {
    const localPreview = URL.createObjectURL(file);
    setCover({ imageId: null, previewUrl: localPreview, uploading: true });
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/cover/upload", { method: "POST", body: form });
      const json = (await res.json().catch(() => null)) as {
        imageId?: string;
        url?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.imageId) {
        throw new Error(json?.error ?? "Upload ảnh bìa thất bại.");
      }
      setCover({
        imageId: json.imageId,
        previewUrl: json.url ?? localPreview,
        uploading: false,
      });
    } catch (uploadErr) {
      URL.revokeObjectURL(localPreview);
      setCover({ imageId: null, previewUrl: null, uploading: false });
      setError(
        uploadErr instanceof Error
          ? uploadErr.message
          : "Upload ảnh bìa thất bại.",
      );
    }
  }

  function handleCoverPaste(e: ClipboardEvent) {
    const file = imageFilesFromClipboard(e.clipboardData)[0];
    if (!file) return;
    e.preventDefault();
    e.stopPropagation();
    void handleCoverPick(file);
  }

  async function handleCoverPasteClick() {
    if (cover.uploading || submitting) return;
    const file = await readImageFileFromClipboard();
    if (file) {
      void handleCoverPick(file);
      return;
    }
    setError("Không đọc được ảnh từ clipboard — thử Ctrl+V trên khung ảnh bìa.");
  }

  useEffect(() => {
    if (!open) return;
    setConfirmDelete(false);
    if (!editing) {
      const draft = loadSuKienDraft(orgId);
      if (draft && suKienDraftHasContent(draft)) {
        setTen(draft.ten);
        setLoaiSuKien(draft.loaiSuKien);
        setWhen(draft.when);
        setTinhThanh(
          normalizeTinhThanhForDb(draft.tinhThanh) ?? defaultTinhThanh,
        );
        setDiaDiem(draft.diaDiem);
        setMienPhi(draft.mienPhi);
        setLoaiVe(
          draft.loaiVe.map((v) => ({
            key: v.key,
            ten: v.ten,
            moTa: v.moTa,
            gia: v.gia,
            coverId: v.coverImageId,
            coverPreviewUrl: v.coverPreviewUrl,
            thuTu: 0,
          })),
        );
        setCachMuaVe(draft.cachMuaVe ?? "");
        setVePanelOpen(false);
        setMoTa(draft.moTa);
        setNoiDung(draft.noiDung?.trim() || "<p></p>");
        setSlotToiDa(draft.slotToiDa);
        setCover({
          imageId: draft.coverImageId,
          previewUrl: draft.coverPreviewUrl,
          uploading: false,
        });
        setError(null);
        return;
      }
      reset();
      if (orgDiaChi?.trim()) setDiaDiem(orgDiaChi.trim());
      return;
    }
    setTen(editing.ten);
    setLoaiSuKien(editing.loaiSuKien);
    setWhen(isoRangeToModularWhen(editing.batDau, editing.ketThuc));
    setTinhThanh(
      normalizeTinhThanhForDb(editing.tinhThanh) ?? defaultTinhThanh,
    );
    setDiaDiem(editing.diaDiem ?? "");
    setMienPhi(editing.mienPhi);
    setLoaiVe(loaiVeDraftsFromCard(editing.loaiVe ?? []));
    setCachMuaVe(editing.cachMuaVe ?? "");
    setVePanelOpen(false);
    setMoTa(editing.moTa ?? "");
    setNoiDung(editing.noiDung?.trim() || "<p></p>");
    setSlotToiDa(editing.slotToiDa != null ? String(editing.slotToiDa) : "");
    setCover({
      imageId: editing.coverId,
      previewUrl: editing.coverSrc,
      uploading: false,
    });
    setError(null);
  }, [open, editing, reset, orgDiaChi, defaultTinhThanh, orgId]);

  /** Đóng sau khi tạo/sửa thành công — xóa nháp create. */
  function finishAndClose() {
    if (!isEdit) clearSuKienDraft(orgId);
    setConfirmDelete(false);
    reset();
    onClose();
  }

  /** Huỷ / nút X — hỏi có lưu nháp không (chỉ khi tạo mới + có nội dung). */
  function handleCancelClose() {
    if (submitting || deleting) return;
    if (!isEdit) {
      const snap = buildDraftSnapshot();
      if (suKienDraftHasContent(snap)) {
        const save = window.confirm("Bạn muốn lưu nội dung nháp không?");
        if (save) saveSuKienDraft(orgId, snap);
        else clearSuKienDraft(orgId);
      } else {
        clearSuKienDraft(orgId);
      }
    }
    setConfirmDelete(false);
    reset();
    onClose();
  }

  async function handleDelete() {
    if (!onDelete || submitting || deleting) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  function validateClient(): string | null {
    if (!ten.trim()) return "Cần tên sự kiện.";
    if (!when.start.trim()) return "Cần ngày bắt đầu.";
    const start = localDateToIso(when.start);
    const end = localDateToIso(when.end);
    if (!start) return "Ngày bắt đầu không hợp lệ.";
    if (end && new Date(end) < new Date(start)) {
      return "Thời gian kết thúc phải sau thời gian bắt đầu.";
    }
    if (!normalizeTinhThanhForDb(tinhThanh)) {
      return "Cần chọn khu vực tổ chức sự kiện.";
    }
    if (!mienPhi && loaiVe.length === 0) {
      return "Sự kiện tính phí cần ít nhất một loại vé.";
    }
    if (!cover.imageId) return "Cần ảnh bìa sự kiện.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const clientErr = validateClient();
    if (clientErr) {
      setError(clientErr);
      if (!mienPhi && loaiVe.length === 0) setVePanelOpen(true);
      return;
    }

    const slotNum = slotToiDa.trim()
      ? Number.parseInt(slotToiDa.trim(), 10)
      : null;

    const payload = {
      ten: ten.trim(),
      loaiSuKien,
      batDau: localDateToIso(when.start),
      ketThuc: localDateToIso(when.end),
      tinhThanh: normalizeTinhThanhForDb(tinhThanh),
      diaDiem: diaDiem.trim() || null,
      mienPhi,
      loaiVe: mienPhi ? [] : loaiVeDraftsToPayload(loaiVe),
      cachMuaVe: mienPhi ? null : cachMuaVe.trim() || null,
      moTa: moTa.trim() || null,
      noiDung,
      slotToiDa: slotNum,
      coverId: cover.imageId,
    };

    setSubmitting(true);
    try {
      const base = `/api/org/${encodeURIComponent(orgId)}/su-kien`;
      const url =
        isEdit && editing
          ? `${base}/${encodeURIComponent(editing.id)}`
          : base;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        suKien?: SuKienCardData;
        error?: string;
      };
      if (!res.ok || !json.suKien) {
        setError(json.error ?? "Không lưu được sự kiện.");
        return;
      }
      if (isEdit) onUpdated?.(json.suKien);
      else onCreated?.(json.suKien);
      finishAndClose();
    } catch {
      setError("Lỗi mạng — thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TruongInlineModal
      open={open}
      onClose={handleCancelClose}
      className="tdh-inline-modal--wide cso-kh-create-modal"
      labelledBy={titleId}
      showClose={false}
    >
      <div className="cso-kh-create-head">
        <h2 id={titleId} className="tdh-inline-modal-title">
          {vePanelOpen
            ? "Quản lý vé"
            : isEdit
              ? "Sửa sự kiện"
              : "Thêm sự kiện"}
        </h2>
        <button
          type="button"
          className="cso-kh-create-close"
          aria-label={vePanelOpen ? "Quay lại form sự kiện" : "Đóng"}
          onClick={() => {
            if (vePanelOpen) {
              setVePanelOpen(false);
              return;
            }
            handleCancelClose();
          }}
          disabled={submitting}
        >
          {vePanelOpen ? (
            <ChevronLeft size={18} aria-hidden />
          ) : (
            <X size={18} aria-hidden />
          )}
        </button>
      </div>

      <form className="cso-kh-create-form" onSubmit={handleSubmit}>
        <div className="cso-kh-create-body">
          {vePanelOpen ? (
            <>
              <label className="cso-kh-field">
                <span className="cso-kh-label">Cách mua vé</span>
                <textarea
                  className="cso-kh-textarea cso-kh-textarea--short"
                  rows={3}
                  maxLength={2000}
                  value={cachMuaVe}
                  disabled={submitting || deleting}
                  onChange={(e) => setCachMuaVe(e.target.value)}
                  placeholder="Link form, chuyển khoản, inbox fanpage, quầy bán vé…"
                />
                <span className="cso-kh-hint">
                  CINs không thu tiền — ghi rõ cách mua ngoài nền tảng.
                </span>
              </label>

              <SuKienLoaiVeManager
                items={loaiVe}
                onChange={setLoaiVe}
                disabled={submitting || deleting}
              />

              <div className="cso-sk-ve-panel-done">
                <button
                  type="button"
                  className="cso-kh-foot-btn cso-kh-foot-btn--primary"
                  onClick={() => setVePanelOpen(false)}
                  disabled={submitting || deleting}
                >
                  Xong
                </button>
              </div>
            </>
          ) : (
            <>
          <label className="cso-kh-field">
            <span className="cso-kh-label">
              Tên sự kiện <span className="cso-kh-req">*</span>
            </span>
            <input
              type="text"
              className="cso-kh-input"
              value={ten}
              onChange={(e) => setTen(e.target.value)}
              placeholder="VD: Workshop vẽ minh hoạ số"
              maxLength={120}
              required
              autoFocus
            />
          </label>

          <label className="cso-kh-field">
            <span className="cso-kh-label">
              Loại sự kiện <span className="cso-kh-req">*</span>
            </span>
            <select
              className="cso-kh-input"
              value={loaiSuKien}
              onChange={(e) => setLoaiSuKien(e.target.value as LoaiSuKien)}
            >
              {LOAI_SU_KIEN_VALUES.map((v) => (
                <option key={v} value={v}>
                  {LOAI_SU_KIEN_LABELS[v]}
                </option>
              ))}
            </select>
          </label>

          <div className="cso-kh-field">
            <span className="cso-kh-label">
              Ảnh bìa <span className="cso-kh-req">*</span>
            </span>
            <div className="cso-kh-cover-pick cso-kh-cover-pick--full">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="cso-kh-cover-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleCoverPick(file);
                  e.target.value = "";
                }}
              />
              <div
                className={[
                  "cso-kh-cover-preview",
                  "cso-kh-cover-preview--banner",
                  "cso-kh-cover-preview--interactive",
                  "c1",
                  cover.previewUrl ? "has-image" : "",
                  cover.uploading ? "is-uploading" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                tabIndex={0}
                role="group"
                aria-label="Ảnh bìa sự kiện — chọn hoặc dán ảnh"
                onPaste={handleCoverPaste}
              >
                {cover.previewUrl ? (
                  <Image
                    src={cover.previewUrl}
                    alt=""
                    fill
                    className="cso-kh-cover-preview-img"
                    sizes="(max-width: 640px) 100vw, 520px"
                    unoptimized={cover.previewUrl.startsWith("blob:")}
                  />
                ) : (
                  <span className="cso-kh-cover-preview-ph" aria-hidden />
                )}
                <div className="cso-kh-cover-preview-tools">
                  {cover.uploading ? (
                    <span className="cso-kh-cover-tool cso-kh-cover-tool--busy">
                      <Loader2 size={18} className="tdh-spin" aria-hidden />
                      <span className="sr-only">Đang tải ảnh…</span>
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="cso-kh-cover-tool"
                        disabled={submitting}
                        title={
                          cover.previewUrl ? "Đổi ảnh bìa" : "Chọn ảnh bìa"
                        }
                        aria-label={
                          cover.previewUrl ? "Đổi ảnh bìa" : "Chọn ảnh bìa"
                        }
                        onClick={() => coverInputRef.current?.click()}
                      >
                        <ImagePlus size={18} strokeWidth={2} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="cso-kh-cover-tool"
                        disabled={submitting}
                        title="Dán ảnh từ clipboard"
                        aria-label="Dán ảnh từ clipboard"
                        onClick={() => void handleCoverPasteClick()}
                      >
                        <ClipboardPaste size={18} strokeWidth={2} aria-hidden />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="cso-kh-field">
            <span className="cso-kh-label">
              Thời gian <span className="cso-kh-req">*</span>
            </span>
            <ModularDateTimeField
              value={when}
              onChange={setWhen}
              startLabel="Bắt đầu"
              endLabel="Kết thúc"
              addEndLabel="Thêm ngày kết thúc"
              removeEndLabel="Bỏ ngày kết thúc"
              fieldClassName="cso-kh-field"
              labelClassName="cso-kh-label"
              inputClassName="cso-kh-input"
            />
            <p className="cso-kh-field-hint">
              Mặc định chỉ cần chọn ngày. Bật “Thêm giờ cụ thể” nếu sự kiện có
              giờ, hoặc thêm ngày kết thúc nếu diễn ra nhiều ngày.
            </p>
          </div>

          <div
            className={
              mienPhi
                ? "cso-kh-field-row cso-kh-field-row--single"
                : "cso-kh-field-row cso-kh-field-row--ve"
            }
          >
            <label className="cso-kh-field">
              <span className="cso-kh-label">
                Hình thức vé <span className="cso-kh-req">*</span>
              </span>
              <select
                className="cso-kh-input"
                value={mienPhi ? "mien_phi" : "tinh_phi"}
                onChange={(e) => {
                  const nextFree = e.target.value === "mien_phi";
                  if (nextFree && (loaiVe.length > 0 || cachMuaVe.trim())) {
                    const ok = window.confirm(
                      "Chuyển sang miễn phí sẽ xóa các loại vé và cách mua vé đã thêm. Tiếp tục?",
                    );
                    if (!ok) return;
                    setLoaiVe([]);
                    setCachMuaVe("");
                    setVePanelOpen(false);
                  }
                  setMienPhi(nextFree);
                }}
              >
                <option value="mien_phi">Miễn phí</option>
                <option value="tinh_phi">Tính phí</option>
              </select>
            </label>

            {!mienPhi ? (
              <div className="cso-sk-ve-entry cso-sk-ve-entry--inline">
                <span className="cso-kh-label cso-sk-ve-entry-label">
                  Vé &amp; cách mua
                </span>
                <button
                  type="button"
                  className="cso-sk-ve-entry-btn"
                  onClick={() => setVePanelOpen(true)}
                  disabled={submitting || deleting}
                >
                  <span className="cso-sk-ve-entry-icon" aria-hidden>
                    <Ticket size={16} strokeWidth={2} />
                  </span>
                  <span className="cso-sk-ve-entry-copy">
                    <span className="cso-sk-ve-entry-title">Quản lý vé</span>
                    <span className="cso-sk-ve-entry-meta">
                      {loaiVe.length > 0
                        ? `${loaiVe.length} loại`
                        : "Chưa có loại"}
                    </span>
                  </span>
                  <ChevronRight
                    className="cso-sk-ve-entry-chevron"
                    size={16}
                    strokeWidth={2.25}
                    aria-hidden
                  />
                </button>
              </div>
            ) : null}
          </div>

          <label className="cso-kh-field">
            <span className="cso-kh-label">
              Khu vực <span className="cso-kh-req">*</span>
            </span>
            <select
              className="cso-kh-input"
              value={tinhThanh}
              onChange={(e) => setTinhThanh(e.target.value)}
              required
            >
              {TINH_THANH_SELECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="cso-kh-hint">
              Dùng để gợi ý sự kiện tới người học gần khu vực này.
            </span>
          </label>

          <label className="cso-kh-field">
            <span className="cso-kh-label">Địa chỉ chi tiết</span>
            <input
              type="text"
              className="cso-kh-input"
              value={diaDiem}
              onChange={(e) => setDiaDiem(e.target.value)}
              placeholder="Số nhà, quận, link online… (tuỳ chọn)"
            />
          </label>

          <label className="cso-kh-field">
            <span className="cso-kh-label">Mô tả ngắn</span>
            <textarea
              className="cso-kh-textarea cso-kh-textarea--short"
              value={moTa}
              onChange={(e) => setMoTa(e.target.value)}
              placeholder="1–2 câu tóm tắt hiển thị trên card sự kiện (tuỳ chọn)"
              rows={2}
              maxLength={280}
            />
          </label>

          <div className="cso-kh-field cso-kh-field--richtext">
            <span className="cso-kh-label">Nội dung chi tiết</span>
            <p className="cso-kh-field-hint">
              Chương trình, lịch trình, đối tượng tham dự… — hiển thị khi xem
              chi tiết sự kiện.
            </p>
            <GioiThieuContentEditor
              value={noiDung?.trim() || "<p></p>"}
              onChange={setNoiDung}
            />
          </div>

          <label className="cso-kh-field">
            <span className="cso-kh-label">Số lượng tối đa</span>
            <input
              type="number"
              min={0}
              className="cso-kh-input"
              value={slotToiDa}
              onChange={(e) => setSlotToiDa(e.target.value)}
              placeholder="Bỏ trống nếu không giới hạn"
            />
          </label>
            </>
          )}

          {error ? <p className="cso-kh-form-err">{error}</p> : null}
        </div>

        <div className="cso-kh-create-foot">
          {isEdit && onDelete ? (
            <button
              type="button"
              className="cso-kh-foot-btn cso-kh-foot-btn--danger"
              style={{ marginRight: "auto" }}
              onClick={handleDelete}
              disabled={submitting || deleting}
            >
              {deleting ? (
                <>
                  <Loader2 size={15} className="tdh-spin" aria-hidden />
                  Đang xóa…
                </>
              ) : confirmDelete ? (
                "Bấm lần nữa để xóa"
              ) : (
                "Xóa sự kiện"
              )}
            </button>
          ) : null}
          <button
            type="button"
            className="cso-kh-foot-btn cso-kh-foot-btn--ghost"
            onClick={handleCancelClose}
            disabled={submitting || deleting}
          >
            Huỷ
          </button>
          <button
            type="submit"
            className="cso-kh-foot-btn cso-kh-foot-btn--primary"
            disabled={
              submitting ||
              deleting ||
              cover.uploading ||
              !ten.trim() ||
              !when.start.trim() ||
              !tinhThanh ||
              !cover.imageId ||
              (!mienPhi && loaiVe.length === 0)
            }
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="tdh-spin" aria-hidden />
                {isEdit ? "Đang lưu…" : "Đang tạo…"}
              </>
            ) : isEdit ? (
              "Lưu thay đổi"
            ) : (
              "Tạo sự kiện"
            )}
          </button>
        </div>
      </form>
    </TruongInlineModal>
  );
}
