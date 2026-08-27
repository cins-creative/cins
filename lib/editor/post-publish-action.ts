"use server";

/**
 * Server Action publish bài viết — canonical path (client import từ đây,
 * tránh lệch action id khi EditorView lazy-load / HMR Turbopack).
 */

import { revalidatePath } from "next/cache";

import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import { resolveActingOwner } from "@/lib/admin/seeding-nick";
import type { ArticleTagRef } from "@/lib/editor/article-tag";
import { uniquePostSlugForUser, slugifyPostTitle } from "@/lib/editor/post-slug";
import { blocksToHtml } from "@/lib/editor/sanitize";
import { sanitizeTableBlockConfig } from "@/lib/editor/table-block";
import {
  VALID_LOAI_MOC,
  VALID_VIS,
  type Block,
  type BlockType,
  type LoaiMoc,
  type Visibility,
} from "@/lib/editor/types";
import { attachCongDongPersonalFilter } from "@/lib/filter/cong-dong-personal-filter";
import { syncCongDongPostFromPublish } from "@/lib/cong-dong/sync-from-publish";
import { setMilestonePersonalFilters } from "@/lib/filter/gan";
import { syncCoAuthorsFromEditor } from "@/lib/social/co-author";
import type { CoAuthorDraft } from "@/lib/social/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { buildMilestoneItemForCotMoc } from "@/lib/journey/milestones-fetch";
import type { MilestoneItem } from "@/components/journey/milestone-types";
import { revalidateTaggedArticlePages } from "@/lib/tag/revalidate-tag-pages";
import { DEFAULT_ARTICLE_POST_TITLE } from "@/lib/journey/post-media";
import {
  POST_TITLE_MAX,
  validatePostContentForPublish,
  validateMoTaLength,
} from "@/lib/journey/post-content-kind";
import { insertDiemFeedChoBaiMoi } from "@/lib/cins/feed-scoring-write";
import { ensureEmbedAutoCover } from "@/lib/editor/ensure-embed-auto-cover";
import {
  clearVisibilityNgoaiLe,
  isVisibilityNgoaiLeLoai,
  replaceVisibilityNgoaiLe,
  VISIBILITY_CUSTOM_BASE,
} from "@/lib/journey/milestone-visibility-custom";
import { resolveCotMocScheduleTaoLuc } from "@/lib/journey/cot-moc-schedule";
import { setPostHang } from "@/lib/shop/post-hang";
import { SHOP_POST_HANG_MAX } from "@/lib/shop/types";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ Server Action: publishPost                                       ║
   ║                                                                  ║
   ║ Flow (theo brief §7):                                            ║
   ║   1. Verify session + quyền trên owner (chủ hoặc admin seeding). ║
   ║   2. Validate payload (title, blocks, visibility, loai_moc).     ║
   ║   3. Generate unique slug (slug per user).                       ║
   ║   4. Serialize blocks → HTML (sanitize plain text).              ║
   ║   5. INSERT cot_moc + tac_pham + thuoc_moc (link M-M).           ║
   ║   6. Revalidate /[slug]/journey + redirect client.               ║
   ║                                                                  ║
   ║ KHÔNG dùng transaction wrap (Supabase JS client không hỗ trợ);   ║
   ║ best-effort: nếu insert cot_moc OK nhưng tac_pham fail, ta thử   ║
   ║ cleanup cot_moc. Sạch tuyệt đối cần RPC SQL function (lượt sau). ║
   ╚══════════════════════════════════════════════════════════════════╝ */

export type PublishPostInput = {
  ownerSlug: string;
  /**
   * Id profile owner trên client — ưu tiên so khớp (ổn định hơn slug URL,
   * tránh fail khi URL `[slug]` lệch `user_nguoi_dung.slug`).
   */
  ownerId?: string;
  tieuDe: string;
  moTa: string;
  coverSeed: string | null;
  /** Tag — quản lý từ Journey card sau khi đăng; bỏ qua khi không truyền. */
  tags?: ArticleTagRef[];
  visibility: Visibility;
  /**
   * Tùy chỉnh — nếu có thì ghi ngoại lệ + nền theo mode
   * (`chan`→theo_nhom, `cho_phep`→chi_minh). Bỏ qua khi `congDong`.
   */
  visibilityCustom?: {
    mode: "chan" | "cho_phep";
    peopleIds: string[];
  } | null;
  loaiMoc: LoaiMoc;
  thoiDiem: string; // ISO date `YYYY-MM-DD`
  blocks: Block[];
  ownerVaiTro?: string;
  coAuthors?: CoAuthorDraft[];
  /** Đăng song song lên feed cộng đồng (compose từ `/community/[slug]`). */
  congDong?: {
    orgId: string;
    filterSlugs: string[];
  };
  /** Nhãn cá nhân gắn lên cột mốc mới tạo. */
  personalFilterIds?: string[];
  /**
   * ISO giờ hẹn — nếu trong tương lai: ghi `content_cot_moc.tao_luc` = giờ hẹn
   * (ẩn khỏi khách/World/Gallery đến khi đến giờ).
   */
  schedulePublishAt?: string | null;
  /**
   * Gắn kiosk hàng bán ngay sau khi tạo cột mốc (Giới thiệu sản phẩm).
   * Best-effort: lỗi gắn không rollback bài.
   */
  shopHangItems?: Array<{
    idBienThe: string;
    idBangGia: string;
    thuTu?: number;
  }>;
};

export type PublishPostResult =
  | {
      ok: true;
      slug: string;
      cotMocId: string;
      tacPhamId: string;
      milestone?: MilestoneItem;
      shopHangAttached?: boolean;
      shopHangError?: string | null;
      shopHangCount?: number;
    }
  | {
      ok: false;
      error: string;
      field?: string;
    };

const MAX_BLOCKS = 200;

export async function publishPost(
  input: PublishPostInput,
): Promise<PublishPostResult> {
  /* 1. Session check. */
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, error: "Bạn cần đăng nhập để đăng bài." };
  }

  const acting = await resolveActingOwner({
    sessionProfileId: session.profile.id,
    sessionSlug: session.profile.slug,
    targetOwnerId: input.ownerId,
    targetOwnerSlug: input.ownerSlug,
  });
  if (!acting) {
    return { ok: false, error: "Bạn không có quyền tạo bài cho user khác." };
  }
  const contentOwnerId = acting.ownerId;
  const contentOwnerSlug = acting.ownerSlug;

  /* 2. Validate. */
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

  if (!Array.isArray(input.blocks)) {
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
    return { ok: false, error: "Quyền hiển thị không hợp lệ.", field: "visibility" };
  }
  if (!VALID_LOAI_MOC.includes(input.loaiMoc)) {
    return { ok: false, error: "Loại cột mốc không hợp lệ.", field: "loaiMoc" };
  }

  const customInput = input.visibilityCustom;
  const useCustom =
    Boolean(customInput) &&
    isVisibilityNgoaiLeLoai(customInput!.mode) &&
    !input.congDong;
  const effectiveVisibility: Visibility = useCustom
    ? VISIBILITY_CUSTOM_BASE[customInput!.mode]
    : input.visibility;
  const scheduleTaoLuc = resolveCotMocScheduleTaoLuc(input.schedulePublishAt);
  const thoiDiem = scheduleTaoLuc
    ? isoDateFromIso(scheduleTaoLuc)
    : isValidIsoDate(input.thoiDiem)
      ? input.thoiDiem
      : todayIso();

  /* Block schema integrity. */
  const normalized = normalizeBlocks(input.blocks);
  if (!normalized) {
    return {
      ok: false,
      error: "Một số block không hợp lệ. Vui lòng kiểm tra lại.",
      field: "blocks",
    };
  }

  /* Auto cover embed (YouTube/Vimeo/Sketchfab/OG) khi user chưa upload thumbnail. */
  let publishBlocks = normalized;
  let coverId = input.coverSeed?.trim() || null;
  try {
    const autoCover = await ensureEmbedAutoCover({
      coverId,
      blocks: publishBlocks,
    });
    publishBlocks = autoCover.blocks;
    coverId = autoCover.coverId;
  } catch {
    /* best-effort — không chặn đăng bài */
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

  /* 3. Slug. */
  const baseSlug = slugifyPostTitle(tieuDe);
  let slug: string;
  try {
    slug = await uniquePostSlugForUser({
      userId: contentOwnerId,
      baseSlug,
    });
  } catch (e) {
    return { ok: false, error: dbErrorMessage(e) };
  }

  /* 4. HTML render. */
  const noiDungHtml = blocksToHtml(publishBlocks);

  /* 5. Insert DB — cộng đồng: cột mốc che_do_hien_thi=cong_dong + tac_pham. */
  const admin = createServiceRoleClient();
  const isCongDongOnly = Boolean(input.congDong);

  if (isCongDongOnly) {
    const { data: cotMoc, error: cotMocErr } = await admin
      .from("content_cot_moc")
      .insert({
        id_nguoi_dung: contentOwnerId,
        id_to_chuc: input.congDong!.orgId,
        loai_moc: input.loaiMoc,
        nguon_goc: "tu_tao",
        tieu_de: tieuDe,
        mo_ta: moTaFinal || null,
        thoi_diem: thoiDiem,
        che_do_hien_thi: "cong_dong",
        ...(scheduleTaoLuc ? { tao_luc: scheduleTaoLuc } : {}),
      })
      .select("id")
      .single<{ id: string }>();

    if (cotMocErr || !cotMoc) {
      return { ok: false, error: dbErrorMessage(cotMocErr) };
    }

    const { data: tacPham, error: tacPhamErr } = await admin
      .from("content_tac_pham")
      .insert({
        id_nguoi_dung: contentOwnerId,
        loai_tac_pham: "bai_viet",
        tieu_de: tieuDe,
        mo_ta: moTaFinal || null,
        cover_id: coverId,
        che_do_hien_thi: "cong_dong",
        slug,
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

    const sync = await syncCongDongPostFromPublish({
      orgId: input.congDong!.orgId,
      cotMocId: cotMoc.id,
      filterSlugs: input.congDong!.filterSlugs,
    });
    if (!sync.ok) {
      await admin.from("content_tac_pham_thuoc_moc").delete().eq("id_cot_moc", cotMoc.id);
      await admin.from("content_tac_pham").delete().eq("id", tacPham.id);
      await admin.from("content_cot_moc").delete().eq("id", cotMoc.id);
      return { ok: false, error: sync.error };
    }

    const labelAttach = await attachCongDongPersonalFilter({
      milestoneId: cotMoc.id,
      userId: contentOwnerId,
    });
    if (!labelAttach.ok) {
      await admin.from("content_tac_pham_thuoc_moc").delete().eq("id_cot_moc", cotMoc.id);
      await admin.from("content_tac_pham").delete().eq("id", tacPham.id);
      await admin.from("content_cot_moc").delete().eq("id", cotMoc.id);
      return { ok: false, error: labelAttach.error };
    }

    await insertDiemFeedChoBaiMoi({
      loai: "cot_moc",
      id: cotMoc.id,
      coverId,
      moTa: moTaFinal || null,
      blocks: publishBlocks,
      hasTag: false,
    });

    return {
      ok: true,
      slug,
      cotMocId: cotMoc.id,
      tacPhamId: tacPham.id,
    };
  }

  const { data: cotMoc, error: cotMocErr } = await admin
    .from("content_cot_moc")
    .insert({
      id_nguoi_dung: contentOwnerId,
      loai_moc: input.loaiMoc,
      nguon_goc: "tu_tao",
      tieu_de: tieuDe,
      mo_ta: moTaFinal || null,
      thoi_diem: thoiDiem,
      che_do_hien_thi: effectiveVisibility,
      ...(scheduleTaoLuc ? { tao_luc: scheduleTaoLuc } : {}),
    })
    .select("id")
    .single<{ id: string }>();

  if (cotMocErr || !cotMoc) {
    return { ok: false, error: dbErrorMessage(cotMocErr) };
  }

  const { data: tacPham, error: tacPhamErr } = await admin
    .from("content_tac_pham")
    .insert({
      id_nguoi_dung: contentOwnerId,
      loai_tac_pham: "bai_viet",
      tieu_de: tieuDe,
      mo_ta: moTaFinal || null,
      cover_id: coverId,
      che_do_hien_thi: effectiveVisibility,
      slug,
      noi_dung_blocks: publishBlocks,
      noi_dung_html: noiDungHtml,
      meta_title: tieuDe.slice(0, 120),
      meta_description: moTaFinal ? moTaFinal.slice(0, 200) : null,
    })
    .select("id")
    .single<{ id: string }>();

  if (tacPhamErr || !tacPham) {
    /* Rollback best-effort: xóa cot_moc vừa tạo để khỏi rác. */
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
    /* Rollback best-effort cả hai. */
    await admin.from("content_tac_pham").delete().eq("id", tacPham.id);
    await admin.from("content_cot_moc").delete().eq("id", cotMoc.id);
    return { ok: false, error: dbErrorMessage(linkErr) };
  }

  /* 5b. Persist tags → `article_gan_tac_pham` (junction). Failure ở đây
     KHÔNG rollback bài viết — best-effort, user sẽ thấy bài đăng OK nhưng
     tag không hiện ra trong gallery của bài tag tương ứng. Log để debug
     khi cần. */
  const tagIds = input.tags ? sanitizeTagIds(input.tags) : [];
  if (tagIds.length > 0) {
    const rows = tagIds.map((id_bai_viet) => ({
      id_bai_viet,
      id_tac_pham: tacPham.id,
    }));
    const { error: tagErr } = await admin
      .from("article_gan_tac_pham")
      .insert(rows);
    if (tagErr) {
      console.error("[publishPost] tag persist failed", tagErr);
    } else if (input.tags) {
      revalidateTaggedArticlePages(input.tags);
    }
  }

  if (input.coAuthors !== undefined) {
    const coSync = await syncCoAuthorsFromEditor(
      tacPham.id,
      contentOwnerId,
      input.ownerVaiTro ?? "",
      input.coAuthors,
    );
    if (!coSync.ok) {
      console.error("[publishPost] co-author sync failed", coSync.error);
    }
    for (const c of input.coAuthors) {
      if (c.slug) revalidatePath(`/${c.slug}`);
    }
  }

  if (input.personalFilterIds && input.personalFilterIds.length > 0) {
    const filterSync = await setMilestonePersonalFilters({
      milestoneId: cotMoc.id,
      userId: contentOwnerId,
      filterIds: input.personalFilterIds,
    });
    if (!filterSync.ok) {
      console.error("[publishPost] personal filter sync failed", filterSync.error);
    }
  }

  if (useCustom && customInput) {
    const ngoaiLe = await replaceVisibilityNgoaiLe({
      cotMocId: cotMoc.id,
      mode: customInput.mode,
      peopleIds: customInput.peopleIds,
      ownerId: contentOwnerId,
    });
    if (!ngoaiLe.ok) {
      console.error("[publishPost] visibility custom failed", ngoaiLe.error);
    }
  } else {
    await clearVisibilityNgoaiLe(cotMoc.id);
  }

  await insertDiemFeedChoBaiMoi({
    loai: "cot_moc",
    id: cotMoc.id,
    coverId,
    moTa: moTaFinal || null,
    blocks: publishBlocks,
    hasTag: tagIds.length > 0,
  });

  /* 6. Revalidate profile + feed trang chủ (compose từ World Journey). */
  revalidatePath(`/${contentOwnerSlug}`);
  revalidatePath("/");

  /* 7. Gắn kiosk (Giới thiệu sản phẩm) — cùng request publish, không 2 bước race. */
  let shopHangAttached = false;
  let shopHangError: string | null = null;
  let shopHangCount = 0;
  const hangRaw = input.shopHangItems;
  if (Array.isArray(hangRaw) && hangRaw.length > 0) {
    const hangItems: Array<{
      idBienThe: string;
      idBangGia: string;
      thuTu?: number;
    }> = [];
    for (const raw of hangRaw) {
      const idBienThe = raw?.idBienThe?.trim();
      const idBangGia = raw?.idBangGia?.trim();
      if (!idBienThe || !idBangGia) continue;
      hangItems.push({
        idBienThe,
        idBangGia,
        thuTu: typeof raw.thuTu === "number" ? raw.thuTu : hangItems.length,
      });
      if (hangItems.length >= SHOP_POST_HANG_MAX) break;
    }
    if (hangItems.length > 0) {
      try {
        const saved = await setPostHang(contentOwnerId, cotMoc.id, hangItems);
        shopHangAttached = saved.length > 0;
        shopHangCount = saved.length;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        shopHangError =
          msg === "BAN_HANG_OFF"
            ? "Chưa bật bán hàng."
            : msg === "SHOP_NOT_READY"
              ? "Cần thêm tài khoản nhận tiền trước khi gắn hàng."
              : msg === "GIA_NOT_FOUND"
                ? "Thiếu giá cho biến thể trong bảng giá."
                : "Không gắn được hàng bán.";
        console.error("[publishPost] setPostHang", e);
      }
    }
  }

  const milestone = await buildMilestoneItemForCotMoc(admin, cotMoc.id);

  return {
    ok: true,
    slug,
    cotMocId: cotMoc.id,
    tacPhamId: tacPham.id,
    milestone: milestone ?? undefined,
    shopHangAttached,
    shopHangError,
    shopHangCount,
  };
}

/* ─── Helpers ────────────────────────────────────────────────────── */

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

function isoDateFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return todayIso();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

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
  "table",
];

/**
 * Sanitize block array vào canonical shape:
 *  - reset `thu_tu` theo vị trí.
 *  - đảm bảo `config` là object thuần.
 *  - drop block không match `VALID_BLOCK_TYPES`.
 *
 * Trả `null` nếu input quá lệch (ví dụ `blocks` không phải array). Để action
 * trả về lỗi cho user thay vì throw.
 */
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
      config: loai === "table" ? sanitizeTableBlockConfig(config) : config,
    });
    i += 1;
  }
  return out;
}

/** Lấy mảng id duy nhất từ `tags` input — drop empty / non-uuid-ish. */
function sanitizeTagIds(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  for (const t of tags) {
    if (!t || typeof t !== "object") continue;
    const id = (t as { id?: unknown }).id;
    if (typeof id !== "string") continue;
    const trimmed = id.trim();
    if (!trimmed) continue;
    seen.add(trimmed);
  }
  return Array.from(seen);
}

function dbErrorMessage(error: unknown): string {
  if (!error) return "Lỗi không xác định khi lưu bài viết.";
  const msg =
    (error as { message?: string }).message ||
    (error as { hint?: string }).hint ||
    "";
  if (/duplicate key/i.test(msg)) {
    return "Trùng dữ liệu — vui lòng thử lại với tiêu đề khác.";
  }
  if (/violates row-level security/i.test(msg)) {
    return "Tài khoản không có quyền tạo bài viết. Vui lòng đăng nhập lại.";
  }
  if (/invalid input value for enum/i.test(msg)) {
    return "Giá trị enum không hợp lệ. Vui lòng tải lại trang.";
  }
  return `Không lưu được bài viết. (${msg.slice(0, 200)})`;
}
