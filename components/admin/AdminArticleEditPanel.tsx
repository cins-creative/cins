"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  adminCountArticleDeleteUsage,
  adminDeleteArticle,
  adminFetchArticleBody,
  adminFetchArticleLienQuan,
  adminSaveArticle,
} from "@/app/admin/actions";
import { AdminArticleLienQuanSection } from "@/components/admin/AdminArticleLienQuanSection";
import type { ArticleDeleteUsage } from "@/lib/admin/article-delete";
import { AdminArticleDeleteDialog } from "@/components/admin/AdminArticleDeleteDialog";
import { AdminArticleThumbnailGallery } from "@/components/admin/AdminArticleThumbnailGallery";
import { ArticleDraftContentEditor } from "@/components/article/draft/ArticleDraftContentEditor";
import { resolveMainVideoValue } from "@/lib/admin/article-fields";
import { normalizeArticleThumbnailValue } from "@/lib/admin/article-display";
import {
  introHtmlForEditor,
  mergeIntroIntoNoiDung,
} from "@/lib/nganh/noi-dung-sections";
import type {
  AdminArticleDetailRow,
  AdminArticleLienQuanRow,
  AdminArticleListRow,
} from "@/lib/admin/articles-server";

const STATUS_OPTIONS = [
  { value: "published", label: "published" },
  { value: "cho_review", label: "cho_review" },
  { value: "dang_viet", label: "dang_viet" },
  { value: "archived", label: "archived" },
  { value: "merged", label: "merged" },
] as const;

function mergedBody(r: AdminArticleDetailRow): string {
  return (r.noi_dung ?? "").replace(/\r\n/g, "\n");
}

type Props = {
  articleId: string;
  listRow?: AdminArticleListRow | null;
  onCancel: () => void;
  onDeleted?: () => void;
};

export function AdminArticleEditPanel({
  articleId,
  listRow,
  onCancel,
  onDeleted,
}: Props) {
  const router = useRouter();
  const loadSeq = useRef(0);
  /** Bản `noi_dung` đầy đủ từ DB — giữ `sec-compare` khi lưu intro từ admin. */
  const fullNoiDungRef = useRef("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteUsage, setDeleteUsage] = useState<ArticleDeleteUsage | null>(null);
  const [deleteUsageLoading, setDeleteUsageLoading] = useState(false);
  const [deleteUsageError, setDeleteUsageError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );

  const [slug, setSlug] = useState("");
  const [tieu_de, setTieuDe] = useState("");
  const [tieu_de_viet, setTieuDeViet] = useState("");
  const [tieu_de_eng, setTieuDeEng] = useState("");
  const [tom_tat, setTomTat] = useState("");
  const [metaJson, setMetaJson] = useState("{}");
  const [noi_dung, setNoiDung] = useState("");
  const [trang_thai, setTrangThai] = useState("published");
  const [loai_bai_viet, setLoaiBaiViet] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);
  const [main_video, setMainVideo] = useState("");
  const [lienQuanOutgoing, setLienQuanOutgoing] = useState<
    AdminArticleLienQuanRow[]
  >([]);
  const [lienQuanIncoming, setLienQuanIncoming] = useState<
    AdminArticleLienQuanRow[]
  >([]);
  const [lienQuanManaged, setLienQuanManaged] = useState<
    AdminArticleLienQuanRow[]
  >([]);
  const [lienQuanManageMode, setLienQuanManageMode] = useState<
    "outgoing" | "nganh_mon_hoc"
  >("outgoing");
  const [lienQuanLoading, setLienQuanLoading] = useState(false);
  const [lienQuanError, setLienQuanError] = useState<string | null>(null);

  async function loadArticle(id: string) {
    const my = ++loadSeq.current;
    setLoading(true);
    setSaveMsg(null);
    setLienQuanOutgoing([]);
    setLienQuanIncoming([]);
    setLienQuanError(null);
    const res = await adminFetchArticleBody(id);
    if (my !== loadSeq.current) return;
    setLoading(false);
    if (!res.ok) {
      setSaveMsg({ type: "err", text: res.message });
      return;
    }
    const r = res.row;
    const body = mergedBody(r);
    fullNoiDungRef.current = body;
    setSlug(r.slug);
    setTieuDe(r.tieu_de);
    setTieuDeViet(r.tieu_de_viet ?? "");
    setTieuDeEng(r.tieu_de_eng ?? "");
    setTomTat(r.tom_tat ?? "");
    setMetaJson(JSON.stringify(r.meta ?? {}, null, 2));
    setNoiDung(
      r.loai_bai_viet === "nganh_dao_tao" ? introHtmlForEditor(body) : body,
    );
    setTrangThai(r.trang_thai_noi_dung);
    setLoaiBaiViet(r.loai_bai_viet);
    setThumbnail(normalizeArticleThumbnailValue(r.thumbnail) ?? "");
    setThumbnailSrc(
      r.thumbnail_src ?? listRow?.thumbnail_src ?? null,
    );
    setMainVideo(resolveMainVideoValue(r) ?? "");

    setLienQuanLoading(true);
    setLienQuanError(null);
    const lq = await adminFetchArticleLienQuan(id, r.loai_bai_viet);
    if (my !== loadSeq.current) return;
    setLienQuanLoading(false);
    if (!lq.ok) {
      setLienQuanOutgoing([]);
      setLienQuanIncoming([]);
      setLienQuanManaged([]);
      setLienQuanError(lq.message);
    } else {
      setLienQuanOutgoing(lq.bundle.outgoing);
      setLienQuanIncoming(lq.bundle.incoming);
      setLienQuanManaged(lq.bundle.managed);
      setLienQuanManageMode(lq.bundle.manageMode);
    }
  }

  useEffect(() => {
    void loadArticle(articleId);
  }, [articleId]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaveMsg(null);
    setSaving(true);
    const fd = new FormData();
    fd.set("id", articleId);
    fd.set("slug", slug);
    fd.set("tieu_de", tieu_de);
    fd.set("tieu_de_viet", tieu_de_viet);
    fd.set("tieu_de_eng", tieu_de_eng);
    fd.set("tom_tat", tom_tat);
    fd.set("meta_json", metaJson);
    fd.set(
      "noi_dung",
      loai_bai_viet === "nganh_dao_tao"
        ? mergeIntroIntoNoiDung(noi_dung, fullNoiDungRef.current)
        : noi_dung,
    );
    fd.set("trang_thai_noi_dung", trang_thai);
    fd.set("thumbnail", thumbnail.trim());
    fd.set("main_video", main_video.trim());
    const r = await adminSaveArticle(fd);
    setSaving(false);
    if (r.ok) {
      if (loai_bai_viet === "nganh_dao_tao") {
        fullNoiDungRef.current = mergeIntroIntoNoiDung(
          noi_dung,
          fullNoiDungRef.current,
        );
      }
      router.refresh();
      onCancel();
    } else {
      setSaveMsg({ type: "err", text: r.message ?? "Lưu thất bại." });
    }
  }

  const deleteArticleTitle =
    tieu_de.trim() || listRow?.tieu_de?.trim() || articleId;

  async function openDeleteDialog() {
    if (deleting || saving || loading) return;
    setSaveMsg(null);
    setDeleteDialogOpen(true);
    setDeleteUsage(null);
    setDeleteUsageError(null);
    setDeleteUsageLoading(true);

    const usageRes = await adminCountArticleDeleteUsage(articleId);
    setDeleteUsageLoading(false);

    if (!usageRes.ok) {
      const msg = usageRes.message ?? "Không kiểm tra được liên kết.";
      setDeleteUsageError(msg);
      return;
    }
    setDeleteUsage(usageRes.usage);
  }

  function closeDeleteDialog() {
    if (deleting) return;
    setDeleteDialogOpen(false);
    setDeleteUsage(null);
    setDeleteUsageError(null);
  }

  async function confirmDelete() {
    if (deleting || !deleteUsage) return;
    setDeleting(true);

    const res = await adminDeleteArticle(
      articleId,
      slug.trim() || listRow?.slug?.trim() || "",
      loai_bai_viet.trim() || listRow?.loai_bai_viet?.trim() || "",
    );
    setDeleting(false);

    if (!res.ok) {
      const msg = res.message ?? "Xóa thất bại.";
      setSaveMsg({ type: "err", text: msg });
      setDeleteUsageError(msg);
      return;
    }

    setDeleteDialogOpen(false);
    onDeleted?.();
    router.refresh();
  }

  return (
    <>
    <form id="admin-article-edit-form" className="admin-edit-form" onSubmit={(e) => void onSave(e)}>
      {saveMsg ? (
        <p
          className={`admin-edit-form__msg admin-edit-form__msg--${saveMsg.type}`}
          role={saveMsg.type === "err" ? "alert" : "status"}
        >
          {saveMsg.text}
        </p>
      ) : null}

      {loading ? <p className="form-hint">Đang tải nội dung chỉnh sửa…</p> : null}

      <div className={loading ? "admin-edit-form__fields admin-edit-form__fields--loading" : "admin-edit-form__fields"}>
        <div className="form-section">Thông tin cơ bản</div>

        <div className="form-group">
          <label className="form-label">Tiêu đề chính *</label>
          <input
            className="form-input"
            type="text"
            value={tieu_de}
            onChange={(e) => setTieuDe(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Tiêu đề tiếng Việt</label>
            <input
              className="form-input"
              type="text"
              value={tieu_de_viet}
              onChange={(e) => setTieuDeViet(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tiêu đề tiếng Anh</label>
            <input
              className="form-input"
              type="text"
              value={tieu_de_eng}
              onChange={(e) => setTieuDeEng(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Slug</label>
            <input
              className="form-input"
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Loại bài viết</label>
            <input className="form-input" type="text" value={loai_bai_viet} readOnly />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Trạng thái</label>
          <select
            className="form-select"
            value={trang_thai}
            onChange={(e) => setTrangThai(e.target.value)}
            disabled={loading}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Tóm tắt</label>
          <textarea
            className="form-textarea"
            rows={2}
            value={tom_tat}
            onChange={(e) => setTomTat(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="form-section">Ảnh & video</div>

        <div className="form-group">
          <label className="form-label">Thumbnail</label>
          <AdminArticleThumbnailGallery
            articleId={articleId}
            thumbnail={thumbnail}
            thumbnailSrc={thumbnailSrc}
            onThumbnailChange={setThumbnail}
            onThumbnailSrcChange={setThumbnailSrc}
            listRow={listRow}
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Main video</label>
          <input
            className="form-input"
            type="url"
            value={main_video}
            onChange={(e) => setMainVideo(e.target.value)}
            disabled={loading}
            placeholder="https://… hoặc URL embed"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Meta (JSON)</label>
          <textarea
            className="form-textarea"
            rows={5}
            spellCheck={false}
            value={metaJson}
            onChange={(e) => setMetaJson(e.target.value)}
            disabled={loading}
            style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
          />
        </div>

        <AdminArticleLienQuanSection
          articleId={articleId}
          loaiBaiViet={loai_bai_viet}
          outgoing={lienQuanOutgoing}
          incoming={lienQuanIncoming}
          managed={lienQuanManaged}
          manageMode={lienQuanManageMode}
          loading={loading || lienQuanLoading}
          error={lienQuanError}
          onBundleUpdated={(bundle) => {
            setLienQuanOutgoing(bundle.outgoing);
            setLienQuanIncoming(bundle.incoming);
            setLienQuanManaged(bundle.managed);
            setLienQuanManageMode(bundle.manageMode);
          }}
        />

        <div className="form-section">Nội dung</div>
        {!loading ? (
          <ArticleDraftContentEditor
            value={noi_dung}
            onChange={setNoiDung}
            variant={
              loai_bai_viet === "nganh_dao_tao" ? "nganh-admin" : "default"
            }
            nganhTitleVi={
              loai_bai_viet === "nganh_dao_tao"
                ? tieu_de_viet.trim() || tieu_de.trim()
                : undefined
            }
            hideHint={loai_bai_viet === "nganh_dao_tao"}
          />
        ) : (
          <p className="form-hint">Editor sẽ hiện sau khi tải xong.</p>
        )}
      </div>

      <div className="admin-edit-form__footer">
        <button
          type="button"
          className="btn btn-danger"
          disabled={saving || deleting || loading || deleteUsageLoading || deleteDialogOpen}
          onClick={() => void openDeleteDialog()}
        >
          {deleteUsageLoading ? "Đang kiểm tra…" : "Xóa bài viết"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
          disabled={saving || deleting}
        >
          Hủy
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving || deleting || loading}
        >
          {saving ? "Đang lưu…" : "Lưu bài viết"}
        </button>
      </div>
    </form>

    <AdminArticleDeleteDialog
      open={deleteDialogOpen}
      articleTitle={deleteArticleTitle}
      usage={deleteUsage}
      loading={deleteUsageLoading}
      loadError={deleteUsageError}
      confirming={deleting}
      onClose={closeDeleteDialog}
      onConfirm={() => void confirmDelete()}
    />
    </>
  );
}
