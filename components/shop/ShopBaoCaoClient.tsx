"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Loader2,
  Minus,
  PackageCheck,
  ShoppingBag,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

import type { BaoCaoDoanhThu, BaoCaoNgay, BaoCaoSanPhamBanChay } from "@/app/api/shop/bao-cao/route";
import {
  fetchBaoCaoCached,
  peekBaoCao,
} from "@/lib/shop/client-fetch-cache";

import "./shop-dashboard.css";

function formatVnd(amount: number, tienTe = "VND"): string {
  if (tienTe === "VND") {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} tỷ`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")} tr`;
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
    return amount.toLocaleString("vi-VN");
  }
  return amount.toLocaleString("vi-VN");
}

function formatVndFull(amount: number, tienTe = "VND"): string {
  return `${amount.toLocaleString("vi-VN")} ${tienTe}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

// ──────────────────────────────────────────────
// KPI Card
// ──────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  icon,
  trend,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "flat" | null;
  accent?: "green" | "blue" | "orange" | "red";
}) {
  return (
    <div className={`bao-cao-kpi${accent ? ` bao-cao-kpi--${accent}` : ""}`}>
      <div className="bao-cao-kpi-icon" aria-hidden>{icon}</div>
      <div className="bao-cao-kpi-body">
        <span className="bao-cao-kpi-label">{label}</span>
        <span className="bao-cao-kpi-value">{value}</span>
        {sub && (
          <span className="bao-cao-kpi-sub">
            {trend === "up" && <ArrowUp size={12} strokeWidth={2.5} aria-hidden />}
            {trend === "down" && <ArrowDown size={12} strokeWidth={2.5} aria-hidden />}
            {trend === "flat" && <Minus size={12} strokeWidth={2.5} aria-hidden />}
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// SVG Bar Chart
// ──────────────────────────────────────────────
function RevenueBarChart({ data }: { data: BaoCaoNgay[] }) {
  const W = 600;
  const H = 120;
  const PAD_L = 4;
  const PAD_R = 4;
  const PAD_T = 8;
  const PAD_B = 24;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const maxVal = Math.max(...data.map((d) => d.doanhThu), 1);
  const barW = chartW / data.length;
  const gap = Math.max(1, barW * 0.15);

  // Only show ~7 date labels to avoid crowding
  const labelStep = Math.ceil(data.length / 7);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="bao-cao-chart-svg"
      role="img"
      aria-label="Biểu đồ doanh thu 30 ngày"
    >
      {/* Guide lines */}
      {[0.25, 0.5, 0.75, 1].map((pct) => {
        const y = PAD_T + chartH * (1 - pct);
        return (
          <line
            key={pct}
            x1={PAD_L}
            y1={y}
            x2={W - PAD_R}
            y2={y}
            stroke="var(--chart-guide)"
            strokeWidth={1}
          />
        );
      })}

      {data.map((d, i) => {
        const barH = d.doanhThu > 0 ? Math.max(3, (d.doanhThu / maxVal) * chartH) : 2;
        const x = PAD_L + i * barW + gap / 2;
        const y = PAD_T + chartH - barH;
        const bw = barW - gap;
        const isEmpty = d.doanhThu === 0;

        return (
          <g key={d.ngay}>
            <rect
              x={x}
              y={y}
              width={bw}
              height={barH}
              rx={3}
              fill={isEmpty ? "var(--chart-empty)" : "var(--bao-cao-bar, #4f78e5)"}
              opacity={isEmpty ? 0.5 : 0.9}
            />
            {i % labelStep === 0 && (
              <text
                x={x + bw / 2}
                y={H - 4}
                textAnchor="middle"
                fontSize={9}
                fill="var(--chart-label)"
              >
                {formatDate(d.ngay)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ──────────────────────────────────────────────
// Top products
// ──────────────────────────────────────────────
function TopProducts({
  items,
  tienTe,
}: {
  items: BaoCaoSanPhamBanChay[];
  tienTe: string;
}) {
  const maxSL = Math.max(...items.map((p) => p.soLuong), 1);

  return (
    <ul className="bao-cao-top-list">
      {items.map((p, idx) => {
        const loaiTags = [p.phanLoai, p.phanLoai2].filter(Boolean);
        const variantLabel = p.nhanSnapshot ?? null;
        return (
          <li key={`${p.ten}|${p.nhanSnapshot ?? ""}|${idx}`} className="bao-cao-top-item">
            <span className="bao-cao-top-rank">{idx + 1}</span>

            {/* Thumbnail */}
            <div className="bao-cao-top-thumb" aria-hidden>
              {p.anhUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.anhUrl}
                  alt=""
                  className="bao-cao-top-thumb-img"
                  loading="lazy"
                  width={40}
                  height={40}
                />
              ) : (
                <span className="bao-cao-top-thumb-placeholder" />
              )}
            </div>

            <div className="bao-cao-top-info">
              <div className="bao-cao-top-name-row">
                <div className="bao-cao-top-name-stack">
                  <span className="bao-cao-top-name" title={p.ten}>{p.ten}</span>
                  {variantLabel && (
                    <span className="bao-cao-top-variant">{variantLabel}</span>
                  )}
                </div>
                <span className="bao-cao-top-dt">{formatVnd(p.doanhThu, tienTe)}</span>
              </div>

              {loaiTags.length > 0 && (
                <div className="bao-cao-top-tags">
                  {loaiTags.map((tag) => (
                    <span key={tag} className="bao-cao-top-tag">{tag}</span>
                  ))}
                </div>
              )}

              <div className="bao-cao-top-bar-wrap">
                <div
                  className="bao-cao-top-bar-fill"
                  style={{ width: `${(p.soLuong / maxSL) * 100}%` }}
                />
              </div>
              <span className="bao-cao-top-sl">{p.soLuong.toLocaleString("vi-VN")} đã bán</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ──────────────────────────────────────────────
// Order status breakdown
// ──────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  da_nhan_tien: "#22c55e",
  da_giao_tai_su_kien: "#16a34a",
  cho_xac_nhan: "#f59e0b",
  huy: "#ef4444",
  nhap: "#94a3b8",
};

function StatusBreakdown({ data }: { data: BaoCaoDoanhThu["trangThaiDon"] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;

  return (
    <div className="bao-cao-status-wrap">
      <div className="bao-cao-status-bar">
        {data.map((d) => (
          <div
            key={d.trangThai}
            className="bao-cao-status-seg"
            style={{
              width: `${(d.count / total) * 100}%`,
              background: STATUS_COLOR[d.trangThai] ?? "#94a3b8",
            }}
            title={`${d.nhan}: ${d.count}`}
          />
        ))}
      </div>
      <ul className="bao-cao-status-legend">
        {data.map((d) => (
          <li key={d.trangThai} className="bao-cao-status-item">
            <span
              className="bao-cao-status-dot"
              style={{ background: STATUS_COLOR[d.trangThai] ?? "#94a3b8" }}
            />
            <span className="bao-cao-status-label">{d.nhan}</span>
            <span className="bao-cao-status-count">{d.count}</span>
            <span className="bao-cao-status-pct">
              ({((d.count / total) * 100).toFixed(0)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────
export function ShopBaoCaoClient() {
  // Seed from hover-prefetch cache for instant render
  const [cachedData] = useState<BaoCaoDoanhThu | null>(() => peekBaoCao());
  const [data, setData] = useState<BaoCaoDoanhThu | null>(cachedData);
  const [loading, setLoading] = useState(cachedData === null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // Silent refresh if we already have cached data
        const json = await fetchBaoCaoCached();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled && cachedData === null) setErr("Không tải được báo cáo.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // cachedData is stable (useState initializer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trend this month vs last month
  const trend: "up" | "down" | "flat" | null = data
    ? data.thangNay > data.thangTruoc
      ? "up"
      : data.thangNay < data.thangTruoc
        ? "down"
        : "flat"
    : null;

  const trendPct =
    data && data.thangTruoc > 0
      ? (((data.thangNay - data.thangTruoc) / data.thangTruoc) * 100).toFixed(0)
      : null;

  return (
    <>
      {loading && (
        <div className="shop-dash-loading-inline">
          <Loader2 size={20} className="spin" aria-hidden />
          <span>Đang tải báo cáo…</span>
        </div>
      )}

      {err && (
        <div className="shop-dash-err-inline" role="alert">
          <AlertCircle size={18} aria-hidden />
          {err}
        </div>
      )}

      {data && !loading && (
        <div className="bao-cao-wrap">

          {/* KPI Row */}
          <section className="bao-cao-section">
            <div className="bao-cao-kpi-row">
              <KpiCard
                label="Tổng doanh thu"
                value={formatVnd(data.tongDoanhThu, data.tienTe)}
                sub={formatVndFull(data.tongDoanhThu, data.tienTe)}
                icon={<TrendingUp size={20} strokeWidth={2} />}
                accent="blue"
              />
              <KpiCard
                label="Tháng này"
                value={formatVnd(data.thangNay, data.tienTe)}
                sub={
                  trendPct !== null
                    ? `${trend === "up" ? "+" : trend === "down" ? "" : ""}${trendPct}% so tháng trước`
                    : "Chưa có tháng trước"
                }
                icon={<BarChart3 size={20} strokeWidth={2} />}
                trend={trend}
                accent={trend === "up" ? "green" : trend === "down" ? "red" : "blue"}
              />
              <KpiCard
                label="Đơn hoàn thành"
                value={data.tongDonHoanThanh.toLocaleString("vi-VN")}
                sub={`${data.tongDonChoXacNhan} chờ xác nhận`}
                icon={<PackageCheck size={20} strokeWidth={2} />}
                accent="green"
              />
              <KpiCard
                label="Đơn đã hủy"
                value={data.tongDonHuy.toLocaleString("vi-VN")}
                sub={
                  data.tongDonHoanThanh + data.tongDonHuy > 0
                    ? `${((data.tongDonHuy / (data.tongDonHoanThanh + data.tongDonHuy)) * 100).toFixed(0)}% tổng đơn`
                    : undefined
                }
                icon={<XCircle size={20} strokeWidth={2} />}
                accent={data.tongDonHuy > 0 ? "red" : "blue"}
              />
            </div>
          </section>

          {/* Revenue chart */}
          <section className="bao-cao-section bao-cao-section--chart">
            <h2 className="bao-cao-section-title">
              <BarChart3 size={16} strokeWidth={2} aria-hidden />
              Doanh thu 30 ngày gần nhất
            </h2>
            {data.doanhThuNgay.length > 0 ? (
              <div className="bao-cao-chart-wrap">
                <RevenueBarChart data={data.doanhThuNgay} />
                <div className="bao-cao-chart-legend">
                  <span className="bao-cao-chart-legend-dot" />
                  <span>Doanh thu hoàn thành ({data.tienTe})</span>
                </div>
              </div>
            ) : (
              <p className="bao-cao-empty">Chưa có dữ liệu.</p>
            )}
          </section>

          {/* Two columns: top products + status */}
          <div className="bao-cao-bottom-row">

            {/* Top products */}
            <section className="bao-cao-section bao-cao-section--half">
              <h2 className="bao-cao-section-title">
                <ShoppingBag size={16} strokeWidth={2} aria-hidden />
                Sản phẩm bán chạy
              </h2>
              {data.sanPhamBanChay.length > 0 ? (
                <TopProducts items={data.sanPhamBanChay} tienTe={data.tienTe} />
              ) : (
                <p className="bao-cao-empty">Chưa có đơn hoàn thành.</p>
              )}
            </section>

            {/* Order status */}
            <section className="bao-cao-section bao-cao-section--half">
              <h2 className="bao-cao-section-title">
                <PackageCheck size={16} strokeWidth={2} aria-hidden />
                Phân tích trạng thái đơn
              </h2>
              {data.trangThaiDon.length > 0 ? (
                <StatusBreakdown data={data.trangThaiDon} />
              ) : (
                <p className="bao-cao-empty">Chưa có đơn nào.</p>
              )}
            </section>

          </div>
        </div>
      )}
    </>
  );
}
