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

export type SuKienDraftLoaiVe = {
  key: string;
  ten: string;
  moTa: string;
  gia: number;
  coverImageId: string | null;
  coverPreviewUrl: string | null;
};

export type SuKienFormDraft = {
  ten: string;
  loaiSuKien: LoaiSuKien;
  when: SuKienDraftWhen;
  tinhThanh: string;
  diaDiem: string;
  mienPhi: boolean;
  /** @deprecated giữ để đọc nháp cũ */
  giaVe: string;
  loaiVe: SuKienDraftLoaiVe[];
  /** Hướng dẫn mua vé ngoài CINs. */
  cachMuaVe: string;
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

function parseLoaiVe(raw: unknown): SuKienDraftLoaiVe[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const ten = typeof o.ten === "string" ? o.ten : "";
      const gia = typeof o.gia === "number" ? o.gia : Number(o.gia);
      if (!ten.trim() && !(Number.isInteger(gia) && gia > 0)) return null;
      const coverPreviewUrl =
        typeof o.coverPreviewUrl === "string" &&
        !o.coverPreviewUrl.startsWith("blob:")
          ? o.coverPreviewUrl
          : null;
      return {
        key:
          typeof o.key === "string" && o.key.trim()
            ? o.key
            : `draft-${i}-${ten}`,
        ten,
        moTa: typeof o.moTa === "string" ? o.moTa : "",
        gia: Number.isInteger(gia) && gia >= 0 ? gia : 0,
        coverImageId:
          typeof o.coverImageId === "string" && o.coverImageId.trim()
            ? o.coverImageId.trim()
            : typeof o.coverId === "string" && o.coverId.trim()
              ? o.coverId.trim()
              : null,
        coverPreviewUrl,
      } satisfies SuKienDraftLoaiVe;
    })
    .filter((x): x is SuKienDraftLoaiVe => Boolean(x));
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
    | "loaiVe"
    | "cachMuaVe"
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
  if (draft.loaiVe.length > 0) return true;
  if (draft.cachMuaVe.trim()) return true;
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

    let loaiVe = parseLoaiVe(parsed.loaiVe);
    // Nháp cũ chỉ có giaVe string → một loại «Vé thường».
    if (
      loaiVe.length === 0 &&
      parsed.mienPhi === false &&
      typeof parsed.giaVe === "string" &&
      parsed.giaVe.trim()
    ) {
      const n = Number.parseInt(parsed.giaVe.trim(), 10);
      if (Number.isInteger(n) && n >= 0) {
        loaiVe = [
          {
            key: "legacy-gia-ve",
            ten: "Vé thường",
            moTa: "",
            gia: n,
            coverImageId: null,
            coverPreviewUrl: null,
          },
        ];
      }
    }

    return {
      ten: typeof parsed.ten === "string" ? parsed.ten : "",
      loaiSuKien: loai,
      when: parseWhen(parsed.when),
      tinhThanh: typeof parsed.tinhThanh === "string" ? parsed.tinhThanh : "",
      diaDiem: typeof parsed.diaDiem === "string" ? parsed.diaDiem : "",
      mienPhi: parsed.mienPhi !== false,
      giaVe: typeof parsed.giaVe === "string" ? parsed.giaVe : "",
      loaiVe,
      cachMuaVe: typeof parsed.cachMuaVe === "string" ? parsed.cachMuaVe : "",
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
    const loaiVe = draft.loaiVe.map((v) => ({
      ...v,
      coverPreviewUrl:
        v.coverPreviewUrl && !v.coverPreviewUrl.startsWith("blob:")
          ? v.coverPreviewUrl
          : null,
    }));
    const payload: SuKienFormDraft = {
      ...draft,
      coverPreviewUrl,
      coverImageId: draft.coverImageId,
      loaiVe,
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
