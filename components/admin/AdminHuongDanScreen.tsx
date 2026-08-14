"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import {
  adminCreateHuongDanNhom,
  adminDeleteHuongDanNhom,
  adminDeleteHuongDanPhien,
  adminSaveHuongDanPhien,
  adminUpdateHuongDanNhomMeta,
} from "@/app/admin/huong-dan/actions";
import { ArticleDraftContentEditor } from "@/components/article/draft/ArticleDraftContentEditor";
import { huongDanHref, slugifyHuongDan } from "@/lib/huong-dan/slug";
import type {
  HuongDanNhomAdmin,
  HuongDanPhienAdmin,
} from "@/lib/huong-dan/types";

type Props = { initialNhom: HuongDanNhomAdmin[] };

type Draft = {
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

function emptyDraft(nhom: HuongDanNhomAdmin | null): Draft {
  return {
    nhomSlug: nhom?.slug ?? "",
    nhomTen: nhom?.ten ?? "",
    nhomThuTu: nhom?.thuTu ?? 100,
    slug: "",
    tieuDe: "",
    videoUrl: "",
    noiDungHtml: "<p></p>",
    thuTu: (nhom?.phien.length ?? 0) * 10 + 10,
    daXuatBan: false,
  };
}

function fromPhien(p: HuongDanPhienAdmin): Draft {
  return {
    id: p.id,
    nhomSlug: p.nhomSlug,
    nhomTen: p.nhomTen,
    nhomThuTu: p.nhomThuTu,
    slug: p.slug,
    tieuDe: p.tieuDe,
    videoUrl: p.videoUrl ?? "",
    noiDungHtml: p.noiDungHtml || "<p></p>",
    thuTu: p.thuTu,
    daXuatBan: p.daXuatBan,
  };
}

export function AdminHuongDanScreen({ initialNhom }: Props) {
  const [nhomList, setNhomList] = useState(initialNhom);
  const [nhomSlug, setNhomSlug] = useState(initialNhom[0]?.slug ?? "");
  const activeNhom = useMemo(
    () => nhomList.find((n) => n.slug === nhomSlug) ?? nhomList[0] ?? null,
    [nhomList, nhomSlug],
  );
  const [draft, setDraft] = useState<Draft>(() =>
    initialNhom[0]?.phien[0]
      ? fromPhien(initialNhom[0].phien[0])
      : emptyDraft(initialNhom[0] ?? null),
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [newNhomTen, setNewNhomTen] = useState("");
  const [newNhomSlug, setNewNhomSlug] = useState("");

  function selectNhom(slug: string) {
    const nhom = nhomList.find((n) => n.slug === slug) ?? null;
    setNhomSlug(slug);
    setDraft(
      nhom?.phien[0] ? fromPhien(nhom.phien[0]) : emptyDraft(nhom),
    );
    setMsg(null);
    setOkMsg(null);
  }

  function selectPhien(p: HuongDanPhienAdmin) {
    setDraft(fromPhien(p));
    setMsg(null);
    setOkMsg(null);
  }

  function startNewPhien() {
    if (!activeNhom) return;
    setDraft(emptyDraft(activeNhom));
    setMsg(null);
    setOkMsg(null);
  }

  function reloadFromServer(next: HuongDanNhomAdmin[], prefer?: {
    nhomSlug?: string;
    phienId?: string;
  }) {
    setNhomList(next);
    const preferNhom =
      next.find((n) => n.slug === (prefer?.nhomSlug || nhomSlug)) ??
      next[0] ??
      null;
    setNhomSlug(preferNhom?.slug ?? "");
    const preferPhien =
      (prefer?.phienId
        ? preferNhom?.phien.find((p) => p.id === prefer.phienId)
        : null) ??
      preferNhom?.phien[0] ??
      null;
    setDraft(preferPhien ? fromPhien(preferPhien) : emptyDraft(preferNhom));
  }

  async function refreshCatalog(prefer?: {
    nhomSlug?: string;
    phienId?: string;
  }) {
    const res = await fetch("/api/admin/huong-dan", { cache: "no-store" });
    if (!res.ok) {
      // Fallback: soft reload page data via router would be heavier — keep local.
      return;
    }
    const json = (await res.json()) as {
      ok?: boolean;
      nhom?: HuongDanNhomAdmin[];
    };
    if (json.ok && Array.isArray(json.nhom)) {
      reloadFromServer(json.nhom, prefer);
    }
  }

  function createNhom() {
    setMsg(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await adminCreateHuongDanNhom({
        nhomTen: newNhomTen,
        nhomSlug: newNhomSlug || slugifyHuongDan(newNhomTen),
        nhomThuTu: (nhomList.length + 1) * 10,
      });
      if (!res.ok) {
        setMsg(res.message);
        return;
      }
      setNewNhomTen("");
      setNewNhomSlug("");
      setOkMsg("Đã tạo nhóm.");
      await refreshCatalog({ nhomSlug: res.nhomSlug });
    });
  }

  function saveNhomMeta() {
    if (!activeNhom) return;
    setMsg(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await adminUpdateHuongDanNhomMeta({
        nhomSlug: activeNhom.slug,
        nhomTen: draft.nhomTen,
        nhomThuTu: draft.nhomThuTu,
      });
      if (!res.ok) {
        setMsg(res.message);
        return;
      }
      setOkMsg("Đã cập nhật nhóm.");
      await refreshCatalog({
        nhomSlug: activeNhom.slug,
        phienId: draft.id,
      });
    });
  }

  function savePhien() {
    if (!activeNhom) return;
    setMsg(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await adminSaveHuongDanPhien({
        id: draft.id,
        nhomSlug: activeNhom.slug,
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
      setOkMsg(draft.id ? "Đã lưu phiên." : "Đã tạo phiên.");
      await refreshCatalog({
        nhomSlug: activeNhom.slug,
        phienId: res.id,
      });
    });
  }

  function deletePhien() {
    if (!draft.id) return;
    if (!window.confirm("Xoá phiên này?")) return;
    setMsg(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await adminDeleteHuongDanPhien(draft.id!);
      if (!res.ok) {
        setMsg(res.message);
        return;
      }
      setOkMsg("Đã xoá phiên.");
      await refreshCatalog({ nhomSlug: activeNhom?.slug });
    });
  }

  function deleteNhom() {
    if (!activeNhom) return;
    if (
      !window.confirm(
        `Xoá cả nhóm «${activeNhom.ten}» và mọi phiên bên trong?`,
      )
    ) {
      return;
    }
    setMsg(null);
    setOkMsg(null);
    startTransition(async () => {
      const res = await adminDeleteHuongDanNhom(activeNhom.slug);
      if (!res.ok) {
        setMsg(res.message);
        return;
      }
      setOkMsg("Đã xoá nhóm.");
      await refreshCatalog();
    });
  }

  return (
    <div className="hd-admin">
      <header className="hd-admin-head">
        <div>
          <h1 className="hd-admin-title">Hướng dẫn</h1>
          <p className="hd-admin-sub">
            Quản lý nhóm đối tượng + phiên (video YouTube + TipTap). Công khai tại{" "}
            <code>/ho-tro/huong-dan</code>.
          </p>
        </div>
        {pending ? (
          <span className="hd-admin-pending">
            <Loader2 size={16} className="hd-spin" aria-hidden />
            Đang lưu…
          </span>
        ) : null}
      </header>

      {msg ? <p className="hd-admin-msg">{msg}</p> : null}
      {okMsg ? <p className="hd-admin-ok">{okMsg}</p> : null}

      <div className="hd-admin-grid">
        <aside className="hd-admin-col">
          <div className="hd-admin-col-head">
            <h2>Nhóm đối tượng</h2>
          </div>
          <ul className="hd-admin-list">
            {nhomList.map((n) => (
              <li key={n.slug}>
                <button
                  type="button"
                  className={`hd-admin-list-btn${activeNhom?.slug === n.slug ? " on" : ""}`}
                  onClick={() => selectNhom(n.slug)}
                >
                  <span>{n.ten}</span>
                  <small>{n.phien.length} phần</small>
                </button>
              </li>
            ))}
          </ul>
          <div className="hd-admin-add">
            <label>
              Tên nhóm mới
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
            <label>
              Slug
              <input
                value={newNhomSlug}
                onChange={(e) => setNewNhomSlug(slugifyHuongDan(e.target.value))}
                placeholder="studio-agency"
              />
            </label>
            <button
              type="button"
              className="hd-btn primary"
              disabled={pending || !newNhomTen.trim()}
              onClick={createNhom}
            >
              <Plus size={15} aria-hidden />
              Thêm nhóm
            </button>
          </div>
        </aside>

        <aside className="hd-admin-col">
          <div className="hd-admin-col-head">
            <h2>Phần / phiên</h2>
            <button
              type="button"
              className="hd-btn ghost"
              disabled={!activeNhom || pending}
              onClick={startNewPhien}
            >
              <Plus size={14} aria-hidden />
              Thêm
            </button>
          </div>
          {activeNhom ? (
            <ul className="hd-admin-list">
              {activeNhom.phien.map((p, i) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`hd-admin-list-btn${draft.id === p.id ? " on" : ""}`}
                    onClick={() => selectPhien(p)}
                  >
                    <span>
                      {i + 1}. {p.tieuDe}
                    </span>
                    <small>{p.daXuatBan ? "Công khai" : "Nháp"}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hd-admin-empty">Chọn hoặc tạo nhóm trước.</p>
          )}
        </aside>

        <section className="hd-admin-editor">
          {!activeNhom ? (
            <p className="hd-admin-empty">Chưa có nhóm hướng dẫn.</p>
          ) : (
            <>
              <div className="hd-admin-fields">
                <label>
                  Tên nhóm
                  <input
                    value={draft.nhomTen}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, nhomTen: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Thứ tự nhóm
                  <input
                    type="number"
                    value={draft.nhomThuTu}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        nhomThuTu: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </label>
                <div className="hd-admin-field-actions">
                  <button
                    type="button"
                    className="hd-btn ghost"
                    disabled={pending}
                    onClick={saveNhomMeta}
                  >
                    Lưu nhóm
                  </button>
                  <button
                    type="button"
                    className="hd-btn danger"
                    disabled={pending}
                    onClick={deleteNhom}
                  >
                    <Trash2 size={14} aria-hidden />
                    Xoá nhóm
                  </button>
                </div>
              </div>

              <hr className="hd-admin-sep" />

              <div className="hd-admin-fields">
                <label className="hd-span-2">
                  Tiêu đề phần
                  <input
                    value={draft.tieuDe}
                    onChange={(e) => {
                      const tieuDe = e.target.value;
                      setDraft((d) => ({
                        ...d,
                        tieuDe,
                        slug:
                          !d.id &&
                          (!d.slug || d.slug === slugifyHuongDan(d.tieuDe))
                            ? slugifyHuongDan(tieuDe)
                            : d.slug,
                      }));
                    }}
                    placeholder="VD: Cách tạo shop"
                  />
                </label>
                <label>
                  Slug phần
                  <input
                    value={draft.slug}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        slug: slugifyHuongDan(e.target.value),
                      }))
                    }
                  />
                </label>
                <label>
                  Thứ tự
                  <input
                    type="number"
                    value={draft.thuTu}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        thuTu: Number(e.target.value) || 0,
                      }))
                    }
                  />
                </label>
                <label className="hd-span-2">
                  URL video YouTube
                  <input
                    value={draft.videoUrl}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, videoUrl: e.target.value }))
                    }
                    placeholder="https://www.youtube.com/watch?v=…"
                  />
                </label>
                <label className="hd-check">
                  <input
                    type="checkbox"
                    checked={draft.daXuatBan}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        daXuatBan: e.target.checked,
                      }))
                    }
                  />
                  Xuất bản công khai
                </label>
                {draft.slug ? (
                  <p className="hd-permalink">
                    Deep-link:{" "}
                    <code>
                      {huongDanHref(activeNhom.slug)}
                    </code>
                  </p>
                ) : null}
              </div>

              <div className="hd-admin-tiptap">
                <h3>Nội dung TipTap</h3>
                <ArticleDraftContentEditor
                  value={draft.noiDungHtml}
                  onChange={(html) =>
                    setDraft((d) => ({ ...d, noiDungHtml: html }))
                  }
                  hideHint
                  deferHeavyContent
                />
              </div>

              <div className="hd-admin-actions">
                <button
                  type="button"
                  className="hd-btn primary"
                  disabled={pending || !draft.tieuDe.trim()}
                  onClick={savePhien}
                >
                  {draft.id ? "Lưu phiên" : "Tạo phiên"}
                </button>
                {draft.id ? (
                  <button
                    type="button"
                    className="hd-btn danger"
                    disabled={pending}
                    onClick={deletePhien}
                  >
                    <Trash2 size={14} aria-hidden />
                    Xoá phiên
                  </button>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
