"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

type DongItem = {
  thamChieu: string | null;
  ngay: string;
  doanhThuVnd: number;
  tyLe: number;
  phiVnd: number;
  loaiTru: boolean;
  lyDoLoaiTru: string | null;
};

type DongPayload = {
  items: DongItem[];
  tong: {
    doanhThuVnd: number;
    phiVnd: number;
    soDong: number;
    soLoaiTru: number;
  };
  loai: string;
  tenDichVu: string | null;
};

function fmtVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

function fmtYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}/${m}/${y}`;
}

function fmtTyLe(tyLe: number): string {
  const pct = tyLe * 100;
  const s =
    Math.abs(pct - Math.round(pct)) < 1e-6
      ? String(Math.round(pct))
      : pct.toFixed(1).replace(/\.0$/, "");
  return `${s}%`;
}

type Props = {
  hoaDonId: string | null;
  title?: string;
  onClose: () => void;
};

export function BillingDongPhiDrawer({ hoaDonId, title, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<DongPayload | null>(null);

  useEffect(() => {
    if (!hoaDonId) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setData(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/tai-khoan/thanh-toan/hoa-don/${encodeURIComponent(hoaDonId)}/dong`,
          { cache: "no-store", credentials: "include" },
        );
        const json = (await res.json().catch(() => null)) as
          | (DongPayload & { error?: string })
          | null;
        if (cancelled) return;
        if (!res.ok) {
          setErr(json?.error ?? "Không tải được bảng kê.");
          return;
        }
        setData(json);
      } catch {
        if (!cancelled) setErr("Lỗi mạng.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hoaDonId]);

  useEffect(() => {
    if (!hoaDonId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [hoaDonId, onClose]);

  if (!hoaDonId) return null;

  const isShop = data?.loai === "shop_phi";

  return (
    <div
      className="billing-dialog-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="billing-dong-title"
      onClick={onClose}
    >
      <div
        className="billing-dialog billing-dialog--dong"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="billing-dialog-head">
          <h2 id="billing-dong-title" className="billing-panel-title">
            {title || data?.tenDichVu || "Bảng kê dòng phí"}
          </h2>
          <button
            type="button"
            className="billing-icon-btn"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <p className="billing-muted">
            <Loader2 size={16} className="spin" aria-hidden /> Đang tải…
          </p>
        ) : null}
        {err ? <p className="billing-flash">{err}</p> : null}

        {data && !loading ? (
          <>
            <p className="billing-muted">
              {isShop ? "GMV đơn hoàn thành" : "Doanh thu học phí ghi nhận"} ·{" "}
              {data.tong.soDong} dòng
              {data.tong.soLoaiTru > 0
                ? ` · ${data.tong.soLoaiTru} loại trừ`
                : ""}
              . Không hiện thông tin người mua / học viên.
            </p>
            <dl className="billing-success-dl">
              <div>
                <dt>{isShop ? "GMV hiệu lực" : "DT hiệu lực"}</dt>
                <dd>{fmtVnd(data.tong.doanhThuVnd)}</dd>
              </div>
              <div>
                <dt>Phí CINs</dt>
                <dd>{fmtVnd(data.tong.phiVnd)}</dd>
              </div>
            </dl>
            {data.items.length === 0 ? (
              <p className="billing-empty">Chưa có dòng phí gắn kỳ này.</p>
            ) : (
              <div className="billing-table-wrap">
                <table className="billing-table billing-table--dong">
                  <thead>
                    <tr>
                      <th>{isShop ? "Mã đơn" : "Mã"}</th>
                      <th>Ngày</th>
                      <th>{isShop ? "GMV" : "DT"}</th>
                      <th>%</th>
                      <th>Phí</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((row, i) => (
                      <tr
                        key={`${row.thamChieu ?? i}-${i}`}
                        className={row.loaiTru ? "billing-dong-loai-tru" : undefined}
                      >
                        <td className="mono">{row.thamChieu || "—"}</td>
                        <td>{fmtYmd(row.ngay)}</td>
                        <td>{fmtVnd(row.doanhThuVnd)}</td>
                        <td>{fmtTyLe(row.tyLe)}</td>
                        <td>
                          {fmtVnd(row.phiVnd)}
                          {row.loaiTru ? (
                            <div className="billing-td-sub">
                              Loại trừ
                              {row.lyDoLoaiTru ? `: ${row.lyDoLoaiTru}` : ""}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}

        <div className="billing-dialog-actions">
          <button type="button" className="billing-btn" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
