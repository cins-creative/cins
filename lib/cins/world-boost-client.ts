/** Client-safe helpers — không import server-only. */

export type WorldBoostLoai = "cot_moc" | "org_bai_dang" | "org_su_kien";

export function worldBoostKey(loai: WorldBoostLoai, id: string): string {
  return `${loai}:${id}`;
}

export function worldBoostTargetFromMilestoneLike(m: {
  cotMocId?: string | null;
  orgBaiDangRef?: { postId: string } | null;
  orgSuKienRef?: { suKienId: string } | null;
}): { loai: WorldBoostLoai; id: string } | null {
  if (m.orgSuKienRef?.suKienId) {
    return { loai: "org_su_kien", id: m.orgSuKienRef.suKienId };
  }
  if (m.orgBaiDangRef?.postId) {
    return { loai: "org_bai_dang", id: m.orgBaiDangRef.postId };
  }
  const cotMocId = m.cotMocId?.trim();
  if (cotMocId) return { loai: "cot_moc", id: cotMocId };
  return null;
}

export function worldBoostTargetFromGalleryLike(item: {
  id: string;
  cotMocId?: string | null;
}): { loai: WorldBoostLoai; id: string } | null {
  const id = item.cotMocId?.trim();
  if (!id) return null;
  if (item.id.startsWith("showcase-") || item.id.startsWith("org-post-")) {
    return { loai: "org_bai_dang", id };
  }
  return { loai: "cot_moc", id };
}
