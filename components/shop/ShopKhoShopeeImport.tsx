"use client";

import { Download, Loader2, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import {
  CINS_SHOPEE_EXT_ZIP_HREF,
  fetchShopeeGetPcViaExtension,
  pingShopeeExtension,
} from "@/lib/shop/shopee/extension-bridge";
import type { ShopeeImportPreview } from "@/lib/shop/shopee/types";
import type { ShopNhom, ShopSanPham } from "@/lib/shop/types";

type Props = {
  disabled?: boolean;
  onImported: (payload: {
    nhom: ShopNhom;
    products: ShopSanPham[];
  }) => void;
  onError: (msg: string | null) => void;
};

export function ShopKhoShopeeImportButton({
  disabled,
  onImported,
  onError,
}: Props) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "preview" | "apply">("idle");
  const [preview, setPreview] = useState<ShopeeImportPreview | null>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [extReady, setExtReady] = useState(false);

  const refreshExt = useCallback(async () => {
    const ok = await pingShopeeExtension();
    setExtReady(ok);
    return ok;
  }, []);

  const close = useCallback(() => {
    if (busy) return;
    setOpen(false);
    setPreview(null);
    setPhase("idle");
    setLocalErr(null);
  }, [busy]);

  useEffect(() => {
    if (!open) return;
    void refreshExt();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, refreshExt]);

  async function previewWithRaw(raw: unknown | undefined, link: string) {
    setBusy(true);
    setPhase("preview");
    setLocalErr(null);
    onError(null);
    try {
      const res = await fetch("/api/shop/import-shopee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: link || undefined,
          raw,
          apply: false,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        preview?: ShopeeImportPreview;
        error?: string;
      } | null;
      if (!res.ok || !json?.preview) {
        throw new Error(json?.error ?? "Không đọc được link Shopee.");
      }
      setPreview(json.preview);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import thất bại.";
      setLocalErr(msg);
      onError(msg);
      setPreview(null);
    } finally {
      setBusy(false);
      setPhase("idle");
    }
  }

  /** Ưu tiên extension (đủ giá + mẫu); không có thì OG/server. */
  async function runPreview() {
    const trimmed = url.trim();
    if (!trimmed) {
      setLocalErr("Dán link sản phẩm Shopee.");
      return;
    }

    const hasExt = extReady || (await refreshExt());
    if (hasExt) {
      setBusy(true);
      setPhase("preview");
      setLocalErr(null);
      onError(null);
      try {
        const raw = await fetchShopeeGetPcViaExtension(trimmed);
        setBusy(false);
        await previewWithRaw(raw, trimmed);
        return;
      } catch (e) {
        setBusy(false);
        setPhase("idle");
        const msg =
          e instanceof Error
            ? e.message
            : "Trợ lý AI không lấy được dữ liệu.";
        setLocalErr(
          `${msg} Thử lại, hoặc dùng «Chỉ lấy tên + ảnh».`,
        );
        return;
      }
    }

    await previewWithRaw(undefined, trimmed);
  }

  async function runPreviewQuick() {
    const trimmed = url.trim();
    if (!trimmed) {
      setLocalErr("Dán link sản phẩm Shopee.");
      return;
    }
    await previewWithRaw(undefined, trimmed);
  }

  async function runApply() {
    if (!preview) return;
    setBusy(true);
    setPhase("apply");
    setLocalErr(null);
    onError(null);
    try {
      const res = await fetch("/api/shop/import-shopee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim() || preview.draft.sourceUrl,
          apply: true,
          preview,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        nhom?: ShopNhom;
        products?: ShopSanPham[];
        error?: string;
      } | null;
      if (!res.ok || !json?.nhom) {
        throw new Error(json?.error ?? "Không tạo được loại hàng.");
      }
      onImported({
        nhom: json.nhom,
        products: json.products ?? [],
      });
      setOpen(false);
      setPreview(null);
      setUrl("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lưu kho thất bại.";
      setLocalErr(msg);
      onError(msg);
    } finally {
      setBusy(false);
      setPhase("idle");
    }
  }

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="shop-shopee-import-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <div
              className="shop-shopee-import-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <header className="shop-shopee-import-head">
                <h2 id={titleId}>
                  <Sparkles size={18} aria-hidden />
                  Import từ Shopee
                </h2>
                <button
                  type="button"
                  className="shop-shopee-import-close"
                  aria-label="Đóng"
                  disabled={busy}
                  onClick={close}
                >
                  <X size={18} aria-hidden />
                </button>
              </header>

              <p className="shop-shopee-import-hint">
                Dán link sản phẩm Shopee. Bật trợ lý AI một lần để lấy đủ giá và
                các mẫu; chưa bật vẫn lấy được tên với ảnh.
              </p>

              <div
                className={`shop-shopee-import-ext${extReady ? " is-ready" : ""}`}
              >
                <div className="shop-shopee-import-ext-row">
                  <div className="shop-shopee-import-ext-label">
                    <span className="shop-shopee-import-ext-step">Bước 1</span>
                    <span className="shop-shopee-import-ext-status">
                      {extReady
                        ? "Trợ lý AI đã sẵn sàng"
                        : "Bật trợ lý AI (làm một lần)"}
                    </span>
                  </div>
                  <div className="shop-shopee-import-ext-acts">
                    {!extReady ? (
                      <a
                        className="shop-dash-kho-edit-btn"
                        href={CINS_SHOPEE_EXT_ZIP_HREF}
                        download="cins-shopee-import.zip"
                      >
                        <Download size={15} aria-hidden />
                        Tải trợ lý AI
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="shop-dash-kho-edit-btn"
                      disabled={busy}
                      onClick={() => void refreshExt()}
                    >
                      {extReady ? "Kiểm tra lại" : "Tôi đã bật xong"}
                    </button>
                  </div>
                </div>
                {!extReady ? (
                  <ol className="shop-shopee-import-ext-steps">
                    <li>Bấm <strong>Tải trợ lý AI</strong> → giải nén file zip.</li>
                    <li>
                      Vào Chrome, gõ trên thanh địa chỉ:{" "}
                      <code>chrome://extensions</code>
                    </li>
                    <li>
                      Bật <strong>Chế độ dành cho nhà phát triển</strong> (góc
                      phải).
                    </li>
                    <li>
                      Bấm <strong>Tải tiện ích đã giải nén</strong> → chọn thư
                      mục <code>cins-shopee-import</code>.
                    </li>
                    <li>Quay lại đây → bấm <strong>Tôi đã bật xong</strong>.</li>
                  </ol>
                ) : (
                  <p className="shop-shopee-import-ext-ok">
                    Có thể dán link bên dưới để lấy đủ giá và mẫu.
                  </p>
                )}
              </div>

              <label className="shop-shopee-import-field">
                <span>
                  <span className="shop-shopee-import-ext-step">Bước 2</span>{" "}
                  Link Shopee
                </span>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Dán link sản phẩm Shopee vào đây"
                  disabled={busy}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void runPreview();
                    }
                  }}
                />
              </label>

              {localErr ? (
                <p className="shop-shopee-import-err" role="alert">
                  {localErr}
                </p>
              ) : null}

              {preview ? (
                <div className="shop-shopee-import-preview">
                  <div className="shop-shopee-import-preview-main">
                    {preview.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview.images[0].url}
                        alt=""
                        className="shop-shopee-import-thumb"
                      />
                    ) : (
                      <div className="shop-shopee-import-thumb is-empty">
                        Không có ảnh
                      </div>
                    )}
                    <div>
                      <p className="shop-shopee-import-nhan">{preview.nhan}</p>
                      <p className="shop-shopee-import-meta">
                        {preview.giaMacDinh != null
                          ? `${preview.giaMacDinh.toLocaleString("vi-VN")}₫`
                          : "Chưa có giá (điền sau)"}
                        {" · "}
                        {preview.images.length} ảnh
                        {" · "}
                        {preview.models.length} mẫu
                        {" · "}
                        {preview.draft.source === "raw" ||
                        preview.draft.source === "api"
                          ? "đủ dữ liệu"
                          : "tên + ảnh"}
                      </p>
                      {preview.moTa ? (
                        <p className="shop-shopee-import-mota">{preview.moTa}</p>
                      ) : null}
                    </div>
                  </div>
                  {preview.draft.warnings.length > 0 ? (
                    <ul className="shop-shopee-import-warn">
                      {preview.draft.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  ) : null}
                  {preview.models.length > 0 ? (
                    <div className="shop-shopee-import-maus">
                      {preview.models.slice(0, 12).map((m) => (
                        <span key={m.ten} className="shop-shopee-import-mau">
                          {m.ten}
                        </span>
                      ))}
                      {preview.models.length > 12 ? (
                        <span className="shop-shopee-import-mau">
                          +{preview.models.length - 12}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <footer className="shop-shopee-import-actions">
                {!preview ? (
                  <>
                    {!extReady ? (
                      <button
                        type="button"
                        className="shop-dash-kho-edit-btn"
                        disabled={busy || !url.trim()}
                        onClick={() => void runPreviewQuick()}
                      >
                        Chỉ lấy tên + ảnh
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="shop-shopee-import-primary"
                      disabled={busy || !url.trim()}
                      onClick={() => void runPreview()}
                    >
                      {busy && phase === "preview" ? (
                        <Loader2 size={16} className="shop-spin" aria-hidden />
                      ) : (
                        <Sparkles size={16} aria-hidden />
                      )}
                      {extReady
                        ? "Để trợ lý AI lấy hàng"
                        : "Lấy hàng (cần trợ lý AI)"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="shop-dash-kho-edit-btn"
                      disabled={busy}
                      onClick={() => {
                        setPreview(null);
                        setLocalErr(null);
                      }}
                    >
                      Làm lại
                    </button>
                    <button
                      type="button"
                      className="shop-shopee-import-primary"
                      disabled={busy}
                      onClick={() => void runApply()}
                    >
                      {busy && phase === "apply" ? (
                        <Loader2 size={16} className="shop-spin" aria-hidden />
                      ) : null}
                      Tạo loại hàng
                      {preview.models.length > 0
                        ? ` + ${preview.models.length} mẫu`
                        : ""}
                    </button>
                  </>
                )}
              </footer>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        className="shop-dash-kho-edit-btn shop-shopee-import-trigger"
        disabled={disabled}
        title="Import sản phẩm từ Shopee bằng trợ lý AI"
        onClick={() => {
          setOpen(true);
          setLocalErr(null);
        }}
      >
        <Sparkles size={15} aria-hidden />
        AI · Shopee
      </button>
      {modal}
    </>
  );
}
