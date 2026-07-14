"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type {
  WorldBoostGrowth,
  WorldBoostGrowthDays,
  WorldBoostGrowthPoint,
  WorldBoostGrowthTotals,
  WorldBoostStats,
} from "@/lib/cins/world-boost-types";

type Props = {
  stats: WorldBoostStats | null;
};

const SERIES = [
  { key: "cotMoc" as const, label: "Bài user", color: "#2563eb" },
  { key: "orgBaiDang" as const, label: "Bài org", color: "#16a34a" },
  { key: "suKien" as const, label: "Sự kiện", color: "#d97706" },
];

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

function polyline(
  series: WorldBoostGrowthPoint[],
  key: keyof Pick<WorldBoostGrowthPoint, "cotMoc" | "orgBaiDang" | "suKien" | "total">,
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
      const y =
        padT + innerH - (maxY <= 0 ? 0 : (p[key] / maxY) * innerH);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function areaPath(
  series: WorldBoostGrowthPoint[],
  maxY: number,
  w: number,
  h: number,
  padL: number,
  padT: number,
  padR: number,
  padB: number,
): string {
  const pts = polyline(series, "total", maxY, w, h, padL, padT, padR, padB);
  if (!pts) return "";
  const n = series.length;
  const innerW = w - padL - padR;
  const baseY = h - padB;
  const x0 = padL + (n === 1 ? innerW / 2 : 0);
  const x1 = padL + (n === 1 ? innerW / 2 : innerW);
  return `M ${x0.toFixed(1)},${baseY} L ${pts} L ${x1.toFixed(1)},${baseY} Z`;
}

function DeltaCard({
  label,
  current,
  previous,
}: {
  label: string;
  current: number;
  previous: number;
}) {
  const { text, tone } = fmtPct(current, previous);
  return (
    <div className="ndd-dash-delta">
      <span className="ndd-dash-delta-label">{label}</span>
      <strong>{current}</strong>
      <span className={`ndd-dash-delta-pct ${tone}`}>
        {text} so với kỳ trước
      </span>
    </div>
  );
}

export function AdminNoiDungGrowthDashboard({ stats }: Props) {
  const [days, setDays] = useState<WorldBoostGrowthDays>(30);
  const [growth, setGrowth] = useState<WorldBoostGrowth | null>(null);
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
          `/api/admin/world-boost?growth=1&days=${days}`,
        );
        if (!res.ok) throw new Error("Không tải được biểu đồ tăng trưởng.");
        const json = (await res.json()) as { growth: WorldBoostGrowth };
        if (!cancelled) setGrowth(json.growth);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Lỗi tải biểu đồ.");
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
    const maxY = Math.max(
      1,
      ...series.map((p) =>
        Math.max(p.total, p.cotMoc, p.orgBaiDang, p.suKien),
      ),
    );
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
      lines: SERIES.map((s) => ({
        ...s,
        points: polyline(series, s.key, maxY, w, h, padL, padT, padR, padB),
      })),
      totalLine: polyline(series, "total", maxY, w, h, padL, padT, padR, padB),
    };
  }, [growth]);

  const totals: WorldBoostGrowthTotals = growth?.totals ?? {
    cotMoc: 0,
    orgBaiDang: 0,
    suKien: 0,
    total: 0,
  };
  const prev: WorldBoostGrowthTotals = growth?.prevTotals ?? {
    cotMoc: 0,
    orgBaiDang: 0,
    suKien: 0,
    total: 0,
  };

  const boostMax = Math.max(
    1,
    stats?.dangBoost ?? 0,
    stats?.sapHetHan24h ?? 0,
  );

  const hoverPoint =
    hoverIdx != null && growth?.series[hoverIdx]
      ? growth.series[hoverIdx]
      : null;

  return (
    <div className="ndd-dash" aria-label="Dashboard tăng trưởng nội dung">
      <div className="ndd-dash-toolbar">
        <div>
          <h2 className="ndd-dash-title">Tăng trưởng nội dung</h2>
          <p className="ndd-dash-sub">
            Số bài / sự kiện mới theo ngày (giờ Việt Nam)
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
          <Loader2 className="bc-spin" size={18} /> Đang tải biểu đồ…
        </p>
      ) : growth ? (
        <>
          <div className="ndd-dash-deltas" aria-label="So với kỳ trước">
            <DeltaCard
              label="Bài user"
              current={totals.cotMoc}
              previous={prev.cotMoc}
            />
            <DeltaCard
              label="Bài org"
              current={totals.orgBaiDang}
              previous={prev.orgBaiDang}
            />
            <DeltaCard
              label="Sự kiện"
              current={totals.suKien}
              previous={prev.suKien}
            />
            <DeltaCard
              label="Tổng"
              current={totals.total}
              previous={prev.total}
            />
          </div>

          <div className="ndd-dash-chart-card">
            <div className="ndd-dash-legend" aria-hidden>
              {SERIES.map((s) => (
                <span key={s.key} className="ndd-dash-legend-item">
                  <i style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
              <span className="ndd-dash-legend-item">
                <i className="is-total" />
                Tổng
              </span>
            </div>

            <div className="ndd-dash-chart-wrap">
              <svg
                className="ndd-dash-chart"
                viewBox={`0 0 ${chart.w} ${chart.h}`}
                role="img"
                aria-label={`Biểu đồ nội dung mới ${days} ngày`}
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
                  points={chart.totalLine}
                  className="ndd-dash-line is-total"
                  fill="none"
                />
                {chart.lines.map((line) => (
                  <polyline
                    key={line.key}
                    points={line.points}
                    fill="none"
                    stroke={line.color}
                    className="ndd-dash-line"
                  />
                ))}

                {growth.series.map((p, i) => {
                  const n = growth.series.length;
                  const innerW = chart.w - chart.padL - chart.padR;
                  const x =
                    chart.padL +
                    (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
                  const showLabel =
                    days === 7
                      ? true
                      : i === 0 ||
                        i === n - 1 ||
                        i % Math.ceil(n / 6) === 0;
                  return (
                    <g key={p.date}>
                      <rect
                        x={x - innerW / Math.max(n, 1) / 2}
                        y={chart.padT}
                        width={Math.max(innerW / Math.max(n, 1), 8)}
                        height={chart.h - chart.padT - chart.padB}
                        fill="transparent"
                        onMouseEnter={() => setHoverIdx(i)}
                      />
                      {showLabel ? (
                        <text
                          x={x}
                          y={chart.h - 8}
                          textAnchor="middle"
                          className="ndd-dash-axis"
                        >
                          {fmtDayLabel(p.date)}
                        </text>
                      ) : null}
                      {hoverIdx === i ? (
                        <line
                          x1={x}
                          x2={x}
                          y1={chart.padT}
                          y2={chart.h - chart.padB}
                          className="ndd-dash-hover-line"
                        />
                      ) : null}
                    </g>
                  );
                })}
              </svg>

              {hoverPoint ? (
                <div className="ndd-dash-tooltip" role="status">
                  <strong>{fmtDayLabel(hoverPoint.date)}</strong>
                  <span>User {hoverPoint.cotMoc}</span>
                  <span>Org {hoverPoint.orgBaiDang}</span>
                  <span>Sự kiện {hoverPoint.suKien}</span>
                  <span>Tổng {hoverPoint.total}</span>
                </div>
              ) : null}
            </div>
          </div>

          {stats ? (
            <div className="ndd-dash-pipeline" aria-label="Pipeline đẩy">
              <h3 className="ndd-dash-pipeline-title">Pipeline đẩy hiện tại</h3>
              <div className="ndd-dash-bars">
                <div className="ndd-dash-bar-row">
                  <span>Đang đẩy</span>
                  <div className="ndd-dash-bar-track">
                    <div
                      className="ndd-dash-bar-fill is-boost"
                      style={{
                        width: `${(stats.dangBoost / boostMax) * 100}%`,
                      }}
                    />
                  </div>
                  <strong>{stats.dangBoost}</strong>
                </div>
                <div className="ndd-dash-bar-row">
                  <span>Sắp hết hạn (24h)</span>
                  <div className="ndd-dash-bar-track">
                    <div
                      className="ndd-dash-bar-fill is-soon"
                      style={{
                        width: `${(stats.sapHetHan24h / boostMax) * 100}%`,
                      }}
                    />
                  </div>
                  <strong>{stats.sapHetHan24h}</strong>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
