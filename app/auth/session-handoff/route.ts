import { NextResponse, type NextRequest } from "next/server";

import { oauthSessionLandingResponse } from "@/lib/auth/oauth-session-landing";
import {
  isAllowedHandoffRequest,
  normalizeManageHandoffNext,
} from "@/lib/cins/manage-handoff";
import { MANAGE_ORIGIN } from "@/lib/cins/manage-site";
import {
  createSupabaseRouteHandlerClient,
  flushDeferredAuthCookies,
} from "@/lib/supabase/route-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function badRequest(message: string): NextResponse {
  return new NextResponse(message, {
    status: 400,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

/**
 * POST /auth/session-handoff — nhận access/refresh từ form trên cins.vn,
 * ghi cookie phiên trên manage.cins.vn, rồi vào path đích.
 */
export async function POST(request: NextRequest) {
  if (!isAllowedHandoffRequest(request)) {
    return badRequest("Nguồn không hợp lệ.");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Yêu cầu không hợp lệ.");
  }

  const accessToken = String(form.get("access_token") ?? "").trim();
  const refreshToken = String(form.get("refresh_token") ?? "").trim();
  const nextPath = normalizeManageHandoffNext(String(form.get("next") ?? ""));

  if (!accessToken || !refreshToken || !nextPath) {
    return badRequest("Thiếu phiên hoặc đường dẫn.");
  }

  const carrier = new NextResponse();
  const supabase = createSupabaseRouteHandlerClient(request, carrier);
  const { error: sessionErr } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  await flushDeferredAuthCookies();
  if (sessionErr) {
    return badRequest("Không lưu được phiên.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return badRequest("Phiên không hợp lệ.");
  }

  const destination = new URL(nextPath, MANAGE_ORIGIN);
  return oauthSessionLandingResponse(MANAGE_ORIGIN, destination, carrier);
}
