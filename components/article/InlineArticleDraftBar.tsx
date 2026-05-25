"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { adminSaveArticle } from "@/app/admin/actions";
import { ArticleDraftContentEditor } from "@/components/article/draft/ArticleDraftContentEditor";
import { useNgheArticleDraftOptional } from "@/components/article/nghe/NgheArticleDraftContext";
import { NgheCornerDraftPanel } from "@/components/article/nghe/NgheCornerDraftPanel";
import type { ArticleBaiViet } from "@/lib/articles/types";

function mergedBody(a: ArticleBaiViet): string {
  return (a.noi_dung ?? a.noi_dung_markdown ?? "").replace(/\r\n/g, "\n");
}

const STATUS_OPTIONS = [
  { value: "published", label: "Đã xuất bản" },
  { value: "cho_review", label: "Chờ duyệt" },
  { value: "dang_viet", label: "Đang viết" },
  { value: "archived", label: "Lưu trữ" },
  { value: "merged", label: "Đã gộp" },
] as const;

type Props = {
  article: ArticleBaiViet;
  /** `false` khi thiếu `SUPABASE_SERVICE_ROLE_KEY` — vẫn mở form nhưng không lưu được. */
  persistEnabled?: boolean;
  /** Điều khiển mở panel từ toolbar quản trị (software / ngành). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** Thanh sửa thử: ghi `article_bai_viet` qua service role — bài `nghe` dùng sửa tại chỗ + thanh này khi đang mở. */
export function InlineArticleDraftBar({
  article,
  persistEnabled = true,
  open: openProp,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const ngheDraft = useNgheArticleDraftOptional();

  const [localOpen, setLocalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : localOpen;

  const setOpen = (next: boolean) => {
    if (isControlled) onOpenChange?.(next);
    else setLocalOpen(next);
  };

  const [tieu_de, setTieuDe] = useState(article.tieu_de);
  const [tieu_de_viet, setTieuDeViet] = useState(article.tieu_de_viet ?? "");
  const [tieu_de_eng, setTieuDeEng] = useState(article.tieu_de_eng ?? "");
  const [tom_tat, setTomTat] = useState(article.tom_tat ?? "");
  const [metaJson, setMetaJson] = useState(() =>
    JSON.stringify(article.meta ?? {}, null, 2),
  );
  const [noi_dung, setNoiDung] = useState(mergedBody(article));
  const [trang_thai, setTrangThai] = useState<string>(article.trang_thai_noi_dung);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  if (ngheDraft) {
    if (!ngheDraft.open) return null;
    return <NgheCornerDraftPanel draft={ngheDraft} />;
  }

  const openPanel = () => setOpen(true);
  const closePanel = () => setOpen(false);

  async function onSave(e: FormEvent) {
    e.preventDefault();
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
  }

  if (!open) {
    if (isControlled) return null;
    return (
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[9999] flex justify-center p-2"
        data-inline-draft-bar="true"
      >
        <div className="pointer-events-auto w-full max-w-4xl">
          <button
            type="button"
            onClick={openPanel}
            className="rounded-full border border-amber-400 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-950 shadow-md hover:bg-amber-200"
          >
            Sửa bài (thử) · {article.slug}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[9999] flex justify-center p-2"
      data-inline-draft-bar="true"
    >
      <div className="pointer-events-auto w-full max-w-4xl">
        <form
          onSubmit={(e) => void onSave(e)}
          className="max-h-[min(85vh,720px)] overflow-y-auto rounded-xl border border-amber-400 bg-white p-4 shadow-xl"
        >
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                Bản thử — không cần đăng nhập
              </p>
              <p className="text-xs text-slate-600">
                Loại: <code>{article.loai_bai_viet}</code> · chỉ bật khi dev hoặc{" "}
                <code className="text-[10px]">CINS_INLINE_ARTICLE_EDIT</code>
              </p>
            </div>
            <button
              type="button"
              onClick={closePanel}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
            >
              Thu gọn
            </button>
          </div>

          {saveMsg ? (
            <p
              className={
                saveMsg.type === "ok" ? "mb-2 text-sm text-green-700" : "mb-2 text-sm text-red-600"
              }
              role={saveMsg.type === "err" ? "alert" : "status"}
            >
              {saveMsg.text}
            </p>
          ) : null}

          {!persistEnabled ? (
            <p className="mb-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-2 text-xs text-amber-950">
              Chưa cấu hình <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> — bạn vẫn xem
              form; thêm key vào <code className="font-mono">.env.local</code> rồi chạy lại{" "}
              <code className="font-mono">npm run dev</code> để bật nút Lưu.
            </p>
          ) : null}

          <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Xem nhanh (cùng dữ liệu form)
            </p>
            <p className="text-lg font-bold leading-snug text-slate-900">{tieu_de.trim() || "—"}</p>
            {tieu_de_viet.trim() || tieu_de_eng.trim() ? (
              <p className="mt-1 text-sm italic text-slate-700">
                {tieu_de_viet.trim() || tieu_de_eng.trim()}
              </p>
            ) : null}
            {tom_tat.trim() ? (
              <p className="mt-2 border-t border-slate-200 pt-2 text-sm text-slate-600">{tom_tat}</p>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-0.5 text-xs font-medium text-slate-800">
              Tiêu đề chính (H1)
              <input
                value={tieu_de}
                onChange={(e) => setTieuDe(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs font-medium text-slate-800">
              <span>
                Dòng <code className="font-normal">em</code> —{" "}
                <code className="text-[10px] font-normal">tieu_de_viet</code>
              </span>
              <input
                value={tieu_de_viet}
                onChange={(e) => setTieuDeViet(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex flex-col gap-0.5 text-xs font-medium text-slate-800 sm:col-span-2">
              <span>
                Dòng <code className="font-normal">em</code> dự phòng —{" "}
                <code className="text-[10px] font-normal">tieu_de_eng</code>
              </span>
              <input
                value={tieu_de_eng}
                onChange={(e) => setTieuDeEng(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
          </div>

          <label className="mt-2 flex flex-col gap-0.5 text-xs font-medium text-slate-800">
            Tóm tắt
            <textarea
              value={tom_tat}
              onChange={(e) => setTomTat(e.target.value)}
              rows={2}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>

          <label className="mt-2 flex flex-col gap-0.5 text-xs font-medium text-slate-800">
            <span>
              Meta (JSON) — ví dụ <code className="text-[10px]">video_url</code>
            </span>
            <textarea
              value={metaJson}
              onChange={(e) => setMetaJson(e.target.value)}
              spellCheck={false}
              rows={4}
              className="rounded border border-slate-300 px-2 py-1.5 font-mono text-[11px] leading-relaxed"
            />
          </label>

          <label className="mt-2 flex flex-col gap-0.5 text-xs font-medium text-slate-800">
            Trạng thái
            <select
              value={trang_thai}
              onChange={(e) => setTrangThai(e.target.value)}
              className="max-w-xs rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold text-slate-800">
              Nội dung <code className="font-mono text-[11px]">noi_dung</code> — Tiptap + tab HTML
            </p>
            <ArticleDraftContentEditor value={noi_dung} onChange={setNoiDung} />
          </div>

          <button
            type="submit"
            disabled={saving || !persistEnabled}
            className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Đang lưu…" : "Lưu vào Supabase"}
          </button>
        </form>
      </div>
    </div>
  );
}
