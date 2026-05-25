import { isInlineArticleEditEnabled } from "@/lib/dev/inline-article-edit";
import { hasServiceRoleEnv } from "@/lib/supabase/service-role";

export type AdminGateResult =
  | { ok: true }
  | { ok: false; reason: "disabled" | "no_service_role" };

export function checkAdminAccess(): AdminGateResult {
  if (!isInlineArticleEditEnabled()) return { ok: false, reason: "disabled" };
  if (!hasServiceRoleEnv()) return { ok: false, reason: "no_service_role" };
  return { ok: true };
}
