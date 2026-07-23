"use client";

import {
  BookOpen,
  Loader2,
  Pencil,
  PlayCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import {
  adminCreateHuongDanNhom,
  adminDeleteHuongDanNhom,
  adminDeleteHuongDanPhien,
  adminSaveHuongDanPhien,
} from "@/app/admin/huong-dan/actions";
import { ArticleDraftContentEditor } from "@/components/article/draft/ArticleDraftContentEditor";
import { ArticleRichBody } from "@/components/article/ArticleRichBody";
import { parseLeadVideoUrl } from "@/lib/articles/lead-video-url";
import { huongDanHref, slugifyHuongDan } from "@/lib/huong-dan/slug";
import type {
  HuongDanCatalogPublic,
  HuongDanNhomAdmin,
  HuongDanPhienPublic,
} from "@/lib/huong-dan/types";

import "@/styles/article-draft-tiptap.css";

type Props = {
  titleId: string;
  catalog: HuongDanCatalogPublic;
  initialNhomSlug?: string | null;
  initialPhienSlug?: string | null;
  onNavigate?: (nhomSlug: string | null, phienSlug: string | null) => void;
  isCinsAdmin?: boolean;
};

type ViewPhien = HuongDanPhienPublic & {
  daXuatBan?: boolean;
  nhomSlug?: string;
  nhomTen?: string;
  nhomThuTu?: number;
};

type ViewNhom = {
  slug: string;
  ten: string;
  thuTu: number;
  phien: ViewPhien[];
};

type EditorDraft = {
  id?: string;
  nhomSlug: string;
  nhomTen: string;
  nhomThuTu: number;
  slug: string;
  tieuDe: string;
  videoUrl: string;
  noiDungHtml: string;
  thuTu: number;
  daXuatBan: boolean;
};

function GuideVideo({ url, title }: { url: string; title: string }) {
  const parsed = parseLeadVideoUrl(url);
  if (!parsed || parsed.kind !== "iframe") return null;
  return (
    <div className="help-guide-video">
      <iframe
        src={parsed.src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

function toViewNhom(list: HuongDanNhomAdmin[]): ViewNhom[] {
  return list.map((n) => ({
    slug: n.slug,
    ten: n.ten,
    thuTu: n.thuTu,
    phien: n.phien.map((p) => ({
      id: p.id,
      slug: p.slug,
      tieuDe: p.tieuDe,
      videoUrl: p.videoUrl,
      noiDungHtml: p.noiDungHtml,
      thuTu: p.thuTu,
      daXuatBan: p.daXuatBan,
      nhomSlug: p.nhomSlug,
      nhomTen: p.nhomTen,
      nhomThuTu: p.nhomThuTu,
    })),
  }));
}

function emptyPhienDraft(nhom: ViewNhom): EditorDraft {
  return {
    nhomSlug: nhom.slug,
    nhomTen: nhom.ten,
    nhomThuTu: nhom.thuTu,
    slug: "",
    tieuDe: "",
    videoUrl: "",
    noiDungHtml: "<p></p>",
    thuTu: nhom.phien.length * 10 + 10,
    daXuatBan: true,
  };
}

function fromPhien(nhom: ViewNhom, p: ViewPhien): EditorDraft {
  return {
    id: p.id,
    nhomSlug: nhom.slug,
    nhomTen: nhom.ten,
    nhomThuTu: nhom.thuTu,
    slug: p.slug,
    tieuDe: p.tieuDe,
    videoUrl: p.videoUrl ?? "",
    noiDungHtml: p.noiDungHtml || "<p></p>",
    thuTu: p.thuTu,
    daXuatBan: p.daXuatBan !== false,
  };
}

export function HelpCenterGuidePanel({
  titleId,
  catalog,
  initialNhomSlug = null,
  initialPhienSlug = null,
  onNavigate,
  isCinsAdmin = false,
}: Props) {
  const [adminNhom, setAdminNhom] = useState<ViewNhom[] | null>(null);
  const [adminLoading, setAdminLoading] = useState(isCinsAdmin);
  const [editing, setEditing] = useState(false);
  const [creatingNhom, setCreatingNhom] = useState(false);
  const [newNhomTen, setNewNhomTen] = useState("");
  const [newNhomSlug, setNewNhomSlug] = useState("");
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refreshAdmin = useCallback(async () => {
    if (!isCinsAdmin) return;
    setAdminLoading(true);
    try {
      const res = await fetch("/api/admin/huong-dan", { cache: "no-store" });
      const json = (await res.json()) as {
        ok?: boolean;
        nhom?: HuongDanNhomAdmin[];
      };
      if (res.ok && json.ok && Array.isArray(json.nhom)) {
        setAdminNhom(toViewNhom(json.nhom));
      } else {
        setAdminNhom([]);
      }
    } catch {
      setAdminNhom([]);
    } finally {
      setAdminLoading(false);
    }
  }, [isCinsAdmin]);

  useEffect(() => {
    if (!isCinsAdmin) {
      setAdminNhom(null);
      setAdminLoading(false);
      return;
    }
    void refreshAdmin();
  }, [isCinsAdmin, refreshAdmin]);

  const nhomList: ViewNhom[] = useMemo(() => {
    if (isCinsAdmin && adminNhom) return adminNhom;
    return catalog.nhom;
  }, [isCinsAdmin, adminNhom, catalog.nhom]);

  const resolvedNhom = useMemo(() => {
    if (!nhomList.length) return null;
    if (initialNhomSlug) {
      const hit = nhomList.find((n) => n.slug === initialNhomSlug);
      if (hit) return hit;
    }
    return nhomList[0] ?? null;
  }, [nhomList, initialNhomSlug]);

  const [nhomSlug, setNhomSlug] = useState(resolvedNhom?.slug ?? "");
  const activeNhom =
    nhomList.find((n) => n.slug === nhomSlug) ?? resolvedNhom;

  const resolvedPhien = useMemo(() => {
    const list = activeNhom?.phien ?? [];
    if (!list.length || !activeNhom) return null;
    if (initialPhienSlug) {
      const hit = list.find((p) => p.slug === initialPhienSlug);
      if (hit) return hit;
    }
    return list[0] ?? null;
  }, [activeNhom, initialPhienSlug]);

  const [phienSlug, setPhienSlug] = useState(resolvedPhien?.slug ?? "");
  const activePhien =
    activeNhom?.phien.find((p) => p.slug === phienSlug) ?? resolvedPhien;

  useEffect(() => {
    if (resolvedNhom && resolvedNhom.slug !== nhomSlug) {
      setNhomSlug(resolvedNhom.slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedNhom?.slug, initialNhomSlug, nhomList]);

  useEffect(() => {
    if (resolvedPhien && resolvedPhien.slug !== phienSlug) {
      setPhienSlug(resolvedPhien.slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedPhien?.slug, initialPhienSlug, nhomSlug]);

  useEffect(() => {
    if (editing || !initialPhienSlug || !activeNhom) return;
    const id = `${titleId}-phien-${initialPhienSlug}`;
    const el = document.getElementById(id);
    if (!el) return;
    const timer = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [editing, initialPhienSlug, activeNhom?.slug, titleId, nhomList]);

  function selectNhom(slug: string) {
    const nhom = nhomList.find((n) => n.slug === slug);
    if (!nhom) return;
    setNhomSlug(slug);
    const first = nhom.phien[0]?.slug ?? null;
    setPhienSlug(first ?? "");
    setEditing(false);
    setDraft(null);
    setCreatingNhom(false);
    onNavigate?.(slug, first);
  }

  function selectPhien(slug: string) {
    if (!activeNhom) return;
    setPhienSlug(slug);
    setEditing(false);
    setDraft(null);
    onNavigate?.(activeNhom.slug, slug);
  }

  function startEdit(phien?: ViewPhien | null) {
    if (!activeNhom) return;
    setMsg(null);
    setCreatingNhom(false);
    setDraft(
      phien ? fromPhien(activeNhom, phien) : emptyPhienDraft(activeNhom),
    );
    setEditing(true);
  }

  function createNhom() {
    const ten = newNhomTen.trim();
    const slug = newNhomSlug || slugifyHuongDan(ten);
    setMsg(null);
    startTransition(async () => {
      const res = await adminCreateHuongDanNhom({
        nhomTen: ten,
        nhomSlug: slug,
        nhomThuTu: (nhomList.length + 1) * 10,
      });
      if (!res.ok) {
        setMsg(res.message);
        return;
      }
      setNewNhomTen("");
      setNewNhomSlug("");
      setCreatingNhom(false);

      const adminRes = await fetch("/api/admin/huong-dan", { cache: "no-store" });
      const json = (await adminRes.json()) as {
        ok?: boolean;
        nhom?: HuongDanNhomAdmin[];
      };
      const next = adminRes.ok && json.ok && Array.isArray(json.nhom)
        ? toViewNhom(json.nhom)
        : [];
      setAdminNhom(next);
      setAdminLoading(false);

      const created = next.find((n) => n.slug === res.nhomSlug) ?? null;
      setNhomSlug(res.nhomSlug);
      const first = created?.phien[0] ?? null;
      setPhienSlug(first?.slug ?? "gioi-thieu");
      if (created && first) {
        setDraft(fromPhien(created, first));
        setEditing(true);
      } else {
        setEditing(false);
        setDraft(null);
      }
      onNavigate?.(res.nhomSlug, first?.slug ?? "gioi-thieu");
    });
  }

  function savePhien() {
    if (!draft || !activeNhom) return;
    setMsg(null);
    startTransition(async () => {
      const res = await adminSaveHuongDanPhien({
        id: draft.id,
        nhomSlug: draft.nhomSlug || activeNhom.slug,
        nhomTen: draft.nhomTen || activeNhom.ten,
        nhomThuTu: draft.nhomThuTu,
        slug: draft.slug || slugifyHuongDan(draft.tieuDe),
        tieuDe: draft.tieuDe,
        videoUrl: draft.videoUrl,
        noiDungHtml: draft.noiDungHtml,
        thuTu: draft.thuTu,
        daXuatBan: draft.daXuatBan,
      });
      if (!res.ok) {
        setMsg(res.message);
        return;
      }
      const slug = draft.slug || slugifyHuongDan(draft.tieuDe);
      await refreshAdmin();
      setPhienSlug(slug);
      setEditing(false);
      setDraft(null);
      onNavigate?.(activeNhom.slug, slug);
    });
  }

  function deletePhien(phien: ViewPhien) {
    if (!activeNhom || !phien.id) return;
    if (
      !window.confirm(
        `Xoá phần «${phien.tieuDe}»? Phần sẽ ẩn khỏi hướng dẫn công khai.`,
      )
    ) {
      return;
    }
    setMsg(null);
    const remaining = activeNhom.phien.filter((p) => p.id !== phien.id);
    const nextPhien = remaining[0]?.slug ?? null;
    startTransition(async () => {
      const res = await adminDeleteHuongDanPhien(phien.id);
      if (!res.ok) {
        setMsg(res.message);
        return;
      }
      await refreshAdmin();
      setEditing(false);
      setDraft(null);
      setPhienSlug(nextPhien ?? "");
      onNavigate?.(activeNhom.slug, nextPhien);
    });
  }

  function deleteNhom(nhom: ViewNhom) {
    if (
      !window.confirm(
        `Xoá nhóm «${nhom.ten}» và mọi phần bên trong? Nhóm sẽ ẩn khỏi hướng dẫn công khai.`,
      )
    ) {
      return;
    }
    setMsg(null);
    const remaining = nhomList.filter((n) => n.slug !== nhom.slug);
    const nextNhom = remaining[0] ?? null;
    const nextPhien = nextNhom?.phien[0]?.slug ?? null;
    startTransition(async () => {
      const res = await adminDeleteHuongDanNhom(nhom.slug);
      if (!res.ok) {
        setMsg(res.message);
        return;
      }
      await refreshAdmin();
      setCreatingNhom(false);
      setEditing(false);
      setDraft(null);
      setNhomSlug(nextNhom?.slug ?? "");
      setPhienSlug(nextPhien ?? "");
      onNavigate?.(nextNhom?.slug ?? null, nextPhien);
    });
  }

  if (isCinsAdmin && adminLoading && !adminNhom) {
    return (
      <div className="uas-layout help-guide-layout">
        <div className="uas-body help-guide-empty">
          <Loader2 size={22} className="help-guide-spin" aria-hidden />
          <p>Đang tải hướng dẫn…</p>
        </div>
      </div>
    );
  }

  if (!nhomList.length) {
    return (
      <div className="uas-layout help-guide-layout">
        <div className="uas-body help-guide-empty">
          <BookOpen size={28} strokeWidth={1.7} aria-hidden />
          {isCinsAdmin ? (
            <>
              <p>Chưa có nhóm hướng dẫn. Tạo nhóm đầu tiên ngay tại đây.</p>
              <div className="help-guide-admin-create">
                <label>
                  Tên nhóm
                  <input
                    value={newNhomTen}
                    onChange={(e) => {
                      const ten = e.target.value;
                      setNewNhomTen(ten);
                      setNewNhomSlug(slugifyHuongDan(ten));
                    }}
                    placeholder="VD: Chủ shop bán hàng"
                  />
                </label>
                <label>
                  Slug
                  <input
                    value={newNhomSlug}
                    onChange={(e) =>
                      setNewNhomSlug(slugifyHuongDan(e.target.value))
                    }
                    placeholder="chu-shop"
                  />
                </label>
                {msg ? <p className="help-guide-admin-msg">{msg}</p> : null}
                <button
                  type="button"
                  className="uas-btn primary"
                  disabled={pending || !newNhomTen.trim()}
                  onClick={createNhom}
                >
                  {pending ? (
                    <Loader2 size={15} className="help-guide-spin" aria-hidden />
                  ) : (
                    <Plus size={15} aria-hidden />
                  )}
                  Tạo nhóm
                </button>
              </div>
            </>
          ) : (
            <p>Chưa có hướng dẫn công khai. Quay lại sau nhé.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="uas-layout help-guide-layout">
      <nav className="uas-nav" aria-label="Nhóm hướng dẫn">
        {nhomList.map((nhom) => {
          const active = activeNhom?.slug === nhom.slug;
          if (!isCinsAdmin) {
            return (
              <button
                key={nhom.slug}
                type="button"
                className={`uas-nav-btn${active ? " on" : ""}`}
                aria-current={active ? "true" : undefined}
                onClick={() => selectNhom(nhom.slug)}
              >
                {nhom.ten}
              </button>
            );
          }
          return (
            <div
              key={nhom.slug}
              className={`help-guide-nav-row${active ? " on" : ""}`}
            >
              <button
                type="button"
                className={`uas-nav-btn${active ? " on" : ""}`}
                aria-current={active ? "true" : undefined}
                onClick={() => selectNhom(nhom.slug)}
              >
                {nhom.ten}
              </button>
              <button
                type="button"
                className="help-guide-nav-del"
                disabled={pending}
                aria-label={`Xoá nhóm ${nhom.ten}`}
                title="Xoá nhóm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNhom(nhom);
                }}
              >
                <Trash2 size={13} aria-hidden />
              </button>
            </div>
          );
        })}
        {isCinsAdmin ? (
          <button
            type="button"
            className="uas-nav-btn help-guide-nav-add"
            onClick={() => {
              setCreatingNhom(true);
              setEditing(false);
              setDraft(null);
              setMsg(null);
            }}
          >
            <Plus size={14} aria-hidden />
            Thêm nhóm
          </button>
        ) : null}
      </nav>

      <div className="uas-body help-guide-main">
        {creatingNhom && isCinsAdmin ? (
          <section className="help-guide-editor help-guide-editor--compact">
            <header className="help-guide-editor-head">
              <div>
                <p className="help-guide-editor-kicker">Nhóm đối tượng</p>
                <h3 className="help-guide-editor-title">Thêm nhóm mới</h3>
              </div>
              <button
                type="button"
                className="help-guide-icon-btn"
                aria-label="Đóng"
                onClick={() => setCreatingNhom(false)}
              >
                <X size={16} aria-hidden />
              </button>
            </header>
            <div className="help-guide-editor-scroll">
              <div className="help-guide-editor-fields">
                <label className="help-guide-field help-guide-field--title">
                  <span>Tên nhóm</span>
                  <input
                    value={newNhomTen}
                    onChange={(e) => {
                      const ten = e.target.value;
                      setNewNhomTen(ten);
                      setNewNhomSlug(slugifyHuongDan(ten));
                    }}
                    placeholder="VD: Studio / Agency"
                  />
                </label>
                <label className="help-guide-field">
                  <span>Slug</span>
                  <input
                    value={newNhomSlug}
                    onChange={(e) =>
                      setNewNhomSlug(slugifyHuongDan(e.target.value))
                    }
                  />
                </label>
              </div>
              {msg ? <p className="help-guide-admin-msg">{msg}</p> : null}
            </div>
            <footer className="help-guide-editor-foot">
              <button
                type="button"
                className="uas-btn ghost"
                onClick={() => setCreatingNhom(false)}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="uas-btn primary"
                disabled={pending || !newNhomTen.trim()}
                onClick={createNhom}
              >
                {pending ? (
                  <Loader2 size={15} className="help-guide-spin" aria-hidden />
                ) : (
                  <Plus size={15} aria-hidden />
                )}
                Tạo nhóm
              </button>
            </footer>
          </section>
        ) : null}

        {activeNhom && !creatingNhom ? (
          <>
            {!editing ? (
            <div className="uas-section-head help-guide-head-row">
              <div className="help-guide-head-copy">
                <h3 id={`${titleId}-guide-nhom`} className="uas-section-title">
                  {activeNhom.ten}
                </h3>
                <p className="uas-section-hint">
                  {isCinsAdmin
                    ? "Cuộn xem từng phần · thêm hoặc sửa nội dung hướng dẫn."
                    : "Cuộn xuống để xem lần lượt từng phần hướng dẫn."}
                </p>
                {msg ? <p className="help-guide-admin-msg">{msg}</p> : null}
              </div>
              {isCinsAdmin ? (
                <div className="help-guide-toolbar">
                  <button
                    type="button"
                    className="help-guide-tool-btn primary"
                    onClick={() => startEdit(null)}
                  >
                    <Plus size={14} aria-hidden />
                    Thêm phần
                  </button>
                </div>
              ) : null}
            </div>
            ) : null}

            {editing && draft && isCinsAdmin ? (
              <section className="help-guide-editor">
                <header className="help-guide-editor-head">
                  <div>
                    <p className="help-guide-editor-kicker">Soạn thảo</p>
                    <h4 className="help-guide-editor-title">
                      {draft.id ? "Sửa phần hướng dẫn" : "Thêm phần hướng dẫn"}
                    </h4>
                  </div>
                  <button
                    type="button"
                    className="help-guide-icon-btn"
                    aria-label="Huỷ"
                    onClick={() => {
                      setEditing(false);
                      setDraft(null);
                      setMsg(null);
                    }}
                  >
                    <X size={16} aria-hidden />
                  </button>
                </header>

                <div className="help-guide-editor-scroll">
                  <div className="help-guide-editor-fields">
                    <label className="help-guide-field help-guide-field--title">
                      <span>Tiêu đề</span>
                      <input
                        value={draft.tieuDe}
                        onChange={(e) => {
                          const tieuDe = e.target.value;
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  tieuDe,
                                  slug:
                                    !d.id &&
                                    (!d.slug ||
                                      d.slug === slugifyHuongDan(d.tieuDe))
                                      ? slugifyHuongDan(tieuDe)
                                      : d.slug,
                                }
                              : d,
                          );
                        }}
                        placeholder="VD: Cách tạo shop"
                      />
                    </label>

                    <div className="help-guide-field-row">
                      <label className="help-guide-field">
                        <span>Slug</span>
                        <input
                          value={draft.slug}
                          onChange={(e) =>
                            setDraft((d) =>
                              d
                                ? {
                                    ...d,
                                    slug: slugifyHuongDan(e.target.value),
                                  }
                                : d,
                            )
                          }
                        />
                      </label>
                      <label className="help-guide-field help-guide-field--order">
                        <span>Thứ tự</span>
                        <input
                          type="number"
                          value={draft.thuTu}
                          onChange={(e) =>
                            setDraft((d) =>
                              d
                                ? {
                                    ...d,
                                    thuTu: Number(e.target.value) || 0,
                                  }
                                : d,
                            )
                          }
                        />
                      </label>
                    </div>

                    <label className="help-guide-field">
                      <span>Video YouTube</span>
                      <input
                        value={draft.videoUrl}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, videoUrl: e.target.value } : d,
                          )
                        }
                        placeholder="https://www.youtube.com/watch?v=…"
                      />
                    </label>

                    <label
                      className={`help-guide-publish${draft.daXuatBan ? " on" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={draft.daXuatBan}
                        onChange={(e) =>
                          setDraft((d) =>
                            d
                              ? { ...d, daXuatBan: e.target.checked }
                              : d,
                          )
                        }
                      />
                      <span className="help-guide-publish-switch" aria-hidden />
                      <span className="help-guide-publish-copy">
                        <strong>Xuất bản công khai</strong>
                        <small>
                          {draft.daXuatBan
                            ? "Người dùng sẽ thấy phần này"
                            : "Chỉ admin thấy (nháp)"}
                        </small>
                      </span>
                    </label>
                  </div>

                  <div className="help-guide-editor-body">
                    <p className="help-guide-editor-label">Nội dung</p>
                    <div className="help-guide-admin-tiptap">
                      <ArticleDraftContentEditor
                        value={draft.noiDungHtml}
                        onChange={(html) =>
                          setDraft((d) =>
                            d ? { ...d, noiDungHtml: html } : d,
                          )
                        }
                        hideHint
                        deferHeavyContent
                      />
                    </div>
                  </div>

                  {msg ? <p className="help-guide-admin-msg">{msg}</p> : null}
                </div>

                <footer className="help-guide-editor-foot">
                  {draft.id ? (
                    <button
                      type="button"
                      className="uas-btn ghost help-guide-delete-btn"
                      disabled={pending}
                      onClick={() =>
                        deletePhien({
                          id: draft.id!,
                          slug: draft.slug,
                          tieuDe: draft.tieuDe,
                          videoUrl: draft.videoUrl,
                          noiDungHtml: draft.noiDungHtml,
                          thuTu: draft.thuTu,
                          daXuatBan: draft.daXuatBan,
                        })
                      }
                    >
                      <Trash2 size={14} aria-hidden />
                      Xoá phần
                    </button>
                  ) : (
                    <span />
                  )}
                  <div className="help-guide-editor-foot-end">
                    <button
                      type="button"
                      className="uas-btn ghost"
                      disabled={pending}
                      onClick={() => {
                        setEditing(false);
                        setDraft(null);
                      }}
                    >
                      Huỷ
                    </button>
                    <button
                      type="button"
                      className="uas-btn primary"
                      disabled={pending || !draft.tieuDe.trim()}
                      onClick={savePhien}
                    >
                      {pending ? (
                        <Loader2
                          size={15}
                          className="help-guide-spin"
                          aria-hidden
                        />
                      ) : null}
                      Lưu phần
                    </button>
                  </div>
                </footer>
              </section>
            ) : (
              <>
                {(activeNhom.phien.length ?? 0) > 0 ? (
                  <div
                    className="help-guide-phien-stack"
                    aria-label={`Phần hướng dẫn ${activeNhom.ten}`}
                  >
                    {activeNhom.phien.map((phien, index) => (
                      <section
                        key={phien.id}
                        id={`${titleId}-phien-${phien.slug}`}
                        className={`help-guide-phien${
                          initialPhienSlug === phien.slug ? " is-target" : ""
                        }`}
                        aria-labelledby={`${titleId}-guide-phien-${phien.slug}`}
                      >
                        <header className="help-guide-phien-head">
                          <div className="help-guide-phien-head-main">
                            <span className="help-guide-phien-idx">
                              {index + 1}
                            </span>
                            <div className="help-guide-phien-head-copy">
                              <h4
                                id={`${titleId}-guide-phien-${phien.slug}`}
                                className="help-guide-phien-title"
                              >
                                {phien.tieuDe}
                              </h4>
                              {isCinsAdmin && phien.daXuatBan === false ? (
                                <em className="help-guide-draft-badge">Nháp</em>
                              ) : null}
                            </div>
                          </div>
                          {isCinsAdmin ? (
                            <div className="help-guide-phien-actions">
                              <button
                                type="button"
                                className="help-guide-tool-btn"
                                disabled={pending}
                                onClick={() => {
                                  selectPhien(phien.slug);
                                  startEdit(phien);
                                }}
                              >
                                <Pencil size={14} aria-hidden />
                                Sửa
                              </button>
                              <button
                                type="button"
                                className="help-guide-tool-btn danger"
                                disabled={pending}
                                aria-label={`Xoá phần ${phien.tieuDe}`}
                                onClick={() => deletePhien(phien)}
                              >
                                <Trash2 size={14} aria-hidden />
                                Xoá
                              </button>
                            </div>
                          ) : null}
                        </header>

                        {phien.videoUrl ? (
                          <div className="help-guide-video-block">
                            <div className="help-guide-video-label">
                              <PlayCircle
                                size={15}
                                strokeWidth={2}
                                aria-hidden
                              />
                              Video hướng dẫn
                            </div>
                            <GuideVideo
                              url={phien.videoUrl}
                              title={phien.tieuDe}
                            />
                          </div>
                        ) : null}

                        <div className="help-guide-content">
                          <ArticleRichBody
                            source={phien.noiDungHtml}
                            emptyMessage="Nội dung đang được cập nhật."
                          />
                        </div>

                        <p className="help-footnote help-guide-permalink">
                          Liên kết:{" "}
                          <code className="help-code">
                            {huongDanHref(activeNhom.slug, phien.slug)}
                          </code>
                        </p>
                      </section>
                    ))}
                  </div>
                ) : isCinsAdmin ? (
                  <p className="uas-section-hint help-guide-empty-phien">
                    Nhóm này chưa có phần — bấm «Thêm phần» để tạo.
                  </p>
                ) : (
                  <p className="uas-section-hint help-guide-empty-phien">
                    Nhóm này chưa có phần hướng dẫn.
                  </p>
                )}
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
