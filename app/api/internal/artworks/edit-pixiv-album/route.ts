import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { buildPixivAlbumBlocks } from "@/lib/autopilot/pixiv-album-blocks";
import { pixivIllustIdTuUrl } from "@/lib/autopilot/pixiv-assets";
import { blocksToHtml } from "@/lib/editor/sanitize";
import { chuanHoaBlocks } from "@/lib/editor/dang-bai-journey";
import type { Block } from "@/lib/editor/types";
import { xacThucBearerSecret } from "@/lib/noi-bo/xac-thuc-bearer";
import {
  createServiceRoleClient,
  hasServiceRoleEnv,
} from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/** Secret Runtime — cùng bearer với API đăng bài Autopilot. */
const ENV_SECRET = "CINS_NOI_BO_DANG_BAI_SECRET";

type BodySuaPixiv = {
  /** UUID `content_tac_pham.id` cần sửa (bắt buộc). */
  idTacPham?: string;
  /** URL Pixiv nguồn — bỏ trống thì tự trích từ block embed hiện có. */
  urlNguon?: string;
  /** Cho phép đăng strip cao (bỏ lọc anh_qua_dai). */
  choPhepAnhQuaDai?: boolean;
  /** Sửa cả bài đã là album (mặc định bỏ qua bài đã có ảnh). */
  ep?: boolean;
  /** Dry-run: fetch + ghép khối, không ghi DB. */
  chiKiemTra?: boolean;
};

type TacPhamRow = {
  id: string;
  id_nguoi_dung: string;
  slug: string | null;
  cover_id: string | null;
  noi_dung_blocks: unknown;
};

function badRequest(message: string, field?: string) {
  return NextResponse.json(
    { ok: false, error: message, field },
    { status: 400 },
  );
}

/** URL embed đầu tiên trong blocks (`config.url` / legacy `config.embedUrl`). */
function trichUrlEmbed(blocks: Block[]): string | null {
  for (const b of blocks) {
    if (b.loai !== "embed") continue;
    const cfg = b.config ?? {};
    const url =
      (typeof cfg.url === "string" && cfg.url.trim()) ||
      (typeof cfg.embedUrl === "string" && cfg.embedUrl.trim()) ||
      "";
    if (url) return url;
  }
  return null;
}

/**
 * POST /api/noi-bo/tac-pham/sua-pixiv-album
 *
 * Header: `Authorization: Bearer <CINS_NOI_BO_DANG_BAI_SECRET>`
 *
 * Sửa 1 bài Pixiv cũ (article + block embed «▶ URL») thành ALBUM ảnh:
 * fetch lại ajax Pixiv → upload CF → khối `imgs` → thay `noi_dung_blocks`,
 * cập nhật `cover_id`. Giữ nguyên `tieu_de` / `mo_ta` (đã có dòng «Nguồn:»).
 * Bài đã là album (có block `imgs`) → bỏ qua trừ khi `ep=true`.
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

  let body: BodySuaPixiv;
  try {
    body = (await request.json()) as BodySuaPixiv;
  } catch {
    return badRequest("JSON không hợp lệ.");
  }

  const idTacPham = body.idTacPham?.trim() || "";
  if (!idTacPham) {
    return badRequest("Thiếu idTacPham.", "idTacPham");
  }

  const admin = createServiceRoleClient();
  const { data: tacPham, error: readErr } = await admin
    .from("content_tac_pham")
    .select("id, id_nguoi_dung, slug, cover_id, noi_dung_blocks")
    .eq("id", idTacPham)
    .maybeSingle<TacPhamRow>();

  if (readErr) {
    return NextResponse.json(
      { ok: false, error: "Không đọc được tác phẩm." },
      { status: 500 },
    );
  }
  if (!tacPham) {
    return NextResponse.json(
      { ok: false, error: "Không tìm thấy tác phẩm.", field: "idTacPham" },
      { status: 404 },
    );
  }

  const blocksHienTai = chuanHoaBlocks(tacPham.noi_dung_blocks) ?? [];
  const coAnh = blocksHienTai.some((b) => b.loai === "imgs");
  if (coAnh && !body.ep) {
    return NextResponse.json(
      {
        ok: true,
        idTacPham,
        boQua: true,
        lyDo: "da_album",
        message: "Bài đã là album (có ảnh) — bỏ qua.",
      },
      { status: 200 },
    );
  }

  const urlNguon =
    body.urlNguon?.trim() || trichUrlEmbed(blocksHienTai) || "";
  if (!urlNguon || !pixivIllustIdTuUrl(urlNguon)) {
    return badRequest(
      "Không xác định được URL artwork Pixiv (/artworks/{id}).",
      "urlNguon",
    );
  }

  const album = await buildPixivAlbumBlocks({
    urlNguon,
    choPhepAnhQuaDai: Boolean(body.choPhepAnhQuaDai),
  });

  if (album && "code" in album) {
    return NextResponse.json(
      { ok: false, error: album.error, code: album.code, boQua: true },
      { status: 422 },
    );
  }
  if (!album || !album.blocks.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "Không lấy được ảnh Pixiv — giữ nguyên bài, thử lại sau.",
        code: "thieu_media",
        boQua: true,
      },
      { status: 422 },
    );
  }

  const blocksMoi = album.blocks;
  const coverMoi = album.coverId || tacPham.cover_id || null;
  const soAnh = blocksMoi.filter((b) => b.loai === "imgs").length;

  if (body.chiKiemTra) {
    return NextResponse.json(
      {
        ok: true,
        idTacPham,
        urlNguon,
        soAnh,
        coverId: coverMoi,
        chiKiemTra: true,
      },
      { status: 200 },
    );
  }

  const { error: upErr } = await admin
    .from("content_tac_pham")
    .update({
      noi_dung_blocks: blocksMoi,
      noi_dung_html: blocksToHtml(blocksMoi),
      cover_id: coverMoi,
    })
    .eq("id", idTacPham);

  if (upErr) {
    return NextResponse.json(
      { ok: false, error: `Không cập nhật được tác phẩm. (${upErr.message})` },
      { status: 500 },
    );
  }

  if (tacPham.slug) {
    /* Slug chủ để revalidate trang cá nhân. */
    const { data: chu } = await admin
      .from("user_nguoi_dung")
      .select("slug")
      .eq("id", tacPham.id_nguoi_dung)
      .maybeSingle<{ slug: string | null }>();
    if (chu?.slug) {
      revalidatePath(`/${chu.slug}`);
      revalidatePath(`/${chu.slug}/p/${tacPham.slug}`);
    }
  }
  revalidatePath("/");

  return NextResponse.json(
    { ok: true, idTacPham, urlNguon, soAnh, coverId: coverMoi },
    { status: 200 },
  );
}
