"use client";

import { Download, Loader2, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  CINS_SHOPEE_EXT_ZIP_HREF,
  CINS_SHOPEE_SHOP_MAX_ITEMS,
  fetchShopeeGetPcBatchViaExtension,
  fetchShopeeGetPcViaExtension,
  listShopeeShopViaExtension,
  pingShopeeExtension,
  type ShopeeShopListItem,
  type ShopeeShopListResult,
} from "@/lib/shop/shopee/extension-bridge";
import type { ShopeeImportPreview } from "@/lib/shop/shopee/types";
import type { ShopNhom, ShopSanPham } from "@/lib/shop/types";

type ImportMode = "product" | "shop";

type Props = {
  disabled?: boolean;
  onImported: (payload: {
    nhom: ShopNhom;
    products: ShopSanPham[];
    /** Khi kéo cả shop: cập nhật list, không mở chi tiết từng loại. */
    stayOnList?: boolean;
  }) => void;
  onError: (msg: string | null) => void;
};

type ShopRowStatus = "idle" | "ok" | "fail" | "skip";

export function ShopKhoShopeeImportButton({
  disabled,
  onImported,
  onError,
}: Props) {
  const titleId = useId();
  const cancelRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ImportMode>("product");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "preview" | "apply" | "scan" | "batch">(
    "idle",
  );
  const [preview, setPreview] = useState<ShopeeImportPreview | null>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [extReady, setExtReady] = useState(false);

  const [shopList, setShopList] = useState<ShopeeShopListResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [shopProgress, setShopProgress] = useState<{
    done: number;
    total: number;
    label: string;
  } | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<string, ShopRowStatus>>({});
  const [shopSummary, setShopSummary] = useState<string | null>(null);

  const refreshExt = useCallback(async () => {
    const ok = await pingShopeeExtension();
    setExtReady(ok);
    return ok;
  }, []);

  const resetShopState = useCallback(() => {
    setShopList(null);
    setSelected(new Set());
    setShopProgress(null);
    setRowStatus({});
    setShopSummary(null);
  }, []);

  const close = useCallback(() => {
    if (busy) return;
    setOpen(false);
    setPreview(null);
    setPhase("idle");
    setLocalErr(null);
    resetShopState();
  }, [busy, resetShopState]);

  useEffect(() => {
    if (!open) return;
    void refreshExt();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, refreshExt]);

  function itemKey(it: { shopId: string; itemId: string }) {
    return `${it.shopId}.${it.itemId}`;
  }

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
        setLocalErr(`${msg} Thử lại, hoặc dùng «Chỉ lấy tên + ảnh».`);
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

  async function runScanShop() {
    const trimmed = url.trim();
    if (!trimmed) {
      setLocalErr("Dán link shop Shopee (vd. https://shopee.vn/ten-shop).");
      return;
    }
    const hasExt = extReady || (await refreshExt());
    if (!hasExt) {
      setLocalErr("Cần bật trợ lý AI để quét cả shop.");
      return;
    }

    setBusy(true);
    setPhase("scan");
    setLocalErr(null);
    onError(null);
    setShopSummary(null);
    setRowStatus({});
    try {
      const list = await listShopeeShopViaExtension(
        trimmed,
        CINS_SHOPEE_SHOP_MAX_ITEMS,
      );
      setShopList(list);
      setSelected(new Set(list.items.map(itemKey)));
      if (list.items.length === 0) {
        setLocalErr("Shop không có sản phẩm (hoặc Shopee chặn danh sách).");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Quét shop thất bại.";
      setLocalErr(msg);
      onError(msg);
      setShopList(null);
      setSelected(new Set());
    } finally {
      setBusy(false);
      setPhase("idle");
    }
  }

  function toggleItem(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll(on: boolean) {
    if (!shopList) return;
    setSelected(on ? new Set(shopList.items.map(itemKey)) : new Set());
  }

  async function applyOneFromRaw(
    raw: unknown,
    productUrl: string,
    stayOnList: boolean,
  ): Promise<{ nhom: ShopNhom; products: ShopSanPham[] }> {
    const previewRes = await fetch("/api/shop/import-shopee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: productUrl, raw, apply: false }),
    });
    const previewJson = (await previewRes.json().catch(() => null)) as {
      preview?: ShopeeImportPreview;
      error?: string;
    } | null;
    if (!previewRes.ok || !previewJson?.preview) {
      throw new Error(previewJson?.error ?? "Preview thất bại.");
    }

    const applyRes = await fetch("/api/shop/import-shopee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: productUrl,
        apply: true,
        preview: previewJson.preview,
      }),
    });
    const applyJson = (await applyRes.json().catch(() => null)) as {
      nhom?: ShopNhom;
      products?: ShopSanPham[];
      error?: string;
    } | null;
    if (!applyRes.ok || !applyJson?.nhom) {
      throw new Error(applyJson?.error ?? "Lưu kho thất bại.");
    }

    onImported({
      nhom: applyJson.nhom,
      products: applyJson.products ?? [],
      stayOnList,
    });
    return {
      nhom: applyJson.nhom,
      products: applyJson.products ?? [],
    };
  }

  async function runImportShop() {
    if (!shopList) return;
    const picks = shopList.items.filter((it) => selected.has(itemKey(it)));
    if (picks.length === 0) {
      setLocalErr("Chọn ít nhất một sản phẩm.");
      return;
    }

    const hasExt = extReady || (await refreshExt());
    if (!hasExt) {
      setLocalErr("Cần bật trợ lý AI để kéo cả shop.");
      return;
    }

    cancelRef.current = false;
    setBusy(true);
    setPhase("batch");
    setLocalErr(null);
    onError(null);
    setShopSummary(null);
    setRowStatus({});
    setShopProgress({
      done: 0,
      total: picks.length,
      label: "Đang lấy dữ liệu từ Shopee…",
    });

    let okCount = 0;
    let failCount = 0;
    let skipCount = 0;

    try {
      const batch = await fetchShopeeGetPcBatchViaExtension(
        picks.map((p) => ({
          shopId: p.shopId,
          itemId: p.itemId,
          productUrl: p.productUrl,
        })),
      );

      if (cancelRef.current) {
        setShopSummary("Đã dừng trước khi lưu kho.");
        return;
      }

      const byKey = new Map(
        batch.map((r) => [`${r.shopId}.${r.itemId}`, r] as const),
      );

      setShopProgress({
        done: 0,
        total: picks.length,
        label: "Đang lưu vào kho…",
      });

      for (let i = 0; i < picks.length; i++) {
        if (cancelRef.current) {
          skipCount += picks.length - i;
          for (let j = i; j < picks.length; j++) {
            const k = itemKey(picks[j]!);
            setRowStatus((s) => ({ ...s, [k]: "skip" }));
          }
          break;
        }

        const it = picks[i]!;
        const key = itemKey(it);
        const rawEntry = byKey.get(key);

        try {
          if (!rawEntry?.ok || rawEntry.data == null) {
            throw new Error(rawEntry?.error || "Không lấy được get_pc.");
          }
          await applyOneFromRaw(rawEntry.data, it.productUrl, true);
          okCount += 1;
          setRowStatus((s) => ({ ...s, [key]: "ok" }));
        } catch (e) {
          failCount += 1;
          setRowStatus((s) => ({ ...s, [key]: "fail" }));
          console.warn("[shopee-shop-import]", it.productUrl, e);
        }

        setShopProgress({
          done: i + 1,
          total: picks.length,
          label: "Đang lưu vào kho…",
        });
      }

      const parts = [`Đã lưu ${okCount}/${picks.length}`];
      if (failCount) parts.push(`${failCount} lỗi`);
      if (skipCount) parts.push(`${skipCount} bỏ qua`);
      if (cancelRef.current) parts.push("(đã dừng)");
      setShopSummary(parts.join(" · "));
      if (failCount && okCount === 0) {
        const msg = "Không lưu được sản phẩm nào. Kiểm tra trợ lý AI / đăng nhập Shopee.";
        setLocalErr(msg);
        onError(msg);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Kéo shop thất bại.";
      setLocalErr(msg);
      onError(msg);
    } finally {
      setBusy(false);
      setPhase("idle");
      setShopProgress(null);
      cancelRef.current = false;
    }
  }

  function requestCancel() {
    cancelRef.current = true;
  }

  function switchMode(next: ImportMode) {
    if (busy) return;
    setMode(next);
    setPreview(null);
    setLocalErr(null);
    resetShopState();
  }

  const selectedCount = selected.size;

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="shop-shopee-import-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget && !busy) close();
            }}
          >
            <div
              className={`shop-shopee-import-modal${mode === "shop" ? " is-wide" : ""}`}
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

              <div
                className={`shop-shopee-import-ext${extReady ? " is-ready" : ""}`}
              >
                <div className="shop-shopee-import-ext-row">
                  <div className="shop-shopee-import-ext-label">
                    <span className="shop-shopee-import-ext-step">Bước 1</span>
                    <span className="shop-shopee-import-ext-status">
                      {extReady
                        ? "Trợ lý AI đã sẵn sàng"
                        : "Bật trợ lý AI (một lần, dùng chung)"}
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
                  <>
                    <p className="shop-shopee-import-ext-shared">
                      Một trợ lý cho cả <strong>một sản phẩm</strong> và{" "}
                      <strong>cả shop</strong> — chỉ tải / cài một lần.
                    </p>
                    <ol className="shop-shopee-import-ext-steps">
                      <li>
                        Bấm <strong>Tải trợ lý AI</strong> → giải nén file zip.
                      </li>
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
                      <li>
                        Quay lại đây → bấm <strong>Tôi đã bật xong</strong>.
                      </li>
                    </ol>
                  </>
                ) : (
                  <p className="shop-shopee-import-ext-ok">
                    Đã sẵn sàng cho cả một sản phẩm và cả shop — chọn tab bên
                    dưới.
                  </p>
                )}
              </div>

              <div className="shop-shopee-import-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "product"}
                  className={`shop-shopee-import-tab${mode === "product" ? " is-active" : ""}`}
                  disabled={busy}
                  onClick={() => switchMode("product")}
                >
                  Một sản phẩm
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "shop"}
                  className={`shop-shopee-import-tab${mode === "shop" ? " is-active" : ""}`}
                  disabled={busy}
                  onClick={() => switchMode("shop")}
                >
                  Cả shop
                </button>
              </div>

              <p className="shop-shopee-import-hint">
                {mode === "product"
                  ? "Dán link sản phẩm Shopee. Có trợ lý AI thì lấy đủ giá và mẫu; chưa bật vẫn lấy được tên với ảnh."
                  : `Dán link shop (vd. shopee.vn/ten-shop). Cần trợ lý AI — quét tối đa ${CINS_SHOPEE_SHOP_MAX_ITEMS} SP; mỗi SP thành một loại hàng (cùng tên thì cập nhật).`}
              </p>

              <label className="shop-shopee-import-field">
                <span>
                  <span className="shop-shopee-import-ext-step">Bước 2</span>{" "}
                  {mode === "shop" ? "Link shop Shopee" : "Link Shopee"}
                </span>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={
                    mode === "shop"
                      ? "https://shopee.vn/ten-shop"
                      : "Dán link sản phẩm Shopee vào đây"
                  }
                  disabled={busy}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (mode === "shop") void runScanShop();
                      else void runPreview();
                    }
                  }}
                />
              </label>

              {localErr ? (
                <p className="shop-shopee-import-err" role="alert">
                  {localErr}
                </p>
              ) : null}

              {shopSummary ? (
                <p className="shop-shopee-import-summary" role="status">
                  {shopSummary}
                </p>
              ) : null}

              {shopProgress ? (
                <div className="shop-shopee-import-progress" role="status">
                  <div className="shop-shopee-import-progress-label">
                    <Loader2 size={14} className="shop-spin" aria-hidden />
                    {shopProgress.label}{" "}
                    {shopProgress.total > 0
                      ? `(${shopProgress.done}/${shopProgress.total})`
                      : null}
                  </div>
                  <div className="shop-shopee-import-progress-bar">
                    <span
                      style={{
                        width: `${
                          shopProgress.total
                            ? Math.round(
                                (100 * shopProgress.done) / shopProgress.total,
                              )
                            : 8
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}

              {mode === "product" && preview ? (
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

              {mode === "shop" && shopList ? (
                <ShopItemPicker
                  list={shopList}
                  selected={selected}
                  rowStatus={rowStatus}
                  disabled={busy}
                  onToggle={toggleItem}
                  onSelectAll={selectAll}
                  itemKey={itemKey}
                />
              ) : null}

              <footer className="shop-shopee-import-actions">
                {mode === "product" ? (
                  !preview ? (
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
                          <Loader2
                            size={16}
                            className="shop-spin"
                            aria-hidden
                          />
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
                          <Loader2
                            size={16}
                            className="shop-spin"
                            aria-hidden
                          />
                        ) : null}
                        Tạo loại hàng
                        {preview.models.length > 0
                          ? ` + ${preview.models.length} mẫu`
                          : ""}
                      </button>
                    </>
                  )
                ) : !shopList ? (
                  <button
                    type="button"
                    className="shop-shopee-import-primary"
                    disabled={busy || !url.trim() || !extReady}
                    onClick={() => void runScanShop()}
                  >
                    {busy && phase === "scan" ? (
                      <Loader2 size={16} className="shop-spin" aria-hidden />
                    ) : (
                      <Sparkles size={16} aria-hidden />
                    )}
                    Quét shop
                  </button>
                ) : busy && phase === "batch" ? (
                  <button
                    type="button"
                    className="shop-dash-kho-edit-btn"
                    onClick={requestCancel}
                  >
                    Dừng
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="shop-dash-kho-edit-btn"
                      disabled={busy}
                      onClick={() => {
                        resetShopState();
                        setLocalErr(null);
                      }}
                    >
                      Quét lại
                    </button>
                    <button
                      type="button"
                      className="shop-shopee-import-primary"
                      disabled={busy || selectedCount === 0}
                      onClick={() => void runImportShop()}
                    >
                      <Sparkles size={16} aria-hidden />
                      Kéo {selectedCount} SP về kho
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

function ShopItemPicker({
  list,
  selected,
  rowStatus,
  disabled,
  onToggle,
  onSelectAll,
  itemKey,
}: {
  list: ShopeeShopListResult;
  selected: Set<string>;
  rowStatus: Record<string, ShopRowStatus>;
  disabled: boolean;
  onToggle: (key: string) => void;
  onSelectAll: (on: boolean) => void;
  itemKey: (it: ShopeeShopListItem) => string;
}) {
  const allOn =
    list.items.length > 0 && list.items.every((it) => selected.has(itemKey(it)));

  return (
    <div className="shop-shopee-import-shop">
      <div className="shop-shopee-import-shop-head">
        <label className="shop-shopee-import-shop-all">
          <input
            type="checkbox"
            checked={allOn}
            disabled={disabled}
            onChange={(e) => onSelectAll(e.target.checked)}
          />
          <span>
            {list.shopName || list.shopId} · {selected.size}/
            {list.items.length} đã chọn
            {list.truncated ? ` (tối đa ${CINS_SHOPEE_SHOP_MAX_ITEMS})` : ""}
          </span>
        </label>
      </div>
      <ul className="shop-shopee-import-shop-list">
        {list.items.map((it) => {
          const key = itemKey(it);
          const st = rowStatus[key];
          return (
            <li key={key} className={`shop-shopee-import-shop-row${st ? ` is-${st}` : ""}`}>
              <label>
                <input
                  type="checkbox"
                  checked={selected.has(key)}
                  disabled={disabled}
                  onChange={() => onToggle(key)}
                />
                {it.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrl} alt="" className="shop-shopee-import-shop-thumb" />
                ) : (
                  <span className="shop-shopee-import-shop-thumb is-empty" />
                )}
                <span className="shop-shopee-import-shop-meta">
                  <span className="shop-shopee-import-shop-name">{it.name}</span>
                  <span className="shop-shopee-import-shop-price">
                    {it.priceMin != null
                      ? `${it.priceMin.toLocaleString("vi-VN")}₫`
                      : "—"}
                    {st === "ok"
                      ? " · đã lưu"
                      : st === "fail"
                        ? " · lỗi"
                        : st === "skip"
                          ? " · bỏ qua"
                          : ""}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
