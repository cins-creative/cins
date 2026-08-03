import type { GiaiDoan, ModuleId, Persona } from "@/lib/cins/home-adaptive/persona";

/** Ngữ cảnh truyền vào mỗi module (server component tự fetch theo ctx này). */
export type HomeModuleCtx = {
  viewerId: string;
  viewerSlug: string;
  persona: Persona;
  giaiDoan: GiaiDoan | null;
  /** open-to-work (§7) — chỉ ảnh hưởng cột phải cụm LÀM, không đụng feed. */
  seeking: boolean;
  /** Số dòng hiển thị mỗi khối (1–10), từ `home_layout.limits`. */
  itemLimits?: Partial<Record<ModuleId, number>>;
};

export const HOME_MODULE_ITEM_LIMIT_DEFAULT = 5;

/** Clamp limit khối — mặc định 5, tối đa 10. */
export function moduleItemLimit(
  ctx: HomeModuleCtx,
  id: ModuleId,
  fallback = HOME_MODULE_ITEM_LIMIT_DEFAULT,
): number {
  const n = ctx.itemLimits?.[id];
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return Math.min(10, Math.max(1, Math.round(n)));
}
