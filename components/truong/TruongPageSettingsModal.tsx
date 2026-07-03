"use client";

import { Loader2, Settings2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import { GioiThieuContentEditor } from "@/components/truong/GioiThieuContentEditor";
import { TruongChiNhanhEditor } from "@/components/truong/tuyensinh/TruongChiNhanhEditor";
import {
  normalizeChiNhanhList,
  orgContactFromPrimaryChiNhanh,
} from "@/lib/truong/chi-nhanh";
import { MO_TA_SHORT_MAX } from "@/lib/truong/mo-ta-short";
import { KTX_DIA_CHI_MAX } from "@/lib/truong/ktx-cau-hinh";
import { normalizeTruongGioiThieuHtml } from "@/lib/truong/gioi-thieu";
import { truongRootPath } from "@/lib/truong/truong-routes";
import type { TruongChiNhanh } from "@/lib/truong/types";
import type { CoSoSettingsViewer } from "@/lib/to-chuc/co-so-settings-types";

export type TruongSettingsSection =
  | "identity"
  | "about"
  | "contact"
  | "tuyen-sinh";

const LOAI_TRUONG_OPTIONS = [
  { value: "", label: "— Chưa chọn —" },
  { value: "cong_lap", label: "Công lập" },
  { value: "dan_lap", label: "Dân lập" },
  { value: "quoc_te", label: "Quốc tế" },
] as const;

type SettingsData = {
  orgId: string;
  slug: string;
  ten: string;
  moTa: string | null;
  gioiThieuTruong: string | null;
  tenTiengAnh: string | null;
  maTruong: string | null;
  loaiTruong: string | null;
  namThanhLap: number | null;
  hocPhiNamTu: number | null;
  hocPhiNamDen: number | null;
  coKtx: boolean;
  ktxGiaThang: number | null;
  ktxDiaChi: string | null;
  chiNhanh: TruongChiNhanh[];
  viewer: CoSoSettingsViewer;
};

type Props = {
  open: boolean;
  orgId: string;
  initialSection?: TruongSettingsSection;
  onClose: () => void;
  onSaved: (patch: {
    slug?: string;
    ten?: string;
    moTa?: string | null;
    gioiThieuTruong?: string | null;
    ten_tieng_anh?: string | null;
    ma_truong?: string | null;
    loai_truong?: string | null;
    nam_thanh_lap?: number | null;
    hoc_phi_nam_tu?: number | null;
    hoc_phi_nam_den?: number | null;
    co_ktx?: boolean | null;
    ktx_gia_thang?: number | null;
    ktx_dia_chi?: string | null;
    chi_nhanh?: TruongChiNhanh[];
    dia_chi?: string | null;
    dien_thoai?: string | null;
    email_lien_he?: string | null;
    tinh_thanh?: string | null;
    website?: string | null;
    facebook?: string | null;
  }) => void;
};

const NAV: ReadonlyArray<{ id: TruongSettingsSection; label: string }> = [
  { id: "identity", label: "Danh tính" },
  { id: "about", label: "Giới thiệu" },
  { id: "contact", label: "Liên hệ" },
  { id: "tuyen-sinh", label: "Tuyển sinh" },
];

function savePayloadForSection(
  section: TruongSettingsSection,
  draft: SettingsData,
): Record<string, unknown> {
  switch (section) {
    case "identity":
      return {
        ten: draft.ten,
        slug: draft.slug,
        moTa: draft.moTa,
        tenTiengAnh: draft.tenTiengAnh,
        maTruong: draft.maTruong,
        loaiTruong: draft.loaiTruong || null,
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
    case "tuyen-sinh":
      return {
        hocPhiNamTu: draft.hocPhiNamTu,
        hocPhiNamDen: draft.hocPhiNamDen,
        coKtx: draft.coKtx,
        ktxGiaThang: draft.coKtx ? draft.ktxGiaThang : null,
        ktxDiaChi: draft.coKtx ? draft.ktxDiaChi : null,
      };
    default:
      return {};
  }
}

export function TruongPageSettingsModal({
  open,
  orgId,
  initialSection = "identity",
  onClose,
  onSaved,
}: Props) {
  const router = useRouter();
  const titleId = useId();
  const [section, setSection] = useState<TruongSettingsSection>(initialSection);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<SettingsData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/truong/${encodeURIComponent(orgId)}/settings`);
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
      moTa: settings.moTa,
      gioiThieuTruong: settings.gioiThieuTruong,
      ten_tieng_anh: settings.tenTiengAnh,
      ma_truong: settings.maTruong,
      loai_truong: settings.loaiTruong,
      nam_thanh_lap: settings.namThanhLap,
      hoc_phi_nam_tu: settings.hocPhiNamTu,
      hoc_phi_nam_den: settings.hocPhiNamDen,
      co_ktx: settings.coKtx,
      ktx_gia_thang: settings.ktxGiaThang,
      ktx_dia_chi: settings.ktxDiaChi,
      chi_nhanh: settings.chiNhanh,
      dia_chi: orgContact.dia_chi,
      dien_thoai: orgContact.dien_thoai,
      email_lien_he: orgContact.email_lien_he,
      tinh_thanh: orgContact.tinh_thanh,
      website: orgContact.website,
      facebook: orgContact.facebook,
    });
  }

  function onSaveSection(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
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
      const res = await fetch(`/api/truong/${encodeURIComponent(orgId)}/settings`, {
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
        router.replace(truongRootPath(json.settings.slug));
      }
      onClose();
    });
  }

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
                Quản lý trường
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
                  Tên và mô tả ngắn hiển thị trên sidebar trang trường.
                </p>
                <label className="tdh-inline-field">
                  <span>Tên trường</span>
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
                    cins.vn/co-so-dao-tao/{draft.slug}
                    {!draft.viewer.canChangeSlug
                      ? " — chỉ quản trị viên mới đổi đường dẫn"
                      : null}
                  </span>
                </label>
                <label className="tdh-inline-field">
                  <span>Tên tiếng Anh</span>
                  <input
                    type="text"
                    value={draft.tenTiengAnh ?? ""}
                    placeholder="English name"
                    onChange={(e) =>
                      patchDraft({ tenTiengAnh: e.target.value || null })
                    }
                  />
                </label>
                <label className="tdh-inline-field">
                  <span>Mô tả ngắn</span>
                  <textarea
                    rows={2}
                    value={draft.moTa ?? ""}
                    maxLength={MO_TA_SHORT_MAX}
                    placeholder="1–2 câu tóm tắt hiển thị dưới tên trường trên sidebar"
                    onChange={(e) =>
                      patchDraft({ moTa: e.target.value || null })
                    }
                  />
                  <span className="cso-settings-field-note">
                    Tối đa {MO_TA_SHORT_MAX} ký tự
                  </span>
                </label>
                <div className="cso-settings-row">
                  <label className="tdh-inline-field">
                    <span>Mã trường</span>
                    <input
                      type="text"
                      value={draft.maTruong ?? ""}
                      onChange={(e) =>
                        patchDraft({ maTruong: e.target.value || null })
                      }
                    />
                  </label>
                  <label className="tdh-inline-field">
                    <span>Loại trường</span>
                    <select
                      value={draft.loaiTruong ?? ""}
                      onChange={(e) =>
                        patchDraft({ loaiTruong: e.target.value || null })
                      }
                    >
                      {LOAI_TRUONG_OPTIONS.map((o) => (
                        <option key={o.value || "none"} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
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
                  Nội dung giới thiệu chi tiết — hiển thị trong popup «Lịch sử
                  trường».
                </p>
                <div className="tdh-inline-field tdh-inline-field--richtext">
                  <span>Giới thiệu trường</span>
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
                  Quản lý chi nhánh và thông tin liên hệ hiển thị trên sidebar.
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

            {section === "tuyen-sinh" ? (
              <section className="cso-settings-section">
                <p className="cso-settings-hint">
                  Số liệu tuyển sinh hiển thị trên sidebar và trang tổng quan.
                </p>
                <div className="cso-settings-row">
                  <label className="tdh-inline-field">
                    <span>Học phí từ (triệu/năm)</span>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={draft.hocPhiNamTu ?? ""}
                      onChange={(e) =>
                        patchDraft({
                          hocPhiNamTu: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                    />
                  </label>
                  <label className="tdh-inline-field">
                    <span>Học phí đến</span>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={draft.hocPhiNamDen ?? ""}
                      onChange={(e) =>
                        patchDraft({
                          hocPhiNamDen: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                    />
                  </label>
                </div>
                <label className="tdh-inline-check">
                  <input
                    type="checkbox"
                    checked={draft.coKtx}
                    onChange={(e) =>
                      patchDraft({
                        coKtx: e.target.checked,
                        ktxGiaThang: e.target.checked ? draft.ktxGiaThang : null,
                        ktxDiaChi: e.target.checked ? draft.ktxDiaChi : null,
                      })
                    }
                  />
                  Có ký túc xá
                </label>
                {draft.coKtx ? (
                  <>
                    <label className="tdh-inline-field">
                      <span>Giá KTX (triệu/tháng)</span>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={draft.ktxGiaThang ?? ""}
                        onChange={(e) =>
                          patchDraft({
                            ktxGiaThang: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                      />
                    </label>
                    <label className="tdh-inline-field">
                      <span>Địa chỉ KTX</span>
                      <textarea
                        rows={2}
                        maxLength={KTX_DIA_CHI_MAX}
                        value={draft.ktxDiaChi ?? ""}
                        placeholder="Số nhà, đường, quận…"
                        onChange={(e) =>
                          patchDraft({
                            ktxDiaChi: e.target.value || null,
                          })
                        }
                      />
                    </label>
                  </>
                ) : null}
              </section>
            ) : null}

            {err ? (
              <p className="cso-settings-err" role="alert">
                {err}
              </p>
            ) : null}

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
