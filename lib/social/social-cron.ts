import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service-role";

/** Ngày lịch VN (YYYY-MM-DD) + offset ngày. Không dùng UTC — cron 6h chạy lúc UTC/VN lệch ngày. */
export function ymdVn(offsetDays: number): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = fmt.format(new Date()).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + offsetDays));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

async function rpcNgay(
  name: string,
  ngay: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createServiceRoleClient();
  const { error } = await admin.rpc(name, { p_ngay: ngay });
  if (error) {
    console.error(`[social-cron] ${name}`, ngay, error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

async function ghiLog(
  ten: string,
  ok: boolean,
  chiTiet: Record<string, unknown>,
): Promise<void> {
  const admin = createServiceRoleClient();
  const { error } = await admin.from("cins_cron_log").insert({
    ten,
    ok,
    chi_tiet: chiTiet,
  });
  if (error) {
    console.error("[social-cron] log", error.message);
  }
}

export type SocialCronResult = {
  ok: boolean;
  skipped?: string;
  partition?: unknown;
  rollup: Record<string, unknown>;
  scrub?: unknown;
};

/**
 * Cron đo lường: lease → partition (DEFAULT + 3 tháng) → rollup hôm qua + hôm nay
 * (ngày VN) → scrub danh tính người xem cửa sổ ~90 ngày.
 */
export async function runSocialCron(opts?: {
  nguon?: string;
}): Promise<SocialCronResult> {
  const admin = createServiceRoleClient();
  const nguon = opts?.nguon?.trim() || "http";
  const rollup: Record<string, unknown> = {};

  const { data: gotLease, error: leaseErr } = await admin.rpc(
    "cins_cron_giu_lease",
    { p_ten: "social", p_giay: 600, p_nguon: nguon },
  );
  if (leaseErr) {
    console.error("[social-cron] lease", leaseErr.message);
    const out: SocialCronResult = {
      ok: false,
      partition: { error: leaseErr.message },
      rollup,
    };
    await ghiLog("social", false, { nguon, ...out });
    return out;
  }
  if (!gotLease) {
    const out: SocialCronResult = {
      ok: true,
      skipped: "lease",
      rollup,
    };
    await ghiLog("social", true, { nguon, skipped: "lease" });
    return out;
  }

  let partition: unknown = { ok: true };
  let scrub: unknown;
  let ok = true;

  try {
    const { data: partData, error: partErr } = await admin.rpc(
      "social_ensure_partition",
      { p_so_thang: 3 },
    );
    if (partErr) {
      console.error("[social-cron] partition", partErr.message);
      ok = false;
      partition = { error: partErr.message };
      return { ok: false, partition, rollup };
    }
    const tao = typeof partData === "string" ? partData : null;
    if (tao?.includes("LOI:")) {
      console.error("[social-cron] partition LOI", tao);
      ok = false;
      partition = { error: tao };
      return { ok: false, partition, rollup };
    }
    partition = { ok: true, tao };

    const days = [ymdVn(-1), ymdVn(0)];
    const fns = [
      "social_rollup_su_kien",
      "social_rollup_nguon",
      "social_rollup_nhom",
      "shop_rollup_san_pham",
      "social_rollup_da_xem",
    ] as const;
    for (const ngay of days) {
      const dayOut: Record<string, unknown> = {};
      for (const fn of fns) {
        const r = await rpcNgay(fn, ngay);
        dayOut[fn] = r;
        if (!r.ok) ok = false;
      }
      rollup[ngay] = dayOut;
    }

    const thangSet = new Set(
      days.map((d) => `${d.slice(0, 7)}-01`),
    );
    const thangOut: Record<string, unknown> = {};
    for (const thang of thangSet) {
      const { error: thangErr } = await admin.rpc("social_rollup_thang", {
        p_thang: thang,
      });
      if (thangErr) {
        console.error("[social-cron] social_rollup_thang", thang, thangErr.message);
        ok = false;
        thangOut[thang] = { ok: false, error: thangErr.message };
      } else {
        thangOut[thang] = { ok: true };
      }
    }
    rollup.thang = thangOut;

    const { error: demErr } = await admin.rpc("social_rollup_dem_doi_tuong");
    if (demErr) {
      console.error("[social-cron] social_rollup_dem_doi_tuong", demErr.message);
      ok = false;
      rollup.dem_doi_tuong = { ok: false, error: demErr.message };
    } else {
      rollup.dem_doi_tuong = { ok: true };
    }

    const truoc = ymdVn(-90);
    const { error: scrubErr } = await admin.rpc("social_xoa_danh_tinh_cu", {
      p_truoc_ngay: truoc,
    });
    if (scrubErr) {
      console.error("[social-cron] scrub", scrubErr.message);
      ok = false;
      scrub = { error: scrubErr.message };
    } else {
      scrub = { truoc };
    }

    return { ok, partition, rollup, scrub };
  } finally {
    const { error: traErr } = await admin.rpc("cins_cron_tra_lease", {
      p_ten: "social",
    });
    if (traErr) {
      console.error("[social-cron] tra-lease", traErr.message);
    }
    await ghiLog("social", ok, { nguon, partition, rollup, scrub });
  }
}
