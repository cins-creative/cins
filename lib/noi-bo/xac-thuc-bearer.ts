import "server-only";

import { timingSafeEqual } from "node:crypto";

/**
 * So khớp Bearer token cho API nội bộ (worker Autopilot / cron).
 * Env: tên truyền vào — không log giá trị.
 */
export function xacThucBearerSecret(
  request: Request,
  envKey: string,
):
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string } {
  const expected = process.env[envKey]?.trim();
  if (!expected) {
    return {
      ok: false,
      status: 503,
      error: `Chưa cấu hình ${envKey}.`,
    };
  }

  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const a = Buffer.from(bearer, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}
