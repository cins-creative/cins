/**
 * Capability types + match helpers — client-safe (không server-only).
 * Loader DB nằm ở `capabilities.ts`.
 */

export type HomeCapability =
  | "co_shop"
  | "da_mua_hang"
  | "dang_hoc_khoa"
  | "org_thanh_vien"
  | "org_staff"
  | "su_kien_admin"
  | "studio_tuyen_dung"
  | "da_ung_tuyen";

export type HomeCapabilities = ReadonlySet<HomeCapability>;

export function hasAllCapabilities(
  caps: ReadonlySet<HomeCapability> | readonly HomeCapability[],
  required: readonly HomeCapability[],
): boolean {
  if (required.length === 0) return true;
  const set = caps instanceof Set ? caps : new Set(caps);
  return required.every((c) => set.has(c));
}

export function hasAnyCapability(
  caps: ReadonlySet<HomeCapability> | readonly HomeCapability[],
  requiredAny: readonly HomeCapability[],
): boolean {
  if (requiredAny.length === 0) return true;
  const set = caps instanceof Set ? caps : new Set(caps);
  return requiredAny.some((c) => set.has(c));
}

/** Module hiện trong catalog khi đủ requires (AND) và requiresAny (OR). */
export function moduleMatchesCapabilities(
  caps: ReadonlySet<HomeCapability> | readonly HomeCapability[],
  opts: {
    requires?: readonly HomeCapability[];
    requiresAny?: readonly HomeCapability[];
  },
): boolean {
  if (opts.requires && !hasAllCapabilities(caps, opts.requires)) return false;
  if (opts.requiresAny && !hasAnyCapability(caps, opts.requiresAny)) {
    return false;
  }
  return true;
}

export function serializeHomeCapabilities(
  caps: HomeCapabilities,
): HomeCapability[] {
  return [...caps];
}
