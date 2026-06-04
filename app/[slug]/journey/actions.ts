"use server";

import { revalidatePath } from "next/cache";

import type { GiaiDoan } from "@/lib/auth/session";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  VALID_LOAI_MOC,
  VALID_VIS,
  type Block as ServerBlock,
  type LoaiMoc,
  type Visibility,
} from "@/lib/editor/types";
import {
  uiKeyToDbEnum,
  type LoaiMocFilterKey,
} from "@/lib/journey/filter-visibility";
import type { ArticleTagRef } from "@/lib/editor/article-tag";
import { fetchArticleTagsForTacPham } from "@/lib/journey/article-tags-batch";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { notifyMilestoneComment } from "@/lib/social/follow";

const GIAI_DOAN_VALID = new Set<GiaiDoan>([
  "moi_bat_dau",
  "dang_hoc",
  "dang_lam",
  "tim_viec",
  "freelance",
  "dang_day",
]);

const SLUG_RE = /^[a-z0-9_-]+$/;
const RESERVED_SLUGS = new Set<string>([
  "admin",
  "api",
  "auth",
  "login",
  "logout",
  "onboarding",
  "maintenance",
  "settings",
  "chat",
  "bai-viet",
  "nghe-nghiep",
  "nganh-hoc",
  "truong-dai-hoc",
  "software",
  "phan-mem",
  "keyword",
  "search",
  "gallery",
  "invite",
  "verify",
]);

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      field?:
        | "slug"
        | "ten_hien_thi"
        | "giai_doan"
        | "bio"
        | "tinh_thanh"
        | "email_lien_he"
        | "mxh_links";
    };

function normalizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}

function validateSlugFormat(slug: string): string | null {
  if (!slug) return "Slug không được để trống.";
  if (slug.length < 3) return "Slug phải có ít nhất 3 ký tự.";
  if (slug.length > 48) return "Slug tối đa 48 ký tự.";
  if (!SLUG_RE.test(slug)) {
    return "Slug chỉ chấp nhận chữ thường, số, dấu gạch ngang (-) và gạch dưới (_).";
  }
  if (RESERVED_SLUGS.has(slug)) {
    return "Slug này đã được hệ thống giữ chỗ — bạn cần chọn slug khác.";
  }
  return null;
}

/**
 * Kiểm tra slug khả dụng — gọi từ client khi user blur input.
 * Yêu cầu session để chống abuse (probe slug ẩn từ guest).
 */
export async function checkSlugAvailable(
  rawSlug: string,
): Promise<ActionResult<{ available: boolean; slug: string }>> {
  const session = await getCurrentSessionAndProfile();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn." };
  }

  const slug = normalizeSlug(rawSlug);
  const formatErr = validateSlugFormat(slug);
  if (formatErr) return { ok: false, error: formatErr, field: "slug" };

  /* Slug hiện tại của user — coi như "khả dụng" để UI không báo trùng. */
  if (session.profile && session.profile.slug === slug) {
    return { ok: true, data: { available: true, slug } };
  }

  const admin = createServiceRoleClient();
  const { data: existing, error } = await admin
    .from("user_nguoi_dung")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<{ id: string }>();

  if (error) {
    return { ok: false, error: "Không kiểm tra được slug. Thử lại sau." };
  }
  return {
    ok: true,
    data: { available: !existing, slug },
  };
}

export type SubmitOnboardingInput = {
  tenHienThi: string;
  slug: string;
  giaiDoan: GiaiDoan;
};

/**
 * Hoàn tất onboarding — UPDATE `ten_hien_thi`, `slug`, `giai_doan`.
 *
 * Dùng service-role client (server-only) vì hiện tại `user_nguoi_dung` chỉ có SELECT
 * policy; ta tự enforce `auth_user_id = session.user.id`. Sau khi cập nhật xong,
 * caller (client) chịu trách nhiệm điều hướng tới slug mới.
 */
export async function submitOnboarding(
  input: SubmitOnboardingInput,
): Promise<ActionResult<{ slug: string }>> {
  const session = await getCurrentSessionAndProfile();
  if (!session) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại." };
  }
  if (!session.profile) {
    return {
      ok: false,
      error: "Hồ sơ đang khởi tạo — vui lòng chờ vài giây rồi thử lại.",
    };
  }

  const tenHienThi = (input.tenHienThi ?? "").trim();
  if (!tenHienThi || tenHienThi.length < 2) {
    return {
      ok: false,
      error: "Tên hiển thị cần ít nhất 2 ký tự.",
      field: "ten_hien_thi",
    };
  }
  if (tenHienThi.length > 80) {
    return {
      ok: false,
      error: "Tên hiển thị tối đa 80 ký tự.",
      field: "ten_hien_thi",
    };
  }

  const slug = normalizeSlug(input.slug);
  const slugFmtErr = validateSlugFormat(slug);
  if (slugFmtErr) return { ok: false, error: slugFmtErr, field: "slug" };

  if (!GIAI_DOAN_VALID.has(input.giaiDoan)) {
    return {
      ok: false,
      error: "Hãy chọn 1 giai đoạn phù hợp với bạn.",
      field: "giai_doan",
    };
  }

  const admin = createServiceRoleClient();

  /* Race-safe slug uniqueness — query có thể true tại t1 và conflict tại t2; ta vẫn
     dựa vào UNIQUE constraint `user_nguoi_dung_slug_key` để bắt lỗi cuối cùng. */
  if (slug !== session.profile.slug) {
    const { data: clash, error: clashErr } = await admin
      .from("user_nguoi_dung")
      .select("id")
      .eq("slug", slug)
      .maybeSingle<{ id: string }>();
    if (clashErr) {
      return {
        ok: false,
        error: "Không kiểm tra được slug. Thử lại sau.",
        field: "slug",
      };
    }
    if (clash && clash.id !== session.profile.id) {
      return {
        ok: false,
        error: "Slug này đã được người khác sử dụng — thử thêm số hoặc dấu gạch.",
        field: "slug",
      };
    }
  }

  const { error: updateErr } = await admin
    .from("user_nguoi_dung")
    .update({
      ten_hien_thi: tenHienThi,
      slug,
      giai_doan: input.giaiDoan,
    })
    .eq("auth_user_id", session.authUserId);

  if (updateErr) {
    /* unique_violation code 23505 → phổ biến nhất ở slug. */
    const isUnique = (updateErr as { code?: string }).code === "23505";
    return {
      ok: false,
      error: isUnique
        ? "Slug này vừa bị người khác chiếm — thử thêm số."
        : updateErr.message,
      field: isUnique ? "slug" : undefined,
    };
  }

  /* Revalidate cả slug cũ lẫn slug mới — slug có thể đã thay đổi. */
  revalidatePath(`/${session.profile.slug}`);
  if (slug !== session.profile.slug) {
    revalidatePath(`/${slug}`);
  }

  return { ok: true, data: { slug } };
}

/* ──────────────────────────────────────────────────────────────────────
 * updateProfile — modal "Chỉnh sửa hồ sơ" trên Journey sidebar.
 *
 * Cập nhật các field tự nhập của owner:
 *   - ten_hien_thi · bio · tinh_thanh
 *   - email_lien_he · visibility_email
 *   - mxh_links (JSONB array dạng `[{ label, url }, …]`)
 *   - giai_doan (chip select, có thể đổi lại sau onboarding)
 *
 * KHÔNG đụng `slug` (đổi slug = đổi URL Journey → cần flow riêng).
 * KHÔNG đụng `avatar_id` / `cover_id` (cần upload Cloudflare — lượt sau).
 * ────────────────────────────────────────────────────────────────────── */

/* visibility_email là enum `visibility_field_enum` (public / friends / private)
 * trong DB — lượt này UI chỉ phơi 2 lựa chọn: `public` (công khai trên Journey)
 * và `private` (ẩn). Không expose `friends` cho tới khi có flow follow. */
export type EmailVisibility = "public" | "private";

export type ProfileLinkInput = { label?: string; url: string };

export type UpdateProfileInput = {
  tenHienThi: string;
  bio: string;
  tinhThanh: string;
  emailLienHe: string;
  visibilityEmail: EmailVisibility;
  mxhLinks: ProfileLinkInput[];
  giaiDoan: GiaiDoan;
};

/* Danh sách phải khớp 1-1 với enum `tinh_thanh_vn_enum` trên Supabase
 * (project ospzzzxcomrmhqrnkoiw). Lưu ý: TP. HCM key là `hcm`, không phải
 * `ho_chi_minh` — đã từng gây lỗi `invalid input value for enum…`. */
const TINH_THANH_OPTIONS = new Set<string>([
  "ha_noi",
  "hue",
  "hai_phong",
  "da_nang",
  "hcm",
  "can_tho",
  "cao_bang",
  "lang_son",
  "quang_ninh",
  "dien_bien",
  "lai_chau",
  "son_la",
  "nghe_an",
  "ha_tinh",
  "thanh_hoa",
  "tuyen_quang",
  "lao_cai",
  "thai_nguyen",
  "phu_tho",
  "bac_ninh",
  "hung_yen",
  "ninh_binh",
  "quang_tri",
  "quang_ngai",
  "gia_lai",
  "khanh_hoa",
  "dak_lak",
  "lam_dong",
  "dong_nai",
  "tay_ninh",
  "vinh_long",
  "dong_thap",
  "an_giang",
  "ca_mau",
  "",
]);

const URL_RE = /^https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<ActionResult<{ slug: string }>> {
  const session = await getCurrentSessionAndProfile();
  if (!session) {
    return {
      ok: false,
      error: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",
    };
  }
  if (!session.profile) {
    return {
      ok: false,
      error: "Hồ sơ chưa khởi tạo xong — thử lại sau vài giây.",
    };
  }

  const tenHienThi = (input.tenHienThi ?? "").trim();
  if (tenHienThi.length < 2) {
    return {
      ok: false,
      error: "Tên hiển thị cần ít nhất 2 ký tự.",
      field: "ten_hien_thi",
    };
  }
  if (tenHienThi.length > 80) {
    return {
      ok: false,
      error: "Tên hiển thị tối đa 80 ký tự.",
      field: "ten_hien_thi",
    };
  }

  const bio = (input.bio ?? "").trim();
  if (bio.length > 280) {
    return {
      ok: false,
      error: "Bio tối đa 280 ký tự (hiện đang " + bio.length + ").",
      field: "bio",
    };
  }

  const tinhThanh = (input.tinhThanh ?? "").trim().toLowerCase();
  if (tinhThanh && !TINH_THANH_OPTIONS.has(tinhThanh)) {
    return {
      ok: false,
      error: "Tỉnh / thành phố không hợp lệ.",
      field: "tinh_thanh",
    };
  }

  const emailLienHe = (input.emailLienHe ?? "").trim();
  if (emailLienHe && !EMAIL_RE.test(emailLienHe)) {
    return {
      ok: false,
      error: "Email liên hệ không đúng định dạng.",
      field: "email_lien_he",
    };
  }
  const visibilityEmail: EmailVisibility =
    input.visibilityEmail === "public" ? "public" : "private";

  if (!GIAI_DOAN_VALID.has(input.giaiDoan)) {
    return {
      ok: false,
      error: "Giai đoạn không hợp lệ.",
      field: "giai_doan",
    };
  }

  const links = Array.isArray(input.mxhLinks) ? input.mxhLinks : [];
  if (links.length > 8) {
    return {
      ok: false,
      error: "Tối đa 8 đường link mạng xã hội.",
      field: "mxh_links",
    };
  }
  const cleanedLinks: { label?: string; url: string }[] = [];
  for (const link of links) {
    if (!link || typeof link !== "object") continue;
    const url = (link.url ?? "").trim();
    if (!url) continue;
    if (!URL_RE.test(url)) {
      return {
        ok: false,
        error: "Link không hợp lệ: \"" + url + "\". Cần bắt đầu bằng http/https.",
        field: "mxh_links",
      };
    }
    if (url.length > 300) {
      return {
        ok: false,
        error: "Link quá dài (tối đa 300 ký tự).",
        field: "mxh_links",
      };
    }
    const label = (link.label ?? "").trim();
    cleanedLinks.push(label ? { label: label.slice(0, 40), url } : { url });
  }

  const admin = createServiceRoleClient();
  const { error: updateErr } = await admin
    .from("user_nguoi_dung")
    .update({
      ten_hien_thi: tenHienThi,
      bio: bio || null,
      tinh_thanh: tinhThanh || null,
      email_lien_he: emailLienHe || null,
      visibility_email: visibilityEmail,
      mxh_links: cleanedLinks,
      giai_doan: input.giaiDoan,
    })
    .eq("auth_user_id", session.authUserId);

  if (updateErr) {
    /* Log đầy đủ để dev đọc terminal; client chỉ thấy thông điệp tóm tắt. */
    console.error("[updateProfile] supabase error:", updateErr);
    const raw = updateErr.message || "";
    if (raw.includes("tinh_thanh_vn_enum")) {
      return {
        ok: false,
        error: "Tỉnh / TP không hợp lệ. Hãy chọn lại từ danh sách.",
        field: "tinh_thanh",
      };
    }
    if (raw.includes("visibility_field_enum")) {
      return {
        ok: false,
        error: "Tùy chọn hiển thị email không hợp lệ.",
        field: "email_lien_he",
      };
    }
    if (raw.includes("giai_doan_enum")) {
      return {
        ok: false,
        error: "Giai đoạn không hợp lệ.",
        field: "giai_doan",
      };
    }
    return { ok: false, error: "Không lưu được hồ sơ: " + raw };
  }

  revalidatePath(`/${session.profile.slug}`);
  return { ok: true, data: { slug: session.profile.slug } };
}

/* ──────────────────────────────────────────────────────────────────────
 * Avatar — lưu Cloudflare imageId vào `user_nguoi_dung.avatar_id`.
 *
 * Client flow:
 *   1. Upload file qua POST /api/avatar/upload → nhận `imageId`
 *   2. Gọi `updateAvatar(imageId)` để gắn vào hồ sơ
 *   3. revalidatePath để Sidebar refetch URL từ Cloudflare delivery
 *
 * Truyền `null` để xoá avatar (rollback về initials).
 * ────────────────────────────────────────────────────────────────────── */
export async function updateAvatar(
  imageId: string | null,
): Promise<ActionResult<{ slug: string; avatarId: string | null }>> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn." };
  }

  const cleaned =
    typeof imageId === "string" && imageId.trim().length > 0
      ? imageId.trim()
      : null;

  /* Cloudflare imageId là UUID hoặc 32 hex; chấp nhận tối đa 64 chars,
     chỉ alphanumeric + dash để tránh inject. */
  if (cleaned && !/^[A-Za-z0-9-]{8,64}$/.test(cleaned)) {
    return { ok: false, error: "imageId không hợp lệ." };
  }

  const admin = createServiceRoleClient();
  const { error: updateErr } = await admin
    .from("user_nguoi_dung")
    .update({ avatar_id: cleaned })
    .eq("auth_user_id", session.authUserId);

  if (updateErr) {
    console.error("[updateAvatar] supabase error:", updateErr);
    return { ok: false, error: "Không lưu được avatar: " + updateErr.message };
  }

  revalidatePath(`/${session.profile.slug}`);
  return {
    ok: true,
    data: { slug: session.profile.slug, avatarId: cleaned },
  };
}

/* ──────────────────────────────────────────────────────────────────────
 * Cover (banner sidebar) — lưu Cloudflare imageId vào
 * `user_nguoi_dung.cover_id`. Cùng pattern với `updateAvatar`:
 *   1. Upload qua POST /api/cover/upload → imageId
 *   2. updateCover(imageId) gắn vào hồ sơ
 *   3. revalidatePath để Sidebar refetch URL Cloudflare delivery
 *
 * Truyền `null` để xoá cover (rollback về gradient mặc định).
 * ────────────────────────────────────────────────────────────────────── */
export async function updateCover(
  imageId: string | null,
): Promise<ActionResult<{ slug: string; coverId: string | null }>> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn." };
  }

  const cleaned =
    typeof imageId === "string" && imageId.trim().length > 0
      ? imageId.trim()
      : null;

  if (cleaned && !/^[A-Za-z0-9-]{8,64}$/.test(cleaned)) {
    return { ok: false, error: "imageId không hợp lệ." };
  }

  const admin = createServiceRoleClient();
  const { error: updateErr } = await admin
    .from("user_nguoi_dung")
    .update({ cover_id: cleaned })
    .eq("auth_user_id", session.authUserId);

  if (updateErr) {
    console.error("[updateCover] supabase error:", updateErr);
    return { ok: false, error: "Không lưu được cover: " + updateErr.message };
  }

  revalidatePath(`/${session.profile.slug}`);
  return {
    ok: true,
    data: { slug: session.profile.slug, coverId: cleaned },
  };
}

/* ──────────────────────────────────────────────────────────────────────
 * Journey filter visibility — toggle 1 loai_moc giữa public ↔ private.
 *
 * Lưu JSONB `journey_loai_moc_visibility` trên `user_nguoi_dung`.
 * Missing entry = public (default). Server merge entry mới vào JSONB
 * thay vì overwrite cả map — giảm risk race.
 *
 * Client gọi với UI key (`hoc, lam, du-an, ...`). Server convert sang
 * DB enum (`hoc, lam_viec, du_an, ...`) qua `uiKeyToDbEnum`.
 * ────────────────────────────────────────────────────────────────────── */
const ALLOWED_FILTER_KEYS = new Set<string>([
  "hoc",
  "lam",
  "du-an",
  "su-kien",
  "thanh-tuu",
  "ca-nhan",
]);

export async function updateLoaiMocVisibility(
  uiKey: string,
  visibility: "public" | "private",
): Promise<ActionResult<null>> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn." };
  }
  if (!ALLOWED_FILTER_KEYS.has(uiKey)) {
    return { ok: false, error: "Filter key không hợp lệ." };
  }
  if (visibility !== "public" && visibility !== "private") {
    return { ok: false, error: "Giá trị visibility không hợp lệ." };
  }

  const dbEnum = uiKeyToDbEnum(uiKey as LoaiMocFilterKey);
  if (!dbEnum) {
    return { ok: false, error: "Filter key không map sang loai_moc_enum." };
  }

  const admin = createServiceRoleClient();

  /* Read-modify-write trong 1 query (Postgres jsonb_set lưu nhanh hơn
     fetch toàn map về client). */
  const { data: row, error: readErr } = await admin
    .from("user_nguoi_dung")
    .select("journey_loai_moc_visibility")
    .eq("id", session.profile.id)
    .maybeSingle<{ journey_loai_moc_visibility: Record<string, unknown> | null }>();
  if (readErr) {
    console.error("[updateLoaiMocVisibility] read err:", readErr);
    return { ok: false, error: "Không đọc được hồ sơ." };
  }
  const current = (row?.journey_loai_moc_visibility ?? {}) as Record<
    string,
    unknown
  >;
  const next = { ...current, [dbEnum]: visibility };

  const { error: writeErr } = await admin
    .from("user_nguoi_dung")
    .update({ journey_loai_moc_visibility: next })
    .eq("id", session.profile.id);
  if (writeErr) {
    console.error("[updateLoaiMocVisibility] write err:", writeErr);
    return { ok: false, error: "Không lưu được tuỳ chọn." };
  }

  revalidatePath(`/${session.profile.slug}`);
  return { ok: true, data: null };
}

/* ──────────────────────────────────────────────────────────────────────
 * Milestone owner actions — kebab menu trên `JourneyMilestoneCard`:
 *
 *   • updateMilestoneType       — đổi `loai_moc` (nhóm filter)
 *   • updateMilestoneVisibility — đổi `che_do_hien_thi` (public / theo_nhom / chi_minh)
 *   • deleteMilestone           — xoá cột mốc + dọn dẹp link `thuoc_moc` +
 *                                 xoá `content_tac_pham` orphan (chỉ thuộc 1 mốc).
 *
 * Tất cả đều check `id_nguoi_dung = session.profile.id` qua helper
 * `requireMilestoneOwnership` — không tin payload từ client.
 * ────────────────────────────────────────────────────────────────────── */

type MilestoneOwnership =
  | { ok: true; profileSlug: string; profileId: string }
  | { ok: false; error: string };

async function requireMilestoneOwnership(
  milestoneId: string,
): Promise<MilestoneOwnership> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn." };
  }
  if (!milestoneId || typeof milestoneId !== "string") {
    return { ok: false, error: "Thiếu ID cột mốc." };
  }

  const admin = createServiceRoleClient();
  const { data: row, error } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung")
    .eq("id", milestoneId)
    .maybeSingle<{ id: string; id_nguoi_dung: string }>();

  if (error) {
    return { ok: false, error: "Không tìm thấy cột mốc: " + error.message };
  }
  if (!row) {
    return { ok: false, error: "Cột mốc không tồn tại (đã bị xoá?)." };
  }
  if (row.id_nguoi_dung !== session.profile.id) {
    return { ok: false, error: "Bạn không phải chủ cột mốc này." };
  }
  return {
    ok: true,
    profileSlug: session.profile.slug,
    profileId: session.profile.id,
  };
}

export async function updateMilestoneType(
  milestoneId: string,
  loaiMoc: LoaiMoc,
): Promise<ActionResult<null>> {
  const owner = await requireMilestoneOwnership(milestoneId);
  if (!owner.ok) return { ok: false, error: owner.error };
  if (!VALID_LOAI_MOC.includes(loaiMoc)) {
    return { ok: false, error: "Nhóm filter không hợp lệ." };
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("content_cot_moc")
    .update({ loai_moc: loaiMoc })
    .eq("id", milestoneId);
  if (error) {
    return { ok: false, error: "Không đổi được nhóm: " + error.message };
  }

  revalidatePath(`/${owner.profileSlug}`);
  return { ok: true, data: null };
}

export async function updateMilestoneVisibility(
  milestoneId: string,
  visibility: Visibility,
): Promise<ActionResult<null>> {
  const owner = await requireMilestoneOwnership(milestoneId);
  if (!owner.ok) return { ok: false, error: owner.error };
  if (!VALID_VIS.includes(visibility)) {
    return { ok: false, error: "Chế độ hiển thị không hợp lệ." };
  }

  const admin = createServiceRoleClient();
  const { error } = await admin
    .from("content_cot_moc")
    .update({ che_do_hien_thi: visibility })
    .eq("id", milestoneId);
  if (error) {
    return {
      ok: false,
      error: "Không đổi được chế độ hiển thị: " + error.message,
    };
  }

  /* Sync cùng visibility xuống các `content_tac_pham` được liên kết với
     cột mốc — owner expect "cột mốc private" cũng ẩn bài viết tương ứng. */
  const { data: links } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select("id_tac_pham")
    .eq("id_cot_moc", milestoneId)
    .returns<Array<{ id_tac_pham: string }>>();
  const tacPhamIds = (links ?? []).map((l) => l.id_tac_pham);
  if (tacPhamIds.length > 0) {
    await admin
      .from("content_tac_pham")
      .update({ che_do_hien_thi: visibility })
      .in("id", tacPhamIds);
  }

  revalidatePath(`/${owner.profileSlug}`);
  return { ok: true, data: null };
}

export async function deleteMilestone(
  milestoneId: string,
): Promise<ActionResult<null>> {
  const owner = await requireMilestoneOwnership(milestoneId);
  if (!owner.ok) return { ok: false, error: owner.error };

  const admin = createServiceRoleClient();

  /* Tìm danh sách tác phẩm gắn vào cột mốc trước khi xoá link. */
  const { data: links } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select("id_tac_pham")
    .eq("id_cot_moc", milestoneId)
    .returns<Array<{ id_tac_pham: string }>>();
  const tacPhamIds = (links ?? []).map((l) => l.id_tac_pham);

  /* Xoá bảng nối trước → tránh FK constraint khi xoá cot_moc. */
  const { error: linkErr } = await admin
    .from("content_tac_pham_thuoc_moc")
    .delete()
    .eq("id_cot_moc", milestoneId);
  if (linkErr) {
    return { ok: false, error: "Không xoá được liên kết: " + linkErr.message };
  }

  /* Bài viết "mồ côi" (không còn cột mốc nào tham chiếu) → xoá luôn. */
  if (tacPhamIds.length > 0) {
    const { data: stillUsed } = await admin
      .from("content_tac_pham_thuoc_moc")
      .select("id_tac_pham")
      .in("id_tac_pham", tacPhamIds)
      .returns<Array<{ id_tac_pham: string }>>();
    const stillUsedIds = new Set((stillUsed ?? []).map((l) => l.id_tac_pham));
    const orphanIds = tacPhamIds.filter((id) => !stillUsedIds.has(id));
    if (orphanIds.length > 0) {
      await admin.from("content_tac_pham").delete().in("id", orphanIds);
    }
  }

  const { error: delErr } = await admin
    .from("content_cot_moc")
    .delete()
    .eq("id", milestoneId);
  if (delErr) {
    return { ok: false, error: "Không xoá được cột mốc: " + delErr.message };
  }

  revalidatePath(`/${owner.profileSlug}`);
  return { ok: true, data: null };
}

/* ──────────────────────────────────────────────────────────────────────
 * Post modal (overlay) — load detail + comments khi user click vào card.
 *
 *   • loadMilestoneDetail(milestoneId)  — fetch cot_moc + tac_pham đính
 *     kèm + owner profile + comments (loai_doi_tuong='cot_moc'). Apply
 *     visibility check: `chi_minh` chỉ owner thấy.
 *   • addMilestoneComment(milestoneId, text) — INSERT social_binh_luan.
 *
 * Comments hiện chỉ render flat (id_cha = null) — replies/threading lượt
 * sau khi có UI tương ứng.
 * ────────────────────────────────────────────────────────────────────── */

export type MilestonePostAuthor = {
  id: string;
  slug: string;
  tenHienThi: string;
  avatarId: string | null;
};

export type MilestonePostContent = {
  id: string;
  slug: string;
  tieuDe: string;
  moTa: string | null;
  noiDungHtml: string | null;
  /**
   * Canonical block array (server schema `{id, loai, thu_tu, config}`) — dùng
   * cho client-side renderer (`PostRenderer`) để render bài viết theo đúng
   * layout của editor canvas. `null` khi bài chưa có blocks (legacy posts hoặc
   * lỗi parse).
   */
  noiDungBlocks: ServerBlock[] | null;
  coverId: string | null;
  /**
   * Article tags — bài viết (`article_bai_viet`) được tác giả gắn vào post
   * này qua `article_gan_tac_pham`. Render dưới byline trong view, click vào
   * sẽ điều hướng tới trang article tương ứng theo `loai_bai_viet`.
   */
  articleTags: ArticleTagRef[];
  contributors: MilestonePostContributor[];
};

export type MilestonePostContributor = {
  id: string;
  slug: string;
  tenHienThi: string;
  avatarId: string | null;
  vaiTro: string | null;
  laChuSoHuu: boolean;
};

export type MilestonePostComment = {
  id: string;
  noiDung: string;
  taoLuc: string;
  author: MilestonePostAuthor | null;
  isOwn: boolean;
};

export type MilestonePostDetail = {
  milestone: {
    id: string;
    tieuDe: string;
    moTa: string | null;
    thoiDiem: string;
    loaiMoc: string;
    cheDoHienThi: "public" | "theo_nhom" | "chi_minh" | "feature";
  };
  owner: MilestonePostAuthor;
  posts: MilestonePostContent[];
  comments: MilestonePostComment[];
  viewerCanComment: boolean;
  /** True khi viewer chính là owner của cột mốc. Dùng để render nút "Sửa bài". */
  viewerIsOwner: boolean;
  social: {
    viewerLiked: boolean;
    viewerBookmarked: boolean;
    likeCount: number;
    bookmarkCount: number;
  };
};

type CotMocDetailRow = {
  id: string;
  id_nguoi_dung: string;
  tieu_de: string;
  mo_ta: string | null;
  thoi_diem: string;
  loai_moc: string;
  che_do_hien_thi: "public" | "theo_nhom" | "chi_minh" | "feature";
};

type TacPhamRow = {
  id: string;
  slug: string | null;
  tieu_de: string;
  mo_ta: string | null;
  cover_id: string | null;
  noi_dung_html: string | null;
  noi_dung_blocks: unknown;
  thu_tu: number;
};

type ProfileRow = {
  id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
};

type CommentRow = {
  id: string;
  nguoi_binh_luan: string;
  noi_dung: string;
  tao_luc: string;
  da_xoa: boolean;
};

type TacGiaRow = {
  id_tac_pham: string;
  id_nguoi_dung: string;
  vai_tro: string | null;
  la_chu_so_huu: boolean;
  thu_tu: number | null;
};

export async function loadMilestoneDetail(
  milestoneId: string,
): Promise<ActionResult<MilestonePostDetail>> {
  if (!milestoneId || typeof milestoneId !== "string") {
    return { ok: false, error: "Thiếu ID cột mốc." };
  }

  const session = await getCurrentSessionAndProfile();
  const viewerId = session?.profile?.id ?? null;

  const admin = createServiceRoleClient();

  /* Fetch cột mốc — gồm cả `id_nguoi_dung` để check ownership visibility. */
  const { data: cotMoc, error: cmErr } = await admin
    .from("content_cot_moc")
    .select(
      "id, id_nguoi_dung, tieu_de, mo_ta, thoi_diem, loai_moc, che_do_hien_thi",
    )
    .eq("id", milestoneId)
    .maybeSingle<CotMocDetailRow>();

  if (cmErr || !cotMoc) {
    return { ok: false, error: "Cột mốc không tồn tại hoặc đã bị xoá." };
  }

  const isOwner = viewerId === cotMoc.id_nguoi_dung;

  /* Visibility — chi_minh: chỉ owner; theo_nhom: hiện coi như public (chưa
     có user_nhom_boi_canh); public: ai cũng xem được. */
  if (cotMoc.che_do_hien_thi === "chi_minh" && !isOwner) {
    return { ok: false, error: "Cột mốc này đang ở chế độ riêng tư." };
  }

  /* Owner profile — cho hero hiển thị tên + avatar. */
  const { data: ownerRow } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .eq("id", cotMoc.id_nguoi_dung)
    .maybeSingle<ProfileRow>();

  const owner: MilestonePostAuthor = ownerRow
    ? {
        id: ownerRow.id,
        slug: ownerRow.slug,
        tenHienThi: ownerRow.ten_hien_thi || ownerRow.slug,
        avatarId: ownerRow.avatar_id,
      }
    : {
        id: cotMoc.id_nguoi_dung,
        slug: "user",
        tenHienThi: "Người dùng",
        avatarId: null,
      };

  /* Tác phẩm gắn vào cột mốc — sort theo `thu_tu`. */
  const { data: linkedTacPham } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(
      "thu_tu, content_tac_pham:content_tac_pham!inner(id, slug, tieu_de, mo_ta, cover_id, noi_dung_html, noi_dung_blocks)",
    )
    .eq("id_cot_moc", milestoneId)
    .order("thu_tu", { ascending: true })
    .returns<
      Array<{
        thu_tu: number;
        content_tac_pham: {
          id: string;
          slug: string | null;
          tieu_de: string;
          mo_ta: string | null;
          cover_id: string | null;
          noi_dung_html: string | null;
          noi_dung_blocks: unknown;
        } | null;
      }>
    >();

  const tacPhamRows: TacPhamRow[] = (linkedTacPham ?? [])
    .map((row): TacPhamRow | null => {
      const tp = row.content_tac_pham;
      if (!tp) return null;
      return {
        id: tp.id,
        slug: tp.slug,
        tieu_de: tp.tieu_de,
        mo_ta: tp.mo_ta,
        cover_id: tp.cover_id,
        noi_dung_html: tp.noi_dung_html,
        noi_dung_blocks: tp.noi_dung_blocks,
        thu_tu: row.thu_tu,
      };
    })
    .filter((x): x is TacPhamRow => x !== null);

  /* Article tags — gắn cho từng tác phẩm trong cột mốc. Query 1 lượt theo
     batch `id_tac_pham IN (...)` rồi group lại theo tác phẩm để tránh N+1. */
  const tagsByTacPham = await fetchArticleTagsForTacPham(
    admin,
    tacPhamRows.map((t) => t.id),
  );
  const contributorsByTacPham = await loadPostContributors(
    admin,
    tacPhamRows.map((t) => t.id),
  );

  const posts: MilestonePostContent[] = tacPhamRows.map((tp) => ({
    id: tp.id,
    slug: tp.slug ?? "",
    tieuDe: tp.tieu_de,
    moTa: tp.mo_ta,
    noiDungHtml: tp.noi_dung_html,
    noiDungBlocks: parseServerBlocks(tp.noi_dung_blocks),
    coverId: tp.cover_id,
    articleTags: tagsByTacPham.get(tp.id) ?? [],
    contributors: contributorsByTacPham.get(tp.id) ?? [],
  }));

  /* Comments — lấy top-level (id_cha IS NULL), sort cũ → mới. */
  const { data: cmtRows } = await admin
    .from("social_binh_luan")
    .select("id, nguoi_binh_luan, noi_dung, tao_luc, da_xoa")
    .eq("loai_doi_tuong", "cot_moc")
    .eq("id_doi_tuong", milestoneId)
    .is("id_cha", null)
    .eq("da_xoa", false)
    .order("tao_luc", { ascending: true })
    .returns<CommentRow[]>();

  const commenterIds = Array.from(
    new Set((cmtRows ?? []).map((c) => c.nguoi_binh_luan)),
  );
  let commenters: Record<string, ProfileRow> = {};
  if (commenterIds.length > 0) {
    const { data: profiles } = await admin
      .from("user_nguoi_dung")
      .select("id, slug, ten_hien_thi, avatar_id")
      .in("id", commenterIds)
      .returns<ProfileRow[]>();
    commenters = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p]),
    );
  }

  const comments: MilestonePostComment[] = (cmtRows ?? []).map((c) => {
    const p = commenters[c.nguoi_binh_luan];
    return {
      id: c.id,
      noiDung: c.noi_dung,
      taoLuc: c.tao_luc,
      author: p
        ? {
            id: p.id,
            slug: p.slug,
            tenHienThi: p.ten_hien_thi || p.slug,
            avatarId: p.avatar_id,
          }
        : null,
      isOwn: viewerId === c.nguoi_binh_luan,
    };
  });

  const [{ count: likeCount }, { count: bookmarkCount }, viewerLiked, viewerBookmarked] =
    await Promise.all([
      admin
        .from("social_reaction")
        .select("id", { count: "exact", head: true })
        .eq("loai_doi_tuong", "cot_moc")
        .eq("id_doi_tuong", milestoneId)
        .eq("emoji", "heart"),
      admin
        .from("social_luu")
        .select("id", { count: "exact", head: true })
        .eq("loai_doi_tuong", "cot_moc")
        .eq("id_doi_tuong", milestoneId),
      viewerId
        ? admin
            .from("social_reaction")
            .select("id")
            .eq("id_nguoi_dung", viewerId)
            .eq("loai_doi_tuong", "cot_moc")
            .eq("id_doi_tuong", milestoneId)
            .eq("emoji", "heart")
            .maybeSingle()
            .then(({ data }) => Boolean(data))
        : Promise.resolve(false),
      viewerId
        ? admin
            .from("social_luu")
            .select("id")
            .eq("id_nguoi_dung", viewerId)
            .eq("loai_doi_tuong", "cot_moc")
            .eq("id_doi_tuong", milestoneId)
            .maybeSingle()
            .then(({ data }) => Boolean(data))
        : Promise.resolve(false),
    ]);

  return {
    ok: true,
    data: {
      milestone: {
        id: cotMoc.id,
        tieuDe: cotMoc.tieu_de,
        moTa: cotMoc.mo_ta,
        thoiDiem: cotMoc.thoi_diem,
        loaiMoc: cotMoc.loai_moc,
        cheDoHienThi: cotMoc.che_do_hien_thi,
      },
      owner,
      posts,
      comments,
      viewerCanComment: !!viewerId,
      viewerIsOwner: isOwner,
      social: {
        viewerLiked,
        viewerBookmarked,
        likeCount: likeCount ?? 0,
        bookmarkCount: bookmarkCount ?? 0,
      },
    },
  };
}

/* ──────────────────────────────────────────────────────────────────────
 * loadPostBySlug — resolve `/{ownerSlug}/p/{postSlug}` → MilestonePostDetail.
 *
 *   1. Lookup owner by `user_nguoi_dung.slug`.
 *   2. Lookup `content_tac_pham` by (id_nguoi_dung, slug).
 *   3. Tìm milestone đầu liên kết qua `content_tac_pham_thuoc_moc`
 *      (lấy `thu_tu` thấp nhất).
 *   4. Delegate sang `loadMilestoneDetail` để tái dùng query + visibility
 *      check + comments.
 *
 * Trả về `null` (404) khi owner/post không tồn tại; trả lỗi visibility khi
 * post là `chi_minh` và viewer không phải owner.
 * ────────────────────────────────────────────────────────────────────── */
export async function loadPostBySlug(
  ownerSlug: string,
  postSlug: string,
): Promise<ActionResult<MilestonePostDetail>> {
  if (!ownerSlug || !postSlug) {
    return { ok: false, error: "Thiếu thông tin bài viết." };
  }

  const admin = createServiceRoleClient();

  const { data: owner } = await admin
    .from("user_nguoi_dung")
    .select("id, slug")
    .eq("slug", ownerSlug)
    .maybeSingle<{ id: string; slug: string }>();
  if (!owner) {
    return { ok: false, error: "Người dùng không tồn tại." };
  }

  const { data: tacPham } = await admin
    .from("content_tac_pham")
    .select("id")
    .eq("id_nguoi_dung", owner.id)
    .eq("slug", postSlug)
    .maybeSingle<{ id: string }>();
  if (!tacPham) {
    return { ok: false, error: "Bài viết không tồn tại." };
  }

  const { data: link } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select("id_cot_moc, thu_tu")
    .eq("id_tac_pham", tacPham.id)
    .order("thu_tu", { ascending: true })
    .limit(1)
    .maybeSingle<{ id_cot_moc: string; thu_tu: number }>();
  if (!link) {
    return { ok: false, error: "Bài viết chưa gắn vào cột mốc nào." };
  }

  return loadMilestoneDetail(link.id_cot_moc);
}

async function loadPostContributors(
  admin: ReturnType<typeof createServiceRoleClient>,
  tacPhamIds: string[],
): Promise<Map<string, MilestonePostContributor[]>> {
  const out = new Map<string, MilestonePostContributor[]>();
  if (tacPhamIds.length === 0) return out;

  const { data: rows } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_tac_pham, id_nguoi_dung, vai_tro, la_chu_so_huu, thu_tu")
    .in("id_tac_pham", tacPhamIds)
    .eq("trang_thai", "accepted")
    .order("la_chu_so_huu", { ascending: false })
    .order("thu_tu", { ascending: true })
    .returns<TacGiaRow[]>();

  if (!rows?.length) return out;

  const userIds = [...new Set(rows.map((r) => r.id_nguoi_dung))];
  const { data: profiles } = await admin
    .from("user_nguoi_dung")
    .select("id, slug, ten_hien_thi, avatar_id")
    .in("id", userIds)
    .returns<ProfileRow[]>();
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  for (const row of rows) {
    const profile = profileById.get(row.id_nguoi_dung);
    const contributor: MilestonePostContributor = {
      id: row.id_nguoi_dung,
      slug: profile?.slug ?? "",
      tenHienThi: profile?.ten_hien_thi || profile?.slug || "Người dùng",
      avatarId: profile?.avatar_id ?? null,
      vaiTro: row.vai_tro,
      laChuSoHuu: row.la_chu_so_huu,
    };
    const list = out.get(row.id_tac_pham) ?? [];
    list.push(contributor);
    out.set(row.id_tac_pham, list);
  }

  return out;
}

const MAX_COMMENT_LEN = 1000;

export async function addMilestoneComment(
  milestoneId: string,
  noiDung: string,
): Promise<
  ActionResult<{
    id: string;
    noiDung: string;
    taoLuc: string;
    author: MilestonePostAuthor;
  }>
> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn." };
  }
  if (!milestoneId || typeof milestoneId !== "string") {
    return { ok: false, error: "Thiếu ID cột mốc." };
  }

  const text = (noiDung || "").trim();
  if (!text) return { ok: false, error: "Nội dung bình luận trống." };
  if (text.length > MAX_COMMENT_LEN) {
    return {
      ok: false,
      error: `Bình luận tối đa ${MAX_COMMENT_LEN} ký tự.`,
    };
  }

  const admin = createServiceRoleClient();

  /* Kiểm tra cột mốc tồn tại + visibility — chặn comment vào private. */
  const { data: cotMoc } = await admin
    .from("content_cot_moc")
    .select("id, id_nguoi_dung, che_do_hien_thi")
    .eq("id", milestoneId)
    .maybeSingle<{
      id: string;
      id_nguoi_dung: string;
      che_do_hien_thi: "public" | "theo_nhom" | "chi_minh" | "feature";
    }>();
  if (!cotMoc) {
    return { ok: false, error: "Cột mốc không tồn tại." };
  }
  if (
    cotMoc.che_do_hien_thi === "chi_minh" &&
    cotMoc.id_nguoi_dung !== session.profile.id
  ) {
    return { ok: false, error: "Cột mốc đang ở chế độ riêng tư." };
  }

  const { data: inserted, error } = await admin
    .from("social_binh_luan")
    .insert({
      nguoi_binh_luan: session.profile.id,
      loai_doi_tuong: "cot_moc",
      id_doi_tuong: milestoneId,
      noi_dung: text,
    })
    .select("id, tao_luc, noi_dung")
    .single<{ id: string; tao_luc: string; noi_dung: string }>();

  if (error || !inserted) {
    return {
      ok: false,
      error: "Không gửi được bình luận: " + (error?.message ?? "unknown"),
    };
  }

  /* Owner Journey path — revalidate để counter "n bình luận" reflect đúng. */
  const { data: ownerProfile } = await admin
    .from("user_nguoi_dung")
    .select("slug")
    .eq("id", cotMoc.id_nguoi_dung)
    .maybeSingle<{ slug: string }>();
  if (ownerProfile?.slug) {
    revalidatePath(`/${ownerProfile.slug}`);
  }
  await notifyMilestoneComment({
    ownerId: cotMoc.id_nguoi_dung,
    commenterId: session.profile.id,
    milestoneId: cotMoc.id,
  });

  return {
    ok: true,
    data: {
      id: inserted.id,
      noiDung: inserted.noi_dung,
      taoLuc: inserted.tao_luc,
      author: {
        id: session.profile.id,
        slug: session.profile.slug,
        tenHienThi:
          session.profile.ten_hien_thi || session.profile.slug,
        avatarId: session.profile.avatar_id,
      },
    },
  };
}

export async function deleteMilestoneComment(
  commentId: string,
): Promise<ActionResult<null>> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn." };
  }
  if (!commentId || typeof commentId !== "string") {
    return { ok: false, error: "Thiếu ID bình luận." };
  }

  const admin = createServiceRoleClient();
  const { data: cmt } = await admin
    .from("social_binh_luan")
    .select("id, nguoi_binh_luan, id_doi_tuong")
    .eq("id", commentId)
    .maybeSingle<{
      id: string;
      nguoi_binh_luan: string;
      id_doi_tuong: string;
    }>();
  if (!cmt) {
    return { ok: false, error: "Bình luận không tồn tại." };
  }
  if (cmt.nguoi_binh_luan !== session.profile.id) {
    return { ok: false, error: "Bạn không có quyền xoá bình luận này." };
  }

  const { error } = await admin
    .from("social_binh_luan")
    .update({ da_xoa: true })
    .eq("id", commentId);
  if (error) {
    return { ok: false, error: "Không xoá được bình luận: " + error.message };
  }

  return { ok: true, data: null };
}

/**
 * Cập nhật nội dung bình luận của user hiện tại. Chỉ author của comment
 * sửa được — không cho admin override (tránh impersonation). Trả về
 * `noiDung` đã trim sau khi update để client cập nhật state ngay (không
 * cần refetch).
 */
export async function editMilestoneComment(
  commentId: string,
  noiDung: string,
): Promise<ActionResult<{ id: string; noiDung: string }>> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn." };
  }
  if (!commentId || typeof commentId !== "string") {
    return { ok: false, error: "Thiếu ID bình luận." };
  }

  const text = (noiDung || "").trim();
  if (!text) return { ok: false, error: "Nội dung bình luận trống." };
  if (text.length > MAX_COMMENT_LEN) {
    return {
      ok: false,
      error: `Bình luận tối đa ${MAX_COMMENT_LEN} ký tự.`,
    };
  }

  const admin = createServiceRoleClient();
  const { data: cmt } = await admin
    .from("social_binh_luan")
    .select("id, nguoi_binh_luan, da_xoa")
    .eq("id", commentId)
    .maybeSingle<{ id: string; nguoi_binh_luan: string; da_xoa: boolean }>();
  if (!cmt) {
    return { ok: false, error: "Bình luận không tồn tại." };
  }
  if (cmt.nguoi_binh_luan !== session.profile.id) {
    return { ok: false, error: "Bạn không có quyền sửa bình luận này." };
  }
  if (cmt.da_xoa) {
    return { ok: false, error: "Bình luận đã bị xoá, không thể sửa." };
  }

  const { error } = await admin
    .from("social_binh_luan")
    .update({ noi_dung: text })
    .eq("id", commentId);
  if (error) {
    return { ok: false, error: "Không sửa được bình luận: " + error.message };
  }

  return { ok: true, data: { id: commentId, noiDung: text } };
}

/* ──────────────────────────────────────────────────────────────────────
 * parseServerBlocks — defensive parse `content_tac_pham.noi_dung_blocks`
 * (jsonb / unknown) sang canonical `ServerBlock[]`.
 *
 * Bỏ qua silent các phần tử không hợp lệ → trả mảng rỗng nếu data hỏng.
 * Sắp xếp theo `thu_tu` để consumer không cần re-sort.
 * ────────────────────────────────────────────────────────────────────── */
function parseServerBlocks(raw: unknown): ServerBlock[] | null {
  if (raw === null || raw === undefined) return null;
  if (!Array.isArray(raw)) return null;
  const out: ServerBlock[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (typeof obj.loai !== "string") continue;
    out.push({
      id: typeof obj.id === "string" ? obj.id : `b-${out.length}`,
      loai: obj.loai as ServerBlock["loai"],
      thu_tu: typeof obj.thu_tu === "number" ? obj.thu_tu : out.length,
      config:
        obj.config && typeof obj.config === "object"
          ? (obj.config as Record<string, unknown>)
          : {},
    });
  }
  out.sort((a, b) => a.thu_tu - b.thu_tu);
  return out;
}
