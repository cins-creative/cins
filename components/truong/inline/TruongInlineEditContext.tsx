"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";

import { TruongCalcConfigModalHost } from "@/components/truong/TruongCalcConfigModalHost";
import { rememberCfAccountHashFromDeliveryUrl } from "@/lib/cloudflare/account-hash";
import { cauHinhMonThiCacheKey } from "@/lib/truong/cau-hinh-tinh-diem";
import { readTruongInlineError, truongInlineFetch } from "@/lib/truong/inline-api";
import { normalizeTinhThanhForDb } from "@/lib/truong/contact";
import { ORG_CONTACT_FIELD_KEYS } from "@/lib/truong/org-contact-fields";
import type {
  CalcConfigDraft,
  MonThiCatalogItem,
} from "@/lib/truong/calc-draft";
import type {
  TruongBaiDang,
  TruongDetail,
  TruongHinhAnh,
  TruongNganhProgram,
  TruongPagePayload,
  TruongStats,
  TruongTuyenSinhNamRow,
  TruongCauHinhTinhDiem,
} from "@/lib/truong/types";

type Ctx = {
  /** Quyền sửa từ server (org admin / dev). */
  canEdit: boolean;
  /** Đang bật UI chỉnh sửa trên trang. */
  editMode: boolean;
  setEditMode: (on: boolean) => void;
  /** canEdit && editMode — hiện nút sửa, FAB, v.v. */
  isEditing: boolean;
  orgId: string;
  school: TruongDetail;
  stats: TruongStats;
  baidang: TruongBaiDang[];
  hinhanh: TruongHinhAnh[];
  tuyenSinh: TruongTuyenSinhNamRow[];
  cauHinhYears: number[];
  cauHinhMonThiByKey: Record<string, TruongCauHinhTinhDiem>;
  patchCauHinhMonThi: (
    programId: string,
    year: number,
    config: TruongCauHinhTinhDiem,
  ) => void;
  /** Draft PT + hệ số theo năm (một cấu hình / trường). */
  getCalcDraft: (year: number) => CalcConfigDraft | null;
  setCalcDraft: (year: number, draft: CalcConfigDraft) => void;
  patchCalcHeSo: (
    year: number,
    baseConfig: TruongCauHinhTinhDiem,
    monId: string,
    heSo: number,
  ) => void;
  toggleCalcMonIncluded: (
    year: number,
    baseConfig: TruongCauHinhTinhDiem,
    monId: string,
    included: boolean,
  ) => void;
  replaceCalcMon: (
    year: number,
    baseConfig: TruongCauHinhTinhDiem,
    monId: string,
    item: MonThiCatalogItem,
  ) => void;
  calcConfigModalYear: number | null;
  openCalcConfigModal: (year: number) => void;
  closeCalcConfigModal: () => void;
  programs: TruongNganhProgram[];
  saving: boolean;
  toast: string | null;
  patchSchool: (patch: Partial<TruongDetail>) => Promise<boolean>;
  avatarDraft: { file: File; previewUrl: string } | null;
  setAvatarDraft: (draft: { file: File; previewUrl: string } | null) => void;
  commitAvatarDraft: () => Promise<boolean>;
  coverDraft: { file: File; previewUrl: string } | null;
  setCoverDraft: (draft: { file: File; previewUrl: string } | null) => void;
  commitCoverDraft: () => Promise<boolean>;
  uploadImage: (file: File) => Promise<{ imageId: string; url: string } | null>;
  setBaidang: React.Dispatch<React.SetStateAction<TruongBaiDang[]>>;
  setHinhanh: React.Dispatch<React.SetStateAction<TruongHinhAnh[]>>;
  setTuyenSinh: React.Dispatch<React.SetStateAction<TruongTuyenSinhNamRow[]>>;
  setPrograms: React.Dispatch<React.SetStateAction<TruongNganhProgram[]>>;
  setStats: React.Dispatch<React.SetStateAction<TruongStats>>;
  showToast: (msg: string) => void;
  /** Mở modal Sửa giới thiệu (đăng ký từ TruongEditableAbout). */
  openSchoolAboutEditor: () => void;
  registerOpenSchoolAboutEditor: (fn: (() => void) | null) => void;
};

const TruongInlineEditContext = createContext<Ctx | null>(null);

const EMPTY_CAU_HINH_MON_THI: Record<string, TruongCauHinhTinhDiem> = {};
const EMPTY_CAU_HINH_YEARS: number[] = [];

export function useTruongInlineEdit(): Ctx | null {
  return useContext(TruongInlineEditContext);
}

function editModeStorageKey(slug: string) {
  return `tdh-edit-mode:${slug}`;
}

export function TruongInlineEditProvider({
  children,
  canEdit,
  initial,
}: {
  children: ReactNode;
  canEdit: boolean;
  initial: TruongPagePayload;
}) {
  const [school, setSchool] = useState(initial.school);
  const [stats, setStats] = useState(initial.stats);
  const [baidang, setBaidang] = useState(initial.baidang);
  const [hinhanh, setHinhanh] = useState(initial.hinhanh);
  const [tuyenSinh, setTuyenSinh] = useState(initial.tuyenSinh);
  const [programs, setProgramsState] = useState(initial.school.programs);
  const [cauHinhMonThiByKey, setCauHinhMonThiByKey] = useState(
    initial.cauHinhMonThiByKey ?? EMPTY_CAU_HINH_MON_THI,
  );
  const [calcDraftByYear, setCalcDraftByYear] = useState<
    Record<number, CalcConfigDraft>
  >({});
  const [calcConfigModalYear, setCalcConfigModalYear] = useState<number | null>(
    null,
  );
  const [editMode, setEditModeState] = useState(false);
  const [editHydrated, setEditHydrated] = useState(false);

  const storageKey = editModeStorageKey(initial.school.slug);

  useEffect(() => {
    if (!canEdit) {
      setEditHydrated(true);
      return;
    }
    try {
      if (sessionStorage.getItem(storageKey) === "1") {
        setEditModeState(true);
      }
    } catch {
      /* ignore */
    }
    setEditHydrated(true);
  }, [canEdit, storageKey]);

  const setEditMode = useCallback(
    (on: boolean) => {
      setEditModeState(on);
      try {
        sessionStorage.setItem(storageKey, on ? "1" : "0");
      } catch {
        /* ignore */
      }
    },
    [storageKey],
  );

  const isEditing = canEdit && editMode;

  useEffect(() => {
    const root = document.querySelector(".tdh-page");
    if (!root) return;
    root.classList.toggle("tdh-page--editing", isEditing);
    return () => {
      root.classList.remove("tdh-page--editing");
    };
  }, [isEditing]);

  const setPrograms = useCallback(
    (action: SetStateAction<TruongNganhProgram[]>) => {
      setProgramsState((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        const tags = [...new Set(next.map((p) => p.nganhTitle))];
        setSchool((s) => ({
          ...s,
          programs: next,
          nganhCount: next.length,
          nganhTags: tags.slice(0, 3),
        }));
        return next;
      });
    },
    [],
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [avatarDraft, setAvatarDraftState] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);

  const setAvatarDraft = useCallback(
    (draft: { file: File; previewUrl: string } | null) => {
      setAvatarDraftState((prev) => {
        if (prev?.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(prev.previewUrl);
        }
        return draft;
      });
    },
    [],
  );

  const [coverDraft, setCoverDraftState] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);

  const setCoverDraft = useCallback(
    (draft: { file: File; previewUrl: string } | null) => {
      setCoverDraftState((prev) => {
        if (prev?.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(prev.previewUrl);
        }
        return draft;
      });
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (avatarDraft?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(avatarDraft.previewUrl);
      }
      if (coverDraft?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(coverDraft.previewUrl);
      }
    };
  }, [avatarDraft, coverDraft]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const openSchoolAboutEditorRef = useRef<(() => void) | null>(null);
  const registerOpenSchoolAboutEditor = useCallback(
    (fn: (() => void) | null) => {
      openSchoolAboutEditorRef.current = fn;
    },
    [],
  );
  const openSchoolAboutEditor = useCallback(() => {
    openSchoolAboutEditorRef.current?.();
  }, []);

  const patchSchool = useCallback(
    async (patch: Partial<TruongDetail>): Promise<boolean> => {
      if (!canEdit) return false;
      if (!editMode) setEditModeState(true);
      const prev = school;
      const payload = { ...patch };
      if ("tinh_thanh" in payload) {
        payload.tinh_thanh = normalizeTinhThanhForDb(payload.tinh_thanh);
      }
      setSchool((s) => ({ ...s, ...payload }));
      setSaving(true);
      try {
        const res = await truongInlineFetch(school.id, "", {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error(await readTruongInlineError(res));
        }
        const json = (await res.json()) as { contactFieldsSkipped?: boolean };
        if (json.contactFieldsSkipped) {
          showToast(
            "Đã lưu một phần — chạy SQL org-truong-contact-fields.sql để lưu địa chỉ & liên hệ",
          );
          setSchool((s) => {
            const next = { ...s };
            for (const key of ORG_CONTACT_FIELD_KEYS) {
              (next as Record<string, unknown>)[key] =
                (prev as Record<string, unknown>)[key] ?? null;
            }
            return next;
          });
        } else {
          showToast("Đã lưu");
        }
        return true;
      } catch (err) {
        setSchool(prev);
        const msg =
          err instanceof Error && err.message.trim()
            ? err.message.trim()
            : "Yêu cầu thất bại";
        showToast(`Lưu thất bại: ${msg} — đã hoàn tác`);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [canEdit, editMode, school, showToast],
  );

  const uploadImage = useCallback(
    async (file: File) => {
      if (!isEditing) return null;
      const form = new FormData();
      form.append("file", file);
      const token =
        process.env.NEXT_PUBLIC_ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN?.trim();
      const headers: HeadersInit = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(
        `/api/truong/${encodeURIComponent(school.id)}/upload`,
        { method: "POST", body: form, headers },
      );
      if (!res.ok) return null;
      const json = (await res.json()) as { imageId: string; url: string };
      rememberCfAccountHashFromDeliveryUrl(json.url);
      return json;
    },
    [isEditing, school.id],
  );

  const commitAvatarDraft = useCallback(async (): Promise<boolean> => {
    if (!isEditing || !avatarDraft) return false;
    const uploaded = await uploadImage(avatarDraft.file);
    if (!uploaded) {
      showToast("Tải logo thất bại");
      return false;
    }
    const ok = await patchSchool({
      avatar_id: uploaded.imageId,
      logo_id: uploaded.imageId,
      avatar_src: uploaded.url,
    });
    if (ok) setAvatarDraft(null);
    return ok;
  }, [
    isEditing,
    avatarDraft,
    uploadImage,
    patchSchool,
    showToast,
    setAvatarDraft,
  ]);

  const commitCoverDraft = useCallback(async (): Promise<boolean> => {
    if (!isEditing || !coverDraft) return false;
    const uploaded = await uploadImage(coverDraft.file);
    if (!uploaded) {
      showToast("Tải ảnh bìa thất bại");
      return false;
    }
    const ok = await patchSchool({
      cover_id: uploaded.imageId,
      cover_src: uploaded.url,
    });
    if (ok) setCoverDraft(null);
    return ok;
  }, [
    isEditing,
    coverDraft,
    uploadImage,
    patchSchool,
    showToast,
    setCoverDraft,
  ]);

  useEffect(() => {
    if (!isEditing) {
      if (avatarDraft) setAvatarDraft(null);
      if (coverDraft) setCoverDraft(null);
      setCalcDraftByYear({});
      setCalcConfigModalYear(null);
    }
  }, [isEditing, avatarDraft, coverDraft, setAvatarDraft, setCoverDraft]);

  const getCalcDraft = useCallback(
    (year: number) => calcDraftByYear[year] ?? null,
    [calcDraftByYear],
  );

  const setCalcDraft = useCallback((year: number, draft: CalcConfigDraft) => {
    setCalcDraftByYear((prev) => ({ ...prev, [year]: draft }));
  }, []);

  const ensureCalcDraft = useCallback(
    (
      prev: Record<number, CalcConfigDraft>,
      year: number,
      baseConfig: TruongCauHinhTinhDiem,
    ): CalcConfigDraft => {
      const cur = prev[year];
      return (
        cur ?? {
          config: baseConfig,
          heSoOverrides: {},
          selectedPhuongThucIds: [],
          excludedMonIds: [],
        }
      );
    },
    [],
  );

  const patchCalcHeSo = useCallback(
    (
      year: number,
      baseConfig: TruongCauHinhTinhDiem,
      monId: string,
      heSo: number,
    ) => {
      if (Number.isNaN(heSo)) return;
      setCalcDraftByYear((prev) => {
        const nextDraft = ensureCalcDraft(prev, year, baseConfig);
        return {
          ...prev,
          [year]: {
            ...nextDraft,
            config: nextDraft.config ?? baseConfig,
            heSoOverrides: {
              ...nextDraft.heSoOverrides,
              [monId]: heSo,
            },
          },
        };
      });
    },
    [ensureCalcDraft],
  );

  const toggleCalcMonIncluded = useCallback(
    (
      year: number,
      baseConfig: TruongCauHinhTinhDiem,
      monId: string,
      included: boolean,
    ) => {
      setCalcDraftByYear((prev) => {
        const nextDraft = ensureCalcDraft(prev, year, baseConfig);
        const excluded = new Set(nextDraft.excludedMonIds ?? []);
        if (included) excluded.delete(monId);
        else excluded.add(monId);
        return {
          ...prev,
          [year]: {
            ...nextDraft,
            excludedMonIds: [...excluded],
          },
        };
      });
    },
    [ensureCalcDraft],
  );

  const replaceCalcMon = useCallback(
    (
      year: number,
      baseConfig: TruongCauHinhTinhDiem,
      monId: string,
      item: MonThiCatalogItem,
    ) => {
      setCalcDraftByYear((prev) => {
        const nextDraft = ensureCalcDraft(prev, year, baseConfig);
        const cfg = nextDraft.config ?? baseConfig;
        const idx = cfg.mon.findIndex((m) => m.id_mon_thi === monId);
        if (idx < 0) return prev;

        const old = cfg.mon[idx]!;
        const heSo =
          nextDraft.heSoOverrides[monId] ??
          nextDraft.heSoOverrides[item.id] ??
          old.he_so;

        const mon = [...cfg.mon];
        mon[idx] = {
          ...old,
          id_mon_thi: item.id,
          ten: item.ten,
          loai: item.loai,
          he_so: heSo,
        };

        const heSoOverrides = { ...nextDraft.heSoOverrides };
        delete heSoOverrides[monId];
        heSoOverrides[item.id] = heSo;

        const excluded = (nextDraft.excludedMonIds ?? []).map((id) =>
          id === monId ? item.id : id,
        );

        return {
          ...prev,
          [year]: {
            ...nextDraft,
            config: { ...cfg, mon },
            heSoOverrides,
            excludedMonIds: excluded,
          },
        };
      });
    },
    [ensureCalcDraft],
  );

  const openCalcConfigModal = useCallback((year: number) => {
    setCalcConfigModalYear(year);
  }, []);

  const closeCalcConfigModal = useCallback(() => {
    setCalcConfigModalYear(null);
  }, []);

  const patchCauHinhMonThi = useCallback(
    (programId: string, year: number, config: TruongCauHinhTinhDiem) => {
      setCauHinhMonThiByKey((prev) => ({
        ...prev,
        [cauHinhMonThiCacheKey(programId, year)]: config,
      }));
    },
    [],
  );

  const value = useMemo<Ctx>(
    () => ({
      canEdit,
      editMode,
      setEditMode,
      isEditing,
      orgId: school.id,
      school,
      stats,
      baidang,
      hinhanh,
      tuyenSinh,
      cauHinhYears: initial.cauHinhYears ?? EMPTY_CAU_HINH_YEARS,
      cauHinhMonThiByKey,
      patchCauHinhMonThi,
      getCalcDraft,
      setCalcDraft,
      patchCalcHeSo,
      toggleCalcMonIncluded,
      replaceCalcMon,
      calcConfigModalYear,
      openCalcConfigModal,
      closeCalcConfigModal,
      programs,
      saving,
      toast,
      patchSchool,
      avatarDraft,
      setAvatarDraft,
      commitAvatarDraft,
      coverDraft,
      setCoverDraft,
      commitCoverDraft,
      uploadImage,
      setBaidang,
      setHinhanh,
      setTuyenSinh,
      setPrograms,
      setStats,
      showToast,
      openSchoolAboutEditor,
      registerOpenSchoolAboutEditor,
    }),
    [
      canEdit,
      editMode,
      setEditMode,
      isEditing,
      school,
      stats,
      baidang,
      hinhanh,
      tuyenSinh,
      initial.cauHinhYears,
      cauHinhMonThiByKey,
      patchCauHinhMonThi,
      getCalcDraft,
      setCalcDraft,
      patchCalcHeSo,
      toggleCalcMonIncluded,
      replaceCalcMon,
      calcConfigModalYear,
      openCalcConfigModal,
      closeCalcConfigModal,
      openSchoolAboutEditor,
      registerOpenSchoolAboutEditor,
      programs,
      saving,
      toast,
      patchSchool,
      avatarDraft,
      setAvatarDraft,
      commitAvatarDraft,
      coverDraft,
      setCoverDraft,
      commitCoverDraft,
      uploadImage,
      showToast,
    ],
  );

  const toastNode =
    toast && typeof document !== "undefined"
      ? createPortal(
          <div className="tdh-inline-toast" role="status" aria-live="polite">
            {toast}
          </div>,
          document.body,
        )
      : null;

  return (
    <TruongInlineEditContext.Provider value={value}>
      {editHydrated ? children : null}
      <TruongCalcConfigModalHost />
      {toastNode}
    </TruongInlineEditContext.Provider>
  );
}
