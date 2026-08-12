import { NextResponse, type NextRequest } from "next/server";

import { createShopDangKyMo } from "@/lib/shop/dang-ky-mo";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Rate-limit best-effort theo IP (RAM). Production nên thay store bền — DEV_RULES §6.
 */
const ATTEMPT_WINDOW_MS = 60_000;
const ATTEMPT_MAX = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > ATTEMPT_MAX;
}

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** POST /api/mo-shop — lead dựng shop hộ (public). */
export async function POST(request: NextRequest) {
  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { error: "Server chưa cấu hình để nhận đăng ký." },
      { status: 503 },
    );
  }

  const ip = clientIp(request);
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Bạn gửi quá nhiều lần. Đợi một phút rồi thử lại." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body JSON không hợp lệ." }, { status: 400 });
  }

  /* Honeypot — bot điền field ẩn → giả thành công, không ghi DB. */
  const honey =
    typeof body?.website === "string" ? body.website.trim() : "";
  if (honey) {
    return NextResponse.json({ ok: true, id: "ok" });
  }

  /* Chặn submit quá nhanh (< 3s từ lúc mở form). */
  const openedAt =
    typeof body?.openedAt === "number"
      ? body.openedAt
      : typeof body?.openedAt === "string"
        ? Number(body.openedAt)
        : NaN;
  if (Number.isFinite(openedAt) && Date.now() - openedAt < 3000) {
    return NextResponse.json(
      { error: "Gửi quá nhanh. Đợi vài giây rồi thử lại." },
      { status: 400 },
    );
  }

  const str = (k: string): string | null =>
    typeof body?.[k] === "string" ? (body[k] as string) : null;

  const result = await createShopDangKyMo({
    tenShop: str("tenShop") ?? "",
    moTa: str("moTa"),
    tenLienHe: str("tenLienHe"),
    loaiHang: Array.isArray(body?.loaiHang)
      ? (body.loaiHang as unknown[]).filter(
          (x): x is string => typeof x === "string",
        )
      : [],
    hinhThucBan: str("hinhThucBan"),
    mxhBanHangLinks: Array.isArray(body?.mxhBanHangLinks)
      ? (body.mxhBanHangLinks as unknown[]).filter(
          (x): x is string => typeof x === "string",
        )
      : [],
    hangGioiThieu: Array.isArray(body?.hangGioiThieu)
      ? (body.hangGioiThieu as {
          tenMatHang?: string | null;
          moTa?: string | null;
          giaBan?: string | null;
          link?: string | null;
        }[])
      : [],
    resourceLinksText: str("resourceLinksText"),
    ghiChu: str("ghiChu"),
    kenhLienHe: str("kenhLienHe") ?? "",
    lienHeGiaTri: str("lienHeGiaTri") ?? "",
    email: str("email") ?? "",
    nganHang: str("nganHang"),
    soTaiKhoan: str("soTaiKhoan"),
    tenChuTk: str("tenChuTk"),
    daCoTaiKhoan: Boolean(body?.daCoTaiKhoan),
    linkProfileCins: str("linkProfileCins"),
    nguoiGioiThieu: str("nguoiGioiThieu"),
    dongYDieuKhoan: Boolean(body?.dongYDieuKhoan),
    dongYDungAnh: Boolean(body?.dongYDungAnh),
    nguon: str("nguon"),
    clientIp: ip,
    userAgent: request.headers.get("user-agent"),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    id: result.id,
    kenhLienHe: result.kenhLienHe,
    lienHeGiaTri: result.lienHeGiaTri,
  });
}
