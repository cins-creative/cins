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

import { LOAI_CO_SO_OPTIONS } from "@/lib/to-chuc/constants";
import {
  CO_SO_TAB_LABELS,
  type CoSoOptionalTabId,
  type CoSoPageCauHinh,
} from "@/lib/to-chuc/co-so-page-cau-hinh";
import type { CoSoFilterChip } from "@/lib/to-chuc/co-so-page-queries";

type SettingsSection = "identity" | "display" | "filters";

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
  pageConfig: CoSoPageCauHinh;
  filters: Array<{
    id: string;
    ten: string;
    slug: string;
    mau: string | null;
    thuTu: number;
  }>;
};

type Props = {
  open: boolean;
  orgId: string;
  onClose: () => void;
  onSaved: (patch: {
    slug?: string;
    ten?: string;
    pageConfig: CoSoPageCauHinh;
    filters: CoSoFilterChip[];
    loaiCoSo?: string;
    namThanhLap?: number | null;
    giayPhepDaoTao?: string | null;
  }) => void;
};

const OPTIONAL_TABS: CoSoOptionalTabId[] = ["khoa-hoc", "san-pham", "hinh-anh"];

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

export function CoSoPageSettingsModal({ open, orgId, onClose, onSaved }: Props) {
  const router = useRouter();
  const titleId = useId();
  const [section, setSection] = useState<SettingsSection>("identity");
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

  useEffect(() => {
    if (!open) return;
    setSection("identity");
    setNewFilterName("");
    void loadSettings();
  }, [open, loadSettings]);

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

  function toggleTab(tabId: CoSoOptionalTabId, visible: boolean) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pageConfig: {
          tabs: {
            ...prev.pageConfig.tabs,
            [tabId]: visible,
          },
        },
      };
    });
  }

  function onSaveIdentity(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setErr(null);
    startTransition(async () => {
      const res = await fetch(`/api/co-so/${encodeURIComponent(orgId)}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ten: draft.ten,
          slug: draft.slug,
          moTa: draft.moTa,
          gioiThieuTruong: draft.gioiThieuTruong,
          tenChinhThuc: draft.tenChinhThuc,
          loaiCoSo: draft.loaiCoSo,
          namThanhLap: draft.namThanhLap,
          website: draft.website,
          giayPhepDaoTao: draft.giayPhepDaoTao,
          pageConfig: draft.pageConfig,
        }),
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
      onSaved({
        slug: json.settings.slug,
        ten: json.settings.ten,
        pageConfig: json.settings.pageConfig,
        filters: mapFiltersToChips(json.settings.filters),
        loaiCoSo: json.settings.loaiCoSo,
        namThanhLap: json.settings.namThanhLap,
        giayPhepDaoTao: json.settings.giayPhepDaoTao,
      });
      if (json.settings.slug !== draft.slug) {
        router.replace(`/co-so/${json.settings.slug}`);
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
      onSaved({
        pageConfig: draft.pageConfig,
        filters: mapFiltersToChips(nextFilters),
      });
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
      onSaved({
        pageConfig: draft.pageConfig,
        filters: mapFiltersToChips(nextFilters),
      });
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
      onSaved({
        pageConfig: draft.pageConfig,
        filters: mapFiltersToChips(nextFilters),
      });
    } finally {
      setFilterPending(false);
    }
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
            <h2 id={titleId} className="tdh-inline-modal-title cso-settings-title">
              Cài đặt trang cơ sở
            </h2>
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
          {(
            [
              ["identity", "Danh tính"],
              ["display", "Hiển thị"],
              ["filters", "Nhãn timeline"],
            ] as const
          ).map(([id, label]) => (
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
          <form className="cso-settings-body" onSubmit={onSaveIdentity}>
            {section === "identity" ? (
              <section className="cso-settings-section">
                <p className="cso-settings-hint">
                  Thông tin công khai trên trang và hub cơ sở đào tạo.
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
                  <span>Tên pháp lý</span>
                  <input
                    type="text"
                    value={draft.tenChinhThuc}
                    required
                    onChange={(e) => patchDraft({ tenChinhThuc: e.target.value })}
                  />
                </label>
                <label className="tdh-inline-field">
                  <span>Đường dẫn (slug)</span>
                  <input
                    type="text"
                    value={draft.slug}
                    required
                    onChange={(e) => patchDraft({ slug: e.target.value })}
                  />
                  <span className="cso-settings-field-note">
                    Đổi slug sẽ đổi URL trang — cins.vn/co-so/{draft.slug}
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
                    placeholder="VD: Trung tâm đào tạo Mỹ thuật — hội họa, đồ họa, thiết kế"
                    onChange={(e) =>
                      patchDraft({ moTa: e.target.value || null })
                    }
                  />
                  <span className="cso-settings-field-note">
                    Một câu tagline ngắn — hiện trên thẻ cơ sở ở hub và mô tả
                    khi chia sẻ link (SEO).
                  </span>
                </label>
                <label className="tdh-inline-field">
                  <span>Giới thiệu</span>
                  <textarea
                    rows={3}
                    value={draft.gioiThieuTruong ?? ""}
                    placeholder="Lịch sử, phương pháp đào tạo, thế mạnh, đội ngũ…"
                    onChange={(e) =>
                      patchDraft({ gioiThieuTruong: e.target.value || null })
                    }
                  />
                  <span className="cso-settings-field-note">
                    Nội dung «Về chúng tôi» chi tiết trên trang cơ sở — dài hơn
                    mô tả ngắn, dùng khi khách muốn tìm hiểu sâu.
                  </span>
                </label>
                <div className="cso-settings-row">
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
                  <label className="tdh-inline-field">
                    <span>Website</span>
                    <input
                      type="url"
                      value={draft.website ?? ""}
                      placeholder="https://"
                      onChange={(e) =>
                        patchDraft({ website: e.target.value || null })
                      }
                    />
                  </label>
                </div>
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
                  <span className="cso-settings-field-note">
                    Hiển thị công khai trong sidebar — mục «Số liệu đào tạo».
                  </span>
                </label>
                <div className="cso-settings-readonly">
                  <span>Mã cơ sở: {draft.maCoSo}</span>
                  <span>
                    Xác thực CINs: {draft.daVerify ? "Đã xác thực" : "Chưa"}
                  </span>
                </div>
              </section>
            ) : null}

            {section === "display" ? (
              <section className="cso-settings-section">
                <p className="cso-settings-hint">
                  Tab «Bài đăng» luôn hiển thị. Các tab khác có thể ẩn khi chưa
                  có nội dung.
                </p>
                <ul className="cso-settings-checks">
                  {OPTIONAL_TABS.map((tabId) => {
                    const visible = draft.pageConfig.tabs?.[tabId] !== false;
                    return (
                      <li key={tabId}>
                        <label className="cso-settings-check">
                          <input
                            type="checkbox"
                            checked={visible}
                            onChange={(e) => toggleTab(tabId, e.target.checked)}
                          />
                          <span>{CO_SO_TAB_LABELS[tabId]}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {section === "filters" ? (
              <section className="cso-settings-section">
                <p className="cso-settings-hint">
                  Nhãn lọc cục bộ trên timeline bài đăng — không dùng cho giá
                  hay bán hàng.
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

            {section !== "filters" ? (
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
