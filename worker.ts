/**
 * Custom Cloudflare Worker entry — OpenNext fetch + billing Cron Triggers.
 * @see https://opennext.js.org/cloudflare/howtos/custom-worker
 *
 * Build trước khi deploy (`opennextjs-cloudflare build`) để có `.open-next/worker.js`.
 * Test cron local: `wrangler dev --test-scheduled` rồi
 * `curl "http://localhost:8787/__scheduled?cron=0+1+*+*+*"`
 */

// @ts-expect-error `.open-next/worker.js` sinh lúc build
import { default as handler } from "./.open-next/worker.js";

import { runBillingScheduled } from "./workers/scheduled";

export default {
  fetch: handler.fetch,

  async scheduled(
    controller: ScheduledController,
    env: CloudflareEnv,
    ctx: ExecutionContext,
  ): Promise<void> {
    await runBillingScheduled(
      controller,
      env as CloudflareEnv & {
        CSDT_PHI_CRON_SECRET?: string;
        CINS_NOI_BO_SHOP_PHI_SECRET?: string;
        NEXT_PUBLIC_SITE_URL?: string;
      },
      ctx,
    );
  },
} satisfies ExportedHandler<CloudflareEnv>;

/* Re-export nếu adapter bật DO queue / tag cache (mặc định OpenNext). */
// @ts-expect-error `.open-next/worker.js` sinh lúc build
export { DOQueueHandler, DOShardedTagCache } from "./.open-next/worker.js";
