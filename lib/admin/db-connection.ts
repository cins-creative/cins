/** Parse Postgres URI — dùng `@` cuối để mật khẩu có thể chứa `@`. */
export type ParsedPgUrl = {
  username: string;
  password: string;
  host: string;
  port: number;
  database: string;
};

export function parsePostgresUrl(connectionString: string): ParsedPgUrl {
  const raw = connectionString.trim();
  const prefix = /^postgres(?:ql)?:\/\//i;
  if (!prefix.test(raw)) {
    throw new Error("DATABASE_URL phải bắt đầu bằng postgresql://");
  }

  const rest = raw.replace(prefix, "");
  const at = rest.lastIndexOf("@");
  if (at < 1) {
    throw new Error("DATABASE_URL thiếu @host (hoặc thiếu user).");
  }

  const userinfo = rest.slice(0, at);
  const hostpart = rest.slice(at + 1);
  const slash = hostpart.indexOf("/");
  const hostPort = slash === -1 ? hostpart : hostpart.slice(0, slash);
  const database =
    slash === -1
      ? "postgres"
      : hostpart.slice(slash + 1).split("?")[0]!.trim() || "postgres";

  const colon = userinfo.indexOf(":");
  const username = decodeURIComponent(
    colon === -1 ? userinfo : userinfo.slice(0, colon),
  );
  const password =
    colon === -1
      ? ""
      : decodeURIComponent(userinfo.slice(colon + 1));

  const portSep = hostPort.lastIndexOf(":");
  const host = portSep === -1 ? hostPort : hostPort.slice(0, portSep);
  const port =
    portSep === -1 ? 5432 : Number.parseInt(hostPort.slice(portSep + 1), 10);

  if (!host || !username || Number.isNaN(port)) {
    throw new Error("DATABASE_URL không hợp lệ (host/user/port).");
  }

  return { username, password, host, port, database };
}

/** Mật khẩu tách riêng — tránh lỗi parse khi password có @ # % … */
export function getAdminDbPassword(): string | null {
  const p =
    process.env.SUPABASE_DB_PASSWORD?.trim() ||
    process.env.DATABASE_PASSWORD?.trim() ||
    null;
  return p || null;
}

export function resolveAdminDbCredentials(connectionString: string): ParsedPgUrl {
  const parsed = parsePostgresUrl(connectionString);
  const override = getAdminDbPassword();
  if (override) {
    return { ...parsed, password: override };
  }
  if (!parsed.password) {
    throw new Error(
      "Thiếu mật khẩu: thêm SUPABASE_DB_PASSWORD vào .env.local (khuyến nghị) hoặc đặt password trong DATABASE_URL (URL-encode nếu có ký tự đặc biệt).",
    );
  }
  return parsed;
}
