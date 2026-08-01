import {
  isAuthRetryableFetchError,
  type AuthError,
} from "@supabase/supabase-js";

/**
 * True khi refresh token thực sự vô hiệu (invalid_grant / revoked / not found).
 * False với lỗi tạm (mạng, 5xx) — giữ nick trong kho để thử lại.
 */
export function isDeadRefreshToken(error: AuthError | null): boolean {
  if (!error) return false;
  if (isAuthRetryableFetchError(error)) return false;
  const status = (error as { status?: number }).status ?? 0;
  if (status === 0 || status >= 500) return false;
  return true;
}
