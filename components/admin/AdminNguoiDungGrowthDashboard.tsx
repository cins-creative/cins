"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type {
  AdminUserGrowth,
  AdminUserGrowthDays,
} from "@/lib/admin/nguoi-dung-growth-types";

function fmtPct(curr: number, prev: number): { text: string; tone: string } {
  if (prev === 0 && curr === 0) return { text: "0%", tone: "is-flat" };
  if (prev === 0) return { text: "+100%", tone: "is-up" };
  const pct = Math.round(((curr - prev) / prev) * 100);
  if (pct > 0) return { text: `+${pct}%`, tone: "is-up" };
  if (pct < 0) return { text: `${pct}%`, tone: "is-down" };
  return { text: "0%", tone: "is-flat" };
}

function fmtDayLabel(date: string): string {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function polyline(
  series: AdminUserGrowth["series"],
  maxY: number,
  w: number,
  h: number,
  padL: number,
  padT: number,
  padR: number,
  padB: number,
): string {
  const n = series.length;
  if (n === 0) return "";
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  return series
    .map((p, i) => {
      const x = padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const y = padT + innerH - (maxY <= 0 ? 0 : (p.count / maxY) * innerH);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function areaPath(
  series: AdminUserGrowth["series"],
  maxY: number,
  w: number,
  h: number,
  padL: number,
  padT: number,
  padR: number,
  padB: number,
): string {
  const pts = polyline(series, maxY, w, h, padL, padT, padR, padB);
  if (!pts) return "";
  const n = series.length;
  const innerW = w - padL - padR;
  const baseY = h - padB;
  const x0 = padL + (n === 1 ? innerW / 2 : 0);
  const x1 = padL + (n === 1 ? innerW / 2 : innerW);
  return `M ${x0.toFixed(1)},${baseY} L ${pts} L ${x1.toFixed(1)},${baseY} Z`;
}

export function AdminNguoiDungGrowthDashboard() {
  const [days, setDays] = useState<AdminUserGrowthDays>(30);
  const [growth, setGrowth] = useState<AdminUserGrowth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/admin/nguoi-dung/growth?days=${days}`,
        );
        if (!res.ok) {
          let detail = "Không tải được báo cáo tài khoản mới.";
          try {
            const body = (await res.json()) as { error?: string };
            if (body.error?.trim()) detail = body.error.trim();
          } catch {
            /* giữ mặc định */
          }
          throw new Error(detail);
        }
        const json = (await res.json()) as { growth: AdminUserGrowth };
        if (!cancelled) setGrowth(json.growth);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Lỗi tải báo cáo tài khoản.",
          );
          setGrowth(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const chart = useMemo(() => {
    const series = growth?.series ?? [];
    const w = 640;
    const h = 260;
    const padL = 36;
    const padR = 12;
    const padT = 16;
    const padB = 28;
    const maxY = Math.max(1, ...series.map((p) => p.count));
    const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
      y: padT + (h - padT - padB) * (1 - t),
      label: Math.round(maxY * t),
    }));
    return {
      w,
      h,
      padL,
      padR,
      padT,
      padB,
      maxY,
      gridYs,
      area: areaPath(series, maxY, w, h, padL, padT, padR, padB),
      line: polyline(series, maxY, w, h, padL, padT, padR, padB),
    };
  }, [growth]);

  const delta = fmtPct(
    growth?.totals.current ?? 0,
    growth?.totals.previous ?? 0,
  );
  const hoverPoint =
    hoverIdx != null && growth?.series[hoverIdx]
      ? growth.series[hoverIdx]
      : null;

  return (
    <div className="ndd-dash admin-nguoi-dung-dash" aria-label="Dashboard tài khoản mới">
      <div className="ndd-dash-toolbar">
        <div>
          <h2 className="ndd-dash-title">Tài khoản mới tạo</h2>
          <p className="ndd-dash-sub">
            Số user đăng ký theo ngày (giờ Việt Nam)
          </p>
        </div>
        <div className="ndd-dash-range" role="group" aria-label="Khoảng thời gian">
          <button
            type="button"
            className={days === 7 ? "is-active" : ""}
            onClick={() => setDays(7)}
          >
            7 ngày
          </button>
          <button
            type="button"
            className={days === 30 ? "is-active" : ""}
            onClick={() => setDays(30)}
          >
            30 ngày
          </button>
        </div>
      </div>

      {error ? <p className="ndd-error">{error}</p> : null}

      {loading && !growth ? (
        <p className="admin-panel-loading">
          <Loader2 className="bc-spin" size={18} /> Đang tải báo cáo…
        </p>
      ) : growth ? (
        <>
          <div className="ndd-dash-deltas" aria-label="Tóm tắt đăng ký">
            <div className="ndd-dash-delta">
              <span className="ndd-dash-delta-label">Hôm nay</span>
              <strong>{growth.today}</strong>
              <span className="ndd-dash-delta-pct is-flat">theo giờ VN</span>
            </div>
            <div className="ndd-dash-delta">
              <span className="ndd-dash-delta-label">7 ngày</span>
              <strong>{growth.last7}</strong>
              <span className="ndd-dash-delta-pct is-flat">tài khoản mới</span>
            </div>
            <div className="ndd-dash-delta">
              <span className="ndd-dash-delta-label">30 ngày</span>
              <strong>{growth.last30}</strong>
              <span className="ndd-dash-delta-pct is-flat">tài khoản mới</span>
            </div>
            <div className="ndd-dash-delta">
              <span className="ndd-dash-delta-label">Kỳ đang xem</span>
              <strong>{growth.totals.current}</strong>
              <span className={`ndd-dash-delta-pct ${delta.tone}`}>
                {delta.text} so với kỳ trước
              </span>
            </div>
          </div>

          <div className="ndd-dash-chart-card">
            <div className="ndd-dash-legend" aria-hidden>
              <span className="ndd-dash-legend-item">
                <i style={{ background: "#2563eb" }} />
                Tài khoản mới
              </span>
            </div>

            <div className="ndd-dash-chart-wrap">
              <svg
                className="ndd-dash-chart"
                viewBox={`0 0 ${chart.w} ${chart.h}`}
                role="img"
                aria-label={`Biểu đồ tài khoản mới ${days} ngày`}
                onMouseLeave={() => setHoverIdx(null)}
              >
                {chart.gridYs.map((g) => (
                  <g key={g.label}>
                    <line
                      x1={chart.padL}
                      x2={chart.w - chart.padR}
                      y1={g.y}
                      y2={g.y}
                      className="ndd-dash-grid"
                    />
                    <text
                      x={chart.padL - 6}
                      y={g.y + 3}
                      textAnchor="end"
                      className="ndd-dash-axis"
                    >
                      {g.label}
                    </text>
                  </g>
                ))}

                <path d={chart.area} className="ndd-dash-area" />
                <polyline
                  points={chart.line}
                  className="ndd-dash-line is-total"
                  style={{ stroke: "#2563eb" }}
                />

                {growth.series.map((p, i) => {
                  const n = growth.series.length;
                  const innerW = chart.w - chart.padL - chart.padR;
                  const innerH = chart.h - chart.padT - chart.padB;
                  const x =
                    chart.padL +
                    (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
                  const y =
                    chart.padT +
                    innerH -
                    (chart.maxY <= 0
                      ? 0
                      : (p.count / chart.maxY) * innerH);
                  return (
                    <circle
                      key={p.date}
                      cx={x}
                      cy={y}
                      r={hoverIdx === i ? 4.5 : 3}
                      fill="#2563eb"
                      opacity={0.9}
                      onMouseEnter={() => setHoverIdx(i)}
                    />
                  );
                })}

                {growth.series.map((p, i) => {
                  const n = growth.series.length;
                  const step =
                    n <= 1
                      ? chart.w - chart.padL - chart.padR
                      : (chart.w - chart.padL - chart.padR) / (n - 1);
                  const x = chart.padL + (n === 1 ? step / 2 : i * step);
                  const show =
                    days === 7 ||
                    i === 0 ||
                    i === n - 1 ||
                    i % Math.ceil(n / 6) === 0;
                  if (!show) return null;
                  return (
                    <text
                      key={`lbl-${p.date}`}
                      x={x}
                      y={chart.h - 8}
                      textAnchor="middle"
                      className="ndd-dash-axis"
                    >
                      {fmtDayLabel(p.date)}
                    </text>
                  );
                })}

                {hoverPoint && hoverIdx != null ? (
                  <g className="ndd-dash-tooltip">
                    {(() => {
                      const n = growth.series.length;
                      const innerW = chart.w - chart.padL - chart.padR;
                      const x =
                        chart.padL +
                        (n === 1
                          ? innerW / 2
                          : (hoverIdx / (n - 1)) * innerW);
                      return (
                        <>
                          <line
                            x1={x}
                            x2={x}
                            y1={chart.padT}
                            y2={chart.h - chart.padB}
                            className="ndd-dash-hover-line"
                          />
                          <foreignObject
                            x={Math.min(x + 8, chart.w - 140)}
                            y={chart.padT}
                            width={128}
                            height={56}
                          >
                            <div className="ndd-dash-tooltip">
                              <strong>{fmtDayLabel(hoverPoint.date)}</strong>
                              <span>{hoverPoint.count} tài khoản</span>
                            </div>
                          </foreignObject>
                        </>
                      );
                    })()}
                  </g>
                ) : null}
              </svg>
            </div>
          </div>

          <div className="admin-nguoi-dung-recent">
            <h3 className="admin-nguoi-dung-recent-title">
              Tài khoản mới nhất
            </h3>
            {growth.recent.length === 0 ? (
              <p className="ndd-dash-sub">Chưa có tài khoản nào.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table admin-nguoi-dung-recent-table">
                  <thead>
                    <tr>
                      <th>Người dùng</th>
                      <th>Email</th>
                      <th>Ngày tạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {growth.recent.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <Link href={`/${u.slug}/journey`} className="admin-nguoi-dung-user-slug">
                            {u.tenHienThi}
                          </Link>
                          <div className="admin-nguoi-dung-muted">@{u.slug}</div>
                        </td>
                        <td>{u.email ?? "—"}</td>
                        <td>{fmtDateTime(u.taoLuc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
