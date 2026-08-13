/**
 * Cloudflare Workers scheduled — billing cron (P2) + social đo lường.
 *
 * Entry: `worker.ts` (custom OpenNext worker) gọi `runBillingScheduled`.
 * Cron 01:00 UTC = billing + social. Cron mỗi 6 giờ = chỉ social.
 * Fallback: GitHub Actions `billing-cron.yml` + `social-cron.yml`.
 */

export type BillingScheduledEnv = {
  CSDT_PHI_CRON_SECRET?: string;
  CINS_NOI_BO_SHOP_PHI_SECRET?: string;
  NEXT_PUBLIC_SITE_URL?: string;
};

function siteBase(env: BillingScheduledEnv): string {
  return (
    env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "https://cins.vn"
  );
}

function billingCronUrl(env: BillingScheduledEnv): string {
  return `${siteBase(env)}/api/noi-bo/billing/cron`;
}

function socialCronUrl(env: BillingScheduledEnv): string {
  return `${siteBase(env)}/api/noi-bo/social/cron`;
}

function cronExpr(controller: unknown): string {
  if (controller && typeof controller === "object" && "cron" in controller) {
    const c = (controller as { cron?: unknown }).cron;
    return typeof c === "string" ? c : "";
  }
  return "";
}

export async function runBillingScheduled(
  controller: unknown,
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

  const cron = cronExpr(controller);
  const chiSocial = cron === "0 */6 * * *";

  if (!chiSocial) {
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

  const socialUrl = socialCronUrl(env);
  ctx.waitUntil(
    fetch(socialUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "x-cins-cron-nguon": "worker",
      },
    }).then(async (res) => {
      if (!res.ok) {
        console.error(
          "[scheduled] social cron",
          socialUrl,
          res.status,
          await res.text(),
        );
      } else {
        console.info("[scheduled] social cron ok", socialUrl, res.status);
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
