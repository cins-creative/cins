import { NextResponse } from "next/server";

import { layAnhArtstationTuUrl } from "@/lib/autopilot/artstation-assets";
import { layAnhBehanceTuUrl } from "@/lib/autopilot/behance-assets";
import { buildPixivAlbumBlocks } from "@/lib/autopilot/pixiv-album-blocks";
import { pixivImageFetchHeaders } from "@/lib/autopilot/pixiv-assets";
import { uploadCloudflareImageFromUrl } from "@/lib/cloudflare/upload-image-from-url";
import {
  chuanHoaBlocks,
  dangBaiJourneyChoUser,
} from "@/lib/editor/dang-bai-journey";
import {
  doanNenTangTuUrl,
  gopMoTaVoiDongNguon,
  taoDongGhiNguon,
  taoKhoiBaiAlbumNguon,
  taoKhoiBaiBehanceNguon,
  taoKhoiBaiNguon,
  type AnhAlbumNguon,
  type NenTangNguon,
} from "@/lib/editor/khoi-bai-nguon";
import type { Block, LoaiMoc, Visibility } from "@/lib/editor/types";
import { VALID_LOAI_MOC, VALID_VIS } from "@/lib/editor/types";
import { attachThamKhaoPersonalFilter } from "@/lib/filter/tham-khao-personal-filter";
import { laNickSeedChoPhep } from "@/lib/noi-bo/danh-sach-nick-seed";
import { xacThucBearerSecret } from "@/lib/noi-bo/xac-thuc-bearer";
import {
  createServiceRoleClient,
  hasServiceRoleEnv,
} from "@/lib/supabase/service-role";

export const runtime = "nodejs";

/** Secret Runtime — worker Autopilot gọi API này. */
const ENV_SECRET = "CINS_NOI_BO_DANG_BAI_SECRET";

type BodyDangBai = {
  /** Slug nick seeding (bắt buộc, phải trong allowlist). */
  slugChu?: string;
  tieuDe?: string;
  moTa?: string;
  /** URL Behance / ArtStation — bắt buộc; dùng làm embed + dedup sau. */
  urlNguon?: string;
  nenTang?: NenTangNguon;
  tenTacGiaNguon?: string;
  /** Ghi đè dòng attribution. */
  dongGhiNguon?: string;
  coverId?: string | null;
  /** URL ảnh bìa nguồn (RSS/OG ArtStation/Behance) — upload CF làm cover nếu chưa có coverId. */
  anhBiaUrl?: string | null;
  /**
   * Album ảnh nguồn đã bắt sẵn (extension quét trang gallery → `auto_muc.meta.anhUrls`).
   * Ưu tiên dùng trực tiếp (upload CF) thay vì fetch lại HTML — tránh Cloudflare chặn
   * (Behance) và lấy đủ nhiều ảnh thay vì chỉ 1 cover.
   */
  anhUrls?: string[];
  loaiMoc?: LoaiMoc;
  cheDoHienThi?: Visibility;
  thoiDiem?: string;
  /**
   * Thời điểm tạo (ISO datetime) — ghi đè mốc «N giờ trước». Autopilot truyền giá
   * trị rải rác để nick không cùng một mốc giờ. Chỉ nhận quá khứ (≤ now).
   */
  taoLuc?: string;
  /** Nếu bỏ trống → tự ghép body + embed + dòng ghi nguồn. */
  blocks?: Block[];
  /** Dry-run: validate + ghép khối, không ghi DB. */
  chiKiemTra?: boolean;
  /**
   * Cho phép đăng Pixiv strip cao (bỏ lọc anh_qua_dai).
   * Chỉ dùng qua bearer secret — cron thường không set.
   */
  choPhepAnhQuaDai?: boolean;
};

function badRequest(message: string, field?: string) {
  return NextResponse.json(
    { ok: false, error: message, field },
    { status: 400 },
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * POST /api/noi-bo/tac-pham/dang
 *
 * Header: `Authorization: Bearer <CINS_NOI_BO_DANG_BAI_SECRET>`
 *
 * Contract Phase 0 — đăng bài Journey curator (link/embed nguồn ngoài).
 * Mặc định `cheDoHienThi: "feature"` (Nổi bật) cho nick seeding.
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

  let body: BodyDangBai;
  try {
    body = (await request.json()) as BodyDangBai;
  } catch {
    return badRequest("JSON không hợp lệ.");
  }

  const slugChu = body.slugChu?.trim().toLowerCase() || "";
  if (!slugChu) {
    return badRequest("Thiếu slugChu.", "slugChu");
  }
  if (!laNickSeedChoPhep(slugChu)) {
    return NextResponse.json(
      {
        ok: false,
        error: "slugChu không nằm trong danh sách nick seeding.",
        field: "slugChu",
      },
      { status: 403 },
    );
  }

  const urlNguon = body.urlNguon?.trim() || "";
  if (!urlNguon || !isHttpUrl(urlNguon)) {
    return badRequest("urlNguon phải là URL http(s) hợp lệ.", "urlNguon");
  }

  let tieuDe = typeof body.tieuDe === "string" ? body.tieuDe.trim() : "";
  let moTa = typeof body.moTa === "string" ? body.moTa : "";

  const nenTang: NenTangNguon =
    body.nenTang === "artstation" ||
    body.nenTang === "behance" ||
    body.nenTang === "pixiv" ||
    body.nenTang === "khac"
      ? body.nenTang
      : doanNenTangTuUrl(urlNguon);

  const loaiMoc = body.loaiMoc;
  if (loaiMoc != null && !VALID_LOAI_MOC.includes(loaiMoc)) {
    return badRequest("loaiMoc không hợp lệ.", "loaiMoc");
  }
  const cheDoHienThi = body.cheDoHienThi;
  if (cheDoHienThi != null && !VALID_VIS.includes(cheDoHienThi)) {
    return badRequest("cheDoHienThi không hợp lệ.", "cheDoHienThi");
  }

  let blocks: Block[] = [];
  let coverId = body.coverId?.trim() || null;
  let dungAlbumAnh = false;

  const laNenNgoai =
    nenTang === "artstation" || nenTang === "behance" || nenTang === "pixiv";
  const clientCungCapBlocks =
    Array.isArray(body.blocks) && body.blocks.length > 0;

  if (clientCungCapBlocks) {
    const normalized = chuanHoaBlocks(body.blocks!);
    if (!normalized || normalized.length === 0) {
      return badRequest("blocks không hợp lệ.", "blocks");
    }
    blocks = normalized;
  } else if (laNenNgoai) {
    /* ArtStation / Behance / Pixiv: kéo album ảnh → khối imgs. */
    const anhUrlsExt = Array.isArray(body.anhUrls)
      ? body.anhUrls
          .map((u) => String(u || "").trim())
          .filter((u) => isHttpUrl(u))
          .slice(0, 12)
      : [];

    let album:
      | { blocks: Block[]; coverId: string | null }
      | { code: "anh_qua_dai" | "r18" | "ugoira"; error: string }
      | { blocks: Block[]; coverId: string | null; tieuDeGoiY?: string | null; moTaGoiY?: string | null }
      | null = null;

    if (nenTang === "behance") {
      /*
       * Behance: FETCH đầy đủ album trước (khớp preview — nhiều ảnh + text/video
       * theo modules). `anhUrls` extension chỉ là FALLBACK khi fetch bị chặn
       * (Cloudflare) — tránh trường hợp published 1 ảnh trong khi preview đủ ảnh.
       */
      const fetched = await buildBehanceAlbumBlocks({
        urlNguon,
        tenTacGiaNguon: body.tenTacGiaNguon,
        dongGhiNguon: body.dongGhiNguon,
      });
      if (fetched && "code" in fetched) {
        album = fetched; // anh_qua_dai → 422 bên dưới (không fallback).
      } else if (fetched && "blocks" in fetched) {
        album = fetched;
      } else if (anhUrlsExt.length) {
        album = await buildAlbumBlocksFromUrls({
          anhUrls: anhUrlsExt,
          urlNguon,
          nenTang,
          tenTacGiaNguon: body.tenTacGiaNguon,
          dongGhiNguon: body.dongGhiNguon,
        });
      }
    } else {
      /* ArtStation / Pixiv: ưu tiên album extension bắt sẵn, rồi fetch. */
      album = anhUrlsExt.length
        ? await buildAlbumBlocksFromUrls({
            anhUrls: anhUrlsExt,
            urlNguon,
            nenTang,
            tenTacGiaNguon: body.tenTacGiaNguon,
            dongGhiNguon: body.dongGhiNguon,
          })
        : null;

      if (!album) {
        album =
          nenTang === "artstation"
            ? await buildArtstationAlbumBlocks({
                urlNguon,
                tenTacGiaNguon: body.tenTacGiaNguon,
                dongGhiNguon: body.dongGhiNguon,
              })
            : await buildPixivAlbumBlocks({
                urlNguon,
                tenTacGiaNguon: body.tenTacGiaNguon,
                dongGhiNguon: body.dongGhiNguon,
                choPhepAnhQuaDai: Boolean(body.choPhepAnhQuaDai),
              });
      }
    }

    if (
      album &&
      "code" in album &&
      (album.code === "anh_qua_dai" ||
        album.code === "r18" ||
        album.code === "ugoira")
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: album.error,
          code: album.code,
          field: "urlNguon",
        },
        { status: 422 },
      );
    }
    if (album && "blocks" in album) {
      blocks = album.blocks;
      if (!coverId && album.coverId) coverId = album.coverId;
      dungAlbumAnh = true;
      const tieuDeAlbum =
        "tieuDeGoiY" in album && typeof album.tieuDeGoiY === "string"
          ? album.tieuDeGoiY.trim()
          : "";
      if (!tieuDe && tieuDeAlbum) tieuDe = tieuDeAlbum;
      const moTaAlbum =
        "moTaGoiY" in album && typeof album.moTaGoiY === "string"
          ? album.moTaGoiY.trim()
          : "";
      if (moTaAlbum && !moTa.trim()) moTa = moTaAlbum;
    }
    /* Nền ngoài KHÔNG có ảnh album → không tạo embed link «▶ …» (chỉ dành cho
       video thật). Rơi xuống cover-only bên dưới, hoặc guard thiếu media. */
  } else {
    /* Nguồn «khác» — embed link hợp lệ (bài viết/video ngoài). */
    blocks = taoKhoiBaiNguon({
      moTa,
      urlNguon,
      nenTang,
      tenTacGiaNguon: body.tenTacGiaNguon,
      dongGhiNguon: body.dongGhiNguon,
    });
  }

  /* Cover nguồn → CF Images (khi chưa có coverId từ client / album). */
  if (!coverId && typeof body.anhBiaUrl === "string") {
    const anhBia = body.anhBiaUrl.trim();
    if (isHttpUrl(anhBia)) {
      try {
        const uploaded = await uploadCloudflareImageFromUrl(
          anhBia,
          nenTang === "pixiv" ? { headers: pixivImageFetchHeaders() } : undefined,
        );
        if (uploaded?.imageId) coverId = uploaded.imageId;
      } catch {
        /* thiếu cover — nền chữ màu vẫn ổn */
      }
    }
  }

  /* Nền ngoài không lấy được album nhưng có cover → 1 khối ảnh (không embed link). */
  if (laNenNgoai && !dungAlbumAnh && blocks.length === 0 && coverId) {
    blocks = taoKhoiBaiAlbumNguon({
      anh: [{ seed: coverId }],
      moTa: null,
      urlNguon,
      nenTang,
      tenTacGiaNguon: body.tenTacGiaNguon,
      dongGhiNguon: body.dongGhiNguon,
    });
    dungAlbumAnh = true;
  }

  /*
   * Guard thiếu media — nền ngoài (ArtStation/Behance/Pixiv) mà fetch ảnh thất
   * bại và không có cover → KHÔNG đăng thẻ gradient rỗng. Trả code để worker giữ
   * bản thảo `san_sang` thử lại lần sau. Bỏ qua khi client tự cấp `blocks`.
   */
  const coAnhTrongBlocks = blocks.some((b) => b.loai === "imgs");
  if (laNenNgoai && !clientCungCapBlocks && !coAnhTrongBlocks && !coverId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Không lấy được ảnh tác phẩm và không có ảnh bìa — bỏ qua để thử lại.",
        code: "thieu_media",
        field: "urlNguon",
      },
      { status: 422 },
    );
  }

  /* Dòng Nguồn gộp vào mô tả ngắn — không tách block body riêng. */
  moTa = gopMoTaVoiDongNguon(
    moTa,
    taoDongGhiNguon({
      urlNguon,
      nenTang,
      tenTacGiaNguon: body.tenTacGiaNguon,
      dongGhiNguon: body.dongGhiNguon,
    }),
  );

  const admin = createServiceRoleClient();
  const { data: profile, error: profileErr } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, trang_thai_tai_khoan")
    .eq("slug", slugChu)
    .maybeSingle<{
      id: string;
      slug: string;
      trang_thai_tai_khoan: string | null;
    }>();

  if (profileErr) {
    return NextResponse.json(
      { ok: false, error: "Không đọc được hồ sơ nick." },
      { status: 500 },
    );
  }
  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "Không tìm thấy nick.", field: "slugChu" },
      { status: 404 },
    );
  }
  if (
    profile.trang_thai_tai_khoan &&
    profile.trang_thai_tai_khoan !== "dang_hoat_dong"
  ) {
    return NextResponse.json(
      { ok: false, error: "Nick không ở trạng thái hoạt động.", field: "slugChu" },
      { status: 403 },
    );
  }

  /* Nick seeding: mặc định Feature (Nổi bật Journey / Gallery) — có thể ghi đè body. */
  const result = await dangBaiJourneyChoUser({
    idNguoiDung: profile.id,
    slugChu: profile.slug,
    tieuDe,
    moTa,
    coverId,
    loaiMoc: loaiMoc ?? "du_an",
    cheDoHienThi: cheDoHienThi ?? "feature",
    thoiDiem: body.thoiDiem,
    taoLuc: typeof body.taoLuc === "string" ? body.taoLuc : undefined,
    blocks,
    chiKiemTra: Boolean(body.chiKiemTra),
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, field: result.field },
      { status: 422 },
    );
  }

  /* Nick seeding: mọi bài gắn nhãn riêng «Tham khảo». */
  if (!body.chiKiemTra && result.idCotMoc) {
    const gan = await attachThamKhaoPersonalFilter({
      milestoneId: result.idCotMoc,
      userId: profile.id,
    });
    if (!gan.ok) {
      console.warn(
        `[noi-bo/tac-pham/dang] gắn Tham khảo thất bại @${profile.slug}:`,
        gan.error,
      );
    }
  }

  return NextResponse.json(
    {
      ok: true,
      slugChu: profile.slug,
      slugBai: result.slugBai,
      idCotMoc: result.idCotMoc,
      idTacPham: result.idTacPham,
      duongDan: result.duongDan,
      nenTang,
      urlNguon,
      albumAnh: dungAlbumAnh,
      chiKiemTra: Boolean(body.chiKiemTra),
    },
    { status: body.chiKiemTra ? 200 : 201 },
  );
}

/**
 * Album từ danh sách URL ảnh đã bắt sẵn (extension quét gallery) → upload CF →
 * khối imgs. Không fetch lại HTML nguồn (tránh Cloudflare chặn Behance) và lấy
 * đủ nhiều ảnh thay vì 1 cover. Fail (không upload được ảnh nào) → null.
 */
async function buildAlbumBlocksFromUrls(params: {
  anhUrls: string[];
  urlNguon: string;
  nenTang: NenTangNguon;
  tenTacGiaNguon?: string | null;
  dongGhiNguon?: string | null;
}): Promise<{ blocks: Block[]; coverId: string | null } | null> {
  const anh: AnhAlbumNguon[] = [];
  let coverId: string | null = null;
  const opts =
    params.nenTang === "pixiv"
      ? { headers: pixivImageFetchHeaders() }
      : undefined;

  for (const url of params.anhUrls) {
    if (anh.length >= 12) break;
    if (!isHttpUrl(url)) continue;
    try {
      const uploaded = await uploadCloudflareImageFromUrl(url, opts);
      if (!uploaded?.imageId) continue;
      anh.push({ seed: uploaded.imageId });
      if (!coverId) coverId = uploaded.imageId;
    } catch {
      /* bỏ ảnh lỗi, tiếp tục */
    }
  }

  if (!anh.length) return null;

  const blocks = taoKhoiBaiAlbumNguon({
    anh,
    moTa: null,
    urlNguon: params.urlNguon,
    nenTang: params.nenTang,
    tenTacGiaNguon: params.tenTacGiaNguon,
    dongGhiNguon: params.dongGhiNguon,
  });

  return { blocks, coverId };
}

/**
 * Fetch JSON ArtStation → upload CF → khối album imgs.
 * Fail → null (caller fallback embed link).
 */
async function buildArtstationAlbumBlocks(params: {
  urlNguon: string;
  tenTacGiaNguon?: string | null;
  dongGhiNguon?: string | null;
}): Promise<{ blocks: Block[]; coverId: string | null } | null> {
  const fetched = await layAnhArtstationTuUrl(params.urlNguon);
  if (!fetched.ok) return null;

  const anh: AnhAlbumNguon[] = [];
  let coverId: string | null = null;

  for (const item of fetched.data.anh) {
    try {
      const uploaded = await uploadCloudflareImageFromUrl(item.imageUrl);
      if (!uploaded?.imageId) continue;
      anh.push({
        seed: uploaded.imageId,
        width: item.width,
        height: item.height,
      });
      if (!coverId) coverId = uploaded.imageId;
    } catch {
      /* bỏ ảnh lỗi, tiếp tục */
    }
  }

  if (!anh.length) return null;

  /* Caption giữ ở `mo_ta` bài — khối chỉ imgs + dòng ghi nguồn. */
  const blocks = taoKhoiBaiAlbumNguon({
    anh,
    moTa: null,
    urlNguon: params.urlNguon,
    nenTang: "artstation",
    tenTacGiaNguon: params.tenTacGiaNguon,
    dongGhiNguon: params.dongGhiNguon,
  });

  return { blocks, coverId };
}

/**
 * Fetch HTML Behance → chữ + ảnh + video embed theo modules → upload CF → stack.
 * Fail → null (caller fallback embed link).
 */
async function buildBehanceAlbumBlocks(params: {
  urlNguon: string;
  tenTacGiaNguon?: string | null;
  dongGhiNguon?: string | null;
}): Promise<
  | { blocks: Block[]; coverId: string | null; tieuDeGoiY?: string | null }
  | { code: "anh_qua_dai"; error: string }
  | null
> {
  const fetched = await layAnhBehanceTuUrl(params.urlNguon);
  if (!fetched.ok) {
    if (fetched.code === "anh_qua_dai") {
      return { code: fetched.code, error: fetched.error };
    }
    return null;
  }

  const seedByUrl = new Map<string, AnhAlbumNguon>();
  let coverId: string | null = null;

  for (const item of fetched.data.anh) {
    let cfId: string | null = null;
    try {
      const uploaded = await uploadCloudflareImageFromUrl(item.imageUrl);
      if (uploaded?.imageId) cfId = uploaded.imageId;
    } catch {
      /* upload lỗi → fallback URL nguồn bên dưới */
    }
    /*
     * CF upload fail (GIF >10MB, timeout…) → KHÔNG bỏ ảnh: dùng URL nguồn làm
     * seed (hotlink) để bài đăng đủ ảnh như preview. Renderer hỗ trợ seed URL.
     */
    const mapped: AnhAlbumNguon = {
      seed: cfId || item.imageUrl,
      width: item.width,
      height: item.height,
    };
    seedByUrl.set(item.imageUrl, mapped);
    if (!coverId && cfId) coverId = cfId;
  }
  /* Chưa có cover CF (mọi ảnh hotlink) → dùng ảnh đầu làm cover. */
  if (!coverId && seedByUrl.size) {
    coverId = [...seedByUrl.values()][0]!.seed;
  }

  let modules = fetched.data.modules
    .map((mod) => {
      if (mod.kind === "text") return mod;
      if (mod.kind === "video") return mod;
      const mapped = seedByUrl.get(mod.anh.imageUrl);
      if (!mapped) return null;
      return {
        kind: "image" as const,
        seed: mapped.seed,
        width: mapped.width,
        height: mapped.height,
      };
    })
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const coAnh = modules.some((m) => m.kind === "image");

  /* Ảnh upload được nhưng map module mất — ghép album seed + video còn lại. */
  if (!coAnh && seedByUrl.size) {
    const anhMods = [...seedByUrl.values()].map((a) => ({
      kind: "image" as const,
      seed: a.seed,
      width: a.width,
      height: a.height,
    }));
    const videoMods = modules.filter(
      (m): m is { kind: "video"; url: string } => m.kind === "video",
    );
    const textMods = modules.filter(
      (m): m is { kind: "text"; text: string } => m.kind === "text",
    );
    modules = [...textMods, ...anhMods, ...videoMods];
  }

  if (
    !modules.some((m) => m.kind === "image") &&
    !modules.some((m) => m.kind === "video")
  ) {
    return null;
  }

  return {
    blocks: taoKhoiBaiBehanceNguon({
      modules,
      urlNguon: params.urlNguon,
      tenTacGiaNguon: params.tenTacGiaNguon,
      dongGhiNguon: params.dongGhiNguon,
    }),
    coverId,
    tieuDeGoiY: fetched.data.title,
  };
}
