import { NextResponse } from "next/server";

import { damBaoNguonTuMaNgoai } from "@/lib/autopilot/dam-bao-nguon";
import { luuMucBatch } from "@/lib/autopilot/luu-muc-batch";
import { xacThucBearerSecret } from "@/lib/noi-bo/xac-thuc-bearer";
import {
  createServiceRoleClient,
  hasServiceRoleEnv,
} from "@/lib/supabase/service-role";

export const runtime = "nodejs";

const ENV_SECRET = "CINS_NOI_BO_DANG_BAI_SECRET";
const MAX_ITEMS = 200;

type BodyMuc = {
  nenTang?: "artstation" | "behance" | "khac";
  idNguon?: string | null;
  /** Username Behance/ArtStation — tự tạo/gắn auto_nguon nếu chưa có idNguon. */
  maNgoai?: string | null;
  /** Niche gợi ý (string hoặc mảng) — lưu meta + auto_nguon.niche. */
  niche?: string | string[] | null;
  items?: Array<{
    urlCanonic?: string;
    url?: string;
    tieuDeGoc?: string;
    tieuDe?: string;
    moTaGoc?: string;
    moTa?: string;
    tenTacGia?: string;
    tacGia?: string;
    anhBiaUrl?: string;
    anhBia?: string;
  }>;
};

function chuanHoaNiche(raw: BodyMuc["niche"]): string | null {
  if (Array.isArray(raw)) {
    const s = raw
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .join(", ");
    return s || null;
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    return s || null;
  }
  return null;
}

/**
 * POST /api/noi-bo/auto/muc
 * Extension Behance / worker đẩy batch mục → auto_muc.
 * Header: Authorization: Bearer <CINS_NOI_BO_DANG_BAI_SECRET>
 */
export async function POST(request: Request) {
  const auth = xacThucBearerSecret(request, ENV_SECRET);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }

  if (!hasServiceRoleEnv()) {
    return NextResponse.json(
      { ok: false, error: "Thiếu SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 },
    );
  }

  let body: BodyMuc;
  try {
    body = (await request.json()) as BodyMuc;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON không hợp lệ." },
      { status: 400 },
    );
  }

  const nenTang = body.nenTang || "behance";
  if (!["artstation", "behance", "khac"].includes(nenTang)) {
    return NextResponse.json(
      { ok: false, error: "nenTang không hợp lệ.", field: "nenTang" },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Thiếu items[].", field: "items" },
      { status: 400 },
    );
  }
  if (body.items.length > MAX_ITEMS) {
    return NextResponse.json(
      {
        ok: false,
        error: `Tối đa ${MAX_ITEMS} mục / request.`,
        field: "items",
      },
      { status: 400 },
    );
  }

  const niche = chuanHoaNiche(body.niche);
  const maNgoai = body.maNgoai?.trim() || null;
  const admin = createServiceRoleClient();

  let idNguon = body.idNguon?.trim() || null;
  if (!idNguon && maNgoai && (nenTang === "behance" || nenTang === "artstation")) {
    try {
      idNguon = await damBaoNguonTuMaNgoai(admin, {
        nenTang,
        maNgoai,
        niche,
      });
    } catch (e) {
      return NextResponse.json(
        {
          ok: false,
          error: e instanceof Error ? e.message : "Không tạo được auto_nguon.",
          field: "maNgoai",
        },
        { status: 400 },
      );
    }
  }

  const items = body.items.map((raw) => ({
    urlCanonic: String(raw.urlCanonic || raw.url || "").trim(),
    tieuDeGoc: raw.tieuDeGoc || raw.tieuDe || null,
    moTaGoc: raw.moTaGoc || raw.moTa || null,
    tenTacGia: raw.tenTacGia || raw.tacGia || maNgoai || null,
    anhBiaUrl: raw.anhBiaUrl || raw.anhBia || null,
    meta: {
      tuExtension: true,
      niche,
      maNgoai,
    },
  }));

  try {
    const result = await luuMucBatch(admin, {
      idNguon,
      nenTang,
      items,
    });
    return NextResponse.json(
      { ok: true, nenTang, idNguon, maNgoai, ...result },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Lỗi lưu auto_muc.",
      },
      { status: 500 },
    );
  }
}
