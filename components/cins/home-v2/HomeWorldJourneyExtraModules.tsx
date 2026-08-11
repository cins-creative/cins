import { renderHomeModules } from "@/components/cins/home-adaptive/HomeModuleColumn";
import type { HomeModuleCtx } from "@/components/cins/home-adaptive/types";
import {
  loadHomeCapabilities,
  serializeHomeCapabilities,
} from "@/lib/cins/home-adaptive/capabilities";
import { loadHomeLayoutRaw } from "@/lib/cins/home-adaptive/home-layout-store";
import { resolveHomeLayout } from "@/lib/cins/home-adaptive/layout-prefs";
import type {
  GiaiDoan,
  ModuleId,
  Persona,
} from "@/lib/cins/home-adaptive/persona";

type Props = {
  viewerId: string;
  viewerSlug: string;
  persona: Persona;
  seeking: boolean;
  giaiDoan: GiaiDoan;
  /** Module đã seed từ layout mặc định — bỏ qua để tránh trùng key. */
  defaultModuleIds: readonly ModuleId[];
};

/**
 * Module nằm ngoài layout mặc định (prefs user / capability) — stream sau feed.
 * `loadHomeLayoutRaw` / capabilities đã có unstable_cache → trùng với layoutPromise.
 */
export async function HomeWorldJourneyExtraModules({
  viewerId,
  viewerSlug,
  persona,
  seeking,
  giaiDoan,
  defaultModuleIds,
}: Props) {
  const [homeLayoutRaw, capabilities] = await Promise.all([
    loadHomeLayoutRaw(viewerId),
    loadHomeCapabilities(viewerId),
  ]);
  const capabilityList = serializeHomeCapabilities(capabilities);
  const layout = resolveHomeLayout(
    persona,
    seeking,
    homeLayoutRaw,
    capabilityList,
    giaiDoan,
  );
  const seeded = new Set(defaultModuleIds);
  const extra = [...layout.left, ...layout.right].filter((id) => !seeded.has(id));
  if (extra.length === 0) return null;

  const moduleCtx: HomeModuleCtx = {
    viewerId,
    viewerSlug,
    persona,
    giaiDoan,
    seeking,
    itemLimits: layout.limits,
  };

  return <>{renderHomeModules(extra, moduleCtx)}</>;
}
