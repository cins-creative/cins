"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { adminFetchArticleBody, adminSaveArticle } from "@/app/admin/actions";
import { ArticleDraftContentEditor } from "@/components/article/draft/ArticleDraftContentEditor";
import type { AdminArticleDetailRow, AdminArticleListRow } from "@/lib/admin/articles-server";

const STATUS_OPTIONS = [
  { value: "published", label: "Đã xuất bản" },
  { value: "cho_review", label: "Chờ duyệt" },
  { value: "dang_viet", label: "Đang viết" },
  { value: "archived", label: "Lưu trữ" },
  { value: "merged", label: "Đã gộp" },
] as const;

function mergedBody(r: AdminArticleDetailRow): string {
  return (r.noi_dung ?? r.noi_dung_markdown ?? "").replace(/\r\n/g, "\n");
}

type Props = {
  initialRows: AdminArticleListRow[];
};

export function AdminArticleManager({ initialRows }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"articles" | "more">("articles");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingBody, setLoadingBody] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  const loadSeq = useRef(0);

  const [slug, setSlug] = useState("");
  const [tieu_de, setTieuDe] = useState("");
  const [tieu_de_viet, setTieuDeViet] = useState("");
  const [tieu_de_eng, setTieuDeEng] = useState("");
  const [tom_tat, setTomTat] = useState("");
  const [metaJson, setMetaJson] = useState("{}");
  const [noi_dung, setNoiDung] = useState("");
  const [trang_thai, setTrangThai] = useState<string>("published");
  const [loai_bai_viet, setLoaiBaiViet] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialRows;
    return initialRows.filter(
      (r) =>
        r.slug.toLowerCase().includes(q) ||
        r.tieu_de.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q),
    );
  }, [initialRows, query]);

  async function selectArticle(id: string) {
    setSelectedId(id);
    const my = ++loadSeq.current;
    setLoadingBody(true);
    setSaveMsg(null);
    const res = await adminFetchArticleBody(id);
    if (my !== loadSeq.current) return;
    setLoadingBody(false);
    if (!res.ok) {
      setSaveMsg({ type: "err", text: res.message });
      return;
    }
    const r = res.row;
    setSlug(r.slug);
    setTieuDe(r.tieu_de);
    setTieuDeViet(r.tieu_de_viet ?? "");
    setTieuDeEng(r.tieu_de_eng ?? "");
    setTomTat(r.tom_tat ?? "");
    setMetaJson(JSON.stringify(r.meta ?? {}, null, 2));
    setNoiDung(mergedBody(r));
    setTrangThai(r.trang_thai_noi_dung);
    setLoaiBaiViet(r.loai_bai_viet);
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setSaveMsg(null);
    setSaving(true);
    const fd = new FormData();
    fd.set("id", selectedId);
    fd.set("slug", slug);
    fd.set("tieu_de", tieu_de);
    fd.set("tieu_de_viet", tieu_de_viet);
    fd.set("tieu_de_eng", tieu_de_eng);
    fd.set("tom_tat", tom_tat);
    fd.set("meta_json", metaJson);
    fd.set("noi_dung", noi_dung);
    fd.set("trang_thai_noi_dung", trang_thai);
    const r = await adminSaveArticle(fd);
    setSaving(false);
    if (r.ok) {
      setSaveMsg({ type: "ok", text: "Đã lưu. Trang bài viết đã được revalidate." });
      router.refresh();
    } else {
      setSaveMsg({ type: "err", text: r.message ?? "Lưu thất bại." });
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold">CINs · danh sách bài (thử)</span>
            <nav className="flex gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setTab("articles")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  tab === "articles"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Quản lý bài viết
              </button>
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-md px-3 py-1.5 text-sm font-medium text-slate-400"
                title="Sắp có"
              >
                Khác
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-blue-600 hover:underline">
              Về trang chủ
            </Link>
          </div>
        </div>
      </header>

      {tab === "articles" ? (
        <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-0 p-4">
          <aside className="w-[320px] shrink-0 flex-col border-r border-slate-200 pr-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Tìm kiếm
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Slug, tiêu đề, id…"
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <ul className="max-h-[calc(100vh-180px)] space-y-1 overflow-y-auto">
              {filtered.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => void selectArticle(r.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      selectedId === r.id
                        ? "border-blue-400 bg-blue-50"
                        : "border-transparent bg-white hover:border-slate-200"
                    }`}
                  >
                    <div className="font-medium line-clamp-2">{r.tieu_de}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {r.loai_bai_viet} · {r.trang_thai_noi_dung}
                    </div>
                    <div className="font-mono text-[11px] text-slate-400">{r.slug}</div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <main className="min-w-0 flex-1 pl-4">
            {!selectedId ? (
              <p className="text-sm text-slate-600">
                Chọn một bài viết bên trái để chỉnh nội dung (trình soạn Tiptap + tab HTML cho{" "}
                <code className="rounded bg-slate-200 px-1">noi_dung</code>
                ). Có thể chèn <strong>ảnh</strong>, <strong>video</strong>, bảng và HTML tùy chỉnh.
              </p>
            ) : loadingBody ? (
              <p className="text-sm text-slate-600">Đang tải nội dung…</p>
            ) : (
              <form onSubmit={(e) => void onSave(e)} className="space-y-4">
                {saveMsg ? (
                  <p
                    className={
                      saveMsg.type === "ok"
                        ? "text-sm text-green-700"
                        : "text-sm text-red-600"
                    }
                    role={saveMsg.type === "err" ? "alert" : "status"}
                  >
                    {saveMsg.text}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  {trang_thai === "published" ? (
                    <Link
                      href={`/bai-viet/${slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Xem bài trên site →
                    </Link>
                  ) : (
                    <span className="text-sm text-amber-700">
                      Chỉ bài <code>published</code> hiển thị công khai trên `/bai-viet/…`
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    Loại: <strong>{loai_bai_viet || "—"}</strong> · slug cố định:{" "}
                    <code className="rounded bg-slate-200 px-1">{slug}</code>
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Tiêu đề chính (H1)
                    <input
                      value={tieu_de}
                      onChange={(e) => setTieuDe(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    <span>
                      Dòng <code className="font-normal">em</code> — tiếng Việt (
                      <code className="text-xs font-normal">tieu_de_viet</code>)
                    </span>
                    <input
                      value={tieu_de_viet}
                      onChange={(e) => setTieuDeViet(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="sm:col-span-2 flex flex-col gap-1 text-sm font-medium">
                    <span>
                      Dòng <code className="font-normal">em</code> dự phòng (
                      <code className="text-xs font-normal">tieu_de_eng</code>)
                    </span>
                    <input
                      value={tieu_de_eng}
                      onChange={(e) => setTieuDeEng(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1 text-sm font-medium">
                  Tóm tắt (hero)
                  <textarea
                    value={tom_tat}
                    onChange={(e) => setTomTat(e.target.value)}
                    rows={3}
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium">
                  Meta (JSON) — <code className="font-normal text-xs">video_url</code>
                  <textarea
                    value={metaJson}
                    onChange={(e) => setMetaJson(e.target.value)}
                    spellCheck={false}
                    rows={5}
                    className="rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm font-medium">
                  Trạng thái
                  <select
                    value={trang_thai}
                    onChange={(e) => setTrangThai(e.target.value)}
                    className="max-w-xs rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div>
                  <span className="mb-2 block text-sm font-medium">
                    Nội dung HTML (
                    <code className="font-normal">noi_dung</code>
                    {loai_bai_viet === "nghe" ? (
                      <>
                        {" "}
                        · lead <code className="font-normal">.nghe-lead-rich</code>
                      </>
                    ) : null}
                    )
                  </span>
                  <p className="mb-2 text-xs text-slate-500">
                    Với bài <strong>nghe</strong>, HTML được render trong khối lead. Có thể dùng class{" "}
                    <code className="rounded bg-slate-200 px-0.5">article-rich-content</code>{" "}
                    (wrapper đã có sẵn) và các class <code className="rounded bg-slate-200 px-0.5">arc-*</code>{" "}
                    trong <code className="rounded bg-slate-200 px-0.5">styles/article-rich-content.css</code>.
                    Nếu cần buộc nhận diện HTML, thêm các dòng <code className="rounded bg-slate-200 px-0.5">-- …</code> ở đầu (sẽ bị strip khi hiển thị).
                  </p>
                  <ArticleDraftContentEditor value={noi_dung} onChange={setNoiDung} />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Đang lưu…" : "Lưu lên Supabase"}
                </button>
              </form>
            )}
          </main>
        </div>
      ) : null}
    </div>
  );
}
