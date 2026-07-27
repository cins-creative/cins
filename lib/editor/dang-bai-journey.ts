/**
 * Đăng bài Journey cá nhân không qua session UI —
 * dùng cho API nội bộ Autopilot (service role + nick seed).
 *
 * Không hỗ trợ đường cộng đồng / co-author / visibility custom (Phase 0).
 */

import "server-only";

import { revalidatePath } from "next/cache";

import { uniquePostSlugForUser, slugifyPostTitle } from "@/lib/editor/post-slug";
import { blocksToHtml } from "@/lib/editor/sanitize";
import {
  VALID_LOAI_MOC,
  VALID_VIS,
  type Block,
  type BlockType,
  type LoaiMoc,
  type Visibility,
} from "@/lib/editor/types";
import { ensureEmbedAutoCover } from "@/lib/editor/ensure-embed-auto-cover";
import { DEFAULT_ARTICLE_POST_TITLE } from "@/lib/journey/post-media";
import {
  POST_TITLE_MAX,
  validateMoTaLength,
  validatePostContentForPublish,
} from "@/lib/journey/post-content-kind";
import { insertDiemFeedChoBaiMoi } from "@/lib/cins/feed-scoring-write";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_BLOCKS = 200;

const VALID_BLOCK_TYPES: ReadonlyArray<BlockType> = [
  "h2",
  "h3",
  "body",
  "quote",
  "imgs",
  "embed",
  "palette",
  "divider",
  "spacer",
];

export type DangBaiJourneyInput = {
  /** UUID `user_nguoi_dung.id` */
  idNguoiDung: string;
  slugChu: string;
  tieuDe: string;
  moTa: string;
  coverId?: string | null;
  cheDoHienThi?: Visibility;
  loaiMoc?: LoaiMoc;
  thoiDiem?: string;
  /**
   * Thời điểm tạo (ISO datetime) — ghi đè `content_cot_moc.tao_luc` (mốc «N giờ trước»).
   * Dùng cho Autopilot rải rác giờ đăng để nick không cùng một mốc thời gian.
   * Chỉ nhận quá khứ (≤ now, ≤ 30 ngày trước); bỏ trống → DB default now().
   */
  taoLuc?: string;
  blocks: Block[];
};

export type DangBaiJourneyResult =
  | {
      ok: true;
      slugBai: string;
      idCotMoc: string;
      idTacPham: string;
      duongDan: string;
    }
  | { ok: false; error: string; field?: string };

export function chuanHoaBlocks(raw: unknown): Block[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Block[] = [];
  let i = 0;
  for (const b of raw) {
    if (!b || typeof b !== "object") continue;
    const item = b as Record<string, unknown>;
    const loai = item.loai as BlockType | undefined;
    if (!loai || !VALID_BLOCK_TYPES.includes(loai)) continue;
    const config =
      item.config && typeof item.config === "object"
        ? (item.config as Record<string, unknown>)
        : {};
    out.push({
      id: String(item.id || `b-${i}`),
      loai,
      thu_tu: i,
      config,
    });
    i += 1;
  }
  return out;
}

function isValidIsoDate(s: string | undefined): s is string {
  if (!s) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Chuẩn hoá `taoLuc` override: ISO datetime hợp lệ, kẹp về không vượt quá hiện
 * tại và không cũ quá 30 ngày. Không hợp lệ → null (dùng DB default now()).
 */
function normalizeTaoLuc(raw: string | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return null;
  const now = Date.now();
  const clamped = Math.min(t, now);
  if (clamped < now - 30 * 24 * 60 * 60 * 1000) return null;
  return new Date(clamped).toISOString();
}

function dbErrorMessage(error: unknown): string {
  if (!error) return "Lỗi không xác định khi lưu bài viết.";
  const msg =
    (error as { message?: string }).message ||
    (error as { hint?: string }).hint ||
    "";
  if (/duplicate key/i.test(msg)) {
    return "Trùng dữ liệu — thử lại với tiêu đề khác.";
  }
  return `Không lưu được bài viết. (${msg.slice(0, 200)})`;
}

/** Validate + (tuỳ chọn) ghi DB. `chiKiemTra` = dry-run. */
export async function dangBaiJourneyChoUser(
  input: DangBaiJourneyInput & { chiKiemTra?: boolean },
): Promise<DangBaiJourneyResult> {
  const tieuDe = (input.tieuDe || "").trim() || DEFAULT_ARTICLE_POST_TITLE;
  if (tieuDe.length > POST_TITLE_MAX) {
    return {
      ok: false,
      error: `Tiêu đề tối đa ${POST_TITLE_MAX} ký tự.`,
      field: "tieuDe",
    };
  }

  const moTaCheck = validateMoTaLength(input.moTa);
  if (!moTaCheck.ok) {
    return {
      ok: false,
      error: moTaCheck.error,
      field: moTaCheck.field,
    };
  }
  const moTa = moTaCheck.trimmed;

  if (!Array.isArray(input.blocks) || input.blocks.length === 0) {
    return {
      ok: false,
      error: "Bài viết chưa có nội dung. Thêm ít nhất một block.",
      field: "blocks",
    };
  }
  if (input.blocks.length > MAX_BLOCKS) {
    return {
      ok: false,
      error: `Bài viết quá dài (tối đa ${MAX_BLOCKS} block).`,
      field: "blocks",
    };
  }

  const cheDo: Visibility = input.cheDoHienThi ?? "public";
  if (!VALID_VIS.includes(cheDo)) {
    return {
      ok: false,
      error: "Quyền hiển thị không hợp lệ.",
      field: "cheDoHienThi",
    };
  }

  const loaiMoc: LoaiMoc = input.loaiMoc ?? "du_an";
  if (!VALID_LOAI_MOC.includes(loaiMoc)) {
    return {
      ok: false,
      error: "Loại cột mốc không hợp lệ.",
      field: "loaiMoc",
    };
  }

  const thoiDiem = isValidIsoDate(input.thoiDiem)
    ? input.thoiDiem
    : todayIso();

  const taoLucOverride = normalizeTaoLuc(input.taoLuc);

  const normalized = chuanHoaBlocks(input.blocks);
  if (!normalized || normalized.length === 0) {
    return {
      ok: false,
      error: "Một số block không hợp lệ.",
      field: "blocks",
    };
  }

  let publishBlocks = normalized;
  let coverId = input.coverId?.trim() || null;
  try {
    const autoCover = await ensureEmbedAutoCover({
      coverId,
      blocks: publishBlocks,
    });
    publishBlocks = autoCover.blocks;
    coverId = autoCover.coverId;
  } catch {
    /* best-effort */
  }

  const contentCheck = validatePostContentForPublish({
    moTa,
    coverId,
    tieuDe,
    blocks: publishBlocks,
  });
  if (!contentCheck.ok) {
    return {
      ok: false,
      error: contentCheck.error,
      field: contentCheck.field,
    };
  }
  const moTaFinal = contentCheck.resolution.effectiveMoTa;

  if (input.chiKiemTra) {
    return {
      ok: true,
      slugBai: slugifyPostTitle(tieuDe) || "bai-viet",
      idCotMoc: "chi-kiem-tra",
      idTacPham: "chi-kiem-tra",
      duongDan: `/${input.slugChu}/p/${slugifyPostTitle(tieuDe) || "bai-viet"}`,
    };
  }

  const baseSlug = slugifyPostTitle(tieuDe);
  let slugBai: string;
  try {
    slugBai = await uniquePostSlugForUser({
      userId: input.idNguoiDung,
      baseSlug,
    });
  } catch (e) {
    return { ok: false, error: dbErrorMessage(e) };
  }

  const noiDungHtml = blocksToHtml(publishBlocks);
  const admin = createServiceRoleClient();

  const cotMocInsert: Record<string, unknown> = {
    id_nguoi_dung: input.idNguoiDung,
    loai_moc: loaiMoc,
    nguon_goc: "tu_tao",
    tieu_de: tieuDe,
    mo_ta: moTaFinal || null,
    thoi_diem: thoiDiem,
    che_do_hien_thi: cheDo,
  };
  if (taoLucOverride) cotMocInsert.tao_luc = taoLucOverride;

  const { data: cotMoc, error: cotMocErr } = await admin
    .from("content_cot_moc")
    .insert(cotMocInsert)
    .select("id")
    .single<{ id: string }>();

  if (cotMocErr || !cotMoc) {
    return { ok: false, error: dbErrorMessage(cotMocErr) };
  }

  const { data: tacPham, error: tacPhamErr } = await admin
    .from("content_tac_pham")
    .insert({
      id_nguoi_dung: input.idNguoiDung,
      loai_tac_pham: "bai_viet",
      tieu_de: tieuDe,
      mo_ta: moTaFinal || null,
      cover_id: coverId,
      che_do_hien_thi: cheDo,
      slug: slugBai,
      noi_dung_blocks: publishBlocks,
      noi_dung_html: noiDungHtml,
      meta_title: tieuDe.slice(0, 120),
      meta_description: moTaFinal ? moTaFinal.slice(0, 200) : null,
    })
    .select("id")
    .single<{ id: string }>();

  if (tacPhamErr || !tacPham) {
    await admin.from("content_cot_moc").delete().eq("id", cotMoc.id);
    return { ok: false, error: dbErrorMessage(tacPhamErr) };
  }

  const { error: linkErr } = await admin
    .from("content_tac_pham_thuoc_moc")
    .insert({
      id_tac_pham: tacPham.id,
      id_cot_moc: cotMoc.id,
      thu_tu: 0,
    });

  if (linkErr) {
    await admin.from("content_tac_pham").delete().eq("id", tacPham.id);
    await admin.from("content_cot_moc").delete().eq("id", cotMoc.id);
    return { ok: false, error: dbErrorMessage(linkErr) };
  }

  await insertDiemFeedChoBaiMoi({
    loai: "cot_moc",
    id: cotMoc.id,
    coverId,
    moTa: moTaFinal || null,
    blocks: publishBlocks,
    hasTag: false,
  });

  revalidatePath(`/${input.slugChu}`);
  revalidatePath("/");
  revalidatePath("/luoi");

  return {
    ok: true,
    slugBai,
    idCotMoc: cotMoc.id,
    idTacPham: tacPham.id,
    duongDan: `/${input.slugChu}/p/${slugBai}`,
  };
}
