import { NextResponse } from "next/server";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  resolveActingOwner,
} from "@/lib/admin/seeding-nick";
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
import {
  getPhiDangApDungShop,
  listPhiThongBaoCongBo,
} from "@/lib/billing/phi-chinh-sach";

export async function GET(request: Request) {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }
  const url = new URL(request.url);
  const acting = await resolveActingOwner({
    sessionProfileId: session.profile.id,
    sessionSlug: session.profile.slug,
    targetOwnerId: url.searchParams.get("ownerId"),
    targetOwnerSlug: url.searchParams.get("slug"),
  });
  if (!acting) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
  }

  const [settings, ready, dangApDung, thongBao] = await Promise.all([
    getBanHangSettings(acting.ownerId),
    getShopReady(acting.ownerId).catch((readyErr) => {
      console.error("[api/user/seller] getShopReady", readyErr);
      return { shopReady: false, missing: null };
    }),
    getPhiDangApDungShop(),
    listPhiThongBaoCongBo("shop", 10),
  ]);
  return NextResponse.json({
    ...settings,
    shopReady: ready.shopReady,
    shopReadyMissing: ready.missing,
    shopSetupHref: shopSetupHref(acting.ownerSlug),
    terms: {
      version: SHOP_TERMS_VERSION,
      title: SHOP_TERMS_TITLE,
      body: SHOP_TERMS_BODY,
    },
    phiSan: {
      dangApDung,
      thongBao,
      chinhSachHref: "/policies/marketplace-fee",
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
    ownerId?: unknown;
    slug?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON không hợp lệ." }, { status: 400 });
  }

  const acting = await resolveActingOwner({
    sessionProfileId: session.profile.id,
    sessionSlug: session.profile.slug,
    targetOwnerId: typeof body.ownerId === "string" ? body.ownerId : null,
    targetOwnerSlug: typeof body.slug === "string" ? body.slug : null,
  });
  if (!acting) {
    return NextResponse.json({ error: "Không có quyền." }, { status: 403 });
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
    let settings = await getBanHangSettings(acting.ownerId);

    if (hasEnabled) {
      settings = await setBanHangEnabled(
        acting.ownerId,
        body.enabled === true,
        body.acceptTerms === true,
      );
    }

    if (hasShopVisible) {
      settings = await setShopHienThi(
        acting.ownerId,
        body.shopVisible === true,
      );
    }

    const ready = await getShopReady(acting.ownerId).catch((readyErr) => {
      console.error("[api/user/seller] getShopReady", readyErr);
      return { shopReady: false, missing: null as string | null };
    });
    return NextResponse.json({
      ...settings,
      shopReady: ready.shopReady,
      shopReadyMissing: ready.missing,
      shopSetupHref: shopSetupHref(acting.ownerSlug),
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
    console.error("[api/user/seller] PATCH", e);
    return NextResponse.json(
      { error: msg && msg !== "UPDATE_FAILED" ? msg : "Không lưu được." },
      { status: 500 },
    );
  }
}
