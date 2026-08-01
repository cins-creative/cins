import { NextResponse, type NextRequest } from "next/server";

import {
  ACCOUNT_VAULT_COOKIE,
  decodeVault,
  setAccountVaultOnResponse,
  setRestoreHintOnResponse,
  upsertAccount,
} from "@/lib/auth/account-vault";
import {
  appendSetCookieHeaders,
  createSupabaseRouteHandlerClient,
  flushDeferredAuthCookies,
} from "@/lib/supabase/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/auth/vault-sync — đồng bộ refresh token hiện hành vào kho
 * `cins-accounts` sau khi client báo TOKEN_REFRESHED.
 *
 * Không nhận body / slug từ client — chỉ thao tác trên phiên của request.
 * Không trả token ra client.
 */
export async function POST(request: NextRequest) {
  const carrier = new NextResponse();
  const supabase = createSupabaseRouteHandlerClient(request, carrier);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: true, synced: false });
  }

  await flushDeferredAuthCookies();

  const { data: sessionData } = await supabase.auth.getSession();
  const refreshToken = sessionData.session?.refresh_token;
  if (!refreshToken) {
    return NextResponse.json({ ok: true, synced: false });
  }

  const { data: profile } = await supabase
    .from("user_nguoi_dung")
    .select("slug, ten_hien_thi, avatar_id")
    .eq("auth_user_id", user.id)
    .maybeSingle<{
      slug: string;
      ten_hien_thi: string | null;
      avatar_id: string | null;
    }>();

  if (!profile?.slug) {
    return NextResponse.json({ ok: true, synced: false });
  }

  const vault = decodeVault(request.cookies.get(ACCOUNT_VAULT_COOKIE)?.value);
  setAccountVaultOnResponse(
    carrier,
    upsertAccount(vault, {
      slug: profile.slug,
      tenHienThi: profile.ten_hien_thi,
      avatarId: profile.avatar_id,
      refreshToken,
      addedAt: Date.now(),
    }),
  );
  setRestoreHintOnResponse(carrier);

  const response = NextResponse.json({ ok: true, synced: true });
  appendSetCookieHeaders(carrier, response);
  return response;
}
