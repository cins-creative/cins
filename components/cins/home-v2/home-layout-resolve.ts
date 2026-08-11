import type { HomeCapability } from "@/lib/cins/home-adaptive/capability-types";
import type { ResolvedHomeLayout } from "@/lib/cins/home-adaptive/layout-prefs";

/** Payload layout trang chủ — truyền Promise từ RSC sang client (`use`). */
export type HomeLayoutResolvePayload = {
  layout: ResolvedHomeLayout;
  capabilityList: HomeCapability[];
};
