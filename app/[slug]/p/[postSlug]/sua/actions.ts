"use server";

import { revalidatePath } from "next/cache";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { blocksToHtml, deriveMoTaFallback } from "@/lib/editor/sanitize";
import {
  VALID_LOAI_MOC,
  VALID_VIS,
  type Block,
  type BlockType,
  type LoaiMoc,
  type Visibility,
} from "@/lib/editor/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ Server Action: updatePost                                        ║
   ║                                                                  ║
   ║ Update song song `content_tac_pham` (slug giữ nguyên, không      ║
   ║ regen) + `content_cot_moc` (mirror tieu_de/mo_ta/visibility).    ║
   ║                                                                  ║
   ║ Auth: owner-only — kiểm tra `id_nguoi_dung` của cả 2 row khớp    ║
   ║ session profile id.                                              ║
   ║                                                                  ║
   ║ Không tạo cot_moc mới (giữ cùng id_cot_moc để Journey không bị   ║
   ║ duplicate). Slug bài viết KHÔNG đổi để URL cũ vẫn truy cập.      ║
   ╚══════════════════════════════════════════════════════════════════╝ */

export type UpdatePostInput = {
  ownerSlug: string;
  tacPhamId: string;
  cotMocId: string;
  tieuDe: string;
  moTa: string;
  coverSeed: string | null;
  tags: string[];
  visibility: Visibility;
  loaiMoc: LoaiMoc;
  thoiDiem: string;
  blocks: Block[];
};

export type UpdatePostResult =
  | { ok: true; tacPhamId: string; cotMocId: string }
  | { ok: false; error: string; field?: string };

const MAX_TITLE = 200;
const MAX_MOTA = 280;
const MAX_BLOCKS = 200;

export async function updatePost(
  input: UpdatePostInput,
): Promise<UpdatePostResult> {
  /* 1. Session check. */
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, error: "Bạn cần đăng nhập để chỉnh sửa bài viết." };
  }
  if (session.profile.slug !== input.ownerSlug) {
    return { ok: false, error: "Bạn không có quyền sửa bài của user khác." };
  }

  /* 2. Validate. */
  const tieuDe = (input.tieuDe || "").trim();
  if (!tieuDe) {
    return { ok: false, error: "Cần nhập tiêu đề.", field: "tieuDe" };
  }
  if (tieuDe.length > MAX_TITLE) {
    return {
      ok: false,
      error: `Tiêu đề tối đa ${MAX_TITLE} ký tự.`,
      field: "tieuDe",
    };
  }
  const moTa = (input.moTa || "").trim().slice(0, MAX_MOTA);

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

  if (!VALID_VIS.includes(input.visibility)) {
    return {
      ok: false,
      error: "Quyền hiển thị không hợp lệ.",
      field: "visibility",
    };
  }
  if (!VALID_LOAI_MOC.includes(input.loaiMoc)) {
    return { ok: false, error: "Loại cột mốc không hợp lệ.", field: "loaiMoc" };
  }

  const normalized = normalizeBlocks(input.blocks);
  if (!normalized) {
    return {
      ok: false,
      error: "Một số block không hợp lệ. Vui lòng kiểm tra lại.",
      field: "blocks",
    };
  }

  /* 3. Re-render HTML + derive mo_ta nếu user clear. */
  const noiDungHtml = blocksToHtml(normalized);
  const moTaFinal = moTa || deriveMoTaFallback(normalized);

  /* 4. Verify ownership trước khi update (tránh PII leak). */
  const admin = createServiceRoleClient();

  const { data: tpRow, error: tpFetchErr } = await admin
    .from("content_tac_pham")
    .select("id, id_nguoi_dung")
    .eq("id", input.tacPhamId)
    .maybeSingle<{ id: string; id_nguoi_dung: string }>();

  if (tpFetchErr || !tpRow) {
    return { ok: false, error: "Không tìm thấy bài viết." };
  }
  if (tpRow.id_nguoi_dung !== session.profile.id) {
    return { ok: false, error: "Bạn không có quyền sửa bài viết này." };
  }

  const { data: cmRow, error: cmFetchErr } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung")
    .eq("id", input.cotMocId)
    .maybeSingle<{ id: string; id_nguoi_dung: string }>();

  if (cmFetchErr || !cmRow) {
    return { ok: false, error: "Không tìm thấy cột mốc liên kết." };
  }
  if (cmRow.id_nguoi_dung !== session.profile.id) {
    return { ok: false, error: "Bạn không có quyền sửa cột mốc này." };
  }

  /* 5. UPDATE content_tac_pham (giữ slug). */
  const { error: tpUpdErr } = await admin
    .from("content_tac_pham")
    .update({
      tieu_de: tieuDe,
      mo_ta: moTaFinal || null,
      cover_id: input.coverSeed || null,
      che_do_hien_thi: input.visibility,
      noi_dung_blocks: normalized,
      noi_dung_html: noiDungHtml,
      meta_title: tieuDe.slice(0, 120),
      meta_description: moTaFinal ? moTaFinal.slice(0, 200) : null,
    })
    .eq("id", input.tacPhamId);

  if (tpUpdErr) {
    return { ok: false, error: dbErrorMessage(tpUpdErr) };
  }

  /* 6. UPDATE content_cot_moc — mirror metadata. */
  const { error: cmUpdErr } = await admin
    .from("content_cot_moc")
    .update({
      tieu_de: tieuDe,
      mo_ta: moTaFinal || null,
      che_do_hien_thi: input.visibility,
      loai_moc: input.loaiMoc,
      thoi_diem: input.thoiDiem,
    })
    .eq("id", input.cotMocId);

  if (cmUpdErr) {
    /* Tac_pham đã update nhưng cot_moc thất bại — best-effort log,
       Journey vẫn render đúng từ tac_pham mirror. */
    return { ok: false, error: dbErrorMessage(cmUpdErr) };
  }

  /* 7. Revalidate journey. */
  revalidatePath(`/${session.profile.slug}/journey`);

  return { ok: true, tacPhamId: input.tacPhamId, cotMocId: input.cotMocId };
}

/* ─── Helpers (clone từ /new/actions.ts, giữ chung schema) ──────── */

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

function normalizeBlocks(raw: unknown): Block[] | null {
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

function dbErrorMessage(error: unknown): string {
  if (!error) return "Lỗi không xác định khi lưu bài viết.";
  const msg =
    (error as { message?: string }).message ||
    (error as { hint?: string }).hint ||
    "";
  if (/violates row-level security/i.test(msg)) {
    return "Tài khoản không có quyền sửa bài. Vui lòng đăng nhập lại.";
  }
  if (/invalid input value for enum/i.test(msg)) {
    return "Giá trị enum không hợp lệ. Vui lòng tải lại trang.";
  }
  return `Không lưu được thay đổi. (${msg.slice(0, 200)})`;
}
