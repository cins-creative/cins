import type { ArticleMeta, MetaPhanMem } from "@/lib/articles/types";

export function isMetaPhanMem(m: ArticleMeta): m is MetaPhanMem {
  return (
    !!m &&
    typeof m === "object" &&
    "nha_phat_hanh" in m &&
    "platform" in m &&
    Array.isArray((m as { platform?: unknown }).platform)
  );
}

export function formatPlatformList(meta: MetaPhanMem | null): string {
  if (!meta?.platform?.length) return "—";
  return meta.platform.join(", ");
}
