import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getShopReady, shopSetupHref } from "@/lib/shop/cua-hang";
import {
  getBanHangSettings,
  setBanHangEnabled,
} from "@/lib/shop/settings";
import {
  SHOP_TERMS_BODY,
  SHOP_TERMS_TITLE,
  SHOP_TERMS_VERSION,
} from "@/lib/shop/terms";

export async function GET() {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const [settings, ready] = await Promise.all([
    getBanHangSettings(session.profile.id),
    getShopReady(session.profile.id),
  ]);
  const slug = session.profile.slug?.trim() || "";
  return NextResponse.json({
    ...settings,
    shopReady: ready.shopReady,
    shopReadyMissing: ready.missing,
    shopSetupHref: shopSetupHref(slug),
    terms: {
      version: SHOP_TERMS_VERSION,
      title: SHOP_TERMS_TITLE,
      body: SHOP_TERMS_BODY,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  let body: { enabled?: unknown; acceptTerms?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Thiếu enabled." }, { status: 422 });
  }
  try {
    const settings = await setBanHangEnabled(
      session.profile.id,
      body.enabled,
      body.acceptTerms === true,
    );
    const ready = await getShopReady(session.profile.id);
    const slug = session.profile.slug?.trim() || "";
    return NextResponse.json({
      ...settings,
      shopReady: ready.shopReady,
      shopReadyMissing: ready.missing,
      shopSetupHref: shopSetupHref(slug),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "TERMS_REQUIRED") {
      return NextResponse.json(
        { error: "Cần chấp nhận điều khoản để bật bán hàng." },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: "Không lưu được." }, { status: 500 });
  }
}
