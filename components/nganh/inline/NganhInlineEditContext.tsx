"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { adminSaveArticle } from "@/app/admin/actions";
import type { MetaNganhDaoTao } from "@/lib/articles/types";
import { mergeCompareIntoNoiDung } from "@/lib/nganh/compare-html";
import { textToEditorialImages } from "@/lib/nganh/media-fields";
import type { MonHocNganhWithCapDo } from "@/lib/nganh/monHoc";
import {
  parseNganhNoiDung,
  type NganhCompareItem,
} from "@/lib/nganh/parseNoiDung";
import type { NganhTruongRow } from "@/lib/nganh/truong-shared";
import type { NganhDetailArticle } from "@/lib/nganh/types";

function mergedBody(article: NganhDetailArticle): string {
  return (article.noi_dung ?? "").replace(/\r\n/g, "\n");
}

function khoiThiToText(khoi: string[] | undefined): string {
  return (khoi ?? []).join(", ");
}

function textToKhoiThi(text: string): string[] {
  return text
    .split(/[,，\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

type Ctx = {
  canEdit: boolean;
  editMode: boolean;
  setEditMode: (on: boolean) => void;
  isEditing: boolean;
  persistEnabled: boolean;
  saving: boolean;
  toast: string | null;
  article: NganhDetailArticle;
  tieu_de_viet: string;
  setTieuDeViet: (v: string) => void;
  tieu_de: string;
  setTieuDe: (v: string) => void;
  tieu_de_eng: string;
  setTieuDeEng: (v: string) => void;
  heroDesc: string;
  setHeroDesc: (v: string) => void;
  ma_nganh: string;
  setMaNganh: (v: string) => void;
  khoi_thi_text: string;
  setKhoiThiText: (v: string) => void;
  mon_nang_khieu: string;
  setMonNangKhieu: (v: string) => void;
  thoi_gian_dao_tao: string;
  setThoiGianDaoTao: (v: string) => void;
  cover_id: string;
  setCoverId: (v: string) => void;
  thumbnail: string;
  setThumbnail: (v: string) => void;
  main_video: string;
  setMainVideo: (v: string) => void;
  video_url: string;
  setVideoUrl: (v: string) => void;
  editorial_images: string[];
  setEditorialImages: (v: string[] | ((prev: string[]) => string[])) => void;
  noi_dung: string;
  setNoiDung: (v: string) => void;
  mon_hoc: MonHocNganhWithCapDo[];
  setMonHoc: (v: MonHocNganhWithCapDo[]) => void;
  truong: NganhTruongRow[];
  setTruong: (v: NganhTruongRow[]) => void;
  compare_items: NganhCompareItem[];
  setCompareItems: (
    v: NganhCompareItem[] | ((prev: NganhCompareItem[]) => NganhCompareItem[]),
  ) => void;
  parsed: ReturnType<typeof parseNganhNoiDung>;
  saveAll: () => Promise<boolean>;
  showToast: (msg: string) => void;
};

const NganhInlineEditContext = createContext<Ctx | null>(null);

export function useNganhInlineEdit(): Ctx | null {
  return useContext(NganhInlineEditContext);
}

type ProviderProps = {
  children: ReactNode;
  article: NganhDetailArticle;
  canEdit: boolean;
  persistEnabled?: boolean;
  resetKey: string;
  initialMonHoc: MonHocNganhWithCapDo[];
  initialTruong: NganhTruongRow[];
  initialCompareItems: NganhCompareItem[];
};

export function NganhInlineEditProvider({
  children,
  article,
  canEdit,
  persistEnabled = true,
  resetKey,
  initialMonHoc,
  initialTruong,
  initialCompareItems,
}: ProviderProps) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [tieu_de_viet, setTieuDeViet] = useState(article.tieu_de_viet ?? "");
  const [tieu_de, setTieuDe] = useState(article.tieu_de ?? "");
  const [tieu_de_eng, setTieuDeEng] = useState(article.tieu_de_eng ?? "");
  const [heroDesc, setHeroDesc] = useState(
    () => article.mo_ta_ngan?.trim() || article.tom_tat?.trim() || "",
  );
  const [ma_nganh, setMaNganh] = useState(article.meta?.ma_nganh ?? "");
  const [khoi_thi_text, setKhoiThiText] = useState(
    khoiThiToText(article.meta?.khoi_thi),
  );
  const [mon_nang_khieu, setMonNangKhieu] = useState(
    article.meta?.mon_nang_khieu ?? "",
  );
  const [thoi_gian_dao_tao, setThoiGianDaoTao] = useState(
    article.meta?.thoi_gian_dao_tao ?? "",
  );
  const [cover_id, setCoverId] = useState(article.cover_id ?? "");
  const [thumbnail, setThumbnail] = useState(article.thumbnail ?? "");
  const [main_video, setMainVideo] = useState(article.main_video ?? "");
  const [video_url, setVideoUrl] = useState(article.meta?.video_url ?? "");
  const [editorial_images, setEditorialImages] = useState<string[]>(
    () => article.meta?.editorial_images ?? [],
  );
  const [noi_dung, setNoiDung] = useState(() => mergedBody(article));
  const [mon_hoc, setMonHoc] = useState(initialMonHoc);
  const [truong, setTruong] = useState(initialTruong);
  const [compare_items, setCompareItems] = useState(initialCompareItems);

  const resetFromArticle = useCallback(() => {
    setTieuDeViet(article.tieu_de_viet ?? "");
    setTieuDe(article.tieu_de ?? "");
    setTieuDeEng(article.tieu_de_eng ?? "");
    setHeroDesc(article.mo_ta_ngan?.trim() || article.tom_tat?.trim() || "");
    setMaNganh(article.meta?.ma_nganh ?? "");
    setKhoiThiText(khoiThiToText(article.meta?.khoi_thi));
    setMonNangKhieu(article.meta?.mon_nang_khieu ?? "");
    setThoiGianDaoTao(article.meta?.thoi_gian_dao_tao ?? "");
    setCoverId(article.cover_id ?? "");
    setThumbnail(article.thumbnail ?? "");
    setMainVideo(article.main_video ?? "");
    setVideoUrl(article.meta?.video_url ?? "");
    setEditorialImages(article.meta?.editorial_images ?? []);
    setNoiDung(mergedBody(article));
    setMonHoc(initialMonHoc);
    setTruong(initialTruong);
    setCompareItems(initialCompareItems);
  }, [article, initialMonHoc, initialTruong, initialCompareItems]);

  useEffect(() => {
    resetFromArticle();
    setEditMode(false);
  }, [resetKey, resetFromArticle]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const parsed = useMemo(() => parseNganhNoiDung(noi_dung), [noi_dung]);
  const isEditing = canEdit && editMode;

  const showToast = useCallback((msg: string) => setToast(msg), []);

  const saveAll = useCallback(async (): Promise<boolean> => {
    if (!persistEnabled) {
      showToast("Thiếu SUPABASE_SERVICE_ROLE_KEY — thêm key rồi restart dev server.");
      return false;
    }
    setSaving(true);
    const meta: MetaNganhDaoTao = {
      ma_nganh: ma_nganh.trim(),
      khoi_thi: textToKhoiThi(khoi_thi_text),
      mon_nang_khieu: mon_nang_khieu.trim() || null,
      thoi_gian_dao_tao: thoi_gian_dao_tao.trim() || null,
      editorial_images: textToEditorialImages(
        editorial_images.map((s) => s.trim()).join("\n"),
      ),
      video_url: video_url.trim() || null,
    };
    const fd = new FormData();
    fd.set("id", article.id);
    fd.set("slug", article.slug);
    fd.set("tieu_de", tieu_de.trim() || article.tieu_de);
    fd.set("tieu_de_viet", tieu_de_viet);
    fd.set("tieu_de_eng", tieu_de_eng);
    fd.set("tom_tat", heroDesc.trim());
    fd.set("noi_dung", mergeCompareIntoNoiDung(noi_dung, compare_items));
    fd.set("cover_id", cover_id.trim());
    fd.set("thumbnail", thumbnail.trim());
    fd.set("main_video", main_video.trim());
    fd.set("trang_thai_noi_dung", "published");
    fd.set("meta_json", JSON.stringify(meta));
    const r = await adminSaveArticle(fd);
    setSaving(false);
    if (r.ok) {
      showToast("Đã lưu thay đổi.");
      router.refresh();
      return true;
    }
    showToast(r.message ?? "Lưu thất bại.");
    return false;
  }, [
    persistEnabled,
    article.id,
    article.slug,
    article.tieu_de,
    tieu_de,
    tieu_de_viet,
    tieu_de_eng,
    heroDesc,
    noi_dung,
    compare_items,
    ma_nganh,
    khoi_thi_text,
    mon_nang_khieu,
    thoi_gian_dao_tao,
    cover_id,
    thumbnail,
    main_video,
    video_url,
    editorial_images,
    router,
    showToast,
  ]);

  const value = useMemo<Ctx>(
    () => ({
      canEdit,
      editMode,
      setEditMode,
      isEditing,
      persistEnabled,
      saving,
      toast,
      article,
      tieu_de_viet,
      setTieuDeViet,
      tieu_de,
      setTieuDe,
      tieu_de_eng,
      setTieuDeEng,
      heroDesc,
      setHeroDesc,
      ma_nganh,
      setMaNganh,
      khoi_thi_text,
      setKhoiThiText,
      mon_nang_khieu,
      setMonNangKhieu,
      thoi_gian_dao_tao,
      setThoiGianDaoTao,
      cover_id,
      setCoverId,
      thumbnail,
      setThumbnail,
      main_video,
      setMainVideo,
      video_url,
      setVideoUrl,
      editorial_images,
      setEditorialImages,
      noi_dung,
      setNoiDung,
      mon_hoc,
      setMonHoc,
      truong,
      setTruong,
      compare_items,
      setCompareItems,
      parsed,
      saveAll,
      showToast,
    }),
    [
      canEdit,
      editMode,
      isEditing,
      persistEnabled,
      saving,
      toast,
      article,
      tieu_de_viet,
      tieu_de,
      tieu_de_eng,
      heroDesc,
      ma_nganh,
      khoi_thi_text,
      mon_nang_khieu,
      thoi_gian_dao_tao,
      cover_id,
      thumbnail,
      main_video,
      video_url,
      editorial_images,
      noi_dung,
      mon_hoc,
      truong,
      compare_items,
      parsed,
      saveAll,
      showToast,
    ],
  );

  return (
    <NganhInlineEditContext.Provider value={value}>
      {children}
      {toast && typeof document !== "undefined"
        ? createPortal(
            <NganhInlineToast message={toast} />,
            document.body,
          )
        : null}
    </NganhInlineEditContext.Provider>
  );
}

function NganhInlineToast({ message }: { message: string }) {
  return (
    <div className="tdh-inline-toast" role="status">
      {message}
    </div>
  );
}
