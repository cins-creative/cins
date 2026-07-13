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
  mxh_links: unknown;
  cho_phep_chat_an_danh: boolean | null;
  journey_loai_moc_visibility: Record<string, unknown> | null;
  /** Chế độ hiển thị mặc định khi người khác vào trang: timeline | gallery | gallery_luoi. */
  journey_mac_dinh_view: string | null;
  /** true → áp chế độ mặc định cho cả chính chủ khi tự mở trang mình. */
  journey_mac_dinh_ap_dung_toi: boolean | null;
  /** JSON string — ShareOgThemeState (thẻ share / OG). */
  theme: string | null;
};

const OWNER_SELECT =
  "id, auth_user_id, slug, ten_hien_thi, avatar_id, cover_id, bio, ai_summary_journey, giai_doan, tinh_thanh, email_lien_he, visibility_email, mxh_links, cho_phep_chat_an_danh, journey_loai_moc_visibility, journey_mac_dinh_view, journey_mac_dinh_ap_dung_toi, theme";

export const fetchOwnerBySlug = cache(async (slug: string) => {
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("user_nguoi_dung")
    .select(OWNER_SELECT)
    .eq("slug", slug)
    .maybeSingle<JourneyOwnerRow>();

  return { owner: data, error };
});
