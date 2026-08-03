import { cookies } from "next/headers";

import { HangFeaturePanel } from "@/components/cins/home-adaptive/modules/HangFeatureClient";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import { moduleItemLimit } from "@/components/cins/home-adaptive/types";
import {
  loadHangFeature,
  parseHangFeatureSeenCookie,
} from "@/lib/cins/home-adaptive/hang-feature";
import { HANG_FEATURE_SEEN_COOKIE } from "@/lib/cins/home-adaptive/hang-feature-types";

/** Chung · Hàng feature — SP nổi bật shop bạn bè + discovery; click → loại hàng. */
export async function HangFeatureModule({ ctx }: { ctx: HomeModuleCtx }) {
  const jar = await cookies();
  const excludeIds = parseHangFeatureSeenCookie(
    jar.get(HANG_FEATURE_SEEN_COOKIE)?.value,
  );
  const limit = moduleItemLimit(ctx, "hang_feature");
  const items = await loadHangFeature(ctx.viewerId, {
    limit,
    excludeIds,
  });

  return <HangFeaturePanel initialItems={items} limit={limit} />;
}
