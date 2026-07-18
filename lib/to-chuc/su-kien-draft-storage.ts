import {
  isLoaiSuKien,
  type LoaiSuKien,
} from "@/lib/to-chuc/su-kien-constants";

const PREFIX = "cins-org-su-kien-draft";

export type SuKienDraftWhen = {
  start: string;
  end: string;
  withTime: boolean;
};

export type SuKienFormDraft = {
  ten: string;
  loaiSuKien: LoaiSuKien;
  when: SuKienDraftWhen;
  tinhThanh: string;
  diaDiem: string;
  mienPhi: boolean;
  giaVe: string;
  moTa: string;
  noiDung: string;
  slotToiDa: string;
  coverImageId: string | null;
  coverPreviewUrl: string | null;
  savedAt: string;
};

function storageKey(orgId: string) {
  return `${PREFIX}:${orgId}`;
}

function emptyWhen(): SuKienDraftWhen {
  return { start: "", end: "", withTime: false };
}

function isBlankHtml(html: string): boolean {
  return !html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseWhen(raw: unknown): SuKienDraftWhen {
  if (!raw || typeof raw !== "object") return emptyWhen();
  const o = raw as Record<string, unknown>;
  return {
    start: typeof o.start === "string" ? o.start : "",
    end: typeof o.end === "string" ? o.end : "",
    withTime: Boolean(o.withTime),
  };
}

/** Có nội dung đáng lưu nháp (không phải form trống). */
export function suKienDraftHasContent(
  draft: Pick<
    SuKienFormDraft,
    | "ten"
    | "when"
    | "diaDiem"
    | "moTa"
    | "noiDung"
    | "giaVe"
    | "slotToiDa"
    | "coverImageId"
    | "mienPhi"
  >,
): boolean {
  if (draft.ten.trim()) return true;
  if (draft.when.start.trim() || draft.when.end.trim()) return true;
  if (draft.diaDiem.trim()) return true;
  if (draft.moTa.trim()) return true;
  if (!isBlankHtml(draft.noiDung)) return true;
  if (draft.giaVe.trim()) return true;
  if (draft.slotToiDa.trim()) return true;
  if (draft.coverImageId) return true;
  if (!draft.mienPhi) return true;
  return false;
}

export function loadSuKienDraft(orgId: string): SuKienFormDraft | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(orgId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const loai =
      typeof parsed.loaiSuKien === "string" && isLoaiSuKien(parsed.loaiSuKien)
        ? parsed.loaiSuKien
        : "workshop";
    const coverPreviewUrl =
      typeof parsed.coverPreviewUrl === "string" &&
      !parsed.coverPreviewUrl.startsWith("blob:")
        ? parsed.coverPreviewUrl
        : null;
    const coverImageId =
      typeof parsed.coverImageId === "string" && parsed.coverImageId.trim()
        ? parsed.coverImageId.trim()
        : null;

    return {
      ten: typeof parsed.ten === "string" ? parsed.ten : "",
      loaiSuKien: loai,
      when: parseWhen(parsed.when),
      tinhThanh: typeof parsed.tinhThanh === "string" ? parsed.tinhThanh : "",
      diaDiem: typeof parsed.diaDiem === "string" ? parsed.diaDiem : "",
      mienPhi: parsed.mienPhi !== false,
      giaVe: typeof parsed.giaVe === "string" ? parsed.giaVe : "",
      moTa: typeof parsed.moTa === "string" ? parsed.moTa : "",
      noiDung:
        typeof parsed.noiDung === "string" && parsed.noiDung.trim()
          ? parsed.noiDung
          : "<p></p>",
      slotToiDa: typeof parsed.slotToiDa === "string" ? parsed.slotToiDa : "",
      coverImageId,
      coverPreviewUrl,
      savedAt:
        typeof parsed.savedAt === "string"
          ? parsed.savedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveSuKienDraft(
  orgId: string,
  draft: Omit<SuKienFormDraft, "savedAt">,
): void {
  if (typeof localStorage === "undefined") return;
  try {
    const coverPreviewUrl =
      draft.coverPreviewUrl && !draft.coverPreviewUrl.startsWith("blob:")
        ? draft.coverPreviewUrl
        : null;
    const payload: SuKienFormDraft = {
      ...draft,
      coverPreviewUrl,
      coverImageId: draft.coverImageId,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey(orgId), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearSuKienDraft(orgId: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(storageKey(orgId));
  } catch {
    /* ignore */
  }
}
