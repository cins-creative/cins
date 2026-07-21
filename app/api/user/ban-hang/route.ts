import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { getShopReady, shopSetupHref } from "@/lib/shop/cua-hang";
import {
  getBanHangSettings,
  setBanHangEnabled,
  setShopHienThi,
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
  let body: {
    enabled?: unknown;
    acceptTerms?: unknown;
    shopVisible?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const hasEnabled = typeof body.enabled === "boolean";
  const hasShopVisible = typeof body.shopVisible === "boolean";
  if (!hasEnabled && !hasShopVisible) {
    return NextResponse.json(
      { error: "Thiếu enabled hoặc shopVisible." },
      { status: 422 },
    );
  }

  try {
    let settings = await getBanHangSettings(session.profile.id);

    if (hasEnabled) {
      settings = await setBanHangEnabled(
        session.profile.id,
        body.enabled === true,
        body.acceptTerms === true,
      );
    }

    if (hasShopVisible) {
      settings = await setShopHienThi(
        session.profile.id,
        body.shopVisible === true,
      );
    }

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
    if (msg === "BAN_HANG_OFF") {
      return NextResponse.json(
        { error: "Cần bật chức năng bán hàng trước khi hiện Shop." },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: "Không lưu được." }, { status: 500 });
  }
}
