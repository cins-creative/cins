"use client";

import { useCallback, useEffect, useState } from "react";

import "@/components/admin/admin-bang-thong.css";

type Snapshot = {
  provider: string;
  ky: string;
  freeGb: number;
  usedGb: number;
  percent: number;
  alertLevel: 70 | 85 | 95 | null;
  source: string;
  note: string | null;
  hint: string;
  fetchedAt: string;
};

function fmtGb(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n < 1) return `${(n * 1024).toFixed(0)} MB`;
  return `${n.toFixed(n < 10 ? 2 : 1)} GB`;
}

export function AdminBangThongScreen() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/media/bang-thong", {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as
        | (Snapshot & { error?: string })
        | null;
      if (!res.ok) {
        setErr(json?.error || "Không tải được băng thông.");
        setData(null);
        return;
      }
      setData(json as Snapshot);
    } catch {
      setErr("Lỗi mạng.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/media/bang-thong", {
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as
          | (Snapshot & { error?: string })
          | null;
        if (cancelled) return;
        if (!res.ok) {
          setErr(json?.error || "Không tải được băng thông.");
          setData(null);
        } else {
          setData(json as Snapshot);
        }
      } catch {
        if (!cancelled) {
          setErr("Lỗi mạng.");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pct = Math.min(100, Math.max(0, data?.percent ?? 0));
  const tone =
    data?.alertLevel === 95
      ? "danger"
      : data?.alertLevel === 85
        ? "warn"
        : data?.alertLevel === 70
          ? "info"
          : "ok";

  return (
    <div className="admin-bang-thong">
      <header className="admin-bang-thong-head">
        <div>
          <h1>Băng thông phòng học</h1>
          <p>
            Cloudflare Realtime — free{" "}
            <strong>{data?.freeGb ?? 1000} GB</strong>/tháng. Khi gần ngưỡng,
            cutover thủ công sang LiveKit / Hetzner SIN.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {loading ? "Đang tải…" : "Làm mới"}
        </button>
      </header>

      {err ? <p className="admin-bang-thong-err">{err}</p> : null}

      {data ? (
        <div className={`admin-bang-thong-card is-${tone}`}>
          <div className="admin-bang-thong-stats">
            <div>
              <span className="label">Đã dùng (tháng {data.ky})</span>
              <strong>{fmtGb(data.usedGb)}</strong>
            </div>
            <div>
              <span className="label">Free còn lại</span>
              <strong>{fmtGb(Math.max(0, data.freeGb - data.usedGb))}</strong>
            </div>
            <div>
              <span className="label">Provider</span>
              <strong>{data.provider}</strong>
            </div>
            <div>
              <span className="label">Nguồn số liệu</span>
              <strong>{data.source}</strong>
            </div>
          </div>

          <div
            className="admin-bang-thong-bar"
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div style={{ width: `${pct}%` }} />
          </div>
          <p className="admin-bang-thong-pct">{pct.toFixed(1)}% free tier</p>

          {data.hint ? (
            <p className="admin-bang-thong-hint">{data.hint}</p>
          ) : null}
          {data.note ? (
            <p className="admin-bang-thong-note">{data.note}</p>
          ) : null}
          <p className="admin-bang-thong-meta">
            Cập nhật: {new Date(data.fetchedAt).toLocaleString("vi-VN")} · Ngưỡng
            cảnh báo 70% / 85% / 95%
          </p>
        </div>
      ) : null}
    </div>
  );
}
