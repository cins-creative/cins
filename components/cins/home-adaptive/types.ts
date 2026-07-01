import type { GiaiDoan, Persona } from "@/lib/cins/home-adaptive/persona";

/** Ngữ cảnh truyền vào mỗi module (server component tự fetch theo ctx này). */
export type HomeModuleCtx = {
  viewerId: string;
  viewerSlug: string;
  persona: Persona;
  giaiDoan: GiaiDoan | null;
  /** open-to-work (§7) — chỉ ảnh hưởng cột phải cụm LÀM, không đụng feed. */
  seeking: boolean;
};
