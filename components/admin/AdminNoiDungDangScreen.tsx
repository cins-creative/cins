"use client";

import {
  BadgeCheck,
  BarChart3,
  ExternalLink,
  LayoutGrid,
  List,
  Loader2,
  Scale,
  Search,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  AdminFeedScoreCell,
  fmtAdminFeedGioConLai,
} from "@/components/admin/AdminFeedScoreCell";
import { AdminNoiDungFeedScoreRules } from "@/components/admin/AdminNoiDungFeedScoreRules";
import { AdminNoiDungGrowthDashboard } from "@/components/admin/AdminNoiDungGrowthDashboard";
import { AdminPendingContentVerifyQueue } from "@/components/admin/AdminPendingContentVerifyQueue";
import type { PendingContentVerifyItem } from "@/lib/admin/pending-content-verify-types";
import {
  pathForNoiDungDangView,
  viewFromNoiDungDangPath,
  type NoiDungDangView,
} from "@/lib/admin/noi-dung-dang-views";
import {
  ADMIN_DIEM_UU_TIEN,
  type AdminDiemUuTienDelta,
} from "@/lib/cins/feed-scoring";
import type { FeedScoreConfig } from "@/lib/cins/feed-scoring-config";
import type {
  WorldBoostCatalogItem,
  WorldBoostDinhDangFilter,
  WorldBoostStats,
  WorldBoostXacThucFilter,
} from "@/lib/cins/world-boost-types";

type ViewMode = NoiDungDangView;

type Props = {
  /** Deep-link từ route `/admin/noi-dung-dang/...`. */
  initialView?: ViewMode;
};

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

export function AdminNoiDungDangScreen({ initialView }: Props) {
  const pathname = usePathname();
  const view: ViewMode =
    viewFromNoiDungDangPath(pathname) ?? initialView ?? "grid";
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

  function bumpScore(item: WorldBoostCatalogItem, delta: AdminDiemUuTienDelta) {
    if (!canBumpScore(item) || isBusy(item.key)) return;
    const uu = item.diemFeed?.diem_uu_tien ?? 0;
    if (delta > 0 && uu >= ADMIN_DIEM_UU_TIEN.MAX) {
      setError(`Đã đạt trần ưu tiên (+${ADMIN_DIEM_UU_TIEN.MAX}).`);
      return;
    }
    if (delta < 0 && uu <= ADMIN_DIEM_UU_TIEN.MIN) {
      setError("Điểm ưu tiên đã về 0.");
      return;
    }

    const prevItem = item;
    const nextUu = Math.min(
      ADMIN_DIEM_UU_TIEN.MAX,
      Math.max(ADMIN_DIEM_UU_TIEN.MIN, uu + delta),
    );
    const nowIso = new Date().toISOString();
    const deltaLabel = delta > 0 ? `+${delta}` : `${delta}`;

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
            delta,
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
          setError(json.error ?? `Không chỉnh được điểm (${deltaLabel}).`);
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
        setError(`Không chỉnh được điểm (${deltaLabel}).`);
      } finally {
        setBumpingKeys((prev) => toggleKeyInSet(prev, item.key, false));
      }
    })();
  }

  function scoreDeltaButtons(item: WorldBoostCatalogItem, variant: "card" | "list") {
    const uu = item.diemFeed?.diem_uu_tien ?? 0;
    const busy = isBusy(item.key);
    const bumping = bumpingKeys.has(item.key);
    const step = ADMIN_DIEM_UU_TIEN.STEP;
    const btnClass = variant === "card" ? "ndd-card-bump" : "ndd-list-bump";

    return (
      <span className="ndd-score-delta" role="group" aria-label="Chỉnh điểm ưu tiên">
        <button
          type="button"
          className={`${btnClass} is-minus`}
          onClick={() => bumpScore(item, -step as AdminDiemUuTienDelta)}
          disabled={busy || uu <= ADMIN_DIEM_UU_TIEN.MIN}
          title={`Trừ ${step} điểm ưu tiên${uu > 0 ? ` · hiện ${uu}` : ""}`}
          aria-label={`Trừ ${step} điểm: ${item.tieuDe}`}
        >
          {bumping ? "…" : `−${step}`}
        </button>
        <button
          type="button"
          className={`${btnClass} is-plus`}
          onClick={() => bumpScore(item, step as AdminDiemUuTienDelta)}
          disabled={busy || uu >= ADMIN_DIEM_UU_TIEN.MAX}
          title={`Cộng +${step} điểm ưu tiên${uu > 0 ? ` · hiện ${uu}` : ""}`}
          aria-label={`Cộng ${step} điểm: ${item.tieuDe}`}
        >
          {bumping ? "…" : `+${step}`}
        </button>
      </span>
    );
  }

  return (
    <div className="ndd-page">
      <header className="page-header ndd-head">
        <nav className="ndd-view-toggle" aria-label="Chế độ xem">
          <Link
            href={pathForNoiDungDangView("grid")}
            className={view === "grid" ? "is-active" : undefined}
            aria-current={view === "grid" ? "page" : undefined}
          >
            <LayoutGrid size={16} aria-hidden />
            <span>Lưới</span>
          </Link>
          <Link
            href={pathForNoiDungDangView("listing")}
            className={view === "listing" ? "is-active" : undefined}
            aria-current={view === "listing" ? "page" : undefined}
          >
            <List size={16} aria-hidden />
            <span>Listing</span>
          </Link>
          <Link
            href={pathForNoiDungDangView("dashboard")}
            className={view === "dashboard" ? "is-active" : undefined}
            aria-current={view === "dashboard" ? "page" : undefined}
          >
            <BarChart3 size={16} aria-hidden />
            <span>Dashboard</span>
          </Link>
          <Link
            href={pathForNoiDungDangView("score")}
            className={view === "score" ? "is-active" : undefined}
            aria-current={view === "score" ? "page" : undefined}
          >
            <Scale size={16} aria-hidden />
            <span className="ndd-tab-full">Công thức</span>
            <span className="ndd-tab-short" aria-hidden>
              CT
            </span>
          </Link>
          <Link
            href={pathForNoiDungDangView("pendingVerify")}
            className={view === "pendingVerify" ? "is-active" : undefined}
            aria-current={view === "pendingVerify" ? "page" : undefined}
            aria-label={`Nội dung chờ xác thực${
              pendingVerifyCount > 0 ? ` (${pendingVerifyCount})` : ""
            }`}
          >
            <BadgeCheck size={16} aria-hidden />
            <span className="ndd-tab-full">Chờ xác thực</span>
            <span className="ndd-tab-short" aria-hidden>
              Chờ XT
            </span>
            {pendingVerifyCount > 0 ? (
              <span className="ndd-tab-badge">
                {pendingVerifyCount > 99 ? "99+" : pendingVerifyCount}
              </span>
            ) : null}
          </Link>
        </nav>
      </header>

      <div className="ndd-body">
        {view !== "pendingVerify" && stats ? (
          <div className="ndd-stats" aria-label="Thống kê nội dung">
            <article className="ndd-stat ndd-stat--boost">
              <span className="ndd-stat-k">Đang đẩy</span>
              <strong className="ndd-stat-v">{stats.dangBoost}</strong>
            </article>
            <article className="ndd-stat ndd-stat--soon">
              <span className="ndd-stat-k">Sắp hết hạn (24h)</span>
              <strong className="ndd-stat-v">{stats.sapHetHan24h}</strong>
            </article>
            <article className="ndd-stat">
              <span className="ndd-stat-k">Bài user mới (7 ngày)</span>
              <strong className="ndd-stat-v">{stats.cotMocMoi7n}</strong>
            </article>
            <article className="ndd-stat">
              <span className="ndd-stat-k">Bài org mới (7 ngày)</span>
              <strong className="ndd-stat-v">{stats.orgBaiDangMoi7n}</strong>
            </article>
            <article className="ndd-stat">
              <span className="ndd-stat-k">Sự kiện mới (7 ngày)</span>
              <strong className="ndd-stat-v">{stats.suKienMoi7n}</strong>
            </article>
          </div>
        ) : null}

        {view === "dashboard" ? (
          <AdminNoiDungGrowthDashboard stats={stats} />
        ) : view === "score" ? (
          <AdminNoiDungFeedScoreRules onConfigSaved={setScoreConfig} />
        ) : view === "pendingVerify" ? (
          <AdminPendingContentVerifyQueue
            items={pendingItems}
            total={pendingVerifyCount}
            loading={loading}
            error={error}
            onRetry={() => void loadPending()}
            onResolved={(requestId) => {
              setPendingItems((current) =>
                current.filter((item) => item.requestId !== requestId),
              );
              setPendingVerifyCount((current) => Math.max(0, current - 1));
            }}
          />
        ) : (
          <section className="ndd-panel">
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
              <div className="ndd-filter-selects">
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
            </div>

            {error ? (
              <p className="ndd-error" role="alert">
                {error}
              </p>
            ) : null}

            <div className="ndd-panel-body">
              {loading ? (
                <p className="admin-panel-loading">
                  <Loader2 className="bc-spin" size={18} /> Đang tải…
                </p>
              ) : items.length === 0 ? (
                <div className="bc-empty">
                  <p>Không có nội dung khớp bộ lọc.</p>
                </div>
              ) : view === "grid" ? (
                <div className="ndd-grid">
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
                            {canBumpScore(item)
                              ? scoreDeltaButtons(item, "card")
                              : null}
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
                <>
                  <div className="table-wrap table-wrap--ndd ndd-list-desktop">
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
                                {canBumpScore(item)
                                  ? scoreDeltaButtons(item, "list")
                                  : null}
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
                                  <span
                                    className="ndd-list-thumb-fallback"
                                    aria-hidden
                                  >
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
                                <span className="ndd-list-chip">
                                  {item.dinhDangLabel}
                                </span>
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
                                <span className="ndd-verified-pill">
                                  Đã xác thực
                                </span>
                              ) : (
                                <span className="ndd-list-muted">
                                  Chưa xác thực
                                </span>
                              )}
                            </td>
                            <td className="ndd-list-col-dates">
                              <span className="ndd-list-date-stack">
                                <span title="Ngày tạo">
                                  {fmtDate(item.taoLuc)}
                                </span>
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

                  <ul className="ndd-list-mobile">
                    {items.map((item) => (
                      <li
                        key={item.key}
                        className={[
                          "ndd-mobile-row",
                          item.dangBoost ? "is-boosted" : "",
                          item.daXacThuc ? "is-verified" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span className="ndd-mobile-thumb">
                          {item.thumbUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.thumbUrl} alt="" loading="lazy" />
                          ) : (
                            <span aria-hidden>
                              {item.tieuDe.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <div className="ndd-mobile-main">
                          <strong className="ndd-mobile-title">
                            {item.moBaiUrl ? (
                              <a
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
                          <span className="ndd-mobile-meta">
                            <span className="ndd-list-chip">
                              {item.dinhDangLabel}
                            </span>
                            <span>
                              {item.nguon === "user" ? "User" : "Org"} ·{" "}
                              {item.tacGiaTen ?? "—"}
                            </span>
                          </span>
                          <span className="ndd-mobile-score">
                            <AdminFeedScoreCell
                              diemFeed={item.diemFeed}
                              variant="compact"
                              scoreConfig={scoreConfig}
                            />
                            <small>
                              Còn{" "}
                              {fmtAdminFeedGioConLai(item.diemFeed, scoreConfig)}
                            </small>
                          </span>
                          <span className="ndd-mobile-dates">
                            {fmtDate(item.taoLuc)}
                            {item.hetHanLuc
                              ? ` · Boost ${fmtDate(item.hetHanLuc)}`
                              : ""}
                          </span>
                        </div>
                        <div className="ndd-mobile-actions">
                          {item.daXacThuc ? (
                            <span className="ndd-verified-pill">Đã XT</span>
                          ) : null}
                          <span className="ndd-list-boost-actions">
                            {canBumpScore(item)
                              ? scoreDeltaButtons(item, "list")
                              : null}
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
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
