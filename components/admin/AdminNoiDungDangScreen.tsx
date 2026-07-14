"use client";

import { BarChart3, LayoutGrid, List, Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import {
  AdminFeedScoreCell,
  fmtAdminFeedGioConLai,
} from "@/components/admin/AdminFeedScoreCell";
import { AdminNoiDungGrowthDashboard } from "@/components/admin/AdminNoiDungGrowthDashboard";
import type {
  WorldBoostCatalogItem,
  WorldBoostDinhDangFilter,
  WorldBoostStats,
  WorldBoostXacThucFilter,
} from "@/lib/cins/world-boost-types";

type ViewMode = "grid" | "listing" | "dashboard";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
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

export function AdminNoiDungDangScreen() {
  const [view, setView] = useState<ViewMode>("grid");
  const [stats, setStats] = useState<WorldBoostStats | null>(null);
  const [items, setItems] = useState<WorldBoostCatalogItem[]>([]);
  const [nguon, setNguon] = useState<"all" | "user" | "org">("all");
  const [dinhDang, setDinhDang] = useState<WorldBoostDinhDangFilter>("all");
  const [xacThuc, setXacThuc] = useState<WorldBoostXacThucFilter>("all");
  const [chiBoost, setChiBoost] = useState(false);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const loadStats = useCallback(async () => {
    try {
      const statsRes = await fetch("/api/admin/world-boost?stats=1");
      if (!statsRes.ok) throw new Error("Không tải được thống kê.");
      const statsJson = (await statsRes.json()) as { stats: WorldBoostStats };
      setStats(statsJson.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải thống kê.");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (nguon !== "all") qs.set("nguon", nguon);
      if (dinhDang !== "all") qs.set("dinhDang", dinhDang);
      if (xacThuc !== "all") qs.set("xacThuc", xacThuc);
      if (chiBoost) qs.set("boost", "1");
      if (qDebounced) qs.set("q", qDebounced);
      qs.set("limit", "60");

      const [listRes, statsRes] = await Promise.all([
        fetch(`/api/admin/world-boost?${qs}`),
        fetch("/api/admin/world-boost?stats=1"),
      ]);
      if (!listRes.ok) throw new Error("Không tải được danh sách.");
      if (!statsRes.ok) throw new Error("Không tải được thống kê.");
      const listJson = (await listRes.json()) as {
        items: WorldBoostCatalogItem[];
      };
      const statsJson = (await statsRes.json()) as { stats: WorldBoostStats };
      setItems(listJson.items ?? []);
      setStats(statsJson.stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }, [nguon, dinhDang, xacThuc, chiBoost, qDebounced]);

  useEffect(() => {
    if (view === "dashboard") {
      void loadStats();
      return;
    }
    void load();
  }, [view, load, loadStats]);

  function toggleBoost(item: WorldBoostCatalogItem) {
    const next = !item.dangBoost;
    setItems((prev) =>
      prev.map((row) =>
        row.key === item.key ? { ...row, dangBoost: next } : row,
      ),
    );
    startTransition(async () => {
      const res = await fetch("/api/admin/world-boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loai: item.loai,
          id: item.id,
          dangBat: next,
        }),
      });
      if (!res.ok) {
        setItems((prev) =>
          prev.map((row) =>
            row.key === item.key ? { ...row, dangBoost: !next } : row,
          ),
        );
        setError("Không cập nhật được trạng thái đẩy.");
        return;
      }
      void load();
    });
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Nội dung đăng (World)</h1>
          <p className="page-subtitle">
            Đẩy ẩn nội dung lên đầu Timeline / Gallery World · TTL 3 ngày tự gia
            hạn · không hiện nhãn với user.
          </p>
        </div>
        <div className="page-header-actions ndd-view-toggle">
          <button
            type="button"
            className={view === "grid" ? "is-active" : ""}
            onClick={() => setView("grid")}
          >
            <LayoutGrid size={16} /> Lưới
          </button>
          <button
            type="button"
            className={view === "listing" ? "is-active" : ""}
            onClick={() => setView("listing")}
          >
            <List size={16} /> Listing
          </button>
          <button
            type="button"
            className={view === "dashboard" ? "is-active" : ""}
            onClick={() => setView("dashboard")}
          >
            <BarChart3 size={16} /> Dashboard
          </button>
        </div>
      </header>

      {stats ? (
        <div className="ndd-stats" aria-label="Thống kê nội dung">
          <div className="ndd-stat">
            <strong>{stats.dangBoost}</strong>
            <span>Đang đẩy</span>
          </div>
          <div className="ndd-stat">
            <strong>{stats.sapHetHan24h}</strong>
            <span>Sắp hết hạn (24h)</span>
          </div>
          <div className="ndd-stat">
            <strong>{stats.cotMocMoi7n}</strong>
            <span>Bài user mới (7 ngày)</span>
          </div>
          <div className="ndd-stat">
            <strong>{stats.orgBaiDangMoi7n}</strong>
            <span>Bài org mới (7 ngày)</span>
          </div>
          <div className="ndd-stat">
            <strong>{stats.suKienMoi7n}</strong>
            <span>Sự kiện mới (7 ngày)</span>
          </div>
        </div>
      ) : null}

      {view === "dashboard" ? (
        <AdminNoiDungGrowthDashboard stats={stats} />
      ) : (
        <>
          <div className="ndd-filters">
            <label className="ndd-search">
              <Search size={16} aria-hidden />
              <input
                type="search"
                placeholder="Lọc tiêu đề / tác giả…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <select
              value={nguon}
              onChange={(e) =>
                setNguon(e.target.value as "all" | "user" | "org")
              }
              aria-label="Nguồn đăng"
            >
              <option value="all">Tất cả nguồn</option>
              <option value="user">User</option>
              <option value="org">Tổ chức</option>
            </select>
            <select
              value={dinhDang}
              onChange={(e) =>
                setDinhDang(e.target.value as WorldBoostDinhDangFilter)
              }
              aria-label="Định dạng nội dung"
            >
              <option value="all">Tất cả định dạng</option>
              <option value="photo">Album ảnh</option>
              <option value="video">Video</option>
              <option value="article">Bài viết</option>
              <option value="embed">File nhúng</option>
            </select>
            <select
              value={xacThuc}
              onChange={(e) =>
                setXacThuc(e.target.value as WorldBoostXacThucFilter)
              }
              aria-label="Xác thực tổ chức"
            >
              <option value="all">Tất cả xác thực</option>
              <option value="verified">Đã xác thực (org)</option>
              <option value="unverified">Chưa xác thực</option>
            </select>
            <label className="ndd-check">
              <input
                type="checkbox"
                checked={chiBoost}
                onChange={(e) => setChiBoost(e.target.checked)}
              />
              Chỉ đang đẩy
            </label>
          </div>

          {error ? <p className="ndd-error">{error}</p> : null}

          {loading ? (
            <p className="admin-panel-loading">
              <Loader2 className="bc-spin" size={18} /> Đang tải…
            </p>
          ) : items.length === 0 ? (
            <div className="bc-empty">
              <p>Không có nội dung khớp bộ lọc.</p>
            </div>
          ) : view === "grid" ? (
            <div className="ndd-grid" style={{ ["--ndd-cols" as string]: 4 }}>
              {items.map((item) => (
                <button
                  type="button"
                  key={item.key}
                  className={[
                    "ndd-card",
                    item.dangBoost ? "is-boosted" : "",
                    item.daXacThuc ? "is-verified" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => toggleBoost(item)}
                  disabled={pending}
                  aria-pressed={item.dangBoost}
                >
                  <span className="ndd-card-thumb">
                    {item.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbUrl} alt="" loading="lazy" />
                    ) : (
                      <span className="ndd-card-fallback" aria-hidden>
                        {item.tieuDe.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <span className="ndd-card-mark" aria-hidden />
                    {item.daXacThuc ? (
                      <span className="ndd-card-verified">Đã xác thực</span>
                    ) : null}
                  </span>
                  <span className="ndd-card-body">
                    <strong>{item.tieuDe}</strong>
                    <small>
                      {item.tacGiaTen ?? "—"} · {item.dinhDangLabel}
                    </small>
                    <span className="ndd-card-score-row">
                      <AdminFeedScoreCell
                        diemFeed={item.diemFeed}
                        variant="compact"
                      />
                      <small className="ndd-card-con-lai">
                        {item.diemFeed
                          ? `Còn ${fmtAdminFeedGioConLai(item.diemFeed)}`
                          : "—"}
                      </small>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="table-wrap table-wrap--ndd">
              <table className="data-table ndd-list-table">
                <thead>
                  <tr>
                    <th className="ndd-list-col-boost">Đẩy</th>
                    <th className="ndd-list-col-thumb" aria-label="Ảnh" />
                    <th>Nội dung</th>
                    <th className="ndd-list-col-score">Điểm</th>
                    <th className="ndd-list-col-remain">Còn lại</th>
                    <th className="ndd-list-col-meta">Trạng thái</th>
                    <th className="ndd-list-col-dates">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.key}
                      className={[
                        item.dangBoost ? "ndd-row-boosted" : "",
                        item.daXacThuc ? "ndd-row-verified" : "",
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined}
                    >
                      <td className="ndd-list-col-boost">
                        <button
                          type="button"
                          className={`ndd-list-toggle${item.dangBoost ? " is-on" : ""}`}
                          onClick={() => toggleBoost(item)}
                          disabled={pending}
                          aria-pressed={item.dangBoost}
                        >
                          {item.dangBoost ? "Bật" : "Tắt"}
                        </button>
                      </td>
                      <td className="ndd-list-col-thumb">
                        <span className="ndd-list-thumb">
                          {item.thumbUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.thumbUrl}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <span className="ndd-list-thumb-fallback" aria-hidden>
                              {item.tieuDe.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="ndd-list-content">
                        <strong className="ndd-list-title">{item.tieuDe}</strong>
                        <span className="ndd-list-meta">
                          <span className="ndd-list-chip">{item.dinhDangLabel}</span>
                          <span>
                            {item.nguon === "user" ? "User" : "Org"}
                            {" · "}
                            {item.tacGiaTen ?? "—"}
                          </span>
                        </span>
                      </td>
                      <td className="ndd-list-col-score">
                        <AdminFeedScoreCell
                          diemFeed={item.diemFeed}
                          variant="table"
                        />
                      </td>
                      <td className="ndd-list-col-remain">
                        {fmtAdminFeedGioConLai(item.diemFeed)}
                      </td>
                      <td className="ndd-list-col-meta">
                        {item.daXacThuc ? (
                          <span className="ndd-verified-pill">Đã xác thực</span>
                        ) : (
                          <span className="ndd-list-muted">Chưa xác thực</span>
                        )}
                      </td>
                      <td className="ndd-list-col-dates">
                        <span className="ndd-list-date-stack">
                          <span title="Ngày tạo">{fmtDate(item.taoLuc)}</span>
                          <small title="Hết hạn boost">
                            Boost: {fmtDate(item.hetHanLuc)}
                          </small>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
