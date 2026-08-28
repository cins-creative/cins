import "server-only";

import { cache } from "react";

import type { GiaiDoan } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type JourneyOwnerRow = {
  id: string;
  auth_user_id: string;
  slug: string;
  ten_hien_thi: string | null;
  avatar_id: string | null;
  cover_id: string | null;
  bio: string | null;
  ai_summary_journey: string | null;
  giai_doan: GiaiDoan | null;
  tinh_thanh: string | null;
  email_lien_he: string | null;
  visibility_email: string | null;
  /** Thông tin nhận hàng (shop) — họ tên thật, SĐT, địa chỉ chi tiết + visibility. */
  ho_ten_nhan: string | null;
  visibility_ho_ten_nhan: string | null;
  so_dien_thoai: string | null;
  visibility_sdt: string | null;
  dia_chi_chi_tiet: string | null;
  visibility_dia_chi: string | null;
  mxh_links: unknown;
  cho_phep_chat_an_danh: boolean | null;
  journey_loai_moc_visibility: Record<string, unknown> | null;
  /** Chế độ hiển thị mặc định khi người khác vào trang: timeline | gallery | gallery_luoi. */
  journey_mac_dinh_view: string | null;
  /** true → áp chế độ mặc định cho cả chính chủ khi tự mở trang mình. */
  journey_mac_dinh_ap_dung_toi: boolean | null;
  /** JSON string — ShareOgThemeState (thẻ share / OG). */
  theme: string | null;
  /** Tùy chỉnh giao diện trang hồ sơ (accent + pattern). Không phải share OG. */
  giao_dien: unknown;
  /** Opt-in bán hàng UGC (L33). */
  ban_hang_bat: boolean | null;
  shop_hien_thi: boolean | null;
};

const OWNER_SELECT =
  "id, auth_user_id, slug, ten_hien_thi, avatar_id, cover_id, bio, ai_summary_journey, giai_doan, tinh_thanh, email_lien_he, visibility_email, ho_ten_nhan, visibility_ho_ten_nhan, so_dien_thoai, visibility_sdt, dia_chi_chi_tiet, visibility_dia_chi, mxh_links, cho_phep_chat_an_danh, journey_loai_moc_visibility, journey_mac_dinh_view, journey_mac_dinh_ap_dung_toi, theme, giao_dien, ban_hang_bat, shop_hien_thi";

export const fetchOwnerBySlug = cache(async (slug: string) => {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_nguoi_dung")
    .select(OWNER_SELECT)
    .eq("slug", slug)
    .maybeSingle<JourneyOwnerRow>();

  return { owner: data, error };
});
