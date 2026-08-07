/**
 * Cloudflare Workers scheduled — billing cron (P2).
 *
 * Entry: `worker.ts` (custom OpenNext worker) gọi `runBillingScheduled`.
 * Fallback khi chưa deploy scheduled: GitHub Actions `billing-cron.yml`
 * → POST /api/noi-bo/billing/cron.
 */

export type BillingScheduledEnv = {
  CSDT_PHI_CRON_SECRET?: string;
  CINS_NOI_BO_SHOP_PHI_SECRET?: string;
  NEXT_PUBLIC_SITE_URL?: string;
};

function billingCronUrl(env: BillingScheduledEnv): string {
  const base =
    env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "https://cins.vn";
  return `${base}/api/noi-bo/billing/cron`;
}

export async function runBillingScheduled(
  _controller: unknown,
  env: BillingScheduledEnv,
  ctx: { waitUntil: (p: Promise<unknown>) => void },
): Promise<void> {
  const secret =
    env.CSDT_PHI_CRON_SECRET?.trim() ||
    env.CINS_NOI_BO_SHOP_PHI_SECRET?.trim();
  if (!secret) {
    console.error("[scheduled] thiếu CSDT_PHI_CRON_SECRET");
    return;
  }

  const url = billingCronUrl(env);
  ctx.waitUntil(
    fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    }).then(async (res) => {
      if (!res.ok) {
        console.error(
          "[scheduled] billing cron",
          url,
          res.status,
          await res.text(),
        );
      } else {
        console.info("[scheduled] billing cron ok", url, res.status);
      }
    }),
  );
}

/** @deprecated Dùng `runBillingScheduled` từ `worker.ts`. */
export async function scheduled(
  controller: unknown,
  env: BillingScheduledEnv,
  ctx: { waitUntil: (p: Promise<unknown>) => void },
): Promise<void> {
  return runBillingScheduled(controller, env, ctx);
}
