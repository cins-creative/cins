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
import { readPhanMemMetaExtras } from "@/lib/articles/software-summary-helpers";
import type { ArticleBaiViet, MetaPhanMem } from "@/lib/articles/types";

function mergedBody(article: ArticleBaiViet): string {
  return (article.noi_dung ?? article.noi_dung_markdown ?? "").replace(
    /\r\n/g,
    "\n",
  );
}

function platformToText(platform: string[] | undefined): string {
  return (platform ?? []).join(", ");
}

function textToPlatform(text: string): string[] {
  return text
    .split(/[,，\n]+/)
    .map((s) => s.trim())
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
  article: ArticleBaiViet;
  tieu_de: string;
  setTieuDe: (v: string) => void;
  tieu_de_viet: string;
  setTieuDeViet: (v: string) => void;
  tom_tat: string;
  setTomTat: (v: string) => void;
  nha_phat_hanh: string;
  setNhaPhatHanh: (v: string) => void;
  version: string;
  setVersion: (v: string) => void;
  platform_text: string;
  setPlatformText: (v: string) => void;
  website: string;
  setWebsite: (v: string) => void;
  goi_mien_phi: string;
  setGoiMienPhi: (v: string) => void;
  gia_thanh: string;
  setGiaThanh: (v: string) => void;
  hinh_thuc_mua: string;
  setHinhThucMua: (v: string) => void;
  link_tai: string;
  setLinkTai: (v: string) => void;
  tac_pham_tren_cins: string;
  setTacPhamTrenCins: (v: string) => void;
  nguoi_dung_cins: string;
  setNguoiDungCins: (v: string) => void;
  main_video: string;
  setMainVideo: (v: string) => void;
  cover_id: string;
  setCoverId: (v: string) => void;
  thumbnail: string;
  setThumbnail: (v: string) => void;
  thumbnail_preview_url: string | null;
  setThumbnailPreviewUrl: (v: string | null) => void;
  noi_dung: string;
  setNoiDung: (v: string) => void;
  saveAll: () => Promise<boolean>;
  showToast: (msg: string) => void;
};

const SoftwareInlineEditContext = createContext<Ctx | null>(null);

export function useSoftwareInlineEdit(): Ctx | null {
  return useContext(SoftwareInlineEditContext);
}

type ProviderProps = {
  children: ReactNode;
  article: ArticleBaiViet;
  canEdit: boolean;
  persistEnabled?: boolean;
  resetKey: string;
};

export function SoftwareInlineEditProvider({
  children,
  article,
  canEdit,
  persistEnabled = true,
  resetKey,
}: ProviderProps) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const meta = (article.meta ?? {}) as Partial<MetaPhanMem>;
  const extras = readPhanMemMetaExtras(article.meta);

  const [tieu_de, setTieuDe] = useState(article.tieu_de ?? "");
  const [tieu_de_viet, setTieuDeViet] = useState(article.tieu_de_viet ?? "");
  const [tom_tat, setTomTat] = useState(article.tom_tat ?? "");
  const [nha_phat_hanh, setNhaPhatHanh] = useState(meta.nha_phat_hanh ?? "");
  const [version, setVersion] = useState(meta.version ?? "");
  const [platform_text, setPlatformText] = useState(
    platformToText(meta.platform),
  );
  const [website, setWebsite] = useState(meta.website ?? "");
  const [goi_mien_phi, setGoiMienPhi] = useState(extras.goi_mien_phi ?? "");
  const [gia_thanh, setGiaThanh] = useState(
    extras.gia_thanh ?? meta.gia_thanh ?? "",
  );
  const [hinh_thuc_mua, setHinhThucMua] = useState(
    extras.hinh_thuc_mua ?? meta.hinh_thuc_mua ?? "",
  );
  const [link_tai, setLinkTai] = useState(
    extras.link_tai ?? meta.link_tai ?? "",
  );
  const [tac_pham_tren_cins, setTacPhamTrenCins] = useState(
    extras.tac_pham_tren_cins != null ? String(extras.tac_pham_tren_cins) : "",
  );
  const [nguoi_dung_cins, setNguoiDungCins] = useState(
    extras.nguoi_dung_cins != null ? String(extras.nguoi_dung_cins) : "",
  );
  const [main_video, setMainVideo] = useState(article.main_video ?? "");
  const [cover_id, setCoverId] = useState(article.cover_id ?? "");
  const [thumbnail, setThumbnail] = useState(article.thumbnail ?? "");
  const [thumbnail_preview_url, setThumbnailPreviewUrl] = useState<string | null>(
    null,
  );
  const [noi_dung, setNoiDung] = useState(() => mergedBody(article));

  const resetFromArticle = useCallback(() => {
    const m = (article.meta ?? {}) as Partial<MetaPhanMem>;
    const ex = readPhanMemMetaExtras(article.meta);
    setTieuDe(article.tieu_de ?? "");
    setTieuDeViet(article.tieu_de_viet ?? "");
    setTomTat(article.tom_tat ?? "");
    setNhaPhatHanh(m.nha_phat_hanh ?? "");
    setVersion(m.version ?? "");
    setPlatformText(platformToText(m.platform));
    setWebsite(m.website ?? "");
    setGoiMienPhi(ex.goi_mien_phi ?? "");
    setGiaThanh(ex.gia_thanh ?? m.gia_thanh ?? "");
    setHinhThucMua(ex.hinh_thuc_mua ?? m.hinh_thuc_mua ?? "");
    setLinkTai(ex.link_tai ?? m.link_tai ?? "");
    setTacPhamTrenCins(
      ex.tac_pham_tren_cins != null ? String(ex.tac_pham_tren_cins) : "",
    );
    setNguoiDungCins(
      ex.nguoi_dung_cins != null ? String(ex.nguoi_dung_cins) : "",
    );
    setMainVideo(article.main_video ?? "");
    setCoverId(article.cover_id ?? "");
    setThumbnail(article.thumbnail ?? "");
    setThumbnailPreviewUrl(null);
    setNoiDung(mergedBody(article));
  }, [article]);

  useEffect(() => {
    resetFromArticle();
    setEditMode(false);
  }, [resetKey, resetFromArticle]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const isEditing = canEdit && editMode;
  const showToast = useCallback((msg: string) => setToast(msg), []);

  const saveAll = useCallback(async (): Promise<boolean> => {
    if (!persistEnabled) {
      showToast(
        "Thiếu SUPABASE_SERVICE_ROLE_KEY — thêm key rồi restart dev server.",
      );
      return false;
    }
    setSaving(true);

    const metaOut: MetaPhanMem = {
      nha_phat_hanh: nha_phat_hanh.trim(),
      version: version.trim(),
      platform: textToPlatform(platform_text),
      website: website.trim() || undefined,
      goi_mien_phi: goi_mien_phi.trim() || null,
      gia_thanh: gia_thanh.trim() || null,
      hinh_thuc_mua: hinh_thuc_mua.trim() || null,
      link_tai: link_tai.trim() || null,
      tac_pham_tren_cins: tac_pham_tren_cins.trim() || null,
      nguoi_dung_cins: nguoi_dung_cins.trim() || null,
    };

    const fd = new FormData();
    fd.set("id", article.id);
    fd.set("slug", article.slug);
    fd.set("tieu_de", tieu_de.trim() || article.tieu_de);
    fd.set("tieu_de_viet", tieu_de_viet);
    fd.set("tieu_de_eng", article.tieu_de_eng ?? "");
    fd.set("tom_tat", tom_tat.trim());
    fd.set("noi_dung", noi_dung);
    fd.set("cover_id", cover_id.trim());
    fd.set("thumbnail", thumbnail.trim());
    fd.set("main_video", main_video.trim());
    fd.set("trang_thai_noi_dung", article.trang_thai_noi_dung);
    fd.set("meta_json", JSON.stringify(metaOut));

    let r: Awaited<ReturnType<typeof adminSaveArticle>>;
    try {
      r = await adminSaveArticle(fd);
    } catch (err) {
      setSaving(false);
      const raw = err instanceof Error ? err.message : "";
      showToast(
        raw === "Failed to fetch"
          ? "Không kết nối được dev server — reload trang hoặc chạy lại npm run dev."
          : raw || "Lưu thất bại — thử lại.",
      );
      return false;
    }
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
    article.tieu_de_eng,
    article.trang_thai_noi_dung,
    tieu_de,
    tieu_de_viet,
    tom_tat,
    noi_dung,
    cover_id,
    thumbnail,
    main_video,
    nha_phat_hanh,
    version,
    platform_text,
    website,
    goi_mien_phi,
    gia_thanh,
    hinh_thuc_mua,
    link_tai,
    tac_pham_tren_cins,
    nguoi_dung_cins,
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
      tieu_de,
      setTieuDe,
      tieu_de_viet,
      setTieuDeViet,
      tom_tat,
      setTomTat,
      nha_phat_hanh,
      setNhaPhatHanh,
      version,
      setVersion,
      platform_text,
      setPlatformText,
      website,
      setWebsite,
      goi_mien_phi,
      setGoiMienPhi,
      gia_thanh,
      setGiaThanh,
      hinh_thuc_mua,
      setHinhThucMua,
      link_tai,
      setLinkTai,
      tac_pham_tren_cins,
      setTacPhamTrenCins,
      nguoi_dung_cins,
      setNguoiDungCins,
      main_video,
      setMainVideo,
      cover_id,
      setCoverId,
      thumbnail,
      setThumbnail,
      thumbnail_preview_url,
      setThumbnailPreviewUrl,
      noi_dung,
      setNoiDung,
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
      tieu_de,
      tieu_de_viet,
      tom_tat,
      nha_phat_hanh,
      version,
      platform_text,
      website,
      goi_mien_phi,
      gia_thanh,
      hinh_thuc_mua,
      link_tai,
      tac_pham_tren_cins,
      nguoi_dung_cins,
      main_video,
      cover_id,
      thumbnail,
      thumbnail_preview_url,
      noi_dung,
      saveAll,
      showToast,
    ],
  );

  return (
    <SoftwareInlineEditContext.Provider value={value}>
      {children}
      {toast && typeof document !== "undefined"
        ? createPortal(
            <div className="tdh-inline-toast" role="status">
              {toast}
            </div>,
            document.body,
          )
        : null}
    </SoftwareInlineEditContext.Provider>
  );
}
