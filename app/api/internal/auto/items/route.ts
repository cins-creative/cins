import { NextResponse } from "next/server";

import { damBaoNguonTuMaNgoai } from "@/lib/autopilot/dam-bao-nguon";
import {
  laTieuDeThoBehance,
  layBehanceMetaTuUrl,
  tieuDeTuSlugUrlBehance,
} from "@/lib/autopilot/behance-assets";
import { luuMucBatch } from "@/lib/autopilot/luu-muc-batch";
import { xacThucBearerSecret } from "@/lib/noi-bo/xac-thuc-bearer";
import {
  createServiceRoleClient,
  hasServiceRoleEnv,
} from "@/lib/supabase/service-role";

export const runtime = "nodejs";

const ENV_SECRET = "CINS_NOI_BO_DANG_BAI_SECRET";
const MAX_ITEMS = 200;
const COVER_CONCURRENCY = 4;

type BodyMuc = {
  nenTang?: "artstation" | "behance" | "pixiv" | "khac";
  idNguon?: string | null;
  /** Username AS/BH hoặc user id Pixiv — tự tạo/gắn auto_nguon nếu chưa có idNguon. */
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
    /** Album ảnh (extension quét trang gallery). */
    anhUrls?: string[];
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
 * Extension Behance/Pixiv / worker đẩy batch mục → auto_muc.
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
  if (!["artstation", "behance", "pixiv", "khac"].includes(nenTang)) {
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
  if (
    !idNguon &&
    maNgoai &&
    (nenTang === "behance" ||
      nenTang === "artstation" ||
      nenTang === "pixiv")
  ) {
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

  const items = body.items.map((raw) => {
    const anhUrls = Array.isArray(raw.anhUrls)
      ? raw.anhUrls
          .map((u) => String(u || "").trim())
          .filter((u) => /^https:\/\//i.test(u))
          .slice(0, 12)
      : [];
    return {
      urlCanonic: String(raw.urlCanonic || raw.url || "").trim(),
      tieuDeGoc: raw.tieuDeGoc || raw.tieuDe || null,
      moTaGoc: raw.moTaGoc || raw.moTa || null,
      tenTacGia: raw.tenTacGia || raw.tacGia || maNgoai || null,
      anhBiaUrl: raw.anhBiaUrl || raw.anhBia || anhUrls[0] || null,
      meta: {
        tuExtension: true,
        niche,
        maNgoai,
        ...(anhUrls.length ? { anhUrls } : {}),
      },
    };
  });

  /* Behance: thiếu cover / tiêu đề thô `Behance {id}` → meta từ HTML. */
  if (nenTang === "behance") {
    for (const it of items) {
      if (!it.urlCanonic) continue;
      if (laTieuDeThoBehance(it.tieuDeGoc) || !it.tieuDeGoc) {
        const tuSlug = tieuDeTuSlugUrlBehance(it.urlCanonic);
        if (tuSlug) it.tieuDeGoc = tuSlug;
      }
    }
    const thieu = items
      .map((it, i) => ({ it, i }))
      .filter(
        ({ it }) =>
          it.urlCanonic &&
          (!it.anhBiaUrl || laTieuDeThoBehance(it.tieuDeGoc) || !it.tieuDeGoc),
      );
    for (let i = 0; i < thieu.length; i += COVER_CONCURRENCY) {
      const chunk = thieu.slice(i, i + COVER_CONCURRENCY);
      const metas = await Promise.all(
        chunk.map(({ it }) => layBehanceMetaTuUrl(it.urlCanonic)),
      );
      for (let j = 0; j < chunk.length; j++) {
        const meta = metas[j];
        const idx = chunk[j].i;
        if (!meta) continue;
        if (!items[idx].anhBiaUrl && meta.coverUrl) {
          items[idx].anhBiaUrl = meta.coverUrl;
        }
        if (
          meta.title &&
          (!items[idx].tieuDeGoc || laTieuDeThoBehance(items[idx].tieuDeGoc))
        ) {
          items[idx].tieuDeGoc = meta.title;
        }
      }
    }
  }

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
