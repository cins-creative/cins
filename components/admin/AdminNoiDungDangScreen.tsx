"use client";

import {
  BadgeCheck,
  BarChart3,
  ExternalLink,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Scale,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  AdminFeedScoreCell,
  fmtAdminFeedGioConLai,
} from "@/components/admin/AdminFeedScoreCell";
import { AdminNoiDungFeedScoreRules } from "@/components/admin/AdminNoiDungFeedScoreRules";
import { AdminNoiDungGrowthDashboard } from "@/components/admin/AdminNoiDungGrowthDashboard";
import type { PendingContentVerifyItem } from "@/lib/admin/pending-content-verify-types";
import { ADMIN_DIEM_UU_TIEN } from "@/lib/cins/feed-scoring";
import type { FeedScoreConfig } from "@/lib/cins/feed-scoring-config";
import type {
  WorldBoostCatalogItem,
  WorldBoostDinhDangFilter,
  WorldBoostStats,
  WorldBoostXacThucFilter,
} from "@/lib/cins/world-boost-types";

type ViewMode = "grid" | "listing" | "dashboard" | "score" | "pendingVerify";

/** Khớp `WORLD_BOOST_TTL_MS` (server-only) — TTL đẩy 3 ngày. */
const WORLD_BOOST_TTL_MS = 3 * 24 * 60 * 60 * 1000;

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
  const [pendingItems, setPendingItems] = useState<PendingContentVerifyItem[]>(
    [],
  );
  const [pendingVerifyCount, setPendingVerifyCount] = useState(0);
  const [nguon, setNguon] = useState<"all" | "user" | "org">("all");
  const [dinhDang, setDinhDang] = useState<WorldBoostDinhDangFilter>("all");
  const [xacThuc, setXacThuc] = useState<WorldBoostXacThucFilter>("all");
  const [chiBoost, setChiBoost] = useState(false);
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreConfig, setScoreConfig] = useState<FeedScoreConfig | null>(null);
  /** Per-item — không khóa cả lưới khi một thẻ đang gửi API. */
  const [boostingKeys, setBoostingKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [bumpingKeys, setBumpingKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  function toggleKeyInSet(
    prev: ReadonlySet<string>,
    key: string,
    on: boolean,
  ): ReadonlySet<string> {
    const next = new Set(prev);
    if (on) next.add(key);
    else next.delete(key);
    return next;
  }

  function isBusy(key: string): boolean {
    return boostingKeys.has(key) || bumpingKeys.has(key);
  }

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/feed-score-config");
        if (!res.ok) return;
        const json = (await res.json()) as { config: FeedScoreConfig };
        if (!cancelled) setScoreConfig(json.config);
      } catch {
        /* fallback default trong AdminFeedScoreCell */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const loadPendingCount = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/world-boost?pendingVerifyStats=1");
      if (!res.ok) return;
      const json = (await res.json()) as { pendingVerifyCount?: number };
      setPendingVerifyCount(
        typeof json.pendingVerifyCount === "number"
          ? json.pendingVerifyCount
          : 0,
      );
    } catch {
      /* badge giữ số cũ */
    }
  }, []);

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "/api/admin/world-boost?pendingVerify=1&limit=100",
      );
      if (!res.ok) throw new Error("Không tải được hàng đợi chờ xác thực.");
      const json = (await res.json()) as {
        items: PendingContentVerifyItem[];
        total: number;
      };
      setPendingItems(json.items ?? []);
      setPendingVerifyCount(
        typeof json.total === "number" ? json.total : (json.items?.length ?? 0),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Lỗi tải hàng đợi chờ xác thực.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
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
      if (!silent) {
        setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [nguon, dinhDang, xacThuc, chiBoost, qDebounced]);

  useEffect(() => {
    void loadPendingCount();
  }, [loadPendingCount]);

  useEffect(() => {
    if (view === "dashboard" || view === "score") {
      void loadStats();
      return;
    }
    if (view === "pendingVerify") {
      void loadPending();
      return;
    }
    void load();
  }, [view, load, loadStats, loadPending]);

  function canBumpScore(item: WorldBoostCatalogItem): boolean {
    return item.loai === "cot_moc" || item.loai === "org_bai_dang";
  }

  function toggleBoost(item: WorldBoostCatalogItem) {
    if (isBusy(item.key)) return;
    const next = !item.dangBoost;
    const prevItem = item;
    const prevStats = stats;
    const hetHanOptimistic = next
      ? new Date(Date.now() + WORLD_BOOST_TTL_MS).toISOString()
      : null;

    setError(null);
    setBoostingKeys((prev) => toggleKeyInSet(prev, item.key, true));
    setItems((prev) => {
      if (chiBoost && !next) {
        return prev.filter((row) => row.key !== item.key);
      }
      return prev.map((row) =>
        row.key === item.key
          ? { ...row, dangBoost: next, hetHanLuc: hetHanOptimistic }
          : row,
      );
    });
    setStats((s) =>
      s
        ? {
            ...s,
            dangBoost: Math.max(0, s.dangBoost + (next ? 1 : -1)),
          }
        : s,
    );

    void (async () => {
      try {
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
          setItems((prev) => {
            const had = prev.some((row) => row.key === prevItem.key);
            if (!had && chiBoost && prevItem.dangBoost) {
              return [prevItem, ...prev];
            }
            return prev.map((row) =>
              row.key === prevItem.key ? prevItem : row,
            );
          });
          setStats(prevStats);
          setError("Không cập nhật được trạng thái đẩy.");
          return;
        }
        const json = (await res.json()) as {
          row?: { dang_bat?: boolean; het_han_luc?: string };
        };
        if (json.row) {
          setItems((prev) =>
            prev.map((row) =>
              row.key === item.key
                ? {
                    ...row,
                    dangBoost: Boolean(json.row?.dang_bat),
                    hetHanLuc: json.row?.dang_bat
                      ? (json.row.het_han_luc ?? row.hetHanLuc)
                      : null,
                  }
                : row,
            ),
          );
        }
        /* Điểm feed đồng bộ server — refresh nền, không che lưới. */
        void load({ silent: true });
      } catch {
        setItems((prev) => {
          const had = prev.some((row) => row.key === prevItem.key);
          if (!had && chiBoost && prevItem.dangBoost) {
            return [prevItem, ...prev];
          }
          return prev.map((row) =>
            row.key === prevItem.key ? prevItem : row,
          );
        });
        setStats(prevStats);
        setError("Không cập nhật được trạng thái đẩy.");
      } finally {
        setBoostingKeys((prev) => toggleKeyInSet(prev, item.key, false));
      }
    })();
  }

  function bumpScore(item: WorldBoostCatalogItem) {
    if (!canBumpScore(item) || isBusy(item.key)) return;
    const uu = item.diemFeed?.diem_uu_tien ?? 0;
    if (uu >= ADMIN_DIEM_UU_TIEN.MAX) {
      setError(`Đã đạt trần ưu tiên (+${ADMIN_DIEM_UU_TIEN.MAX}).`);
      return;
    }
    if (
      !window.confirm(
        `Cộng +${ADMIN_DIEM_UU_TIEN.BUMP} điểm ưu tiên cho «${item.tieuDe}»?\nKhông hoàn lại được · đồng thời refresh decay.`,
      )
    ) {
      return;
    }

    const prevItem = item;
    const nextUu = Math.min(
      ADMIN_DIEM_UU_TIEN.MAX,
      uu + ADMIN_DIEM_UU_TIEN.BUMP,
    );
    const nowIso = new Date().toISOString();

    setError(null);
    setBumpingKeys((prev) => toggleKeyInSet(prev, item.key, true));
    setItems((prev) =>
      prev.map((row) => {
        if (row.key !== item.key) return row;
        const base = row.diemFeed;
        return {
          ...row,
          diemFeed: base
            ? { ...base, diem_uu_tien: nextUu, bat_dau_luc: nowIso }
            : {
                diem_co_ban: 0,
                diem_noi_dung: 0,
                diem_verify: 0,
                diem_engagement: 0,
                diem_uu_tien: nextUu,
                bat_dau_luc: nowIso,
              },
        };
      }),
    );

    void (async () => {
      try {
        const res = await fetch("/api/admin/world-boost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "bump",
            loai: item.loai,
            id: item.id,
          }),
        });
        const json = (await res.json()) as {
          error?: string;
          diemUuTien?: number;
        };
        if (!res.ok) {
          setItems((prev) =>
            prev.map((row) => (row.key === prevItem.key ? prevItem : row)),
          );
          setError(json.error ?? "Không cộng được điểm ưu tiên.");
          return;
        }
        if (typeof json.diemUuTien === "number") {
          setItems((prev) =>
            prev.map((row) => {
              if (row.key !== item.key || !row.diemFeed) return row;
              return {
                ...row,
                diemFeed: {
                  ...row.diemFeed,
                  diem_uu_tien: json.diemUuTien as number,
                },
              };
            }),
          );
        }
        void load({ silent: true });
      } catch {
        setItems((prev) =>
          prev.map((row) => (row.key === prevItem.key ? prevItem : row)),
        );
        setError("Không cộng được điểm ưu tiên.");
      } finally {
        setBumpingKeys((prev) => toggleKeyInSet(prev, item.key, false));
      }
    })();
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Nội dung đăng (World)</h1>
          <p className="page-subtitle">
            Đẩy ẩn (TTL 3 ngày) · nút + cộng điểm ưu tiên không hoàn lại · không
            hiện nhãn với user.
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
          <button
            type="button"
            className={view === "score" ? "is-active" : ""}
            onClick={() => setView("score")}
          >
            <Scale size={16} /> Công thức
          </button>
          <button
            type="button"
            className={view === "pendingVerify" ? "is-active" : ""}
            onClick={() => setView("pendingVerify")}
          >
            <BadgeCheck size={16} />
            Nội dung chờ xác thực
            {pendingVerifyCount > 0 ? (
              <span className="ndd-tab-badge">
                {pendingVerifyCount > 99 ? "99+" : pendingVerifyCount}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      {view !== "pendingVerify" && stats ? (
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
      ) : view === "score" ? (
        <AdminNoiDungFeedScoreRules onConfigSaved={setScoreConfig} />
      ) : view === "pendingVerify" ? (
        <>
          {error ? <p className="ndd-error">{error}</p> : null}
          {loading ? (
            <p className="admin-panel-loading">
              <Loader2 className="bc-spin" size={18} /> Đang tải…
            </p>
          ) : pendingItems.length === 0 ? (
            <div className="bc-empty">
              <p>Không có nội dung chờ xác thực.</p>
            </div>
          ) : (
            <div className="table-wrap table-wrap--ndd">
              <table className="data-table ndd-list-table ndd-pending-table">
                <thead>
                  <tr>
                    <th className="ndd-list-col-thumb" aria-label="Ảnh" />
                    <th>Nội dung</th>
                    <th>Người gửi</th>
                    <th>Tổ chức</th>
                    <th>Chi tiết</th>
                    <th>Gửi lúc</th>
                    <th className="ndd-pending-col-actions">Liên kết</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.map((item) => {
                    const metaParts = [
                      item.nam ? `Năm ${item.nam}` : null,
                      item.nganhLabel,
                      item.monHocLabel,
                    ].filter(Boolean);
                    return (
                      <tr key={item.requestId}>
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
                              <span
                                className="ndd-list-thumb-fallback"
                                aria-hidden
                              >
                                {item.projectTitle.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="ndd-list-content">
                          <strong className="ndd-list-title">
                            {item.projectTitle}
                          </strong>
                          {item.milestoneTitle &&
                          item.milestoneTitle !== item.projectTitle ? (
                            <span className="ndd-list-meta">
                              {item.milestoneTitle}
                            </span>
                          ) : null}
                        </td>
                        <td>
                          {item.studentSlug ? (
                            <a
                              href={`/${encodeURIComponent(item.studentSlug)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {item.studentName || item.studentSlug}
                            </a>
                          ) : (
                            item.studentName || "—"
                          )}
                        </td>
                        <td>
                          {item.orgUrl ? (
                            <a
                              href={item.orgUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {item.orgTen}
                            </a>
                          ) : (
                            item.orgTen
                          )}
                        </td>
                        <td className="ndd-list-muted">
                          {metaParts.length > 0 ? metaParts.join(" · ") : "—"}
                        </td>
                        <td>{fmtDate(item.submittedAt)}</td>
                        <td className="ndd-pending-col-actions">
                          <span className="ndd-pending-actions">
                            {item.postUrl ? (
                              <a
                                className="ndd-pending-link"
                                href={item.postUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Mở bài
                                <ExternalLink size={12} aria-hidden />
                              </a>
                            ) : null}
                            {item.orgUrl ? (
                              <a
                                className="ndd-pending-link"
                                href={item.orgUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Mở org
                                <ExternalLink size={12} aria-hidden />
                              </a>
                            ) : null}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
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
                <article
                  key={item.key}
                  className={[
                    "ndd-card",
                    item.dangBoost ? "is-boosted" : "",
                    item.daXacThuc ? "is-verified" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="ndd-card-hit">
                    <span className="ndd-card-thumb">
                      {item.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbUrl} alt="" loading="lazy" />
                      ) : (
                        <span className="ndd-card-fallback" aria-hidden>
                          {item.tieuDe.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span className="ndd-card-mark-row">
                        {canBumpScore(item) ? (
                          <button
                            type="button"
                            className="ndd-card-bump"
                            onClick={() => bumpScore(item)}
                            disabled={
                              isBusy(item.key) ||
                              (item.diemFeed?.diem_uu_tien ?? 0) >=
                                ADMIN_DIEM_UU_TIEN.MAX
                            }
                            title={`Cộng +${ADMIN_DIEM_UU_TIEN.BUMP} điểm ưu tiên (không hoàn lại)${
                              (item.diemFeed?.diem_uu_tien ?? 0) > 0
                                ? ` · hiện ${item.diemFeed?.diem_uu_tien}`
                                : ""
                            }`}
                            aria-label={`Cộng điểm ưu tiên: ${item.tieuDe}`}
                          >
                            {bumpingKeys.has(item.key) ? (
                              <Loader2 size={12} className="bc-spin" />
                            ) : (
                              <Plus size={12} strokeWidth={3} aria-hidden />
                            )}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="ndd-card-mark"
                          onClick={() => toggleBoost(item)}
                          disabled={isBusy(item.key)}
                          aria-pressed={item.dangBoost}
                          aria-label={
                            item.dangBoost
                              ? `Tắt đẩy: ${item.tieuDe}`
                              : `Đẩy nội dung: ${item.tieuDe}`
                          }
                        />
                      </span>
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
                        scoreConfig={scoreConfig}
                      />
                      <small className="ndd-card-con-lai">
                        {item.diemFeed
                          ? `Còn ${fmtAdminFeedGioConLai(item.diemFeed, scoreConfig)}`
                          : "—"}
                      </small>
                      </span>
                    </span>
                  </div>
                  {item.moBaiUrl ? (
                    <a
                      className="ndd-card-open"
                      href={item.moBaiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Mở bài viết"
                      aria-label={`Mở bài viết: ${item.tieuDe}`}
                    >
                      <ExternalLink size={12} aria-hidden />
                    </a>
                  ) : null}
                </article>
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
                        <span className="ndd-list-boost-actions">
                          {canBumpScore(item) ? (
                            <button
                              type="button"
                              className="ndd-list-bump"
                              onClick={() => bumpScore(item)}
                              disabled={
                                isBusy(item.key) ||
                                (item.diemFeed?.diem_uu_tien ?? 0) >=
                                  ADMIN_DIEM_UU_TIEN.MAX
                              }
                              title={`Cộng +${ADMIN_DIEM_UU_TIEN.BUMP} (không hoàn lại)`}
                              aria-label={`Cộng điểm: ${item.tieuDe}`}
                            >
                              {bumpingKeys.has(item.key) ? "…" : "+"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className={`ndd-list-toggle${item.dangBoost ? " is-on" : ""}`}
                            onClick={() => toggleBoost(item)}
                            disabled={isBusy(item.key)}
                            aria-pressed={item.dangBoost}
                          >
                            {item.dangBoost ? "Bật" : "Tắt"}
                          </button>
                        </span>
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
                        <strong className="ndd-list-title">
                          {item.moBaiUrl ? (
                            <a
                              className="ndd-list-open-title"
                              href={item.moBaiUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {item.tieuDe}
                              <ExternalLink size={12} aria-hidden />
                            </a>
                          ) : (
                            item.tieuDe
                          )}
                        </strong>
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
                          scoreConfig={scoreConfig}
                        />
                      </td>
                      <td className="ndd-list-col-remain">
                        {fmtAdminFeedGioConLai(item.diemFeed, scoreConfig)}
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
