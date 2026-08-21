"use client";

import { tHomeModLabel } from "@/lib/i18n/home-modules";
import { useT } from "@/lib/i18n/use-t";
import type { ModuleId } from "@/lib/cins/home-adaptive/persona";
import { useLocale } from "@/lib/locale/context";

/** Tiêu đề module — EN lấy catalog, VI giữ copy gốc trên card. */
export function HomeModTitle({
  moduleId,
  fallback,
}: {
  moduleId?: ModuleId;
  fallback: string;
}) {
  const t = useT();
  const locale = useLocale();
  if (moduleId && locale === "en") return tHomeModLabel(t, moduleId);
  return fallback;
}
