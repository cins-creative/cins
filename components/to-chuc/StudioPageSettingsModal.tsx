"use client";

import { Check, Grid3X3, ImageIcon, LayoutGrid, Loader2, Settings2, Waypoints, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import { LayoutThumbIcon } from "@/components/editor/LayoutThumbIcon";
import { StudioSettingsMembersSection } from "@/components/to-chuc/StudioSettingsMembersSection";
import { StudioSettingsOrganizationSection } from "@/components/to-chuc/StudioSettingsOrganizationSection";
import { GioiThieuContentEditor } from "@/components/truong/GioiThieuContentEditor";
import type { ContentSurfaceView } from "@/lib/cins/content-surface-view";
import { normalizeTruongGioiThieuHtml } from "@/lib/truong/gioi-thieu";
import type { StudioHoatDongStatus } from "@/lib/to-chuc/studio-lifecycle.shared";
import {
  normalizeStudioShowcaseDefaultView,
  STUDIO_OPTIONAL_TAB_IDS,
  STUDIO_SHOWCASE_VIEW_OPTIONS,
  STUDIO_TAB_LABELS,
  type StudioOptionalTabId,
  type StudioPageCauHinh,
} from "@/lib/to-chuc/studio-page-config";

import "@/components/cins/user-account-settings-modal.css";
import "./studio-page-settings-modal.css";

export type StudioSettingsSection =
  | "identity"
  | "about"
  | "contact"
  | "display"
  | "members"
  | "organization";

type SettingsData = {
  orgId: string;
  slug: string;
  ten: string;
  tenChinhThuc: string | null;
  moTa: string | null;
  gioiThieu: string | null;
  website: string | null;
  tinhThanh: string | null;
  diaChi: string | null;
  dienThoai: string | null;
  emailLienHe: string | null;
  pageConfig: StudioPageCauHinh;
  trangThaiHoatDong: StudioHoatDongStatus;
  isOwner: boolean;
};

type Props = {
  open: boolean;
  orgId: string;
  initialSection?: StudioSettingsSection;
  onClose: () => void;
  onSaved: (patch: {
    ten?: string;
    moTa?: string | null;
    gioiThieu?: string | null;
    website?: string | null;
    tinhThanh?: string | null;
    diaChi?: string | null;
    dienThoai?: string | null;
    emailLienHe?: string | null;
    pageConfig?: StudioPageCauHinh;
  }) => void;
};

const NAV_BASE: ReadonlyArray<{ id: StudioSettingsSection; label: string }> = [
  { id: "identity", label: "Danh tính" },
  { id: "about", label: "Giới thiệu" },
  { id: "contact", label: "Liên hệ" },
  { id: "display", label: "Hiển thị" },
  { id: "members", label: "Thành viên" },
];

const SECTION_COPY: Record<
  Exclude<StudioSettingsSection, "members" | "organization">,
  { title: string; hint: string }
> = {
  identity: {
    title: "Danh tính",
    hint: "Tên thương hiệu và mô tả ngắn hiển thị trên sidebar trang studio.",
  },
  about: {
    title: "Giới thiệu",
    hint: "Nội dung giới thiệu chi tiết — hiển thị trong phần Giới thiệu trên sidebar.",
  },
  contact: {
    title: "Liên hệ",
    hint: "Thông tin liên hệ hiển thị trên sidebar trang studio.",
  },
  display: {
    title: "Hiển thị",
    hint: "Tuỳ chỉnh chế độ xem Showcase và tab Hình ảnh trên trang studio.",
  },
};

function savePayloadForSection(
  section: StudioSettingsSection,
  draft: SettingsData,
): Record<string, unknown> {
  switch (section) {
    case "identity":
      return {
        ten: draft.ten,
        moTa: draft.moTa,
        tenChinhThuc: draft.tenChinhThuc,
        website: draft.website,
      };
    case "about":
      return {
        gioiThieu: normalizeTruongGioiThieuHtml(draft.gioiThieu),
      };
    case "contact":
      return {
        tinhThanh: draft.tinhThanh,
        diaChi: draft.diaChi,
        dienThoai: draft.dienThoai,
        emailLienHe: draft.emailLienHe,
      };
    case "display":
      return {
        pageConfig: {
          ...draft.pageConfig,
          showcaseDefaultView: normalizeStudioShowcaseDefaultView(
            draft.pageConfig.showcaseDefaultView,
          ),
        },
      };
    default:
      return {};
  }
}

export function StudioPageSettingsModal({
  open,
  orgId,
  initialSection = "identity",
  onClose,
  onSaved,
}: Props) {
  const router = useRouter();
  const titleId = useId();
  const formId = useId();
  const [section, setSection] = useState<StudioSettingsSection>(initialSection);
  const [displayTab, setDisplayTab] = useState<"showcase" | "hinh-anh">(
    "showcase",
  );
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<SettingsData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/studio/${encodeURIComponent(orgId)}/settings`,
        { credentials: "same-origin" },
      );
      const json = (await res.json().catch(() => null)) as {
        settings?: SettingsData;
        error?: string;
      } | null;
      if (!res.ok || !json?.settings) {
        setErr(json?.error ?? "Không tải được cài đặt.");
        setDraft(null);
        return;
      }
      setDraft({
        ...json.settings,
        pageConfig: json.settings.pageConfig ?? {},
        trangThaiHoatDong: json.settings.trangThaiHoatDong ?? "dang_hoat_dong",
        isOwner: Boolean(json.settings.isOwner),
      });
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!open) return;
    setSection(initialSection);
    setDisplayTab("showcase");
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

  useEffect(() => {
    if (!draft) return;
    if (section === "organization" && !draft.isOwner) {
      setSection("identity");
    }
  }, [draft, section]);

  function patchDraft(patch: Partial<SettingsData>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function toggleTab(tabId: StudioOptionalTabId, visible: boolean) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pageConfig: {
          ...prev.pageConfig,
          tabs: {
            ...prev.pageConfig.tabs,
            [tabId]: visible,
          },
        },
      };
    });
  }

  function setShowcaseDefaultView(view: ContentSurfaceView) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pageConfig: {
          ...prev.pageConfig,
          showcaseDefaultView: view,
        },
      };
    });
  }

  function emitSaved(settings: SettingsData) {
    onSaved({
      ten: settings.ten,
      moTa: settings.moTa,
      gioiThieu: settings.gioiThieu,
      website: settings.website,
      tinhThanh: settings.tinhThanh,
      diaChi: settings.diaChi,
      dienThoai: settings.dienThoai,
      emailLienHe: settings.emailLienHe,
      pageConfig: settings.pageConfig,
    });
  }

  function onSaveSection(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || section === "members" || section === "organization") return;
    setErr(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/studio/${encodeURIComponent(orgId)}/settings`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(savePayloadForSection(section, draft)),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        settings?: SettingsData;
        error?: string;
        contactFieldsSkipped?: boolean;
      } | null;
      if (!res.ok || !json?.settings) {
        setErr(json?.error ?? "Không lưu được.");
        return;
      }
      setDraft(json.settings);
      emitSaved(json.settings);
      if (json.contactFieldsSkipped && section === "contact") {
        setErr(
          "Đã lưu một phần — chạy SQL org-truong-contact-fields.sql để lưu địa chỉ & liên hệ.",
        );
        return;
      }
      router.refresh();
      onClose();
    });
  }

  if (!open || typeof document === "undefined") return null;

  const navItems = draft?.isOwner
    ? [
        ...NAV_BASE,
        { id: "organization" as const, label: "Tổ chức" },
      ]
    : NAV_BASE;

  const canSave =
    Boolean(draft) &&
    section !== "members" &&
    section !== "organization" &&
    !loading;
  const sectionCopy =
    section !== "members" && section !== "organization"
      ? SECTION_COPY[section]
      : null;

  return createPortal(
    <div
      className="uas-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="uas-modal sps-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="uas-head">
          <div className="uas-head-copy">
            <Settings2 size={18} strokeWidth={2} aria-hidden />
            <div className="sps-head-text">
              <h2 id={titleId} className="uas-title">
                Quản lý studio
              </h2>
              {draft ? (
                <p className="sps-slug">cins.vn/studio/{draft.slug}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="uas-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className="uas-layout">
          <nav className="uas-nav" aria-label="Mục cài đặt">
            {navItems.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`uas-nav-btn${section === id ? " on" : ""}`}
                aria-current={section === id ? "true" : undefined}
                onClick={() => {
                  setErr(null);
                  setSection(id);
                }}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="uas-body">
            {loading ? (
              <div className="uas-loading">
                <Loader2 size={18} className="uas-spin" aria-hidden />
                <span>Đang tải…</span>
              </div>
            ) : null}

            {!loading && draft && section === "members" ? (
              <section
                className="uas-section sps-members"
                aria-labelledby={`${titleId}-members`}
              >
                <div className="uas-section-head">
                  <h3
                    id={`${titleId}-members`}
                    className="uas-section-title"
                  >
                    Thành viên
                  </h3>
                  <p className="uas-section-hint">
                    Quản lý người có quyền xem và chỉnh sửa trang studio này.
                  </p>
                </div>
                <StudioSettingsMembersSection
                  orgId={orgId}
                  orgSlug={draft.slug}
                  orgLabel={draft.ten}
                  onError={setErr}
                />
                {err ? (
                  <p className="uas-err" role="alert">
                    {err}
                  </p>
                ) : null}
              </section>
            ) : null}

            {!loading && draft && section === "organization" && draft.isOwner ? (
              <section
                className="uas-section sps-org-wrap"
                aria-labelledby={`${titleId}-organization`}
              >
                <div className="uas-section-head">
                  <h3
                    id={`${titleId}-organization`}
                    className="uas-section-title"
                  >
                    Tổ chức
                  </h3>
                  <p className="uas-section-hint">
                    Chuyển nhượng, tạm dừng hoặc xóa studio — chỉ chủ sở hữu.
                    Mọi hành động cần xác nhận bằng tên tổ chức.
                  </p>
                </div>
                <StudioSettingsOrganizationSection
                  orgId={orgId}
                  orgTen={draft.ten}
                  trangThaiHoatDong={draft.trangThaiHoatDong}
                  onStatusChange={(next) =>
                    patchDraft({ trangThaiHoatDong: next })
                  }
                  onError={setErr}
                  onClosed={onClose}
                  onTransferred={onClose}
                />
                {err ? (
                  <p className="uas-err" role="alert">
                    {err}
                  </p>
                ) : null}
              </section>
            ) : null}

            {!loading &&
            draft &&
            section !== "members" &&
            section !== "organization" &&
            sectionCopy ? (
              <form
                id={formId}
                className="sps-fields"
                onSubmit={onSaveSection}
              >
                <section
                  className={`uas-section${section === "about" ? " sps-about" : ""}`}
                  aria-labelledby={`${titleId}-${section}`}
                >
                  <div className="uas-section-head">
                    <h3
                      id={`${titleId}-${section}`}
                      className="uas-section-title"
                    >
                      {sectionCopy.title}
                    </h3>
                    <p className="uas-section-hint">{sectionCopy.hint}</p>
                  </div>

                  {section === "identity" ? (
                    <>
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
                        <span>Tên pháp lý / chính thức</span>
                        <input
                          type="text"
                          value={draft.tenChinhThuc ?? ""}
                          placeholder="Tên đăng ký doanh nghiệp (tuỳ chọn)"
                          onChange={(e) =>
                            patchDraft({
                              tenChinhThuc: e.target.value || null,
                            })
                          }
                        />
                      </label>
                      <label className="tdh-inline-field">
                        <span>Mô tả ngắn</span>
                        <textarea
                          rows={2}
                          value={draft.moTa ?? ""}
                          placeholder="1–2 câu tóm tắt hiển thị dưới tên studio"
                          onChange={(e) =>
                            patchDraft({ moTa: e.target.value || null })
                          }
                        />
                      </label>
                      <label className="tdh-inline-field">
                        <span>Website</span>
                        <input
                          type="url"
                          value={draft.website ?? ""}
                          placeholder="https://…"
                          onChange={(e) =>
                            patchDraft({ website: e.target.value || null })
                          }
                        />
                      </label>
                    </>
                  ) : null}

                  {section === "about" ? (
                    <div className="tdh-inline-field tdh-inline-field--richtext">
                      <span>Giới thiệu studio</span>
                      <GioiThieuContentEditor
                        value={draft.gioiThieu?.trim() || "<p></p>"}
                        onChange={(html) => patchDraft({ gioiThieu: html })}
                      />
                    </div>
                  ) : null}

                  {section === "contact" ? (
                    <>
                      <label className="tdh-inline-field">
                        <span>Tỉnh / thành</span>
                        <input
                          type="text"
                          value={draft.tinhThanh ?? ""}
                          placeholder="VD: TP. Hồ Chí Minh"
                          onChange={(e) =>
                            patchDraft({ tinhThanh: e.target.value || null })
                          }
                        />
                      </label>
                      <label className="tdh-inline-field">
                        <span>Địa chỉ</span>
                        <input
                          type="text"
                          value={draft.diaChi ?? ""}
                          onChange={(e) =>
                            patchDraft({ diaChi: e.target.value || null })
                          }
                        />
                      </label>
                      <label className="tdh-inline-field">
                        <span>Điện thoại</span>
                        <input
                          type="tel"
                          value={draft.dienThoai ?? ""}
                          onChange={(e) =>
                            patchDraft({ dienThoai: e.target.value || null })
                          }
                        />
                      </label>
                      <label className="tdh-inline-field">
                        <span>Email liên hệ</span>
                        <input
                          type="email"
                          value={draft.emailLienHe ?? ""}
                          onChange={(e) =>
                            patchDraft({
                              emailLienHe: e.target.value || null,
                            })
                          }
                        />
                      </label>
                    </>
                  ) : null}

                  {section === "display" ? (
                    <>
                      <div
                        className="uas-tabs"
                        role="tablist"
                        aria-label="Nhóm hiển thị"
                      >
                        <button
                          type="button"
                          role="tab"
                          aria-selected={displayTab === "showcase"}
                          className={`uas-tab${displayTab === "showcase" ? " on" : ""}`}
                          onClick={() => setDisplayTab("showcase")}
                        >
                          <LayoutGrid size={15} strokeWidth={2} aria-hidden />
                          Showcase
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={displayTab === "hinh-anh"}
                          className={`uas-tab${displayTab === "hinh-anh" ? " on" : ""}`}
                          onClick={() => setDisplayTab("hinh-anh")}
                        >
                          <ImageIcon size={15} strokeWidth={2} aria-hidden />
                          Hình ảnh
                        </button>
                      </div>

                      {displayTab === "showcase" ? (
                        <>
                          <p className="uas-section-hint uas-tab-hint">
                            Chọn chế độ xem mặc định khi mở tab Showcase. Người
                            xem vẫn đổi qua cụm nút trên thanh bộ lọc bất cứ lúc
                            nào.
                          </p>
                          <div
                            className="uas-options"
                            role="radiogroup"
                            aria-label="Chế độ xem Showcase mặc định"
                          >
                            {STUDIO_SHOWCASE_VIEW_OPTIONS.map((opt) => {
                              const selected =
                                normalizeStudioShowcaseDefaultView(
                                  draft.pageConfig.showcaseDefaultView,
                                ) === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  role="radio"
                                  aria-checked={selected}
                                  className={`uas-option${selected ? " on" : ""}`}
                                  onClick={() =>
                                    setShowcaseDefaultView(opt.value)
                                  }
                                >
                                  <span className="uas-option-ico" aria-hidden>
                                    {opt.value === "timeline" ? (
                                      <Waypoints size={20} strokeWidth={1.8} />
                                    ) : opt.value === "grid" ? (
                                      <Grid3X3 size={20} strokeWidth={1.8} />
                                    ) : (
                                      <LayoutThumbIcon
                                        layout="masonry"
                                        masonryColumns={2}
                                        size={20}
                                      />
                                    )}
                                  </span>
                                  <span className="uas-option-text">
                                    <span className="uas-option-label">
                                      {opt.label}
                                    </span>
                                    <span className="uas-option-desc">
                                      {opt.desc}
                                    </span>
                                  </span>
                                  <span className="uas-option-check" aria-hidden>
                                    {selected ? (
                                      <Check size={16} strokeWidth={2.4} />
                                    ) : null}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="uas-section-hint uas-tab-hint">
                            Tab Bài đăng, Showcase và Tuyển dụng luôn hiện. Có
                            thể ẩn tab Hình ảnh khi studio chưa dùng gallery.
                          </p>
                          <ul className="sps-checks">
                            {STUDIO_OPTIONAL_TAB_IDS.map((tabId) => {
                              const visible =
                                draft.pageConfig.tabs?.[tabId] !== false;
                              return (
                                <li key={tabId}>
                                  <div className="uas-toggle-row">
                                    <span className="uas-toggle-text">
                                      <span className="uas-toggle-label">
                                        {STUDIO_TAB_LABELS[tabId]}
                                      </span>
                                      <span className="uas-toggle-desc">
                                        Bật để hiện tab trên trang studio; tắt
                                        thì ẩn với mọi người.
                                      </span>
                                    </span>
                                    <button
                                      type="button"
                                      role="switch"
                                      aria-checked={visible}
                                      aria-label={STUDIO_TAB_LABELS[tabId]}
                                      className={`uas-switch${visible ? " on" : ""}`}
                                      onClick={() =>
                                        toggleTab(tabId, !visible)
                                      }
                                    >
                                      <span
                                        className="uas-switch-knob"
                                        aria-hidden
                                      />
                                    </button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </>
                      )}
                    </>
                  ) : null}
                </section>

                {err ? (
                  <p className="uas-err" role="alert">
                    {err}
                  </p>
                ) : null}
              </form>
            ) : null}

            {!loading && !draft && err ? (
              <p className="uas-err" role="alert">
                {err}
              </p>
            ) : null}
          </div>
        </div>

        <footer className="uas-foot">
          <span />
          <div className="uas-foot-actions">
            <button type="button" className="uas-btn ghost" onClick={onClose}>
              {canSave ? "Huỷ" : "Đóng"}
            </button>
            {canSave ? (
              <button
                type="submit"
                form={formId}
                className="uas-btn primary"
                disabled={pending}
              >
                {pending ? (
                  <>
                    <Loader2 size={15} className="uas-spin" aria-hidden />
                    Đang lưu…
                  </>
                ) : (
                  "Lưu thay đổi"
                )}
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
