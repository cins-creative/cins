import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { SuKienInput } from "@/lib/social/su-kien-constants";

const BOT_UA =
  /bot|crawler|spider|crawling|facebookexternalhit|whatsapp|telegram|slackbot|twitterbot|linkedinbot|googlebot|bingbot|yandex|baiduspider|preview|embed|headless/i;

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua?.trim()) return false;
  return BOT_UA.test(ua);
}

/**
 * Bỏ event do chính chủ đối tượng (không đếm vanity tự xem).
 * Khách chưa đăng nhập giữ nguyên.
 */
export async function dropOwnerSelfEvents(
  events: SuKienInput[],
  nguoiXemId: string | null,
): Promise<SuKienInput[]> {
  if (!nguoiXemId || events.length === 0) return events;

  const shopIds = [
    ...new Set(
      events
        .filter((e) => e.loai_doi_tuong === "shop_san_pham")
        .map((e) => e.id_doi_tuong),
    ),
  ];
  const mocIds = [
    ...new Set(
      events
        .filter((e) => e.loai_doi_tuong === "cot_moc")
        .map((e) => e.id_doi_tuong),
    ),
  ];
  const voucherIds = [
    ...new Set(
      events
        .filter((e) => e.loai_doi_tuong === "shop_voucher")
        .map((e) => e.id_doi_tuong),
    ),
  ];

  const ownShop = new Set<string>();
  const ownMoc = new Set<string>();
  const ownVoucher = new Set<string>();
  const admin = createServiceRoleClient();

  if (shopIds.length > 0) {
    const { data } = await admin
      .from("shop_san_pham")
      .select("id")
      .eq("id_nguoi_dung", nguoiXemId)
      .in("id", shopIds)
      .returns<Array<{ id: string }>>();
    for (const r of data ?? []) ownShop.add(r.id);
  }
  if (mocIds.length > 0) {
    const { data } = await admin
      .from("content_cot_moc")
      .select("id")
      .eq("id_nguoi_dung", nguoiXemId)
      .in("id", mocIds)
      .returns<Array<{ id: string }>>();
    for (const r of data ?? []) ownMoc.add(r.id);
  }
  if (voucherIds.length > 0) {
    const { data } = await admin
      .from("shop_voucher")
      .select("id, id_nguoi_dung")
      .eq("id_nguoi_dung", nguoiXemId)
      .in("id", voucherIds)
      .returns<Array<{ id: string }>>();
    for (const r of data ?? []) ownVoucher.add(r.id);
  }

  return events.filter((e) => {
    if (e.loai_doi_tuong === "nguoi_dung" && e.id_doi_tuong === nguoiXemId) {
      return false;
    }
    if (e.loai_doi_tuong === "shop_san_pham" && ownShop.has(e.id_doi_tuong)) {
      return false;
    }
    if (e.loai_doi_tuong === "cot_moc" && ownMoc.has(e.id_doi_tuong)) {
      return false;
    }
    if (e.loai_doi_tuong === "shop_voucher" && ownVoucher.has(e.id_doi_tuong)) {
      return false;
    }
    return true;
  });
}
