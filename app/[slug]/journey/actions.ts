"use server";

import { revalidatePath } from "next/cache";

import type { GiaiDoan } from "@/lib/auth/session";
import { getCurrentSessionAndProfile } from "@/lib/auth/session";
import {
  VALID_LOAI_MOC,
  VALID_VIS,
  type LoaiMoc,
  type Visibility,
} from "@/lib/editor/types";
import type { ActionResult } from "@/lib/journey/action-result";
import {
  FOREIGN_JOURNEY_VISIBILITY_VALUES,
  type ForeignJourneyVisibility,
} from "@/lib/journey/foreign-milestone-visibility";
import { graduateCongDongMilestone } from "@/lib/journey/graduate-cong-dong-milestone";
import type {
  MilestonePostAuthor,
  MilestonePostDetail,
} from "@/lib/journey/milestone-post-types";
import {
  fetchMilestonePostDetail,
  fetchPostBySlug,
} from "@/lib/journey/post-page-fetch";
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
  "co-so-dao-tao",
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

export type { ActionResult } from "@/lib/journey/action-result";
export type {
  MilestonePostAuthor,
  MilestonePostComment,
  MilestonePostContent,
  MilestonePostContributor,
  MilestonePostDetail,
} from "@/lib/journey/milestone-post-types";

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

/** Chủ cột mốc hoặc đồng tác giả đã chấp nhận — đổi nhóm filter / hiển thị trên Journey. */
async function requireMilestoneEditorAccess(
  milestoneId: string,
): Promise<MilestoneOwnership> {
  const owner = await requireMilestoneOwnership(milestoneId);
  if (owner.ok) return owner;

  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn." };
  }

  const admin = createServiceRoleClient();
  const { data: links } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select("id_tac_pham")
    .eq("id_cot_moc", milestoneId)
    .returns<Array<{ id_tac_pham: string }>>();

  const tacPhamIds = (links ?? []).map((l) => l.id_tac_pham).filter(Boolean);
  if (tacPhamIds.length === 0) {
    return { ok: false, error: "Bạn không có quyền chỉnh cột mốc này." };
  }

  const { data: coRow } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_tac_pham")
    .in("id_tac_pham", tacPhamIds)
    .eq("id_nguoi_dung", session.profile.id)
    .eq("trang_thai", "accepted")
    .eq("la_chu_so_huu", false)
    .limit(1)
    .maybeSingle();

  if (!coRow) {
    return { ok: false, error: "Bạn không có quyền chỉnh cột mốc này." };
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
  const owner = await requireMilestoneEditorAccess(milestoneId);
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
  const owner = await requireMilestoneEditorAccess(milestoneId);
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

/** Rời feed cộng đồng — đổi `che_do_hien_thi` khỏi `cong_dong`, gỡ nhãn org feed. */
export async function graduateCongDongMilestoneAction(input: {
  milestoneId: string;
  visibility?: Visibility;
  loaiMoc?: LoaiMoc;
  personalFilterSlug?: string | null;
}): Promise<ActionResult<null>> {
  const owner = await requireMilestoneOwnership(input.milestoneId);
  if (!owner.ok) return { ok: false, error: owner.error };

  const result = await graduateCongDongMilestone({
    milestoneId: input.milestoneId,
    userId: owner.profileId,
    visibility: input.visibility,
    loaiMoc: input.loaiMoc,
    personalFilterSlug: input.personalFilterSlug,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/${owner.profileSlug}`);
  return { ok: true, data: null };
}

/** Tagged / Lưu về — đổi hiển thị trên Journey của viewer, không sửa `content_cot_moc` gốc. */
export async function updateForeignMilestoneJourneyVisibility(input: {
  variant: "tagged" | "bookmark";
  cotMocId: string;
  tacPhamId: string;
  visibility: Visibility;
}): Promise<ActionResult<null>> {
  const session = await getCurrentSessionAndProfile();
  if (!session?.profile) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn." };
  }

  const { variant, cotMocId, tacPhamId, visibility } = input;
  if (!cotMocId || !tacPhamId) {
    return { ok: false, error: "Thiếu thông tin cột mốc." };
  }

  const journeyVis: ForeignJourneyVisibility =
    visibility === "feature"
      ? "feature"
      : visibility === "chi_minh" || visibility === "theo_nhom"
        ? "chi_minh"
        : "public";

  if (!FOREIGN_JOURNEY_VISIBILITY_VALUES.includes(journeyVis)) {
    return { ok: false, error: "Chế độ hiển thị không hợp lệ." };
  }

  const admin = createServiceRoleClient();

  if (variant === "tagged") {
    const { data: row, error } = await admin
      .from("content_tac_pham_tac_gia")
      .update({ che_do_hien_thi_journey: journeyVis })
      .eq("id_tac_pham", tacPhamId)
      .eq("id_nguoi_dung", session.profile.id)
      .eq("trang_thai", "accepted")
      .eq("la_chu_so_huu", false)
      .select("id_tac_pham")
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        error: "Không đổi được chế độ hiển thị: " + error.message,
      };
    }
    if (!row) {
      return { ok: false, error: "Bạn không có quyền chỉnh cột mốc này." };
    }
  } else {
    const cheDoLuu = journeyVis === "chi_minh" ? "private" : "public";
    const { data: row, error } = await admin
      .from("social_luu")
      .update({ che_do_hien_thi: cheDoLuu })
      .eq("id_nguoi_dung", session.profile.id)
      .eq("loai_doi_tuong", "cot_moc")
      .eq("id_doi_tuong", cotMocId)
      .select("id_doi_tuong")
      .maybeSingle();

    if (error) {
      return {
        ok: false,
        error: "Không đổi được chế độ hiển thị: " + error.message,
      };
    }
    if (!row) {
      return { ok: false, error: "Bạn không có quyền chỉnh mục Lưu về này." };
    }
  }

  revalidatePath(`/${session.profile.slug}`);
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

export async function loadMilestoneDetail(
  milestoneId: string,
): Promise<ActionResult<MilestonePostDetail>> {
  return fetchMilestonePostDetail(milestoneId);
}

export async function loadPostBySlug(
  ownerSlug: string,
  postSlug: string,
): Promise<ActionResult<MilestonePostDetail>> {
  return fetchPostBySlug(ownerSlug, postSlug);
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
    commentId: inserted.id,
    milestoneId,
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
