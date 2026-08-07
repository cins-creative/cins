import "server-only";

import { getBillingHubForUser } from "@/lib/billing/hub";
import type { BillingJourneyPin } from "@/lib/billing/types";

export type { BillingJourneyPin };

/**
 * Ghim đầu Journey (chỉ chủ thể): còn nợ phí thì trả pin; hết nợ → null.
 * Cùng nguồn với hub `/tai-khoan/thanh-toan`.
 */
export async function getBillingJourneyPin(
  userId: string,
): Promise<BillingJourneyPin | null> {
  const hub = await getBillingHubForUser(userId);
  if (!hub.tongNoVnd || hub.tongNoVnd <= 0) return null;

  const soHoaDonNo = hub.hoaDon.filter((h) => h.conNoVnd > 0).length;
  const soKyFallback = hub.theoDichVu.reduce(
    (s, d) => s + (d.soKyNo ?? 0),
    0,
  );
  return {
    tongNoVnd: hub.tongNoVnd,
    soHoaDonNo: soHoaDonNo > 0 ? soHoaDonNo : soKyFallback,
    hanTraGanNhat: hub.hanTraGanNhat,
  };
}
