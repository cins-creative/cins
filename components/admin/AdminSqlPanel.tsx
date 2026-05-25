"use client";

import { useState } from "react";

import { adminRunSql } from "@/app/admin/actions";
import type { AdminSqlMode, AdminSqlResult } from "@/lib/admin/sql-runner";

const SAMPLE_SELECT = `SELECT id, slug, tieu_de, loai_bai_viet, trang_thai_noi_dung
FROM article_bai_viet
ORDER BY cap_nhat_luc DESC NULLS LAST
LIMIT 20;`;

type Props = {
  dbReady: boolean;
  passwordReady: boolean;
  /** Giao diện popup góc màn hình — textarea và bảng kết quả thấp hơn. */
  compact?: boolean;
};

export function AdminSqlPanel({
  dbReady,
  passwordReady,
  compact = false,
}: Props) {
  const [sql, setSql] = useState(SAMPLE_SELECT);
  const [mode, setMode] = useState<AdminSqlMode>("read");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminSqlResult | null>(null);

  async function onRun() {
    setError(null);
    setResult(null);
    setRunning(true);
    const res = await adminRunSql(sql, mode);
    setRunning(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setResult(res.result);
  }

  const columns =
    result?.rows && result.rows.length > 0
      ? Object.keys(result.rows[0]!)
      : [];

  return (
    <div
      className={
        compact ? "admin-sql-panel admin-sql-panel--compact" : "admin-sql-page"
      }
    >
      {!compact ? (
        <header className="page-header">
          <div>
            <h1 className="page-title">SQL</h1>
            <p className="admin-sql-lead">
              Chạy truy vấn Postgres trực tiếp (server-only). Mặc định chỉ đọc;
              bật «Đầy đủ» khi cần INSERT/UPDATE/DDL.
            </p>
          </div>
          <div className="page-header-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setSql(SAMPLE_SELECT)}
              disabled={running}
            >
              Mẫu SELECT
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void onRun()}
              disabled={running || !dbReady || !passwordReady || !sql.trim()}
            >
              {running ? "Đang chạy…" : "Chạy SQL"}
            </button>
          </div>
        </header>
      ) : null}

      {!dbReady ? (
        <div className="admin-sql-warn" role="alert">
          <strong>Thiếu DATABASE_URL.</strong> Thêm pooler URI +{" "}
          <code>SUPABASE_DB_PASSWORD</code> vào <code>.env.local</code>, restart
          dev server.
        </div>
      ) : !passwordReady ? (
        <p
          className="admin-edit-form__msg admin-edit-form__msg--err"
          role="alert"
        >
          Thiếu <code>SUPABASE_DB_PASSWORD</code> trong .env.local.
        </p>
      ) : compact ? (
        <p className="admin-sql-ok-hint admin-sql-ok-hint--compact" role="status">
          Đã kết nối DB
        </p>
      ) : (
        <p className="admin-sql-ok-hint" role="status">
          Đã có DATABASE_URL và mật khẩu.
        </p>
      )}

      <div className="admin-sql-toolbar">
        <label className="admin-sql-mode">
          <input
            type="radio"
            name={compact ? "sql-mode-bubble" : "sql-mode"}
            checked={mode === "read"}
            onChange={() => setMode("read")}
            disabled={running}
          />
          Chỉ đọc
        </label>
        <label className="admin-sql-mode admin-sql-mode--full">
          <input
            type="radio"
            name={compact ? "sql-mode-bubble" : "sql-mode"}
            checked={mode === "full"}
            onChange={() => setMode("full")}
            disabled={running}
          />
          Đầy đủ
        </label>
        {compact ? (
          <div className="admin-sql-toolbar__actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSql(SAMPLE_SELECT)}
              disabled={running}
            >
              Mẫu
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void onRun()}
              disabled={running || !dbReady || !passwordReady || !sql.trim()}
            >
              {running ? "…" : "Chạy"}
            </button>
          </div>
        ) : null}
      </div>

      {mode === "full" ? (
        <div
          className="admin-sql-warn admin-sql-warn--danger admin-sql-warn--compact"
          role="alert"
        >
          Quyền ghi — kiểm tra kỹ trước khi chạy.
        </div>
      ) : null}

      <label className="admin-sql-label" htmlFor={compact ? "admin-sql-bubble-input" : "admin-sql-input"}>
        SQL
      </label>
      <textarea
        id={compact ? "admin-sql-bubble-input" : "admin-sql-input"}
        className="admin-sql-editor"
        spellCheck={false}
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        disabled={running || !dbReady}
        rows={compact ? 8 : 14}
      />

      {error ? (
        <p className="admin-edit-form__msg admin-edit-form__msg--err" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <section className="admin-sql-results" aria-label="Kết quả">
          <p className="admin-sql-meta">
            {result.command
              ? `${result.rowCount} dòng ảnh hưởng`
              : `${result.rowCount} dòng`}
            {" · "}
            {result.durationMs} ms
            {result.truncated ? " · max 500" : null}
          </p>
          {result.rows && result.rows.length > 0 ? (
            <div className="admin-sql-table-wrap">
              <table className="admin-sql-table">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col} scope="col">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i}>
                      {columns.map((col) => (
                        <td key={col}>{formatCell(row[col])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : result.command ? (
            <p className="form-hint">OK (không có RESULT).</p>
          ) : (
            <p className="form-hint">OK, 0 dòng.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  return String(value);
}
