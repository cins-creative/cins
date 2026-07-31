"use client";

import { Check, Loader2, Receipt } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  cloudflareImageTooLargeError,
  MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES,
} from "@/lib/cloudflare/image-upload-limits";
import { isAllowedUploadImageFile } from "@/lib/files/infer-image-mime";

type PhiKy = {
  id: string;
  ky: string;
  gmvGhiNhan: number;
  tyLe: number;
  phiPhaiTra: number;
  trangThai: string;
  hanTra: string | null;
  bienLaiAnhUrl: string | null;
};

function money(n: number): string {
  return `${n.toLocaleString("vi-VN")} VND`;
}

/**
 * Kỳ phí nền tảng (% GMV) — seller xem + nộp biên lai.
 * Gắn vào `ShopOwnerEditor`.
 */
export function ShopPhiPanel() {
  const [items, setItems] = useState<PhiKy[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadFor, setUploadFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/shop/phi/ky", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        items?: PhiKy[];
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không tải kỳ phí.");
        return;
      }
      setItems(json?.items ?? []);
    } catch {
      setErr("Không tải kỳ phí.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadAndBao(kyId: string, file: File | null) {
    if (!file) return;
    if (!isAllowedUploadImageFile(file)) {
      setErr("Chỉ nhận ảnh (JPEG/PNG/WebP).");
      return;
    }
    if (file.size > MAX_CLOUDFLARE_IMAGE_UPLOAD_BYTES) {
      setErr(cloudflareImageTooLargeError(file.size));
      return;
    }
    setBusyId(kyId);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/post-image/upload", {
        method: "POST",
        body: fd,
      });
      const upJson = (await up.json().catch(() => null)) as {
        url?: string;
        imageId?: string;
        error?: string;
      } | null;
      if (!up.ok || !upJson?.url) {
        setErr(upJson?.error ?? "Upload biên lai thất bại.");
        return;
      }
      const res = await fetch(`/api/shop/phi/ky/${kyId}/bao-da-tra`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bienLaiAnhUrl: upJson.url,
          bienLaiAnhId: upJson.imageId ?? null,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không báo đã trả.");
        return;
      }
      await load();
    } catch {
      setErr("Không báo đã trả.");
    } finally {
      setBusyId(null);
      setUploadFor(null);
    }
  }

  return (
    <section
      className="j-shop-panel j-shop-panel-phi"
      aria-labelledby="j-shop-panel-phi"
    >
      <header className="j-shop-panel-head">
        <h3 id="j-shop-panel-phi">
          <Receipt size={16} aria-hidden />
          Phí nền tảng
        </h3>
        <p className="j-shop-panel-desc">
          % doanh thu đơn hoàn thành (mặc định 5%), kỳ tháng, trả sau. CINs không
          giữ tiền hàng — bạn chuyển phí về tài khoản CINs khi đến hạn.
        </p>
      </header>

      {err ? (
        <p className="j-shop-err" role="alert">
          {err}
        </p>
      ) : null}

      {loading ? (
        <p className="j-shop-loading">
          <Loader2 size={16} className="shop-spin" aria-hidden /> Đang tải…
        </p>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const id = uploadFor;
          const f = e.target.files?.[0] ?? null;
          if (fileRef.current) fileRef.current.value = "";
          if (id) void uploadAndBao(id, f);
        }}
      />

      {!loading && items.length === 0 ? (
        <p className="j-shop-panel-desc">Chưa có kỳ phí — sẽ xuất hiện khi có đơn hoàn thành.</p>
      ) : null}

      {!loading && items.length > 0 ? (
        <ul className="j-shop-kho-list">
          {items.map((k) => (
            <li key={k.id} className="j-shop-kho-item">
              <div className="j-shop-kho-item-main">
                <div className="j-shop-kho-item-top">
                  <strong>Kỳ {k.ky}</strong>
                  <span className="j-shop-kho-mac-dinh">{k.trangThai}</span>
                </div>
                <p>
                  GMV {money(k.gmvGhiNhan)} · {(k.tyLe * 100).toFixed(1)}% →{" "}
                  <strong>{money(k.phiPhaiTra)}</strong>
                </p>
                {k.hanTra ? <p>Hạn trả: {k.hanTra}</p> : null}
                {k.bienLaiAnhUrl ? (
                  <p>
                    Đã nộp biên lai
                    {k.trangThai === "da_tra" ? " · đã xác nhận" : " · chờ admin"}
                  </p>
                ) : null}
              </div>
              {k.trangThai === "chua_tra" ||
              k.trangThai === "qua_han" ||
              k.trangThai === "chua_chot" ? (
                <button
                  type="button"
                  className="j-shop-save"
                  disabled={busyId === k.id}
                  onClick={() => {
                    setUploadFor(k.id);
                    fileRef.current?.click();
                  }}
                >
                  {busyId === k.id ? (
                    <Loader2 size={14} className="shop-spin" aria-hidden />
                  ) : (
                    <Check size={14} aria-hidden />
                  )}
                  {k.bienLaiAnhUrl ? "Đổi biên lai" : "Báo đã trả"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
