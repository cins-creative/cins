"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { adminSaveArticle } from "@/app/admin/actions";
import { buildNgheLeadSourceFromNoiDung } from "@/lib/articles/nghe-lead-source-build";
import type { RelatedJobLienQuanRow } from "@/lib/articles/related-jobs-dynamic";
import type { ArticleBaiViet } from "@/lib/articles/types";

function mergedBody(a: ArticleBaiViet): string {
  return (a.noi_dung ?? a.noi_dung_markdown ?? "").replace(/\r\n/g, "\n");
}

export type NgheArticleDraftContextValue = {
  open: boolean;
  openPanel: () => void;
  closePanel: () => void;
  article: ArticleBaiViet;
  tieu_de: string;
  setTieuDe: (v: string) => void;
  tieu_de_viet: string;
  setTieuDeViet: (v: string) => void;
  tieu_de_eng: string;
  setTieuDeEng: (v: string) => void;
  tom_tat: string;
  setTomTat: (v: string) => void;
  metaJson: string;
  setMetaJson: (v: string) => void;
  noi_dung: string;
  setNoiDung: (v: string) => void;
  trang_thai: string;
  setTrangThai: (v: string) => void;
  leadPreview: string | null;
  persistEnabled: boolean;
  /** Chỉ admin CINs — gate UI nút sửa / form. */
  canEdit: boolean;
  saving: boolean;
  saveMsg: { type: "ok" | "err"; text: string } | null;
  save: () => Promise<void>;
  /** Khôi phục toàn bộ trường từ bài trên server rồi đóng panel (bỏ thay đổi chưa lưu). */
  discardDraft: () => void;
  contentEditorOpen: boolean;
  openContentEditor: () => void;
  closeContentEditor: () => void;
};

const NgheArticleDraftContext = createContext<NgheArticleDraftContextValue | null>(
  null,
);

export function useNgheArticleDraftOptional(): NgheArticleDraftContextValue | null {
  return useContext(NgheArticleDraftContext);
}

type ProviderProps = {
  children: ReactNode;
  article: ArticleBaiViet;
  relatedJobsLienQuan: RelatedJobLienQuanRow[];
  persistEnabled?: boolean;
  canEdit?: boolean;
  /** Đồng bộ sau `router.refresh()` — ví dụ `${article.id}-${article.cap_nhat_luc}` */
  resetKey: string;
};

export function NgheArticleDraftProvider({
  children,
  article,
  relatedJobsLienQuan,
  persistEnabled = true,
  canEdit = true,
  resetKey,
}: ProviderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tieu_de, setTieuDe] = useState(article.tieu_de);
  const [tieu_de_viet, setTieuDeViet] = useState(article.tieu_de_viet ?? "");
  const [tieu_de_eng, setTieuDeEng] = useState(article.tieu_de_eng ?? "");
  const [tom_tat, setTomTat] = useState(article.tom_tat ?? "");
  const [metaJson, setMetaJson] = useState(() =>
    JSON.stringify(article.meta ?? {}, null, 2),
  );
  const [noi_dung, setNoiDung] = useState(mergedBody(article));
  const [trang_thai, setTrangThai] = useState<string>(article.trang_thai_noi_dung);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [contentEditorOpen, setContentEditorOpen] = useState(false);

  const resetDraftFromArticle = useCallback(() => {
    setTieuDe(article.tieu_de);
    setTieuDeViet(article.tieu_de_viet ?? "");
    setTieuDeEng(article.tieu_de_eng ?? "");
    setTomTat(article.tom_tat ?? "");
    setMetaJson(JSON.stringify(article.meta ?? {}, null, 2));
    setNoiDung(mergedBody(article));
    setTrangThai(article.trang_thai_noi_dung);
    setSaveMsg(null);
  }, [
    article.tieu_de,
    article.tieu_de_viet,
    article.tieu_de_eng,
    article.tom_tat,
    article.meta,
    article.noi_dung,
    article.noi_dung_markdown,
    article.trang_thai_noi_dung,
  ]);

  useEffect(() => {
    resetDraftFromArticle();
    setOpen(false);
    setContentEditorOpen(false);
  }, [resetKey, resetDraftFromArticle]);

  const leadPreview = useMemo(
    () => buildNgheLeadSourceFromNoiDung(noi_dung, relatedJobsLienQuan),
    [noi_dung, relatedJobsLienQuan],
  );

  const openPanel = useCallback(() => {
    startTransition(() => setOpen(true));
  }, []);
  const closePanel = useCallback(() => setOpen(false), []);
  const openContentEditor = useCallback(() => setContentEditorOpen(true), []);
  const closeContentEditor = useCallback(() => setContentEditorOpen(false), []);

  const discardDraft = useCallback(() => {
    resetDraftFromArticle();
    setOpen(false);
  }, [resetDraftFromArticle]);

  const save = useCallback(async () => {
    if (!persistEnabled) {
      setSaveMsg({
        type: "err",
        text: "Thiếu SUPABASE_SERVICE_ROLE_KEY trong .env — thêm key service_role rồi restart dev server.",
      });
      return;
    }
    setSaveMsg(null);
    setSaving(true);
    const fd = new FormData();
    fd.set("id", article.id);
    fd.set("slug", article.slug);
    fd.set("tieu_de", tieu_de);
    fd.set("tieu_de_viet", tieu_de_viet);
    fd.set("tieu_de_eng", tieu_de_eng);
    fd.set("tom_tat", tom_tat);
    fd.set("noi_dung", noi_dung);
    fd.set("trang_thai_noi_dung", trang_thai);
    fd.set("meta_json", metaJson);
    const r = await adminSaveArticle(fd);
    setSaving(false);
    if (r.ok) {
      setSaveMsg({ type: "ok", text: "Đã lưu." });
      router.refresh();
    } else {
      setSaveMsg({ type: "err", text: r.message ?? "Lưu thất bại." });
    }
  }, [
    persistEnabled,
    article.id,
    article.slug,
    tieu_de,
    tieu_de_viet,
    tieu_de_eng,
    tom_tat,
    noi_dung,
    trang_thai,
    metaJson,
    router,
  ]);

  const value = useMemo<NgheArticleDraftContextValue>(
    () => ({
      open,
      openPanel,
      closePanel,
      article,
      tieu_de,
      setTieuDe,
      tieu_de_viet,
      setTieuDeViet,
      tieu_de_eng,
      setTieuDeEng,
      tom_tat,
      setTomTat,
      metaJson,
      setMetaJson,
      noi_dung,
      setNoiDung,
      trang_thai,
      setTrangThai,
      leadPreview,
      persistEnabled,
      canEdit,
      saving,
      saveMsg,
      save,
      discardDraft,
      contentEditorOpen,
      openContentEditor,
      closeContentEditor,
    }),
    [
      open,
      openPanel,
      closePanel,
      discardDraft,
      contentEditorOpen,
      openContentEditor,
      closeContentEditor,
      article,
      tieu_de,
      tieu_de_viet,
      tieu_de_eng,
      tom_tat,
      metaJson,
      noi_dung,
      trang_thai,
      leadPreview,
      persistEnabled,
      canEdit,
      saving,
      saveMsg,
      save,
    ],
  );

  return (
    <NgheArticleDraftContext.Provider value={value}>
      {children}
    </NgheArticleDraftContext.Provider>
  );
}
