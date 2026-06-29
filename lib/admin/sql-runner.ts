import postgres from "postgres";

import { resolveAdminDbCredentials } from "@/lib/admin/db-connection";
import { getAdminDbUrl } from "@/lib/admin/db-url";
import { isUsingHyperdrive } from "@/lib/db/hyperdrive";

export type AdminSqlMode = "read" | "full";

export type AdminSqlResult = {
  durationMs: number;
  rowCount: number;
  rows: Record<string, unknown>[] | null;
  truncated: boolean;
  command: boolean;
};

const MAX_QUERY_LEN = 100_000;
const MAX_DISPLAY_ROWS = 500;

function stripSqlComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
}

function firstStatementKeyword(sql: string): string {
  const first = stripSqlComments(sql)
    .split(";")
    .map((s) => s.trim())
    .find(Boolean);
  if (!first) return "";
  return first.split(/\s+/)[0]?.toLowerCase() ?? "";
}

const READ_ONLY_KEYWORDS = new Set([
  "select",
  "with",
  "explain",
  "show",
  "table",
  "values",
]);

function assertReadOnly(sql: string): void {
  const kw = firstStatementKeyword(sql);
  if (!READ_ONLY_KEYWORDS.has(kw)) {
    const hint =
      kw === "insert" ||
      kw === "update" ||
      kw === "delete" ||
      kw === "alter" ||
      kw === "create" ||
      kw === "drop" ||
      kw === "truncate"
        ? " Chọn «Đầy đủ» trên trang SQL để chạy lệnh ghi/sửa."
        : "";
    throw new Error(
      `Chế độ chỉ đọc: câu bắt đầu bằng «${kw || "?"}» — chỉ SELECT, WITH, EXPLAIN, SHOW, TABLE hoặc VALUES.${hint}`,
    );
  }
}

function serializeCell(value: unknown): unknown {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Buffer.isBuffer(value)) return `<binary ${value.length} bytes>`;
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return value;
}

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = serializeCell(v);
  }
  return out;
}

export async function runAdminSql(
  query: string,
  mode: AdminSqlMode,
): Promise<AdminSqlResult> {
  const trimmed = query.trim();
  if (!trimmed) throw new Error("Câu SQL trống.");
  if (trimmed.length > MAX_QUERY_LEN) {
    throw new Error("Câu SQL quá dài (tối đa 100.000 ký tự).");
  }
  if (mode === "read") assertReadOnly(trimmed);

  const url = getAdminDbUrl();
  if (!url) {
    throw new Error(
      "Thiếu DATABASE_URL trên server. Lấy URI từ Supabase → Connect → pooler.",
    );
  }

  const db = resolveAdminDbCredentials(url);
  const viaHyperdrive = isUsingHyperdrive();
  const sql = postgres({
    host: db.host,
    port: db.port,
    database: db.database,
    username: db.username,
    password: db.password,
    max: 1,
    connect_timeout: 15,
    idle_timeout: 5,
    ssl: db.host.includes("supabase.co") ? "require" : undefined,
    ...(viaHyperdrive ? { fetch_types: false } : {}),
  });

  const started = Date.now();
  try {
    const raw = await sql.unsafe(trimmed);
    const durationMs = Date.now() - started;
    const arr = Array.isArray(raw) ? raw : [];

    if (arr.length > 0 && typeof arr[0] === "object" && arr[0] !== null) {
      const serialized = arr.map((row) =>
        serializeRow(row as Record<string, unknown>),
      );
      const truncated = serialized.length > MAX_DISPLAY_ROWS;
      return {
        durationMs,
        rowCount: serialized.length,
        rows: truncated
          ? serialized.slice(0, MAX_DISPLAY_ROWS)
          : serialized,
        truncated,
        command: false,
      };
    }

    const count =
      typeof (raw as { count?: number }).count === "number"
        ? (raw as { count: number }).count
        : 0;

    return {
      durationMs,
      rowCount: count,
      rows: null,
      truncated: false,
      command: true,
    };
  } finally {
    await sql.end({ timeout: 3 });
  }
}
