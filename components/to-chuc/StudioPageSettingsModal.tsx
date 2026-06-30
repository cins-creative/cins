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

import { StudioSettingsMembersSection } from "@/components/to-chuc/StudioSettingsMembersSection";
import { GioiThieuContentEditor } from "@/components/truong/GioiThieuContentEditor";
import { normalizeTruongGioiThieuHtml } from "@/lib/truong/gioi-thieu";

export type StudioSettingsSection =
  | "identity"
  | "about"
  | "contact"
  | "members";

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
  }) => void;
};

const NAV: ReadonlyArray<{ id: StudioSettingsSection; label: string }> = [
  { id: "identity", label: "Danh tính" },
  { id: "about", label: "Giới thiệu" },
  { id: "contact", label: "Liên hệ" },
  { id: "members", label: "Thành viên" },
];

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
  const [section, setSection] = useState<StudioSettingsSection>(initialSection);
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
      setDraft(json.settings);
    } finally {
      setLoading(false);
    }
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
    onSaved({
      ten: settings.ten,
      moTa: settings.moTa,
      gioiThieu: settings.gioiThieu,
      website: settings.website,
      tinhThanh: settings.tinhThanh,
      diaChi: settings.diaChi,
      dienThoai: settings.dienThoai,
      emailLienHe: settings.emailLienHe,
    });
  }

  function onSaveSection(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
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

  return createPortal(
    <div
      className="tdh-inline-modal-backdrop cso-settings-backdrop"
      role="presentation"
      onClick={onClose}
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
                Quản lý studio
              </h2>
              {draft ? (
                <p className="cso-settings-role-banner">
                  cins.vn/studio/{draft.slug}
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

        {!loading && draft && section === "members" ? (
          <div className="cso-settings-body">
            <StudioSettingsMembersSection
              orgId={orgId}
              orgSlug={draft.slug}
              orgLabel={draft.ten}
              onError={setErr}
            />
            {err ? (
              <p className="cso-settings-err" role="alert">
                {err}
              </p>
            ) : null}
          </div>
        ) : null}

        {!loading && draft && section !== "members" ? (
          <form className="cso-settings-body" onSubmit={onSaveSection}>
            {section === "identity" ? (
              <section className="cso-settings-section">
                <p className="cso-settings-hint">
                  Tên thương hiệu và mô tả ngắn hiển thị trên sidebar trang studio.
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
                  <span>Tên pháp lý / chính thức</span>
                  <input
                    type="text"
                    value={draft.tenChinhThuc ?? ""}
                    placeholder="Tên đăng ký doanh nghiệp (tuỳ chọn)"
                    onChange={(e) =>
                      patchDraft({ tenChinhThuc: e.target.value || null })
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
              </section>
            ) : null}

            {section === "about" ? (
              <section className="cso-settings-section cso-settings-section--about">
                <p className="cso-settings-hint">
                  Nội dung giới thiệu chi tiết — hiển thị trong phần Giới thiệu
                  trên sidebar.
                </p>
                <div className="tdh-inline-field tdh-inline-field--richtext">
                  <span>Giới thiệu studio</span>
                  <GioiThieuContentEditor
                    value={draft.gioiThieu?.trim() || "<p></p>"}
                    onChange={(html) => patchDraft({ gioiThieu: html })}
                  />
                </div>
              </section>
            ) : null}

            {section === "contact" ? (
              <section className="cso-settings-section">
                <p className="cso-settings-hint">
                  Thông tin liên hệ hiển thị trên sidebar trang studio.
                </p>
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
                      patchDraft({ emailLienHe: e.target.value || null })
                    }
                  />
                </label>
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
