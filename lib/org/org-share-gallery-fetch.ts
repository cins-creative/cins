import type { OrgDoanProjectItem } from "@/lib/journey/org-milestone-tag-types";
import type { OrgShareKind } from "@/lib/org/org-profile-share";

export type OrgShareGalleryPreview = {
  thumbs: string[];
  tacPham: number;
};

async function fetchCoSoDoanGallery(orgId: string): Promise<OrgShareGalleryPreview> {
  const res = await fetch(
    `/api/org/${encodeURIComponent(orgId)}/doan-projects?featured=1`,
    { credentials: "include", cache: "no-store" },
  );
  if (!res.ok) return { thumbs: [], tacPham: 0 };
  const json = (await res.json()) as { projects?: OrgDoanProjectItem[] };
  const projects = Array.isArray(json.projects) ? json.projects : [];
  const thumbs = projects
    .map((p) => p.coverSrc?.trim() || null)
    .filter((src): src is string => Boolean(src))
    .slice(0, 6);
  return { thumbs, tacPham: projects.length };
}

/** Preview mosaic + số tác phẩm cho thẻ chia sẻ gallery org. */
export async function fetchOrgShareGalleryPreview(
  kind: OrgShareKind,
  orgId: string,
): Promise<OrgShareGalleryPreview> {
  if (kind === "co_so") {
    return fetchCoSoDoanGallery(orgId);
  }
  return { thumbs: [], tacPham: 0 };
}
