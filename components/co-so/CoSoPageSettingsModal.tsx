"use client";

import { Loader2, Plus, Settings2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import { CoSoSettingsMembersPanel } from "@/components/co-so/CoSoSettingsMembersPanel";
import { GioiThieuContentEditor } from "@/components/truong/GioiThieuContentEditor";
import { TruongChiNhanhEditor } from "@/components/truong/tuyensinh/TruongChiNhanhEditor";
import { LOAI_CO_SO_OPTIONS } from "@/lib/to-chuc/constants";
import {
  CO_SO_DEFAULT_TAB,
  coSoTabPath,
} from "@/lib/to-chuc/co-so-routes";
import type { CoSoPageCauHinh } from "@/lib/to-chuc/co-so-page-cau-hinh";
import type { CoSoFilterChip } from "@/lib/to-chuc/co-so-page-queries";
import {
  normalizeChiNhanhList,
  orgContactFromPrimaryChiNhanh,
} from "@/lib/truong/chi-nhanh";
import { normalizeTruongGioiThieuHtml } from "@/lib/truong/gioi-thieu";
import type { TruongChiNhanh } from "@/lib/truong/types";
import type {
  CoSoMemberAdmin,
  CoSoSettingsViewer,
} from "@/lib/to-chuc/co-so-settings-types";

import "@/styles/article-draft-tiptap.css";

export type CoSoSettingsSection =
  | "identity"
  | "about"
  | "contact"
  | "verify"
  | "access"
  | "filters";

type SettingsData = {
  orgId: string;
  slug: string;
  ten: string;
  moTa: string | null;
  gioiThieuTruong: string | null;
  tenChinhThuc: string;
  loaiCoSo: string;
  namThanhLap: number | null;
  website: string | null;
  giayPhepDaoTao: string | null;
  maCoSo: string;
  daVerify: boolean;
  diaChi: string | null;
  dienThoai: string | null;
  emailLienHe: string | null;
  tinhThanh: string | null;
  chiNhanh: TruongChiNhanh[];
  pageConfig: CoSoPageCauHinh;
  filters: Array<{
    id: string;
    ten: string;
    slug: string;
    mau: string | null;
    thuTu: number;
  }>;
  members: CoSoMemberAdmin[];
  viewer: CoSoSettingsViewer;
};

type Props = {
  open: boolean;
  orgId: string;
  initialSection?: CoSoSettingsSection;
  onClose: () => void;
  onSaved: (patch: {
    slug?: string;
    ten?: string;
    filters?: CoSoFilterChip[];
    loaiCoSo?: string;
    namThanhLap?: number | null;
    giayPhepDaoTao?: string | null;
    moTa?: string | null;
    gioiThieuTruong?: string | null;
    diaChi?: string | null;
    dienThoai?: string | null;
    emailLienHe?: string | null;
    tinhThanh?: string | null;
    website?: string | null;
    chiNhanh?: TruongChiNhanh[];
    facebook?: string | null;
  }) => void;
};

const NAV: ReadonlyArray<{ id: CoSoSettingsSection; label: string }> = [
  { id: "identity", label: "Danh tính" },
  { id: "about", label: "Giới thiệu" },
  { id: "contact", label: "Liên hệ" },
  { id: "verify", label: "Xác thực" },
  { id: "access", label: "Quyền quản trị" },
  { id: "filters", label: "Quản lý nhãn" },
];

function mapFiltersToChips(
  filters: SettingsData["filters"],
): CoSoFilterChip[] {
  return filters.map((f) => ({
    id: f.id,
    ten: f.ten,
    slug: f.slug,
    mau: f.mau,
    count: 0,
  }));
}

function savePayloadForSection(
  section: CoSoSettingsSection,
  draft: SettingsData,
): Record<string, unknown> {
  switch (section) {
    case "identity":
      return {
        ten: draft.ten,
        slug: draft.slug,
        moTa: draft.moTa,
        loaiCoSo: draft.loaiCoSo,
        namThanhLap: draft.namThanhLap,
      };
    case "about":
      return {
        gioiThieuTruong: normalizeTruongGioiThieuHtml(draft.gioiThieuTruong),
      };
    case "contact":
      return {
        chiNhanh: normalizeChiNhanhList(draft.chiNhanh),
      };
    case "verify":
      return {
        tenChinhThuc: draft.tenChinhThuc,
        giayPhepDaoTao: draft.giayPhepDaoTao,
      };
    default:
      return {};
  }
}

export function CoSoPageSettingsModal({
  open,
  orgId,
  initialSection = "identity",
  onClose,
  onSaved,
}: Props) {
  const router = useRouter();
  const titleId = useId();
  const [section, setSection] = useState<CoSoSettingsSection>(initialSection);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<SettingsData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [filterPending, setFilterPending] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");
  const [newFilterColor, setNewFilterColor] = useState("#1F74C9");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/co-so/${encodeURIComponent(orgId)}/settings`);
      const json = (await res.json().catch(() => null)) as {
        settings?: SettingsData;
        error?: string;
      } | null;
      if (!res.ok || !json?.settings) {
        setErr(json?.error ?? "Không tải được cài đặt.");
        setDraft(null);
        return;
      }
      setDraft(json.settings);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  const uploadBranchCover = useCallback(async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const token =
      process.env.NEXT_PUBLIC_ARTICLE_INLINE_IMAGE_UPLOAD_TOKEN?.trim();
    const headers: HeadersInit = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`/api/truong/${encodeURIComponent(orgId)}/upload`, {
      method: "POST",
      body: form,
      headers,
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    return (await res.json()) as { imageId: string; url: string };
  }, [orgId]);

  useEffect(() => {
    if (!open) return;
    setSection(initialSection);
    setNewFilterName("");
    void loadSettings();
  }, [open, initialSection, loadSettings]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function patchDraft(patch: Partial<SettingsData>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function emitSaved(settings: SettingsData) {
    const orgContact = orgContactFromPrimaryChiNhanh(settings.chiNhanh);
    onSaved({
      slug: settings.slug,
      ten: settings.ten,
      filters: mapFiltersToChips(settings.filters),
      loaiCoSo: settings.loaiCoSo,
      namThanhLap: settings.namThanhLap,
      giayPhepDaoTao: settings.giayPhepDaoTao,
      moTa: settings.moTa,
      gioiThieuTruong: settings.gioiThieuTruong,
      diaChi: settings.diaChi,
      dienThoai: settings.dienThoai,
      emailLienHe: settings.emailLienHe,
      tinhThanh: settings.tinhThanh,
      website: settings.website,
      chiNhanh: settings.chiNhanh,
      facebook: orgContact.facebook,
    });
  }

  function onSaveSection(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || section === "access" || section === "filters") return;
    if (section === "contact") {
      const normalized = normalizeChiNhanhList(draft.chiNhanh);
      if (!normalized.length) {
        setErr("Cần ít nhất một chi nhánh có tên và địa chỉ.");
        return;
      }
    }
    setErr(null);
    const prevSlug = draft.slug;
    startTransition(async () => {
      const res = await fetch(`/api/co-so/${encodeURIComponent(orgId)}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savePayloadForSection(section, draft)),
      });
      const json = (await res.json().catch(() => null)) as {
        settings?: SettingsData;
        error?: string;
      } | null;
      if (!res.ok || !json?.settings) {
        setErr(json?.error ?? "Không lưu được.");
        return;
      }
      setDraft(json.settings);
      emitSaved(json.settings);
      if (json.settings.slug !== prevSlug) {
        router.replace(coSoTabPath(json.settings.slug, CO_SO_DEFAULT_TAB));
      }
      onClose();
    });
  }

  async function addFilter() {
    if (!draft || !newFilterName.trim()) return;
    setFilterPending(true);
    setErr(null);
    try {
      const res = await fetch(`/api/co-so/${encodeURIComponent(orgId)}/filters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ten: newFilterName.trim(), mau: newFilterColor }),
      });
      const json = (await res.json().catch(() => null)) as {
        filter?: SettingsData["filters"][number];
        error?: string;
      } | null;
      if (!res.ok || !json?.filter) {
        setErr(json?.error ?? "Không thêm được nhãn.");
        return;
      }
      const nextFilters = [...draft.filters, json.filter].sort(
        (a, b) => a.thuTu - b.thuTu,
      );
      patchDraft({ filters: nextFilters });
      onSaved({ filters: mapFiltersToChips(nextFilters) });
      setNewFilterName("");
    } finally {
      setFilterPending(false);
    }
  }

  async function updateFilter(
    filterId: string,
    patch: { ten?: string; mau?: string },
  ) {
    if (!draft) return;
    setFilterPending(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/co-so/${encodeURIComponent(orgId)}/filters/${encodeURIComponent(filterId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        filter?: SettingsData["filters"][number];
        error?: string;
      } | null;
      if (!res.ok || !json?.filter) {
        setErr(json?.error ?? "Không cập nhật được nhãn.");
        return;
      }
      const nextFilters = draft.filters
        .map((f) => (f.id === filterId ? json.filter! : f))
        .sort((a, b) => a.thuTu - b.thuTu);
      patchDraft({ filters: nextFilters });
      onSaved({ filters: mapFiltersToChips(nextFilters) });
    } finally {
      setFilterPending(false);
    }
  }

  async function removeFilter(filterId: string) {
    if (!draft) return;
    setFilterPending(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/co-so/${encodeURIComponent(orgId)}/filters/${encodeURIComponent(filterId)}`,
        { method: "DELETE" },
      );
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không xóa được nhãn.");
        return;
      }
      const nextFilters = draft.filters.filter((f) => f.id !== filterId);
      patchDraft({ filters: nextFilters });
      onSaved({ filters: mapFiltersToChips(nextFilters) });
    } finally {
      setFilterPending(false);
    }
  }

  const showSaveFooter = section !== "filters" && section !== "access";

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="tdh-inline-modal-backdrop cso-settings-backdrop"
      role="presentation"
    >
      <div
        className="tdh-inline-modal tdh-inline-modal--wide cso-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cso-settings-head">
          <div className="cso-settings-head-copy">
            <Settings2 size={18} strokeWidth={2} aria-hidden />
            <div className="cso-settings-head-text">
              <h2 id={titleId} className="tdh-inline-modal-title cso-settings-title">
                Quản lý cơ sở
              </h2>
              {draft?.viewer ? (
                <p className="cso-settings-role-banner">
                  Bạn đang đăng nhập với quyền{" "}
                  <strong>{draft.viewer.vaiTroLabel}</strong>
                  {draft.viewer.isCinsAdmin ? " · CINs internal" : null}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="cso-settings-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <nav className="cso-settings-nav" aria-label="Mục cài đặt">
          {NAV.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`cso-settings-nav-btn${section === id ? " on" : ""}`}
              aria-current={section === id ? "true" : undefined}
              onClick={() => setSection(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="cso-settings-loading">
            <Loader2 size={20} className="cso-settings-spin" aria-hidden />
            <span>Đang tải…</span>
          </div>
        ) : null}

        {!loading && draft ? (
          <form className="cso-settings-body" onSubmit={onSaveSection}>
            {section === "identity" ? (
              <section className="cso-settings-section">
                <p className="cso-settings-hint">
                  Tên thương hiệu và mô tả ngắn hiển thị trên sidebar trang cơ
                  sở.
                </p>
                <label className="tdh-inline-field">
                  <span>Tên hiển thị</span>
                  <input
                    type="text"
                    value={draft.ten}
                    maxLength={120}
                    required
                    onChange={(e) => patchDraft({ ten: e.target.value })}
                  />
                </label>
                <label className="tdh-inline-field">
                  <span>Đường dẫn</span>
                  <input
                    type="text"
                    value={draft.slug}
                    required
                    disabled={!draft.viewer.canChangeSlug}
                    onChange={(e) => patchDraft({ slug: e.target.value })}
                  />
                  <span className="cso-settings-field-note">
                    cins.vn/co-so/{draft.slug}
                    {!draft.viewer.canChangeSlug
                      ? " — chỉ quản trị viên mới đổi slug"
                      : null}
                  </span>
                </label>
                <label className="tdh-inline-field">
                  <span>Loại cơ sở</span>
                  <select
                    value={draft.loaiCoSo}
                    onChange={(e) => patchDraft({ loaiCoSo: e.target.value })}
                  >
                    {LOAI_CO_SO_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="tdh-inline-field">
                  <span>Mô tả ngắn</span>
                  <textarea
                    rows={2}
                    value={draft.moTa ?? ""}
                    placeholder="1–2 câu tóm tắt hiển thị dưới tên cơ sở trên sidebar — VD: Trung tâm hội họa · lớp nhỏ, mentor chuyên môn"
                    onChange={(e) =>
                      patchDraft({ moTa: e.target.value || null })
                    }
                  />
                </label>
                <label className="tdh-inline-field">
                  <span>Năm thành lập</span>
                  <input
                    type="number"
                    min={1800}
                    max={2100}
                    value={draft.namThanhLap ?? ""}
                    onChange={(e) =>
                      patchDraft({
                        namThanhLap: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  />
                </label>
              </section>
            ) : null}

            {section === "about" ? (
              <section className="cso-settings-section cso-settings-section--about">
                <p className="cso-settings-hint">
                  Nội dung giới thiệu chi tiết về cơ sở — hiển thị trong popup
                  khi người xem bấm xem thêm.
                </p>
                <div className="tdh-inline-field tdh-inline-field--richtext">
                  <span>Giới thiệu cơ sở</span>
                  <GioiThieuContentEditor
                    value={draft.gioiThieuTruong?.trim() || "<p></p>"}
                    onChange={(html) => patchDraft({ gioiThieuTruong: html })}
                  />
                </div>
              </section>
            ) : null}

            {section === "contact" ? (
              <section className="cso-settings-section">
                <p className="cso-settings-hint">
                  Quản lý chi nhánh và thông tin liên hệ hiển thị trên sidebar
                  trang cơ sở.
                </p>
                <div className="tdh-inline-field">
                  <span>Chi nhánh / cơ sở</span>
                  <TruongChiNhanhEditor
                    branches={draft.chiNhanh}
                    onChange={(chiNhanh) => patchDraft({ chiNhanh })}
                    uploadImage={uploadBranchCover}
                    persistHint="Lưu cài đặt"
                  />
                </div>
              </section>
            ) : null}

            {section === "verify" ? (
              <section className="cso-settings-section">
                <p className="cso-settings-hint">
                  Thông tin pháp lý và trạng thái xác thực CINs. Huy hiệu verify
                  do CINs duyệt sau khi kiểm tra giấy phép.
                </p>
                <label className="tdh-inline-field">
                  <span>Tên pháp lý</span>
                  <input
                    type="text"
                    value={draft.tenChinhThuc}
                    required
                    onChange={(e) =>
                      patchDraft({ tenChinhThuc: e.target.value })
                    }
                  />
                </label>
                <label className="tdh-inline-field">
                  <span>Giấy phép đào tạo</span>
                  <input
                    type="text"
                    value={draft.giayPhepDaoTao ?? ""}
                    placeholder="Số giấy phép / quyết định"
                    onChange={(e) =>
                      patchDraft({ giayPhepDaoTao: e.target.value || null })
                    }
                  />
                </label>
                <div className="cso-settings-readonly">
                  <span>Mã cơ sở: {draft.maCoSo}</span>
                  <span>
                    Xác thực CINs:{" "}
                    {draft.daVerify ? "Đã xác thực" : "Chưa xác thực"}
                  </span>
                </div>
              </section>
            ) : null}

            {section === "access" && draft ? (
              <CoSoSettingsMembersPanel
                orgId={orgId}
                orgSlug={draft.slug}
                orgLabel={draft.ten}
                viewerIsOwner={draft.viewer.vaiTro === "owner"}
                members={draft.members}
                canManage={draft.viewer.canManageMembers}
                onMembersChange={(members) => patchDraft({ members })}
                onError={setErr}
              />
            ) : null}

            {section === "filters" ? (
              <section className="cso-settings-section">
                <p className="cso-settings-hint">
                  Nhãn lọc cục bộ trên timeline bài đăng.
                </p>
                <ul className="cso-settings-filter-list">
                  {draft.filters.map((filter) => (
                    <li key={filter.id} className="cso-settings-filter-row">
                      <input
                        type="color"
                        className="cso-settings-filter-color"
                        value={filter.mau ?? "#1F74C9"}
                        aria-label={`Màu ${filter.ten}`}
                        onChange={(e) =>
                          void updateFilter(filter.id, { mau: e.target.value })
                        }
                        disabled={filterPending}
                      />
                      <input
                        type="text"
                        className="cso-settings-filter-name"
                        value={filter.ten}
                        maxLength={40}
                        onChange={(e) =>
                          patchDraft({
                            filters: draft.filters.map((f) =>
                              f.id === filter.id
                                ? { ...f, ten: e.target.value }
                                : f,
                            ),
                          })
                        }
                        onBlur={(e) => {
                          const ten = e.target.value.trim();
                          if (ten && ten !== filter.ten) {
                            void updateFilter(filter.id, { ten });
                          }
                        }}
                        disabled={filterPending}
                      />
                      <button
                        type="button"
                        className="cso-settings-filter-del"
                        aria-label={`Xóa nhãn ${filter.ten}`}
                        disabled={filterPending}
                        onClick={() => void removeFilter(filter.id)}
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="cso-settings-filter-add">
                  <input
                    type="color"
                    className="cso-settings-filter-color"
                    value={newFilterColor}
                    aria-label="Màu nhãn mới"
                    onChange={(e) => setNewFilterColor(e.target.value)}
                    disabled={filterPending}
                  />
                  <input
                    type="text"
                    className="cso-settings-filter-name"
                    placeholder="Tên nhãn mới"
                    value={newFilterName}
                    maxLength={40}
                    onChange={(e) => setNewFilterName(e.target.value)}
                    disabled={filterPending}
                  />
                  <button
                    type="button"
                    className="tdh-inline-btn ghost cso-settings-filter-add-btn"
                    disabled={filterPending || !newFilterName.trim()}
                    onClick={() => void addFilter()}
                  >
                    <Plus size={14} aria-hidden />
                    Thêm
                  </button>
                </div>
              </section>
            ) : null}

            {err ? (
              <p className="cso-settings-err" role="alert">
                {err}
              </p>
            ) : null}

            {showSaveFooter ? (
              <footer className="cso-settings-foot">
                <button
                  type="button"
                  className="tdh-inline-btn ghost"
                  onClick={onClose}
                  disabled={pending}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="tdh-inline-btn primary"
                  disabled={pending}
                >
                  {pending ? (
                    <>
                      <Loader2 size={15} className="cso-settings-spin" aria-hidden />
                      Đang lưu…
                    </>
                  ) : (
                    "Lưu cài đặt"
                  )}
                </button>
              </footer>
            ) : (
              <footer className="cso-settings-foot">
                <button
                  type="button"
                  className="tdh-inline-btn primary"
                  onClick={onClose}
                >
                  Đóng
                </button>
              </footer>
            )}
          </form>
        ) : null}

        {!loading && !draft && err ? (
          <p className="cso-settings-err cso-settings-err--solo" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
