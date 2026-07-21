"use client";

import {
  ArrowLeft,
  Camera,
  ClipboardPaste,
  Film,
  ImagePlus,
  Loader2,
  Plus,
  Tags,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { readImageFilesFromClipboard } from "@/lib/files/clipboard-images";
import type { ShopNhom } from "@/lib/shop/types";
import { SHOP_NHOM_ANH_PHU_MAX, SHOP_NHOM_MO_TA_MAX } from "@/lib/shop/types";

import { ShopNhomMoTaField } from "./ShopNhomMoTaField";

const MAX_SHOP_VIDEO_BYTES = 500 * 1024 * 1024;

type Props = {
  nhoms: ShopNhom[];
  /** Số mẫu đang bán / tổng theo id nhóm. */
  mauCountByNhomId: Record<string, number>;
  orphanCount: number;
  nhanPhanLoai: string;
  nhanPhanLoai2: string;
  onOpenNhom: (nhomId: string) => void;
  onOpenOrphans: () => void;
  onNhomsChanged: (next: ShopNhom[]) => void;
  onError: (msg: string | null) => void;
};

function formatGia(gia: number | null): string {
  if (gia == null) return "Chưa đặt giá";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(gia);
}

export function ShopKhoLoaiHub({
  nhoms,
  mauCountByNhomId,
  orphanCount,
  nhanPhanLoai,
  onOpenNhom,
  onOpenOrphans,
  onNhomsChanged,
  onError,
}: Props) {
  const loaiList = nhoms.filter((n) => n.truc === 1);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nhan, setNhan] = useState("");
  const [moTa, setMoTa] = useState("");
  const [gia, setGia] = useState("");
  const [anhId, setAnhId] = useState<string | null>(null);
  const [anhUrl, setAnhUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const draftPreviewRef = useRef<string | null>(null);

  const resetDraft = useCallback(() => {
    if (draftPreviewRef.current) {
      URL.revokeObjectURL(draftPreviewRef.current);
      draftPreviewRef.current = null;
    }
    setNhan("");
    setMoTa("");
    setGia("");
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

  async function createLoai() {
    const name = nhan.trim();
    if (!name) {
      onError(`Nhập tên ${nhanPhanLoai.toLowerCase()}.`);
      return;
    }
    const giaNum = gia.trim() ? Number(gia.replace(/,/g, ".")) : null;
    if (gia.trim() && (giaNum == null || !Number.isFinite(giaNum) || giaNum < 0)) {
      onError("Giá mặc định không hợp lệ.");
      return;
    }
    setBusy(true);
    onError(null);
    try {
      const res = await fetch("/api/shop/nhom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          truc: 1,
          nhan: name,
          moTa: moTa.trim().slice(0, SHOP_NHOM_MO_TA_MAX) || null,
          anhId,
          giaMacDinh: giaNum,
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
    } catch {
      onError("Không tạo được loại hàng.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shop-kho-loai-hub">
      <div className="shop-kho-loai-hub-head">
        <div>
          <h2>Loại hàng</h2>
        </div>
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

      {creating ? (
        <div className="shop-kho-loai-create">
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
            <label>
              <span>Giá gốc mặc định</span>
              <input
                value={gia}
                inputMode="decimal"
                placeholder="40000"
                disabled={busy}
                onChange={(e) => setGia(e.target.value)}
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
        {loaiList.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              className="shop-kho-loai-card"
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
              </span>
              <span className="shop-kho-loai-card-body">
                <strong>{n.nhan}</strong>
                <span>{mauCountByNhomId[n.id] ?? 0} mẫu</span>
                <span className="shop-kho-loai-card-gia">
                  {formatGia(n.giaMacDinh)}
                </span>
              </span>
            </button>
          </li>
        ))}
        {orphanCount > 0 ? (
          <li>
            <button
              type="button"
              className="shop-kho-loai-card is-orphan"
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
                <span className="shop-kho-loai-card-gia">
                  Gán vào loại để bán trên mặt tiền
                </span>
              </span>
            </button>
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
  /** Giá suy từ bảng giá mẫu khi loại chưa có `giaMacDinh`. */
  suggestedGiaMacDinh?: number | null;
  onBack: () => void;
  onUpdated: (n: ShopNhom) => void;
  onError: (msg: string | null) => void;
};

function giaInputValue(
  nhomGia: number | null | undefined,
  suggested: number | null | undefined,
): string {
  if (nhomGia != null && Number.isFinite(nhomGia)) return String(nhomGia);
  if (suggested != null && Number.isFinite(suggested)) return String(suggested);
  return "";
}

export function ShopKhoLoaiMeta({
  nhom,
  suggestedGiaMacDinh = null,
  onBack,
  onUpdated,
  onError,
}: MetaProps) {
  const [nhan, setNhan] = useState(nhom.nhan);
  const [moTa, setMoTa] = useState(nhom.moTa ?? "");
  const [gia, setGia] = useState(() =>
    giaInputValue(nhom.giaMacDinh, suggestedGiaMacDinh),
  );
  const [saving, setSaving] = useState(false);
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
  const videoAbortRef = useRef<{ abort: () => void } | null>(null);
  const giaDirtyRef = useRef(false);

  useEffect(() => {
    if (giaDirtyRef.current) return;
    setGia(giaInputValue(nhom.giaMacDinh, suggestedGiaMacDinh));
  }, [nhom.id, nhom.giaMacDinh, suggestedGiaMacDinh]);

  function clearPreviewAnh() {
    if (previewAnhRef.current) {
      URL.revokeObjectURL(previewAnhRef.current);
      previewAnhRef.current = null;
    }
    setPreviewAnhUrl(null);
  }

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    onError(null);
    try {
      const res = await fetch(`/api/shop/nhom/${encodeURIComponent(nhom.id)}`, {
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
      giaDirtyRef.current = false;
      setGia(
        giaInputValue(json.item.giaMacDinh, suggestedGiaMacDinh),
      );
      if (json.item.anhPhuIds && json.item.anhPhuUrls) {
        setAnhPhu(
          json.item.anhPhuIds
            .map((id, i) => {
              const url = json.item!.anhPhuUrls[i];
              return url ? { id, url } : null;
            })
            .filter((x): x is { id: string; url: string } => Boolean(x)),
        );
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
      setSaving(false);
    }
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

  async function uploadAnhPhuMany(files: File[]) {
    const room = SHOP_NHOM_ANH_PHU_MAX - anhPhu.length;
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

    setUploadingPhu(true);
    try {
      const uploaded: Array<{ id: string; url: string }> = [];
      for (const file of picked) {
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
        uploaded.push({ id: json.imageId, url: json.url });
      }
      const next = [...anhPhu, ...uploaded].slice(0, SHOP_NHOM_ANH_PHU_MAX);
      const ok = await patch({ anhPhuIds: next.map((x) => x.id) });
      if (ok) setAnhPhu(next);
    } catch (ex) {
      onError(ex instanceof Error ? ex.message : "Upload thất bại.");
    } finally {
      setUploadingPhu(false);
    }
  }

  async function removeAnhPhu(id: string) {
    const next = anhPhu.filter((x) => x.id !== id);
    const ok = await patch({ anhPhuIds: next.map((x) => x.id) });
    if (ok) setAnhPhu(next);
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
        body: JSON.stringify({ title: `Shop · ${nhom.nhan}` }),
      });
      const prep = (await prepRes.json().catch(() => null)) as {
        videoId?: string;
        libraryId?: string;
        embedUrl?: string;
        authorizationSignature?: string;
        authorizationExpire?: number;
        error?: string;
      } | null;
      if (
        !prepRes.ok ||
        !prep?.videoId ||
        !prep.libraryId ||
        !prep.authorizationSignature ||
        !prep.embedUrl
      ) {
        throw new Error(prep?.error ?? "Không chuẩn bị được upload video.");
      }

      const { Upload } = await import("tus-js-client");
      await new Promise<void>((resolve, reject) => {
        const upload = new Upload(file, {
          endpoint: "https://video.bunnycdn.com/tusupload",
          retryDelays: [0, 1000, 3000, 5000, 10000],
          headers: {
            AuthorizationSignature: prep.authorizationSignature!,
            AuthorizationExpire: String(prep.authorizationExpire),
            VideoId: prep.videoId!,
            LibraryId: String(prep.libraryId),
          },
          metadata: {
            filetype: file.type,
            title: file.name,
          },
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
        });
        videoAbortRef.current = upload;
        upload.start();
      });

      const ok = await patch({ videoPhuId: prep.videoId });
      if (ok) {
        setVideoPhu({
          id: prep.videoId,
          embedUrl: prep.embedUrl,
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

  const displayAnhUrl = previewAnhUrl || nhom.anhUrl;
  const mediaBusy = uploadingAnh || uploadingPhu || uploadingVideo || saving;

  return (
    <div className="shop-kho-loai-meta">
      <button type="button" className="shop-kho-loai-back" onClick={onBack}>
        <ArrowLeft size={15} aria-hidden />
        Tất cả loại hàng
      </button>

      <div className="shop-kho-loai-meta-grid">
        <div className="shop-kho-loai-meta-media">
          <div className="shop-kho-loai-meta-anh-wrap">
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
              onClick={(e) => {
                e.stopPropagation();
                void (async () => {
                  const files = await readImageFilesFromClipboard();
                  const file = files[0];
                  if (!file) {
                    onError(
                      "Không đọc được ảnh từ bộ nhớ tạm. Hãy copy ảnh rồi thử lại.",
                    );
                    return;
                  }
                  void uploadAnh(file);
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
          <div className="shop-kho-loai-meta-row">
            <label>
              <span>Tên loại</span>
              <input
                value={nhan}
                maxLength={40}
                disabled={saving}
                onChange={(e) => setNhan(e.target.value)}
                onBlur={() => {
                  if (nhan.trim() && nhan.trim() !== nhom.nhan) {
                    void patch({ nhan: nhan.trim() });
                  }
                }}
              />
            </label>
            <label>
              <span>Giá gốc</span>
              <input
                value={gia}
                inputMode="decimal"
                disabled={saving}
                placeholder="40000"
                onChange={(e) => {
                  giaDirtyRef.current = true;
                  setGia(e.target.value);
                }}
                onBlur={() => {
                  const raw = gia.trim();
                  const next = raw ? Number(raw.replace(/,/g, ".")) : null;
                  const prev = nhom.giaMacDinh;
                  if (
                    raw &&
                    (next == null || !Number.isFinite(next) || next < 0)
                  ) {
                    onError("Giá mặc định không hợp lệ.");
                    giaDirtyRef.current = false;
                    setGia(giaInputValue(prev, suggestedGiaMacDinh));
                    return;
                  }
                  if ((prev ?? null) !== (next ?? null)) {
                    void patch({ giaMacDinh: next });
                  } else {
                    giaDirtyRef.current = false;
                  }
                }}
              />
            </label>
          </div>
          <ShopNhomMoTaField
            value={moTa}
            disabled={saving}
            rows={2}
            aria-label="Mô tả loại"
            onChange={setMoTa}
            onBlur={() => {
              const next = moTa.trim().slice(0, SHOP_NHOM_MO_TA_MAX) || null;
              if ((nhom.moTa ?? null) !== next) {
                void patch({ moTa: next });
              }
            }}
          />
        </div>
      </div>

      <div className="shop-kho-loai-meta-phu">
        <div className="shop-kho-loai-meta-phu-head">
          <span>Ảnh / video thật</span>
          <span className="shop-kho-loai-meta-phu-count">
            {anhPhu.length}/{SHOP_NHOM_ANH_PHU_MAX} ảnh
            {" · "}
            {videoPhu || uploadingVideo ? "1" : "0"}/1 video
          </span>
        </div>
        <div className="shop-kho-loai-meta-phu-row">
          {anhPhu.map((a) => (
            <span key={a.id} className="shop-kho-loai-meta-phu-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt="" />
              <button
                type="button"
                aria-label="Gỡ ảnh"
                disabled={mediaBusy}
                onClick={() => void removeAnhPhu(a.id)}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          {anhPhu.length < SHOP_NHOM_ANH_PHU_MAX ? (
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
                onClick={() => {
                  void (async () => {
                    const files = await readImageFilesFromClipboard();
                    if (files.length === 0) {
                      onError(
                        "Không đọc được ảnh từ bộ nhớ tạm. Hãy copy ảnh rồi thử lại.",
                      );
                      return;
                    }
                    void uploadAnhPhuMany(files);
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
              const list = e.target.files;
              e.target.value = "";
              if (!list || list.length === 0) return;
              void uploadAnhPhuMany(Array.from(list));
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
    </div>
  );
}
