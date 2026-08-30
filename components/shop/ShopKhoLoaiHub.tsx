"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  ClipboardPaste,
  ExternalLink,
  Film,
  ImagePlus,
  Loader2,
  Megaphone,
  Plus,
  Save,
  Star,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  beginClipboardImageRead,
  clipboardImageFailureMessage,
  imageFilesFromClipboard,
  readImageFilesFromClipboardDetailed,
} from "@/lib/files/clipboard-images";
import { uploadPostImageWithProgress } from "@/lib/files/upload-post-image";
import {
  createVideoTusUpload,
  prepareResponseIsValid,
  type VideoPrepareResponse,
} from "@/lib/video/upload-tus";
import { ShopKhoLoaiTaxonomy } from "@/components/shop/ShopKhoLoaiTaxonomy";
import { formatMoney } from "@/lib/format";
import { useLocale } from "@/lib/locale/context";
import type { ShopNhom } from "@/lib/shop/types";
import {
  SHOP_NHOM_ANH_PHU_MAX,
  SHOP_NHOM_FEATURE_MAX,
  SHOP_NHOM_MO_TA_MAX,
} from "@/lib/shop/types";
import {
  labelNhomGioiThieuCanhBao,
  nhomGioiThieuCanhBao,
  type NhomGiaTuDen,
} from "@/lib/shop/gioi-thieu";

import { ShopNhomMoTaField } from "./ShopNhomMoTaField";

const MAX_SHOP_VIDEO_BYTES = 500 * 1024 * 1024;

/** Khớp `KHO_UPLOAD_CONCURRENCY` của lưới kho (ShopKhoClient). */
const ANH_PHU_UPLOAD_CONCURRENCY = 3;

type PendingClipboardRead = ReturnType<
  typeof readImageFilesFromClipboardDetailed
> | null;

async function resolveClipboardPaste(pending: PendingClipboardRead): Promise<{
  files: File[];
  message: string | null;
}> {
  const result = await (pending ?? readImageFilesFromClipboardDetailed());
  if (result.files.length > 0) return { files: result.files, message: null };
  return {
    files: [],
    message: clipboardImageFailureMessage(result.reason),
  };
}

type PendingStatus = "uploading" | "done" | "error";

type PendingAnh = {
  key: string;
  url: string;
  progress: number;
  status: PendingStatus;
};

type Props = {
  nhoms: ShopNhom[];
  /** Số mẫu đang bán / tổng theo id nhóm. */
  mauCountByNhomId: Record<string, number>;
  orphanCount: number;
  nhanPhanLoai: string;
  onOpenNhom: (nhomId: string) => void;
  onOpenOrphans: () => void;
  onNhomsChanged: (next: ShopNhom[]) => void;
  onError: (msg: string | null) => void;
  /** Tiếp cận theo loại trục 1 — chỉ hiện khi luotThay > 0. */
  tiepCanByNhomId?: Record<string, { luotThay: number; nguoiThay: number }>;
  /**
   * Min/max giá gốc mẫu theo loại. `null` = đã thấy mẫu nhưng chưa có giá.
   * Thiếu key = chưa biết (list kho cắt 200) — không cảnh báo giá.
   */
  giaHubByNhomId?: Record<string, NhomGiaTuDen | null>;
};

export function ShopKhoLoaiHub({
  nhoms,
  mauCountByNhomId,
  orphanCount,
  nhanPhanLoai,
  onOpenNhom,
  onOpenOrphans,
  onNhomsChanged,
  onError,
  tiepCanByNhomId = {},
  giaHubByNhomId = {},
}: Props) {
  const locale = useLocale();
  const loaiList = nhoms.filter((n) => n.truc === 1);
  const featureCount = loaiList.filter((n) => n.noiBat).length;
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [featureBusyId, setFeatureBusyId] = useState<string | null>(null);
  const [nhan, setNhan] = useState("");
  const [moTa, setMoTa] = useState("");
  const [anhId, setAnhId] = useState<string | null>(null);
  const [anhUrl, setAnhUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pasteArmed, setPasteArmed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const draftPreviewRef = useRef<string | null>(null);
  const pendingClipboardReadRef = useRef<PendingClipboardRead>(null);
  const pasteArmedRef = useRef(false);

  const resetDraft = useCallback(() => {
    if (draftPreviewRef.current) {
      URL.revokeObjectURL(draftPreviewRef.current);
      draftPreviewRef.current = null;
    }
    pasteArmedRef.current = false;
    setPasteArmed(false);
    setNhan("");
    setMoTa("");
    setAnhId(null);
    setAnhUrl(null);
    setCreating(false);
  }, []);

  async function uploadAnh(file: File) {
    if (draftPreviewRef.current) {
      URL.revokeObjectURL(draftPreviewRef.current);
    }
    const local = URL.createObjectURL(file);
    draftPreviewRef.current = local;
    setAnhUrl(local);
    setUploading(true);
    onError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/post-image/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json().catch(() => null)) as {
        imageId?: string;
        url?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.imageId || !json.url) {
        throw new Error(json?.error ?? "Upload thất bại.");
      }
      if (draftPreviewRef.current) {
        URL.revokeObjectURL(draftPreviewRef.current);
        draftPreviewRef.current = null;
      }
      setAnhId(json.imageId);
      setAnhUrl(json.url);
    } catch (e) {
      if (draftPreviewRef.current) {
        URL.revokeObjectURL(draftPreviewRef.current);
        draftPreviewRef.current = null;
      }
      setAnhUrl(null);
      setAnhId(null);
      onError(e instanceof Error ? e.message : "Upload thất bại.");
    } finally {
      setUploading(false);
    }
  }

  const uploadAnhRef = useRef(uploadAnh);
  uploadAnhRef.current = uploadAnh;

  useEffect(() => {
    if (!creating || !pasteArmed) return;
    function onPaste(e: ClipboardEvent) {
      if (!pasteArmedRef.current || uploading || busy) return;
      const files = imageFilesFromClipboard(e.clipboardData);
      const file = files[0];
      if (!file) return;
      e.preventDefault();
      e.stopPropagation();
      pasteArmedRef.current = false;
      setPasteArmed(false);
      void uploadAnhRef.current(file);
    }
    window.addEventListener("paste", onPaste, true);
    return () => window.removeEventListener("paste", onPaste, true);
  }, [creating, pasteArmed, uploading, busy]);

  async function createLoai() {
    const name = nhan.trim();
    if (!name) {
      onError(`Nhập tên ${nhanPhanLoai.toLowerCase()}.`);
      return;
    }
    setBusy(true);
    onError(null);
    try {
      const moTaGui = moTa.trim().slice(0, SHOP_NHOM_MO_TA_MAX);
      const res = await fetch("/api/shop/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({
          truc: 1,
          nhan: name,
          ...(moTaGui ? { moTa: moTaGui } : {}),
          ...(anhId ? { anhId } : {}),
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        item?: ShopNhom;
        error?: string;
      } | null;
      if (!res.ok || !json?.item) {
        onError(json?.error ?? "Không tạo được loại hàng.");
        return;
      }
      const item = json.item;
      const next = [...loaiList.filter((n) => n.id !== item.id), item].sort(
        (a, b) => a.nhan.localeCompare(b.nhan, "vi"),
      );
      const truc2 = nhoms.filter((n) => n.truc === 2);
      onNhomsChanged([...next, ...truc2]);
      resetDraft();
      onOpenNhom(item.id);
    } catch (e) {
      const timedOut =
        e instanceof DOMException && e.name === "TimeoutError";
      onError(
        timedOut
          ? "Hết thời gian chờ khi tạo loại hàng. Thử lại."
          : "Không tạo được loại hàng.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleFeature(n: ShopNhom) {
    const next = !n.noiBat;
    if (next && featureCount >= SHOP_NHOM_FEATURE_MAX) {
      onError(
        `Chỉ được gắn ngôi sao tối đa ${SHOP_NHOM_FEATURE_MAX} loại hàng.`,
      );
      return;
    }
    setFeatureBusyId(n.id);
    onError(null);
    try {
      const res = await fetch(`/api/shop/groups/${encodeURIComponent(n.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noiBat: next }),
      });
      const json = (await res.json().catch(() => null)) as {
        item?: ShopNhom;
        error?: string;
      } | null;
      if (!res.ok || !json?.item) {
        onError(json?.error ?? "Không gắn ngôi sao được.");
        return;
      }
      onNhomsChanged(
        nhoms.map((x) => (x.id === json.item!.id ? json.item! : x)),
      );
    } catch {
      onError("Không gắn ngôi sao được.");
    } finally {
      setFeatureBusyId(null);
    }
  }

  return (
    <div className="shop-kho-loai-hub">
      <div className="shop-kho-loai-hub-head">
        <div>
          <h2>Loại hàng</h2>
          <p className="shop-feature-count" title={`Tối đa ${SHOP_NHOM_FEATURE_MAX} loại Feature`}>
            Feature{" "}
            <strong>
              {featureCount}/{SHOP_NHOM_FEATURE_MAX}
            </strong>
          </p>
        </div>
        <div className="shop-kho-loai-hub-actions">
          <button
            type="button"
            className="shop-dash-kho-edit-btn"
            disabled={busy || creating}
            onClick={() => setCreating(true)}
          >
            <Plus size={15} aria-hidden />
            Thêm loại hàng
          </button>
        </div>
      </div>

      {creating ? (
        <div className="shop-kho-loai-create">
          <div
            className="shop-kho-loai-meta-anh-wrap"
            tabIndex={0}
            onPaste={(e) => {
              if (uploading || busy) return;
              const file = imageFilesFromClipboard(e.clipboardData)[0];
              if (!file) return;
              e.preventDefault();
              e.stopPropagation();
              pasteArmedRef.current = false;
              setPasteArmed(false);
              void uploadAnh(file);
            }}
          >
            <button
              type="button"
              className={`shop-kho-loai-create-anh${uploading ? " is-busy" : ""}`}
              disabled={uploading || busy}
              aria-busy={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {anhUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={anhUrl} alt="" />
              ) : (
                <>
                  <Camera size={16} aria-hidden />
                  Ảnh loại
                </>
              )}
              {uploading ? (
                <span className="shop-kho-loai-anh-overlay" aria-hidden>
                  <Loader2 size={20} className="shop-spin" />
                  <span>Đang tải…</span>
                </span>
              ) : null}
            </button>
            <button
              type="button"
              className="shop-kho-loai-meta-corner-paste"
              disabled={uploading || busy}
              aria-label="Dán ảnh loại từ bộ nhớ tạm"
              title="Dán ảnh"
              onPointerDown={() => {
                if (uploading || busy) return;
                pendingClipboardReadRef.current = beginClipboardImageRead();
              }}
              onClick={(e) => {
                e.stopPropagation();
                void (async () => {
                  const pending = pendingClipboardReadRef.current;
                  pendingClipboardReadRef.current = null;
                  const { files, message } = await resolveClipboardPaste(pending);
                  const file = files[0];
                  if (file) {
                    pasteArmedRef.current = false;
                    setPasteArmed(false);
                    void uploadAnh(file);
                    return;
                  }
                  pasteArmedRef.current = true;
                  setPasteArmed(true);
                  onError(
                    message ??
                      clipboardImageFailureMessage("empty"),
                  );
                })();
              }}
            >
              <ClipboardPaste size={11} strokeWidth={2.25} aria-hidden />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void uploadAnh(f);
              }}
            />
          </div>
          <div className="shop-kho-loai-create-fields">
            <label>
              <span>Tên loại</span>
              <input
                value={nhan}
                maxLength={40}
                placeholder="VD: Mèo chọi"
                disabled={busy}
                onChange={(e) => setNhan(e.target.value)}
              />
            </label>
            <ShopNhomMoTaField
              value={moTa}
              disabled={busy}
              placeholder="Mô tả ngắn (tuỳ chọn)"
              aria-label="Mô tả loại hàng"
              rows={2}
              onChange={setMoTa}
            />
            <div className="shop-kho-loai-create-actions">
              <button
                type="button"
                className="shop-kho-loai-create-submit"
                disabled={busy}
                onClick={() => void createLoai()}
              >
                {busy ? (
                  <Loader2 size={15} className="shop-spin" aria-hidden />
                ) : (
                  <Plus size={15} aria-hidden />
                )}
                Tạo loại
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={resetDraft}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ul className="shop-kho-loai-grid">
        {loaiList.map((n) => {
          const featBusy = featureBusyId === n.id;
          const capped = !n.noiBat && featureCount >= SHOP_NHOM_FEATURE_MAX;
          const giaHub = giaHubByNhomId[n.id];
          const canhBao = nhomGioiThieuCanhBao(
            n,
            giaHub !== undefined ? { giaTu: giaHub?.tu ?? null } : undefined,
          );
          const warnTitle =
            canhBao.length > 0
              ? canhBao.map(labelNhomGioiThieuCanhBao).join(" · ")
              : null;
          const giaLabel =
            giaHub != null
              ? `Từ ${formatMoney(giaHub.tu, locale)}`
              : null;
          return (
            <li key={n.id}>
              <div
                className={`shop-kho-loai-card${n.noiBat ? " is-feature" : ""}${canhBao.length ? " is-warn" : ""}`}
              >
                <button
                  type="button"
                  className="shop-kho-loai-card-open"
                  onClick={() => onOpenNhom(n.id)}
                >
                  <span className="shop-kho-loai-card-media">
                    {n.anhUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.anhUrl} alt="" />
                    ) : (
                      <span className="shop-kho-loai-card-ph" aria-hidden>
                        <Tags size={20} />
                      </span>
                    )}
                    {warnTitle ? (
                      <span
                        className="shop-kho-loai-card-warn"
                        title={warnTitle}
                        aria-label={warnTitle}
                      >
                        <AlertTriangle size={12} strokeWidth={2.4} aria-hidden />
                      </span>
                    ) : null}
                  </span>
                  <span className="shop-kho-loai-card-body">
                    <strong>{n.nhan}</strong>
                    <span>{mauCountByNhomId[n.id] ?? 0} mẫu</span>
                    {giaLabel ? (
                      <span className="shop-kho-loai-card-gia">{giaLabel}</span>
                    ) : null}
                    {(tiepCanByNhomId[n.id]?.luotThay ?? 0) > 0 ? (
                      <span className="shop-kho-loai-reach">
                        {tiepCanByNhomId[n.id]!.luotThay.toLocaleString("vi-VN")}{" "}
                        lượt thấy
                        {tiepCanByNhomId[n.id]!.nguoiThay > 0
                          ? ` · ${tiepCanByNhomId[n.id]!.nguoiThay.toLocaleString("vi-VN")} thiết bị`
                          : ""}
                      </span>
                    ) : null}
                    {warnTitle ? (
                      <span className="shop-kho-loai-tax-badge is-warn">
                        {labelNhomGioiThieuCanhBao(canhBao[0]!)}
                        {canhBao.length > 1 ? ` +${canhBao.length - 1}` : ""}
                      </span>
                    ) : null}
                    {!n.idDanhMuc ? (
                      <span className="shop-kho-loai-tax-badge">
                        Chưa gắn danh mục
                      </span>
                    ) : !n.danhMucXacNhan ? (
                      <span className="shop-kho-loai-tax-badge is-soft">
                        Chưa xác nhận
                      </span>
                    ) : null}
                  </span>
                </button>
                <button
                  type="button"
                  className={`shop-kho-loai-feature-btn${n.noiBat ? " is-on" : ""}${capped ? " is-capped" : ""}`}
                  disabled={busy || featBusy || capped}
                  aria-pressed={n.noiBat}
                  aria-label={n.noiBat ? "Bỏ ngôi sao" : "Gắn ngôi sao"}
                  title={
                    capped
                      ? `Đã đủ ${SHOP_NHOM_FEATURE_MAX} ngôi sao — bỏ chọn một loại khác trước`
                      : n.noiBat
                        ? "Bỏ ngôi sao"
                        : "Gắn ngôi sao"
                  }
                  onClick={() => void toggleFeature(n)}
                >
                  {featBusy ? (
                    <Loader2 size={14} className="shop-spin" aria-hidden />
                  ) : (
                    <Star
                      size={14}
                      strokeWidth={2.25}
                      fill={n.noiBat ? "currentColor" : "none"}
                      aria-hidden
                    />
                  )}
                </button>
              </div>
            </li>
          );
        })}
        {orphanCount > 0 ? (
          <li>
            <div className="shop-kho-loai-card is-orphan">
              <button
                type="button"
                className="shop-kho-loai-card-open"
                onClick={onOpenOrphans}
              >
                <span className="shop-kho-loai-card-media">
                  <span className="shop-kho-loai-card-ph" aria-hidden>
                    <Tags size={20} />
                  </span>
                </span>
                <span className="shop-kho-loai-card-body">
                  <strong>Chưa gán loại</strong>
                  <span>{orphanCount} mẫu</span>
                </span>
              </button>
            </div>
          </li>
        ) : null}
      </ul>

      {loaiList.length === 0 && orphanCount === 0 && !creating ? (
        <p className="shop-dash-hint">
          Chưa có loại hàng. Bấm «Thêm loại hàng» để bắt đầu.
        </p>
      ) : null}
    </div>
  );
}

type MetaProps = {
  nhom: ShopNhom;
  /** Số mẫu còn gắn loại (da_xoa=false). Xóa loại chỉ khi = 0. */
  mauCount: number;
  /** Trang loại hàng trên mặt tiền shop — null khi chưa có slug. */
  storefrontLoaiHref?: string | null;
  onBack: () => void;
  onUpdated: (n: ShopNhom) => void;
  onDeleted: () => void;
  onError: (msg: string | null) => void;
  /** Khi server báo còn mẫu nhưng client đang thấy 0 — tải lại kho. */
  onRefreshMau?: () => void;
  /** Mở composer «Giới thiệu sản phẩm» (album + gắn kiosk).
   *  Nhận mô tả loại mới nhất (đã flush) — tránh lệch nháp / state cha. */
  onGioiThieu?: (opts?: { moTa: string }) => void;
  gioiThieuBusy?: boolean;
  gioiThieuDisabledReason?: string | null;
  /** Cảnh báo kiosk (thiếu mẫu/giá/hết hàng) — không chặn mở composer. */
  gioiThieuKioskWarn?: string | null;
  /** true khi loại đủ ảnh + mẫu + giá — mới hiện nút giới thiệu. */
  gioiThieuVisible?: boolean;
  /** true khi chưa từng đăng bài giới thiệu — bật glow attention. */
  gioiThieuChuaCo?: boolean;
};

export function ShopKhoLoaiMeta({
  nhom,
  mauCount,
  storefrontLoaiHref = null,
  onBack,
  onUpdated,
  onDeleted,
  onError,
  onRefreshMau,
  onGioiThieu,
  gioiThieuBusy = false,
  gioiThieuDisabledReason = null,
  gioiThieuKioskWarn = null,
  gioiThieuVisible = false,
  gioiThieuChuaCo = false,
}: MetaProps) {
  const [nhan, setNhan] = useState(nhom.nhan);
  const [moTa, setMoTa] = useState(nhom.moTa ?? "");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteHint, setDeleteHint] = useState(false);
  const [uploadingAnh, setUploadingAnh] = useState(false);
  const [uploadingPhu, setUploadingPhu] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<"idle" | "upload" | "save">(
    "idle",
  );
  const [previewAnhUrl, setPreviewAnhUrl] = useState<string | null>(null);
  const [anhPhu, setAnhPhu] = useState<Array<{ id: string; url: string }>>(
    () =>
      (nhom.anhPhuIds ?? [])
        .map((id, i) => {
          const url = nhom.anhPhuUrls?.[i];
          return url ? { id, url } : null;
        })
        .filter((x): x is { id: string; url: string } => Boolean(x)),
  );
  const anhPhuRef = useRef(anhPhu);
  anhPhuRef.current = anhPhu;
  /** Ô xem trước ngay khi chọn file — sống tới khi patch xong. */
  const [pendingPhu, setPendingPhu] = useState<PendingAnh[]>([]);
  const [videoPhu, setVideoPhu] = useState<{
    id: string;
    embedUrl: string | null;
    thumbUrl: string | null;
  } | null>(() =>
    nhom.videoPhuId
      ? {
          id: nhom.videoPhuId,
          embedUrl: nhom.videoPhuEmbedUrl,
          thumbUrl: nhom.videoPhuThumbUrl,
        }
      : null,
  );
  const fileAnhRef = useRef<HTMLInputElement>(null);
  const filePhuRef = useRef<HTMLInputElement>(null);
  const fileVideoRef = useRef<HTMLInputElement>(null);
  const previewAnhRef = useRef<string | null>(null);
  const pendingUrlsRef = useRef<Set<string>>(new Set());
  const videoAbortRef = useRef<{ abort: () => void } | null>(null);
  const pendingClipboardReadRef = useRef<PendingClipboardRead>(null);
  const pasteArmTargetRef = useRef<"anh" | "phu" | null>(null);
  const [pasteArmed, setPasteArmed] = useState(false);

  /* Rời component giữa lúc upload — thu hồi objectURL còn treo. */
  useEffect(() => {
    const urls = pendingUrlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  function markPending(key: string, status: PendingStatus) {
    setPendingPhu((prev) =>
      prev.map((p) => (p.key === key ? { ...p, status } : p)),
    );
  }

  function markProgress(key: string, progress: number) {
    setPendingPhu((prev) =>
      prev.map((p) => (p.key === key ? { ...p, progress } : p)),
    );
  }

  useEffect(() => {
    setNhan(nhom.nhan);
    setMoTa(nhom.moTa ?? "");
  }, [nhom.id]);

  useEffect(() => {
    if (!deleteHint) return;
    const t = window.setTimeout(() => setDeleteHint(false), 4200);
    return () => window.clearTimeout(t);
  }, [deleteHint]);

  useEffect(() => {
    if (mauCount === 0) setDeleteHint(false);
  }, [mauCount]);

  useEffect(() => {
    if (!deleteOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !deleting) setDeleteOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteOpen, deleting]);

  function clearPreviewAnh() {
    if (previewAnhRef.current) {
      URL.revokeObjectURL(previewAnhRef.current);
      previewAnhRef.current = null;
    }
    setPreviewAnhUrl(null);
  }

  async function patch(
    body: Record<string, unknown>,
    opts?: { quiet?: boolean },
  ) {
    if (!opts?.quiet) setSaving(true);
    onError(null);
    try {
      const res = await fetch(`/api/shop/groups/${encodeURIComponent(nhom.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        item?: ShopNhom;
        error?: string;
      } | null;
      if (!res.ok || !json?.item) {
        onError(json?.error ?? "Không lưu được loại hàng.");
        return false;
      }
      onUpdated(json.item);
      setNhan(json.item.nhan);
      setMoTa(json.item.moTa ?? "");
      if (json.item.anhPhuIds && json.item.anhPhuUrls) {
        /* quiet = gỡ optimistic — giữ list local, tránh race ghi đè. */
        if (!opts?.quiet) {
          setAnhPhu(
            json.item.anhPhuIds
              .map((id, i) => {
                const url = json.item!.anhPhuUrls[i];
                return url ? { id, url } : null;
              })
              .filter((x): x is { id: string; url: string } => Boolean(x)),
          );
        }
      }
      setVideoPhu(
        json.item.videoPhuId
          ? {
              id: json.item.videoPhuId,
              embedUrl: json.item.videoPhuEmbedUrl,
              thumbUrl: json.item.videoPhuThumbUrl,
            }
          : null,
      );
      return true;
    } catch {
      onError("Không lưu được loại hàng.");
      return false;
    } finally {
      if (!opts?.quiet) setSaving(false);
    }
  }

  async function saveMetaChanges() {
    const nextNhan = nhan.trim();
    if (!nextNhan) {
      onError("Tên loại không được trống.");
      return;
    }
    const nextMoTa = moTa.trim().slice(0, SHOP_NHOM_MO_TA_MAX) || null;
    const body: Record<string, unknown> = {};
    if (nextNhan !== nhom.nhan) body.nhan = nextNhan;
    if ((nhom.moTa ?? null) !== nextMoTa) body.moTa = nextMoTa;
    if (Object.keys(body).length === 0) return;
    await patch(body);
  }

  /** Flush mô tả local trước khi mở composer — giữ xuống dòng / list `- `. */
  async function flushMoTaThenGioiThieu() {
    if (!onGioiThieu) return;
    const next = moTa.trim().slice(0, SHOP_NHOM_MO_TA_MAX) || null;
    if ((nhom.moTa ?? null) !== next) {
      const ok = await patch({ moTa: next }, { quiet: true });
      if (!ok) return;
    }
    onGioiThieu({ moTa: next ?? "" });
  }

  async function uploadAnh(file: File) {
    clearPreviewAnh();
    const local = URL.createObjectURL(file);
    previewAnhRef.current = local;
    setPreviewAnhUrl(local);
    setUploadingAnh(true);
    setUploadPhase("upload");
    onError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/post-image/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json().catch(() => null)) as {
        imageId?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.imageId) {
        throw new Error(json?.error ?? "Upload thất bại.");
      }
      setUploadPhase("save");
      const ok = await patch({ anhId: json.imageId });
      if (ok) clearPreviewAnh();
    } catch (ex) {
      clearPreviewAnh();
      onError(ex instanceof Error ? ex.message : "Upload thất bại.");
    } finally {
      setUploadingAnh(false);
      setUploadPhase("idle");
    }
  }

  /**
   * Chọn nhiều ảnh: hiện ngay ô xem trước từ file local (objectURL), rồi upload
   * song song có giới hạn kèm % thật (XHR) — cùng cơ chế thumb ở `ShopKhoClient`.
   * Ô lỗi giữ lại và đánh dấu đỏ, các ảnh còn lại vẫn được lưu.
   */
  async function uploadAnhPhuMany(files: File[]) {
    const room = SHOP_NHOM_ANH_PHU_MAX - anhPhu.length - pendingPhu.length;
    if (room <= 0) {
      onError(`Tối đa ${SHOP_NHOM_ANH_PHU_MAX} ảnh thật.`);
      return;
    }
    const picked = files
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, room);
    if (picked.length === 0) {
      onError("Không có file ảnh hợp lệ.");
      return;
    }
    if (files.length > room) {
      onError(
        `Chỉ thêm được ${room} ảnh nữa (tối đa ${SHOP_NHOM_ANH_PHU_MAX}).`,
      );
    } else {
      onError(null);
    }

    const batch = picked.map((file) => {
      const url = URL.createObjectURL(file);
      pendingUrlsRef.current.add(url);
      return { key: `${Date.now()}-${url}`, file, url };
    });
    setPendingPhu((prev) => [
      ...prev,
      ...batch.map(({ key, url }) => ({
        key,
        url,
        progress: 1,
        status: "uploading" as PendingStatus,
      })),
    ]);
    setUploadingPhu(true);

    const done: Array<{ id: string; url: string } | null> = new Array(
      batch.length,
    ).fill(null);
    let cursor = 0;
    let failed = 0;
    let firstError: string | null = null;

    const worker = async () => {
      for (;;) {
        const i = cursor++;
        if (i >= batch.length) return;
        const item = batch[i];
        try {
          const res = await uploadPostImageWithProgress(item.file, (pct) =>
            markProgress(item.key, pct),
          );
          if (!res.url) throw new Error("Không tải ảnh được.");
          done[i] = { id: res.imageId, url: res.url };
          markPending(item.key, "done");
        } catch (ex) {
          failed += 1;
          firstError ??= ex instanceof Error ? ex.message : "Upload thất bại.";
          markPending(item.key, "error");
        }
      }
    };

    try {
      await Promise.all(
        Array.from(
          { length: Math.min(ANH_PHU_UPLOAD_CONCURRENCY, batch.length) },
          worker,
        ),
      );
      const uploaded = done.filter(
        (x): x is { id: string; url: string } => x !== null,
      );
      if (uploaded.length > 0) {
        const next = [...anhPhu, ...uploaded].slice(0, SHOP_NHOM_ANH_PHU_MAX);
        const ok = await patch({ anhPhuIds: next.map((x) => x.id) });
        if (ok) setAnhPhu(next);
      }
      if (failed > 0) {
        onError(
          failed === batch.length
            ? (firstError ?? "Upload thất bại.")
            : `${failed}/${batch.length} ảnh upload thất bại. ${firstError ?? ""}`.trim(),
        );
      }
    } finally {
      const keys = new Set(batch.map((b) => b.key));
      setPendingPhu((prev) => prev.filter((p) => !keys.has(p.key)));
      /* Revoke sau khi React kịp chuyển sang URL CF — tránh nháy ảnh vỡ. */
      window.setTimeout(() => {
        for (const b of batch) {
          if (!pendingUrlsRef.current.has(b.url)) continue;
          pendingUrlsRef.current.delete(b.url);
          URL.revokeObjectURL(b.url);
        }
      }, 0);
      setUploadingPhu(false);
    }
  }

  async function removeAnhPhu(id: string) {
    const prev = anhPhuRef.current;
    const removed = prev.find((x) => x.id === id);
    if (!removed) return;
    const next = prev.filter((x) => x.id !== id);
    anhPhuRef.current = next;
    setAnhPhu(next);
    const ok = await patch(
      { anhPhuIds: next.map((x) => x.id) },
      { quiet: true },
    );
    if (!ok) {
      setAnhPhu((cur) => {
        if (cur.some((x) => x.id === id)) return cur;
        const idx = prev.findIndex((x) => x.id === id);
        const restored = [...cur];
        restored.splice(Math.min(Math.max(idx, 0), restored.length), 0, removed);
        anhPhuRef.current = restored;
        return restored;
      });
    }
  }

  async function uploadVideoPhu(file: File) {
    if (!file.type.startsWith("video/")) {
      onError("File không phải video.");
      return;
    }
    if (file.size > MAX_SHOP_VIDEO_BYTES) {
      onError("Video quá lớn (giới hạn 500MB).");
      return;
    }
    videoAbortRef.current?.abort();
    setUploadingVideo(true);
    setVideoProgress(0);
    onError(null);
    try {
      const prepRes = await fetch("/api/post-video/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Shop · ${nhom.nhan}`,
          uploadLength: file.size,
        }),
      });
      const prep = (await prepRes
        .json()
        .catch(() => null)) as VideoPrepareResponse | null;
      if (!prepRes.ok || !prep || !prepareResponseIsValid(prep)) {
        throw new Error(prep?.error ?? "Không chuẩn bị được upload video.");
      }

      const videoId = prep.videoId!;
      const embedUrl = prep.embedUrl!;

      await new Promise<void>((resolve, reject) => {
        void createVideoTusUpload(file, prep, {
          onProgress: (bytesUploaded, bytesTotal) => {
            if (bytesTotal <= 0) return;
            setVideoProgress(
              Math.min(100, Math.round((bytesUploaded / bytesTotal) * 100)),
            );
          },
          onError: (err) => {
            reject(
              err instanceof Error ? err : new Error("Upload video thất bại."),
            );
          },
          onSuccess: () => resolve(),
        })
          .then((upload) => {
            videoAbortRef.current = upload;
            upload.start();
          })
          .catch(reject);
      });

      const ok = await patch({ videoPhuId: videoId });
      if (ok) {
        setVideoPhu({
          id: videoId,
          embedUrl,
          thumbUrl: null,
        });
      }
    } catch (ex) {
      onError(ex instanceof Error ? ex.message : "Upload video thất bại.");
    } finally {
      videoAbortRef.current = null;
      setUploadingVideo(false);
      setVideoProgress(0);
    }
  }

  async function removeVideoPhu() {
    const ok = await patch({ videoPhuId: null });
    if (ok) setVideoPhu(null);
  }

  async function confirmDeleteLoai() {
    if (mauCount > 0 || deleting) return;
    setDeleting(true);
    onError(null);
    try {
      const res = await fetch(`/api/shop/groups/${encodeURIComponent(nhom.id)}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        count?: number;
      } | null;
      if (!res.ok || !json?.ok) {
        if (res.status === 409) {
          onRefreshMau?.();
          setDeleteHint(true);
          onError(
            json?.error ??
              "Còn mẫu gắn mặt hàng này. Xóa hết sản phẩm trong danh sách bên dưới rồi thử lại.",
          );
        } else {
          onError(json?.error ?? "Không xóa được loại hàng.");
        }
        setDeleteOpen(false);
        return;
      }
      setDeleteOpen(false);
      onDeleted();
    } catch {
      onError("Không xóa được loại hàng.");
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  const displayAnhUrl = previewAnhUrl || nhom.anhUrl;
  const mediaBusy = uploadingAnh || uploadingPhu || uploadingVideo || saving;
  const metaDirty = useMemo(() => {
    const nextNhan = nhan.trim();
    const nextMoTa = moTa.trim().slice(0, SHOP_NHOM_MO_TA_MAX) || null;
    return (
      nextNhan !== nhom.nhan.trim() ||
      (nhom.moTa ?? null) !== nextMoTa
    );
  }, [nhan, moTa, nhom.nhan, nhom.moTa]);

  const uploadAnhRef = useRef(uploadAnh);
  uploadAnhRef.current = uploadAnh;
  const uploadAnhPhuManyRef = useRef(uploadAnhPhuMany);
  uploadAnhPhuManyRef.current = uploadAnhPhuMany;

  useEffect(() => {
    if (!pasteArmed) return;
    function onPaste(e: ClipboardEvent) {
      const target = pasteArmTargetRef.current;
      if (!target || mediaBusy) return;
      const files = imageFilesFromClipboard(e.clipboardData);
      if (files.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      pasteArmTargetRef.current = null;
      setPasteArmed(false);
      if (target === "anh") void uploadAnhRef.current(files[0]);
      else void uploadAnhPhuManyRef.current(files);
    }
    window.addEventListener("paste", onPaste, true);
    return () => window.removeEventListener("paste", onPaste, true);
  }, [pasteArmed, mediaBusy]);

  async function onDeleteClick() {
    if (mediaBusy || deleting) return;
    if (mauCount > 0) {
      setDeleteHint(true);
      return;
    }
    /* Client thấy 0 — hỏi server để tránh xóa khi còn mẫu ngoài list. */
    try {
      const res = await fetch(
        `/api/shop/products?nhomId=${encodeURIComponent(nhom.id)}&countOnly=1`,
        { cache: "no-store" },
      );
      const json = (await res.json().catch(() => null)) as {
        count?: number;
      } | null;
      if (res.ok && (json?.count ?? 0) > 0) {
        setDeleteHint(true);
        onRefreshMau?.();
        return;
      }
    } catch {
      /* mở dialog; API DELETE sẽ chặn nếu còn mẫu */
    }
    setDeleteHint(false);
    setDeleteOpen(true);
  }

  return (
    <div className="shop-kho-loai-meta">
      <div className="shop-kho-loai-meta-head">
        <button type="button" className="shop-kho-loai-back" onClick={onBack}>
          <ArrowLeft size={15} aria-hidden />
          <span className="shop-kho-loai-back-label">Tất cả loại hàng</span>
        </button>
        <div className="shop-kho-loai-meta-head-actions">
          {storefrontLoaiHref ? (
            <a
              href={storefrontLoaiHref}
              target="_blank"
              rel="noreferrer"
              className="shop-kho-loai-view"
              title="Xem mặt hàng trên shop"
              aria-label="Xem mặt hàng trên shop"
            >
              <ExternalLink size={16} strokeWidth={2} aria-hidden />
            </a>
          ) : null}
          {onGioiThieu && gioiThieuVisible ? (
            <button
              type="button"
              className={`shop-kho-loai-gioi-thieu${gioiThieuKioskWarn ? " is-warn" : ""}${!gioiThieuKioskWarn && gioiThieuChuaCo ? " is-fresh" : ""}`}
              disabled={
                mediaBusy ||
                deleting ||
                gioiThieuBusy ||
                Boolean(gioiThieuDisabledReason)
              }
              title={
                gioiThieuDisabledReason ??
                gioiThieuKioskWarn ??
                (gioiThieuChuaCo
                  ? "Chưa giới thiệu mặt hàng này — tạo bài album ảnh"
                  : "Tạo bài album ảnh giới thiệu mặt hàng này")
              }
              aria-label="Giới thiệu sản phẩm"
              onClick={() => void flushMoTaThenGioiThieu()}
            >
              {gioiThieuBusy ? (
                <Loader2 size={16} className="shop-spin" aria-hidden />
              ) : gioiThieuKioskWarn ? (
                <AlertTriangle size={16} strokeWidth={2} aria-hidden />
              ) : (
                <Megaphone size={16} strokeWidth={2} aria-hidden />
              )}
              <span className="shop-kho-loai-action-label">
                Giới thiệu sản phẩm
              </span>
            </button>
          ) : null}
          {metaDirty ? (
            <button
              type="button"
              className="shop-kho-loai-save"
              disabled={mediaBusy || deleting}
              aria-busy={saving}
              onClick={() => void saveMetaChanges()}
            >
              {saving ? (
                <Loader2 size={16} className="shop-spin" aria-hidden />
              ) : (
                <Save size={16} strokeWidth={2.2} aria-hidden />
              )}
              <span className="shop-kho-loai-action-label">Lưu thay đổi</span>
            </button>
          ) : null}
          <div className="shop-kho-loai-delete-wrap">
          <button
            type="button"
            className="shop-kho-loai-delete"
            disabled={mediaBusy || deleting}
            title="Xóa mặt hàng này"
            aria-label="Xóa mặt hàng này"
            aria-describedby={deleteHint ? "shop-kho-loai-delete-hint" : undefined}
            onClick={() => void onDeleteClick()}
          >
            <Trash2 size={16} strokeWidth={2} aria-hidden />
            <span className="shop-kho-loai-action-label">Xóa mặt hàng này</span>
          </button>
          {deleteHint ? (
            <p
              id="shop-kho-loai-delete-hint"
              className="shop-kho-loai-delete-hint"
              role="status"
            >
              Cần xóa tất cả sản phẩm trước khi xóa mặt hàng này.
            </p>
          ) : null}
          </div>
        </div>
      </div>

      {gioiThieuKioskWarn && onGioiThieu && gioiThieuVisible ? (
        <p className="shop-kho-gioi-thieu-warn" role="status">
          <AlertTriangle size={14} strokeWidth={2.2} aria-hidden />
          {gioiThieuKioskWarn}
        </p>
      ) : null}

      <div className="shop-kho-loai-meta-grid">
        <div className="shop-kho-loai-meta-media">
          <div
            className="shop-kho-loai-meta-anh-wrap"
            tabIndex={0}
            onPaste={(e) => {
              if (mediaBusy) return;
              const file = imageFilesFromClipboard(e.clipboardData)[0];
              if (!file) return;
              e.preventDefault();
              e.stopPropagation();
              pasteArmTargetRef.current = null;
              setPasteArmed(false);
              void uploadAnh(file);
            }}
          >
            <button
              type="button"
              className={`shop-kho-loai-meta-anh${uploadingAnh ? " is-busy" : ""}`}
              disabled={mediaBusy}
              aria-busy={uploadingAnh}
              aria-label={
                uploadingAnh
                  ? uploadPhase === "save"
                    ? "Đang lưu ảnh loại hàng"
                    : "Đang tải ảnh loại hàng"
                  : "Đổi ảnh loại hàng"
              }
              onClick={() => fileAnhRef.current?.click()}
            >
              {displayAnhUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="shop-kho-loai-meta-anh-base"
                  src={displayAnhUrl}
                  alt=""
                />
              ) : (
                <>
                  <Camera size={16} aria-hidden />
                  Ảnh loại
                </>
              )}
              {uploadingAnh ? (
                <span className="shop-kho-loai-anh-overlay" aria-hidden>
                  <Loader2 size={22} className="shop-spin" />
                  <span>
                    {uploadPhase === "save" ? "Đang lưu…" : "Đang tải…"}
                  </span>
                </span>
              ) : null}
            </button>
            <button
              type="button"
              className="shop-kho-loai-meta-corner-paste"
              disabled={mediaBusy}
              aria-label="Dán ảnh loại từ bộ nhớ tạm"
              title="Dán ảnh"
              onPointerDown={() => {
                if (mediaBusy) return;
                pendingClipboardReadRef.current = beginClipboardImageRead();
              }}
              onClick={(e) => {
                e.stopPropagation();
                void (async () => {
                  const pending = pendingClipboardReadRef.current;
                  pendingClipboardReadRef.current = null;
                  const { files, message } = await resolveClipboardPaste(pending);
                  const file = files[0];
                  if (file) {
                    pasteArmTargetRef.current = null;
                    setPasteArmed(false);
                    void uploadAnh(file);
                    return;
                  }
                  pasteArmTargetRef.current = "anh";
                  setPasteArmed(true);
                  onError(message ?? clipboardImageFailureMessage("empty"));
                })();
              }}
            >
              <ClipboardPaste size={11} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
          <input
            ref={fileAnhRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              void uploadAnh(file);
            }}
          />
        </div>

        <div className="shop-kho-loai-meta-fields">
          <div className="shop-kho-loai-meta-identity">
            <label className="shop-kho-loai-meta-name">
              <span>Tên loại</span>
              <input
                value={nhan}
                maxLength={40}
                disabled={saving}
                placeholder="Ví dụ: Hộp shaker Genshin"
                onChange={(e) => setNhan(e.target.value)}
              />
            </label>
          </div>
          <div className="shop-kho-loai-meta-mota">
            <span className="shop-kho-loai-meta-mota-label">Mô tả</span>
            <ShopNhomMoTaField
              value={moTa}
              disabled={saving}
              rows={3}
              aria-label="Mô tả loại"
              placeholder="Chất liệu, kích thước, lưu ý bán…"
              onChange={setMoTa}
            />
          </div>
          {nhom.truc === 1 ? (
            <ShopKhoLoaiTaxonomy
              nhom={nhom}
              disabled={saving}
              onUpdated={onUpdated}
              onError={onError}
            />
          ) : null}
        </div>
      </div>

      <div className="shop-kho-loai-meta-phu">
        <div className="shop-kho-loai-meta-phu-head">
          <span>Ảnh / video thật</span>
          <span className="shop-kho-loai-meta-phu-count">
            {anhPhu.length + pendingPhu.length}/{SHOP_NHOM_ANH_PHU_MAX} ảnh
            {" · "}
            {videoPhu || uploadingVideo ? "1" : "0"}/1 video
          </span>
        </div>
        <div
          className="shop-kho-loai-meta-phu-row"
          tabIndex={0}
          onPaste={(e) => {
            if (mediaBusy) return;
            const files = imageFilesFromClipboard(e.clipboardData);
            if (files.length === 0) return;
            e.preventDefault();
            e.stopPropagation();
            pasteArmTargetRef.current = null;
            setPasteArmed(false);
            void uploadAnhPhuMany(files);
          }}
        >
          {anhPhu.map((a) => (
            <span key={a.id} className="shop-kho-loai-meta-phu-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt="" />
              <button
                type="button"
                aria-label="Gỡ ảnh"
                disabled={uploadingPhu || uploadingVideo || uploadingAnh}
                onClick={() => void removeAnhPhu(a.id)}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {pendingPhu.map((p) => (
            <span
              key={p.key}
              className={`shop-kho-loai-meta-phu-item is-pending${
                p.status === "error" ? " is-failed" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" />
              {p.status === "error" ? (
                <span className="shop-thumb-upload-pct" role="alert">
                  <AlertTriangle size={14} aria-hidden />
                </span>
              ) : (
                <span
                  className="shop-thumb-upload-pct"
                  aria-busy={p.status === "uploading"}
                  aria-label={`Đang tải ${p.progress}%`}
                >
                  {p.progress}%
                </span>
              )}
            </span>
          ))}
          {anhPhu.length + pendingPhu.length < SHOP_NHOM_ANH_PHU_MAX ? (
            <span className="shop-kho-loai-meta-phu-add-wrap">
              <button
                type="button"
                className="shop-kho-loai-meta-phu-add"
                disabled={mediaBusy}
                aria-label="Thêm ảnh thật (có thể chọn nhiều)"
                title="Thêm ảnh thật · chọn nhiều file cùng lúc"
                onClick={() => filePhuRef.current?.click()}
              >
                {uploadingPhu ? (
                  <Loader2 size={16} className="shop-spin" aria-hidden />
                ) : (
                  <ImagePlus size={16} aria-hidden />
                )}
              </button>
              <button
                type="button"
                className="shop-kho-loai-meta-corner-paste"
                disabled={mediaBusy}
                aria-label="Dán ảnh thật từ bộ nhớ tạm"
                title="Dán ảnh"
                onPointerDown={() => {
                  if (mediaBusy) return;
                  pendingClipboardReadRef.current = beginClipboardImageRead();
                }}
                onClick={() => {
                  void (async () => {
                    const pending = pendingClipboardReadRef.current;
                    pendingClipboardReadRef.current = null;
                    const { files, message } =
                      await resolveClipboardPaste(pending);
                    if (files.length > 0) {
                      pasteArmTargetRef.current = null;
                      setPasteArmed(false);
                      void uploadAnhPhuMany(files);
                      return;
                    }
                    pasteArmTargetRef.current = "phu";
                    setPasteArmed(true);
                    onError(message ?? clipboardImageFailureMessage("empty"));
                  })();
                }}
              >
                <ClipboardPaste size={11} strokeWidth={2.25} aria-hidden />
              </button>
            </span>
          ) : null}
          <input
            ref={filePhuRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              /* Chụp mảng trước: `files` là FileList sống, gán value="" sẽ làm rỗng nó. */
              const picked = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (picked.length === 0) return;
              void uploadAnhPhuMany(picked);
            }}
          />

          {videoPhu ? (
            <span className="shop-kho-loai-meta-phu-item is-video">
              {videoPhu.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={videoPhu.thumbUrl} alt="" />
              ) : (
                <span className="shop-kho-loai-meta-video-ph">
                  <Film size={18} aria-hidden />
                </span>
              )}
              <span className="shop-kho-loai-meta-video-badge" aria-hidden>
                <Film size={10} />
              </span>
              <button
                type="button"
                aria-label="Gỡ video"
                disabled={mediaBusy}
                onClick={() => void removeVideoPhu()}
              >
                <X size={12} />
              </button>
            </span>
          ) : uploadingVideo ? (
            <span
              className="shop-kho-loai-meta-phu-add is-busy"
              aria-live="polite"
            >
              <Loader2 size={16} className="shop-spin" aria-hidden />
              <span>{videoProgress}%</span>
            </span>
          ) : (
            <button
              type="button"
              className="shop-kho-loai-meta-phu-add"
              disabled={mediaBusy}
              aria-label="Thêm video (tối đa 1)"
              title="Thêm video sản phẩm · tối đa 1"
              onClick={() => fileVideoRef.current?.click()}
            >
              <Film size={16} aria-hidden />
            </button>
          )}
          <input
            ref={fileVideoRef}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void uploadVideoPhu(file);
            }}
          />
        </div>
      </div>

      {deleteOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="shop-kho-delete-backdrop"
              role="presentation"
              onMouseDown={(e) => {
                if (e.target === e.currentTarget && !deleting) {
                  setDeleteOpen(false);
                }
              }}
            >
              <div
                className="shop-kho-delete-dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="shop-kho-loai-delete-title"
                aria-describedby="shop-kho-loai-delete-desc"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="shop-kho-delete-icon" aria-hidden>
                  <AlertTriangle size={22} strokeWidth={2.2} />
                </div>
                <h3 id="shop-kho-loai-delete-title">Xóa mặt hàng này?</h3>
                <p
                  id="shop-kho-loai-delete-desc"
                  className="shop-kho-delete-desc"
                >
                  Bạn sắp xóa «{nhom.nhan}» khỏi kho. Mặt hàng này sẽ không còn
                  hiện trên mặt tiền.
                </p>
                <div className="shop-kho-delete-actions">
                  <button
                    type="button"
                    className="shop-kho-delete-cancel"
                    disabled={deleting}
                    onClick={() => setDeleteOpen(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="shop-dash-danger shop-kho-delete-confirm"
                    disabled={deleting}
                    onClick={() => void confirmDeleteLoai()}
                  >
                    {deleting ? (
                      <Loader2 className="shop-spin" size={16} />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    Xóa mặt hàng này
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
