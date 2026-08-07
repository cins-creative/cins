import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

import {
  ensureDichVu,
  getOrCreateTk,
  resolveOrgBillingOwner,
} from "./tk";

export type BackfillReport = {
  multiOwnerOrgs: Array<{
    orgId: string;
    ten: string | null;
    ownerIds: string[];
    chosenOwnerId: string;
  }>;
  orgLinked: number;
  orgSkippedNoOwner: number;
  shopLinked: number;
  tkCreated: number;
  errors: string[];
};

/**
 * Backfill dòng dịch vụ từ nguồn phí cũ.
 * - Org có org_phi_dong hoặc org_phi_ky → csdt_phi gắn owner sớm nhất.
 * - Seller có shop_phi_ky hoặc shop_cua_hang → shop_phi.
 * Org nhiều owner: chọn sớm nhất, ghi vào multiOwnerOrgs để rà tay.
 */
export async function backfillCinsTkThanhToan(opts?: {
  dryRun?: boolean;
}): Promise<BackfillReport> {
  const dryRun = opts?.dryRun === true;
  const admin = createServiceRoleClient();
  const report: BackfillReport = {
    multiOwnerOrgs: [],
    orgLinked: 0,
    orgSkippedNoOwner: 0,
    shopLinked: 0,
    tkCreated: 0,
    errors: [],
  };

  const orgIds = new Set<string>();

  const { data: kyOrgs } = await admin
    .from("org_phi_ky")
    .select("id_to_chuc");
  for (const r of kyOrgs ?? []) {
    if (r.id_to_chuc) orgIds.add(r.id_to_chuc as string);
  }
  const { data: dongOrgs } = await admin
    .from("org_phi_dong")
    .select("id_to_chuc");
  for (const r of dongOrgs ?? []) {
    if (r.id_to_chuc) orgIds.add(r.id_to_chuc as string);
  }

  for (const orgId of orgIds) {
    try {
      const { data: members } = await admin
        .from("user_thanh_vien_to_chuc")
        .select("id_nguoi_dung, tu_ngay, id")
        .eq("id_to_chuc", orgId)
        .eq("vai_tro", "owner")
        .order("tu_ngay", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true });

      const owners = (members ?? []) as Array<{
        id_nguoi_dung: string;
        tu_ngay: string | null;
        id: string;
      }>;

      const resolved = await resolveOrgBillingOwner(orgId);
      if (!resolved.ownerId) {
        report.orgSkippedNoOwner += 1;
        report.errors.push(`Org ${orgId}: không có owner / nguoi_tao`);
        continue;
      }

      if (owners.length > 1) {
        const { data: org } = await admin
          .from("org_to_chuc")
          .select("ten")
          .eq("id", orgId)
          .maybeSingle<{ ten: string | null }>();
        report.multiOwnerOrgs.push({
          orgId,
          ten: org?.ten ?? null,
          ownerIds: owners.map((o) => o.id_nguoi_dung),
          chosenOwnerId: resolved.ownerId,
        });
      }

      if (dryRun) {
        report.orgLinked += 1;
        continue;
      }

      const before = await admin
        .from("cins_tk_thanh_toan")
        .select("id")
        .eq("id_nguoi_dung", resolved.ownerId)
        .maybeSingle<{ id: string }>();
      const tk = await getOrCreateTk(resolved.ownerId);
      if (!before?.id) report.tkCreated += 1;

      await ensureDichVu({
        idTk: tk.id,
        loai: "csdt_phi",
        thamChieuId: orgId,
      });
      report.orgLinked += 1;
    } catch (e) {
      report.errors.push(
        `Org ${orgId}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  const sellerIds = new Set<string>();
  const { data: shopKys } = await admin
    .from("shop_phi_ky")
    .select("id_nguoi_ban");
  for (const r of shopKys ?? []) {
    if (r.id_nguoi_ban) sellerIds.add(r.id_nguoi_ban as string);
  }
  const { data: shops } = await admin
    .from("shop_cua_hang")
    .select("id_nguoi_dung");
  for (const r of shops ?? []) {
    if (r.id_nguoi_dung) sellerIds.add(r.id_nguoi_dung as string);
  }

  for (const sellerId of sellerIds) {
    try {
      if (dryRun) {
        report.shopLinked += 1;
        continue;
      }
      const before = await admin
        .from("cins_tk_thanh_toan")
        .select("id")
        .eq("id_nguoi_dung", sellerId)
        .maybeSingle<{ id: string }>();
      const tk = await getOrCreateTk(sellerId);
      if (!before?.id) report.tkCreated += 1;
      await ensureDichVu({
        idTk: tk.id,
        loai: "shop_phi",
        thamChieuId: sellerId,
      });
      report.shopLinked += 1;
    } catch (e) {
      report.errors.push(
        `Seller ${sellerId}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return report;
}
