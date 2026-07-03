import { NextResponse, type NextRequest } from "next/server";

import {
  ACCOUNT_VAULT_COOKIE,
  clearRestoreHintOnResponse,
  decodeVault,
  removeAccount,
  setAccountVaultOnResponse,
  setRestoreHintOnResponse,
  upsertAccount,
  type SavedAccount,
} from "@/lib/auth/account-vault";
import {
  appendSetCookieHeaders,
  createSupabaseRouteHandlerClient,
} from "@/lib/supabase/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/auth/restore — khôi phục phiên từ "kho tài khoản" khi cookie phiên
 * chính đã mất/hết hạn. Chọn tài khoản mặc định = phần tử đầu kho (dùng gần nhất).
 *
 * Được gọi 1 lần từ client bootstrap (`SessionRestorer`) khi server render ra
 * trạng thái khách nhưng kho vẫn còn tài khoản. Chỉ 1 lần gọi → tránh nhiều
 * request song song cùng dùng một refresh token (reuse-detection của Supabase).
 */
export async function POST(request: NextRequest) {
  const carrier = new NextResponse();
  const supabase = createSupabaseRouteHandlerClient(request, carrier);

  // Đã có phiên hợp lệ → không cần khôi phục.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    return NextResponse.json({ ok: true, restored: false });
  }

  let list = decodeVault(request.cookies.get(ACCOUNT_VAULT_COOKIE)?.value);
  if (list.length === 0) {
    const empty = NextResponse.json({ ok: true, restored: false });
    clearRestoreHintOnResponse(empty);
    return empty;
  }

  // Duyệt từ đầu kho (MRU) — thử refresh cho tới khi có tài khoản còn hiệu lực.
  while (list.length > 0) {
    const target = list[0] as SavedAccount;
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: target.refreshToken,
    });

    if (error || !data.session) {
      // Token hỏng/hết hạn → gỡ khỏi kho, thử tài khoản kế.
      list = removeAccount(list, target.slug);
      continue;
    }

    const rotated = upsertAccount(list, {
      ...target,
      refreshToken: data.session.refresh_token,
      addedAt: Date.now(),
    });

    const response = NextResponse.json({
      ok: true,
      restored: true,
      slug: target.slug,
    });
    appendSetCookieHeaders(carrier, response);
    setAccountVaultOnResponse(response, rotated);
    setRestoreHintOnResponse(response);
    return response;
  }

  // Không token nào còn hiệu lực → dọn kho + tắt hint.
  const failed = NextResponse.json({ ok: true, restored: false });
  setAccountVaultOnResponse(failed, list);
  clearRestoreHintOnResponse(failed);
  return failed;
}
