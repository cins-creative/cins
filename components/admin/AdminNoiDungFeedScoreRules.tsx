"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import {
  FEED_SCORE_FORMULA,
  FEED_SCORE_SCOPE,
  buildFeedScoreExampleRows,
} from "@/lib/cins/feed-scoring-catalog";
import {
  DEFAULT_FEED_SCORE_CONFIG,
  FEED_SCORE_EDITABLE_META,
  normalizeFeedScoreLyDo,
  validateFeedScoreConfig,
  type FeedScoreConfig,
  type FeedScorePhienBan,
} from "@/lib/cins/feed-scoring-config";

type Props = {
  onConfigSaved?: (cfg: FeedScoreConfig) => void;
};

const LOAI_LABEL: Record<FeedScorePhienBan["loai"], string> = {
  luu: "Lưu",
  khoi_phuc: "Khôi phục",
  mac_dinh: "Mặc định",
  seed: "Gốc",
};

function fmtWhen(iso: string): string {
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

export function AdminNoiDungFeedScoreRules({ onConfigSaved }: Props) {
  const [draft, setDraft] = useState<FeedScoreConfig>(DEFAULT_FEED_SCORE_CONFIG);
  const [saved, setSaved] = useState<FeedScoreConfig>(DEFAULT_FEED_SCORE_CONFIG);
  const [versions, setVersions] = useState<FeedScorePhienBan[]>([]);
  const [editing, setEditing] = useState(false);
  const [lyDo, setLyDo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/feed-score-config");
      if (!res.ok) throw new Error("Không tải được cấu hình điểm.");
      const json = (await res.json()) as {
        config: FeedScoreConfig;
        versions?: FeedScorePhienBan[];
      };
      setDraft(json.config);
      setSaved(json.config);
      setVersions(json.versions ?? []);
      onConfigSaved?.(json.config);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải cấu hình.");
    } finally {
      setLoading(false);
    }
  }, [onConfigSaved]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(
    () => FEED_SCORE_EDITABLE_META.some((m) => draft[m.key] !== saved[m.key]),
    [draft, saved],
  );

  const localError = validateFeedScoreConfig(draft);
  const lyDoCheck = normalizeFeedScoreLyDo(lyDo);
  const canSave =
    editing &&
    dirty &&
    !localError &&
    lyDoCheck.ok &&
    !pending;

  function setField(key: keyof FeedScoreConfig, raw: string) {
    if (!editing) return;
    const n = Number(raw);
    setDraft((prev) => ({
      ...prev,
      [key]: Number.isFinite(n) ? Math.round(n) : prev[key],
    }));
    setOkMsg(null);
  }

  function startEdit() {
    setEditing(true);
    setLyDo("");
    setError(null);
    setOkMsg(null);
  }

  function cancelEdit() {
    setDraft(saved);
    setLyDo("");
    setEditing(false);
    setError(null);
    setOkMsg(null);
  }

  function applySaved(
    config: FeedScoreConfig,
    nextVersions: FeedScorePhienBan[] | undefined,
    soPhien: number | undefined,
    msg: string,
  ) {
    setDraft(config);
    setSaved(config);
    if (nextVersions) setVersions(nextVersions);
    onConfigSaved?.(config);
    setEditing(false);
    setLyDo("");
    setOkMsg(
      soPhien != null ? `${msg} (phiên bản #${soPhien}).` : msg,
    );
  }

  function save() {
    setError(null);
    setOkMsg(null);
    if (!lyDoCheck.ok) {
      setError(lyDoCheck.message);
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/admin/feed-score-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: draft, lyDo: lyDoCheck.lyDo }),
      });
      const json = (await res.json()) as {
        error?: string;
        config?: FeedScoreConfig;
        soPhien?: number;
        versions?: FeedScorePhienBan[];
      };
      if (!res.ok || !json.config) {
        setError(json.error ?? "Không lưu được.");
        return;
      }
      applySaved(
        json.config,
        json.versions,
        json.soPhien,
        "Đã lưu phiên bản mới. Áp dụng bài mới / recalc / lần đẩy tiếp theo — không rewrite điểm bài cũ",
      );
    });
  }

  function resetDefaults() {
    setError(null);
    setOkMsg(null);
    if (!lyDoCheck.ok) {
      setError(lyDoCheck.message);
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/admin/feed-score-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true, lyDo: lyDoCheck.lyDo }),
      });
      const json = (await res.json()) as {
        error?: string;
        config?: FeedScoreConfig;
        soPhien?: number;
        versions?: FeedScorePhienBan[];
      };
      if (!res.ok || !json.config) {
        setError(json.error ?? "Không khôi phục được mặc định.");
        return;
      }
      applySaved(
        json.config,
        json.versions,
        json.soPhien,
        "Đã khôi phục mặc định code thành phiên bản mới",
      );
    });
  }

  function restorePhien(phien: FeedScorePhienBan) {
    const reason = `Khôi phục phiên bản #${phien.soPhien}`;
    setError(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/feed-score-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restoreId: phien.id, lyDo: reason }),
      });
      const json = (await res.json()) as {
        error?: string;
        config?: FeedScoreConfig;
        soPhien?: number;
        versions?: FeedScorePhienBan[];
      };
      if (!res.ok || !json.config) {
        setError(json.error ?? "Không khôi phục được phiên bản.");
        return;
      }
      applySaved(
        json.config,
        json.versions,
        json.soPhien,
        `Đã khôi phục từ phiên bản #${phien.soPhien}`,
      );
    });
  }

  const examples = buildFeedScoreExampleRows(draft);
  const latestSo = versions[0]?.soPhien ?? null;

  if (loading) {
    return (
      <p className="admin-panel-loading">
        <Loader2 className="bc-spin" size={18} /> Đang tải công thức…
      </p>
    );
  }

  return (
    <div className="ndd-score-rules">
      <div className="ndd-score-rules-intro">
        <p className="ndd-score-rules-formula">
          Công thức: <code>{FEED_SCORE_FORMULA}</code>
          {latestSo != null ? (
            <span className="ndd-score-rules-phien-hien">
              {" "}
              · Đang dùng phiên bản #{latestSo}
            </span>
          ) : null}
        </p>
        <p className="ndd-score-rules-scope">{FEED_SCORE_SCOPE}</p>
        <p className="ndd-score-rules-note">
          Bấm <strong>Chỉnh sửa</strong> để mở khóa bảng. Mỗi lần lưu tạo phiên
          bản mới (bắt buộc lý do).{" "}
          <strong>BASE</strong> / <strong>BOOST_RESET_SCORE</strong> liên kết
          ON/OFF đẩy. TTL L29 không thuộc bảng này.
        </p>
        <div className="ndd-score-rules-actions">
          {!editing ? (
            <button
              type="button"
              className="ndd-score-rules-btn ndd-score-rules-btn--primary"
              disabled={pending}
              onClick={startEdit}
            >
              Chỉnh sửa
            </button>
          ) : (
            <>
              <button
                type="button"
                className="ndd-score-rules-btn ndd-score-rules-btn--primary"
                disabled={!canSave}
                onClick={save}
              >
                {pending ? "Đang lưu…" : "Lưu phiên bản"}
              </button>
              <button
                type="button"
                className="ndd-score-rules-btn"
                disabled={pending}
                onClick={cancelEdit}
              >
                Hủy
              </button>
              <button
                type="button"
                className="ndd-score-rules-btn"
                disabled={pending || !lyDoCheck.ok}
                onClick={resetDefaults}
              >
                Về mặc định code
              </button>
            </>
          )}
        </div>
        {editing ? (
          <label className="ndd-score-rules-lydo">
            <span>Lý do thay đổi (bắt buộc)</span>
            <textarea
              value={lyDo}
              onChange={(e) => {
                setLyDo(e.target.value);
                setOkMsg(null);
              }}
              rows={2}
              maxLength={500}
              placeholder="Ví dụ: tăng điểm thumbnail để ưu tiên album có ảnh…"
              disabled={pending}
            />
          </label>
        ) : null}
        {editing && localError ? (
          <p className="ndd-error">{localError}</p>
        ) : null}
        {error ? <p className="ndd-error">{error}</p> : null}
        {okMsg ? <p className="ndd-score-rules-ok">{okMsg}</p> : null}
      </div>

      <div className="table-wrap table-wrap--ndd">
        <table className="data-table ndd-score-rules-table">
          <thead>
            <tr>
              <th>Nhóm</th>
              <th>Mục</th>
              <th className="ndd-score-rules-col-diem">Giá trị</th>
              <th>Đẩy?</th>
              <th>Điều kiện</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {FEED_SCORE_EDITABLE_META.map((row, i) => {
              const showNhom =
                i === 0 ||
                FEED_SCORE_EDITABLE_META[i - 1]?.nhom !== row.nhom;
              return (
                <tr key={row.key}>
                  <td className="ndd-score-rules-nhom">
                    {showNhom ? row.nhom : ""}
                  </td>
                  <td>{row.muc}</td>
                  <td className="ndd-score-rules-col-diem">
                    {editing ? (
                      <input
                        className="ndd-score-rules-input"
                        type="number"
                        inputMode="numeric"
                        value={draft[row.key]}
                        onChange={(e) => setField(row.key, e.target.value)}
                        disabled={pending}
                        aria-label={row.muc}
                      />
                    ) : (
                      <strong>{draft[row.key]}</strong>
                    )}
                  </td>
                  <td className="ndd-score-rules-day">
                    {row.lienKetDay ? (
                      <span className="ndd-score-rules-day-pill">Có</span>
                    ) : (
                      <span className="ndd-list-muted">—</span>
                    )}
                  </td>
                  <td>{row.dieuKien}</td>
                  <td className="ndd-score-rules-note-cell">
                    {row.ghiChu ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="ndd-score-rules-h2">Lịch sử phiên bản</h2>
      <div className="table-wrap table-wrap--ndd">
        <table className="data-table ndd-score-rules-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Loại</th>
              <th>Lý do</th>
              <th>Người lưu</th>
              <th>Thời gian</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {versions.length === 0 ? (
              <tr>
                <td colSpan={6} className="ndd-list-muted">
                  Chưa có lịch sử — chạy migration phiên bản hoặc lưu lần đầu.
                </td>
              </tr>
            ) : (
              versions.map((v, idx) => (
                <tr key={v.id}>
                  <td>
                    <strong>#{v.soPhien}</strong>
                    {idx === 0 ? (
                      <span className="ndd-score-rules-day-pill"> Hiện tại</span>
                    ) : null}
                  </td>
                  <td>{LOAI_LABEL[v.loai] ?? v.loai}</td>
                  <td>{v.lyDo}</td>
                  <td>{v.taoBoiTen ?? "—"}</td>
                  <td>{fmtWhen(v.taoLuc)}</td>
                  <td>
                    {idx === 0 ? (
                      <span className="ndd-list-muted">—</span>
                    ) : (
                      <button
                        type="button"
                        className="ndd-score-rules-btn"
                        disabled={pending || editing}
                        title={
                          editing
                            ? "Hủy chỉnh sửa trước khi khôi phục"
                            : `Khôi phục #${v.soPhien}`
                        }
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Khôi phục trọng số từ phiên bản #${v.soPhien}? Hệ thống sẽ tạo phiên bản mới.`,
                            )
                          ) {
                            return;
                          }
                          restorePhien(v);
                        }}
                      >
                        Khôi phục
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="ndd-score-rules-h2">Ví dụ phân bổ (gốc, trước decay)</h2>
      <div className="table-wrap table-wrap--ndd">
        <table className="data-table ndd-score-rules-table">
          <thead>
            <tr>
              <th>Tình huống</th>
              <th>Thành phần</th>
              <th className="ndd-score-rules-col-diem">Tổng gốc</th>
            </tr>
          </thead>
          <tbody>
            {examples.map((ex) => (
              <tr key={ex.ten}>
                <td>{ex.ten}</td>
                <td>{ex.thanhPhan}</td>
                <td className="ndd-score-rules-col-diem">
                  <strong>{ex.tongGoc}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
