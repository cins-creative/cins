"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import { UserRound } from "lucide-react";

import {
  checkSlugAvailable,
  updateProfile,
  type EmailVisibility,
  type ProfileLinkInput,
} from "@/app/[slug]/journey/actions";
import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";
import type { GiaiDoan } from "@/lib/auth/session";
import { TINH_THANH_OPTIONS } from "@/lib/truong/contact";
import type { ProfileThemeSlice } from "@/lib/journey/profile-theme";
import {
  JourneyThemePicker,
  type JourneyThemePickerHandle,
} from "@/components/journey/JourneyThemePicker";

/** Sub-tab Customize — PLAN_customize_theme §0 nhóm A–E. */
const CUSTOMIZE_SUB_TABS = [
  { id: "theme", label: "Theme" },
  { id: "avatar", label: "Avatar" },
  { id: "shop", label: "Shop" },
  { id: "card", label: "Card" },
  { id: "post", label: "Bài viết" },
] as const;

type CustomizeSubTab = (typeof CUSTOMIZE_SUB_TABS)[number]["id"];

const CUSTOMIZE_SOON: Record<
  Exclude<CustomizeSubTab, "theme">,
  { title: string; blurb: string }
> = {
  avatar: {
    title: "Khung & viền avatar",
    blurb: "Tùy chỉnh khung avatar trên hồ sơ — sắp có.",
  },
  shop: {
    title: "Theme shop",
    blurb: "Màu và nhấn cho quầy hàng / shop trên Journey — sắp có.",
  },
  card: {
    title: "Card user",
    blurb: "Giao diện thẻ popover khi xem hồ sơ người khác — sắp có.",
  },
  post: {
    title: "Thanh bài viết",
    blurb: "Màu thanh ngày / card mốc trên timeline — sắp có.",
  },
};

type AccentTone = "yellow" | "mint" | "orange" | "violet" | "blue";

type SlugStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok"; slug: string }
  | { kind: "error"; message: string };

function normalizeSlugInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}

const GIAI_DOAN_OPTIONS: ReadonlyArray<{
  value: GiaiDoan;
  label: string;
  hint: string;
  accent: AccentTone;
}> = [
  {
    value: "dang_hoc",
    label: "Đang học",
    hint: "Sinh viên, học sinh, đang theo khóa học.",
    accent: "mint",
  },
  {
    value: "dang_lam",
    label: "Đang làm",
    hint: "Full-time ở studio / công ty.",
    accent: "blue",
  },
  {
    value: "tim_viec",
    label: "Tìm việc",
    hint: "Mới ra trường hoặc đổi job.",
    accent: "orange",
  },
  {
    value: "freelance",
    label: "Freelance",
    hint: "Làm tự do, nhận dự án theo job.",
    accent: "violet",
  },
  {
    value: "dang_day",
    label: "Giáo viên",
    hint: "Mentor, giảng viên, đào tạo nội bộ.",
    accent: "blue",
  },
];

export type EditProfileInitial = {
  tenHienThi: string;
  bio: string;
  tinhThanh: string;
  emailLienHe: string;
  visibilityEmail: EmailVisibility;
  /** Thông tin nhận hàng (shop) — mặc định private, mỗi trường có toggle riêng. */
  hoTenNhan: string;
  visibilityHoTenNhan: EmailVisibility;
  soDienThoai: string;
  visibilitySdt: EmailVisibility;
  diaChiChiTiet: string;
  visibilityDiaChi: EmailVisibility;
  mxhLinks: ProfileLinkInput[];
  giaiDoan: GiaiDoan;
  /** Theme trang hồ sơ (accent + pattern) — lưu riêng qua /api/user/giao-dien. */
  profileTheme?: ProfileThemeSlice | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initial: EditProfileInitial;
  /** Slug hiện tại — để revalidate / refresh sau khi lưu. */
  ownerSlug: string;
};

/**
 * Modal "Chỉnh sửa hồ sơ" mở từ Journey sidebar.
 *
 * Cập nhật các field mà owner tự khai: tên, địa chỉ Journey (slug), bio,
 * tỉnh thành, email + visibility, link mạng xã hội (tối đa 8), giai đoạn.
 *
 * Đổi slug → redirect sang URL mới. KHÔNG đụng avatar / cover (upload Cloudflare).
 */
export function JourneyEditProfileModal({
  open,
  onClose,
  initial,
  ownerSlug,
}: Props) {
  const router = useRouter();
  const titleId = useId();
  const { ownerId: composeOwnerId } = useJourneyCompose();

  const [tenHienThi, setTenHienThi] = useState(initial.tenHienThi);
  const [slug, setSlug] = useState(ownerSlug);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ kind: "idle" });
  const [bio, setBio] = useState(initial.bio);
  const [tinhThanh, setTinhThanh] = useState(initial.tinhThanh);
  const [emailLienHe, setEmailLienHe] = useState(initial.emailLienHe);
  const [visibilityEmail, setVisibilityEmail] = useState<EmailVisibility>(
    initial.visibilityEmail,
  );
  const [hoTenNhan, setHoTenNhan] = useState(initial.hoTenNhan);
  const [visibilityHoTenNhan, setVisibilityHoTenNhan] =
    useState<EmailVisibility>(initial.visibilityHoTenNhan);
  const [soDienThoai, setSoDienThoai] = useState(initial.soDienThoai);
  const [visibilitySdt, setVisibilitySdt] = useState<EmailVisibility>(
    initial.visibilitySdt,
  );
  const [diaChiChiTiet, setDiaChiChiTiet] = useState(initial.diaChiChiTiet);
  const [visibilityDiaChi, setVisibilityDiaChi] = useState<EmailVisibility>(
    initial.visibilityDiaChi,
  );
  const [links, setLinks] = useState<ProfileLinkInput[]>(
    initial.mxhLinks.length > 0
      ? initial.mxhLinks.map((l) => ({ label: l.label ?? "", url: l.url }))
      : [{ label: "", url: "" }],
  );
  const [giaiDoan, setGiaiDoan] = useState<GiaiDoan>(initial.giaiDoan);
  const [tab, setTab] = useState<"thong-tin" | "customize">("thong-tin");
  const [customizeSub, setCustomizeSub] =
    useState<CustomizeSubTab>("theme");
  const [themeDirty, setThemeDirty] = useState(false);
  const [themeSaving, setThemeSaving] = useState(false);
  const themePickerRef = useRef<JourneyThemePickerHandle>(null);
  const onCustomize = tab === "customize";
  const themeFooter =
    onCustomize && (customizeSub === "theme" || themeDirty);
  const customizeStubFooter = onCustomize && !themeFooter;

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isPending, startTransition] = useTransition();
  /* Timer cho auto-close sau khi lưu thành công — clear nếu unmount/đóng tay. */
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Ref banner thông báo (err / ok) — scroll vào view sau khi submit để
   * user không miss kết quả (modal có thể dài, banner nằm cuối body). */
  const noticeRef = useRef<HTMLDivElement>(null);

  const onThemeDirtyChange = useCallback((dirty: boolean) => {
    setThemeDirty(dirty);
  }, []);

  /* Mount flag — portal chỉ chạy sau khi client hydrate xong (tránh SSR mismatch). */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  /* Reset state mỗi khi modal được mở lại (initial có thể đã refresh). */
  useEffect(() => {
    if (!open) return;
    setTenHienThi(initial.tenHienThi);
    setSlug(ownerSlug);
    setSlugStatus({ kind: "idle" });
    setBio(initial.bio);
    setTinhThanh(initial.tinhThanh);
    setEmailLienHe(initial.emailLienHe);
    setVisibilityEmail(initial.visibilityEmail);
    setHoTenNhan(initial.hoTenNhan);
    setVisibilityHoTenNhan(initial.visibilityHoTenNhan);
    setSoDienThoai(initial.soDienThoai);
    setVisibilitySdt(initial.visibilitySdt);
    setDiaChiChiTiet(initial.diaChiChiTiet);
    setVisibilityDiaChi(initial.visibilityDiaChi);
    setLinks(
      initial.mxhLinks.length > 0
        ? initial.mxhLinks.map((l) => ({ label: l.label ?? "", url: l.url }))
        : [{ label: "", url: "" }],
    );
    setGiaiDoan(initial.giaiDoan);
    setTab("thong-tin");
    setCustomizeSub("theme");
    setThemeDirty(false);
    setThemeSaving(false);
    setSubmitError(null);
    setSavedFlash(false);
  }, [open, initial, ownerSlug]);

  async function runSlugCheck(value: string): Promise<boolean> {
    setSlugStatus({ kind: "checking" });
    const result = await checkSlugAvailable(value, { currentSlug: ownerSlug });
    if (!result.ok) {
      setSlugStatus({ kind: "error", message: result.error });
      return false;
    }
    if (!result.data.available) {
      setSlugStatus({
        kind: "error",
        message:
          "Địa chỉ này đã có người dùng — thử thêm số (vd: " +
          result.data.slug +
          "-2).",
      });
      return false;
    }
    setSlugStatus({ kind: "ok", slug: result.data.slug });
    return true;
  }

  function onSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlug(normalizeSlugInput(e.target.value));
    setSlugStatus({ kind: "idle" });
  }

  function onSlugBlur() {
    if (!slug.trim()) {
      setSlugStatus({
        kind: "error",
        message: "Địa chỉ Journey không được để trống.",
      });
      return;
    }
    if (normalizeSlugInput(slug) === ownerSlug) {
      setSlugStatus({ kind: "idle" });
      return;
    }
    void runSlugCheck(slug);
  }

  /* Đóng "an toàn" — clear timer auto-close (nếu user bấm x giữa lúc flash). */
  function handleClose() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    onClose();
  }

  /** Đóng có xác nhận nếu theme chưa lưu. Không đóng khi bấm ngoài backdrop. */
  async function requestClose() {
    if (isPending || themeSaving) return;
    const picker = themePickerRef.current;
    if (picker?.isDirty()) {
      const wantSave = window.confirm(
        "Bạn có thay đổi giao diện chưa lưu.\n\nOK = Lưu rồi đóng\nCancel = Đóng mà không lưu",
      );
      if (wantSave) {
        setThemeSaving(true);
        const ok = await picker.save();
        setThemeSaving(false);
        if (!ok) return;
        router.refresh();
      } else {
        picker.discard();
        setThemeDirty(false);
      }
    }
    handleClose();
  }

  async function saveThemeFromFooter() {
    const picker = themePickerRef.current;
    if (!picker) return;
    setThemeSaving(true);
    const ok = await picker.save();
    setThemeSaving(false);
    if (ok) {
      setThemeDirty(false);
      router.refresh();
    }
  }

  /* Khóa scroll body khi modal mở + Esc → requestClose (có confirm nếu dirty). */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending && !themeSaving) {
        void requestClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isPending, themeSaving]);

  if (!open || !mounted) return null;

  function setLinkAt(i: number, patch: Partial<ProfileLinkInput>) {
    setLinks((prev) => {
      const next = prev.slice();
      const cur = next[i] || { url: "" };
      next[i] = { ...cur, ...patch } as ProfileLinkInput;
      return next;
    });
  }
  function addLinkRow() {
    setLinks((prev) => (prev.length >= 8 ? prev : [...prev, { url: "" }]));
  }
  function removeLinkAt(i: number) {
    setLinks((prev) => {
      if (prev.length <= 1) return [{ url: "" }];
      const next = prev.slice();
      next.splice(i, 1);
      return next;
    });
  }

  async function onSubmit() {
    setSubmitError(null);
    const nextSlug = normalizeSlugInput(slug);
    if (!nextSlug) {
      setSlugStatus({
        kind: "error",
        message: "Địa chỉ Journey không được để trống.",
      });
      setSubmitError("Hãy nhập địa chỉ Journey.");
      return;
    }
    if (slugStatus.kind === "error") {
      setSubmitError(slugStatus.message);
      return;
    }
    if (slugStatus.kind === "checking") {
      setSubmitError("Đang kiểm tra địa chỉ — chờ giây lát.");
      return;
    }
    /* Lọc trống ngay client để tránh trip server validator. */
    const cleanLinks = links
      .map((l) => ({
        label: (l.label ?? "").trim(),
        url: (l.url ?? "").trim(),
      }))
      .filter((l) => l.url.length > 0);

    startTransition(async () => {
      if (nextSlug !== ownerSlug && slugStatus.kind !== "ok") {
        const ok = await runSlugCheck(nextSlug);
        if (!ok) {
          setSubmitError("Địa chỉ Journey chưa khả dụng.");
          return;
        }
      }

      const result = await updateProfile({
        tenHienThi,
        slug: nextSlug,
        bio,
        tinhThanh,
        emailLienHe,
        visibilityEmail,
        hoTenNhan,
        visibilityHoTenNhan,
        soDienThoai,
        visibilitySdt,
        diaChiChiTiet,
        visibilityDiaChi,
        mxhLinks: cleanLinks,
        giaiDoan,
        targetOwnerId: composeOwnerId || undefined,
        currentSlug: ownerSlug,
      });
      if (!result.ok) {
        console.error("[JourneyEditProfileModal] save failed:", result);
        setSubmitError(result.error);
        if (result.field === "slug") {
          setSlugStatus({ kind: "error", message: result.error });
        }
        /* Scroll banner lỗi vào view (modal body có scroll riêng). */
        requestAnimationFrame(() =>
          noticeRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          }),
        );
        return;
      }
      /* Server action đã `revalidatePath` — refresh ngay để sidebar/journey
       * reflect dữ liệu mới. Hiện flash success ~1.2s rồi tự đóng modal.
       * Đổi slug → chuyển sang URL mới (slug cũ sẽ 404). */
      setSavedFlash(true);
      const savedSlug = result.data.slug;
      if (savedSlug !== ownerSlug) {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => {
          handleClose();
          router.replace(`/${encodeURIComponent(savedSlug)}`);
        }, 900);
        return;
      }
      router.refresh();
      requestAnimationFrame(() =>
        noticeRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        }),
      );
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      closeTimerRef.current = setTimeout(() => {
        handleClose();
      }, 1200);
    });
  }

  /* Render qua portal vào document.body để backdrop fixed thoát hoàn toàn
   * mọi containing block (sticky sidebar, transformed ancestors, …) và phủ
   * trọn viewport — bao gồm cả topbar / sidebar điều hướng. */
  return createPortal(
    <div
      className="j-edit-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <section
        className={
          "j-edit-card" +
          (tab === "customize" ? " j-edit-card--theme" : "")
        }
        aria-busy={isPending || themeSaving}
      >
        <header className="j-edit-head">
          <div>
            <h2 id={titleId} className="j-edit-title">
              Chỉnh sửa hồ sơ
            </h2>
            <p className="j-edit-sub">
              cins.vn/<strong>{slug || ownerSlug}</strong>
            </p>
          </div>
          <button
            type="button"
            className="j-edit-close"
            aria-label="Đóng"
            onClick={() => void requestClose()}
            disabled={isPending || themeSaving}
          >
            ×
          </button>
        </header>

        <div className="j-edit-tabs" role="tablist" aria-label="Mục chỉnh sửa">
          <button
            type="button"
            role="tab"
            id="j-edit-tab-thong-tin"
            aria-selected={tab === "thong-tin"}
            aria-controls="j-edit-panel-thong-tin"
            tabIndex={tab === "thong-tin" ? 0 : -1}
            className={
              "j-edit-tab" + (tab === "thong-tin" ? " is-active" : "")
            }
            onClick={() => setTab("thong-tin")}
          >
            <UserRound size={16} strokeWidth={2.25} aria-hidden />
            Thông tin
          </button>
          <button
            type="button"
            role="tab"
            id="j-edit-tab-customize"
            aria-selected={tab === "customize"}
            aria-controls="j-edit-panel-customize"
            tabIndex={tab === "customize" ? 0 : -1}
            className={
              "j-edit-tab" + (tab === "customize" ? " is-active" : "")
            }
            onClick={() => setTab("customize")}
          >
            <span className="j-edit-tab-colorwheel" aria-hidden>
              <span className="j-edit-tab-colorwheel-ring" />
            </span>
            Customize
          </button>
        </div>

        <div className="j-edit-body">
          <div
            id="j-edit-panel-thong-tin"
            role="tabpanel"
            aria-labelledby="j-edit-tab-thong-tin"
            hidden={tab !== "thong-tin"}
          >
          <div className="j-edit-field">
            <label htmlFor="ep-name" className="j-edit-label">
              Tên hiển thị <span aria-hidden>*</span>
            </label>
            <input
              id="ep-name"
              type="text"
              className="j-edit-input"
              value={tenHienThi}
              onChange={(e) => setTenHienThi(e.target.value)}
              maxLength={80}
              placeholder="Vd: Mai Anh, Tú Nguyễn…"
              autoComplete="name"
            />
            <p className="j-edit-hint">Tên hiện trên Journey và mọi nơi bạn xuất hiện trên CINs.</p>
          </div>

          <div className="j-edit-field">
            <label htmlFor="ep-slug" className="j-edit-label">
              Địa chỉ Journey <span aria-hidden>*</span>
            </label>
            <div className="j-edit-slug-row">
              <span className="j-edit-slug-prefix">cins.vn/</span>
              <input
                id="ep-slug"
                type="text"
                className="j-edit-input j-edit-input--slug"
                value={slug}
                onChange={onSlugChange}
                onBlur={onSlugBlur}
                maxLength={48}
                placeholder="vd: mai-anh"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                disabled={isPending || savedFlash}
              />
            </div>
            {slugStatus.kind === "checking" ? (
              <p className="j-edit-hint">Đang kiểm tra…</p>
            ) : slugStatus.kind === "ok" ? (
              <p className="j-edit-hint j-edit-hint--ok">
                ✓ Địa chỉ còn trống — dùng được.
              </p>
            ) : slugStatus.kind === "error" ? (
              <p className="j-edit-hint j-edit-hint--err" role="alert">
                {slugStatus.message}
              </p>
            ) : (
              <p className="j-edit-hint">
                Link công khai trên sidebar. Chữ thường, số, dấu{" "}
                <code>-</code> hoặc <code>_</code>. Đổi xong sẽ chuyển sang URL
                mới.
              </p>
            )}
          </div>

          <div className="j-edit-field">
            <label htmlFor="ep-bio" className="j-edit-label">
              Mô tả ngắn
            </label>
            <textarea
              id="ep-bio"
              className="j-edit-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              rows={3}
              placeholder="1–2 câu giới thiệu — vai trò, mảng bạn làm, hoặc thứ bạn quan tâm."
            />
            <p className="j-edit-hint">{bio.length} / 280 ký tự.</p>
          </div>

          <div className="j-edit-row">
            <div className="j-edit-field">
              <label htmlFor="ep-city" className="j-edit-label">
                Tỉnh / Thành phố
              </label>
              <select
                id="ep-city"
                className="j-edit-input"
                value={tinhThanh}
                onChange={(e) => setTinhThanh(e.target.value)}
              >
                {TINH_THANH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="j-edit-field">
              <label htmlFor="ep-email" className="j-edit-label">
                Email liên hệ
              </label>
              <input
                id="ep-email"
                type="email"
                className="j-edit-input"
                value={emailLienHe}
                onChange={(e) => setEmailLienHe(e.target.value)}
                placeholder="ten@email.com"
                autoComplete="email"
                maxLength={120}
              />
              <label className="j-edit-checkbox">
                <input
                  type="checkbox"
                  checked={visibilityEmail === "public"}
                  onChange={(e) =>
                    setVisibilityEmail(e.target.checked ? "public" : "private")
                  }
                />
                <span>Công khai trên Journey</span>
              </label>
            </div>
          </div>

          <div className="j-edit-section">
            <span className="j-edit-label">Thông tin nhận hàng</span>
            <p className="j-edit-hint" style={{ marginTop: 0, marginBottom: 10 }}>
              Đồng bộ với địa chỉ mặc định lúc thanh toán giỏ hàng. Mặc định{" "}
              <strong>riêng tư</strong> (chỉ hiện với người bán khi bạn đặt đơn).
              Bật công khai nếu muốn hiện trên Journey. Phường/xã chọn thêm khi
              thanh toán.
            </p>

            <div className="j-edit-field">
              <label htmlFor="ep-hoten" className="j-edit-label">
                Họ tên thật (người nhận)
              </label>
              <input
                id="ep-hoten"
                type="text"
                className="j-edit-input"
                value={hoTenNhan}
                onChange={(e) => setHoTenNhan(e.target.value)}
                maxLength={80}
                placeholder="Vd: Nguyễn Văn A"
                autoComplete="name"
              />
              <label className="j-edit-checkbox">
                <input
                  type="checkbox"
                  checked={visibilityHoTenNhan === "public"}
                  onChange={(e) =>
                    setVisibilityHoTenNhan(
                      e.target.checked ? "public" : "private",
                    )
                  }
                />
                <span>Công khai trên Journey</span>
              </label>
            </div>

            <div className="j-edit-field">
              <label htmlFor="ep-sdt" className="j-edit-label">
                Số điện thoại
              </label>
              <input
                id="ep-sdt"
                type="tel"
                className="j-edit-input"
                value={soDienThoai}
                onChange={(e) => setSoDienThoai(e.target.value)}
                maxLength={20}
                placeholder="Vd: 0912 345 678"
                autoComplete="tel"
              />
              <label className="j-edit-checkbox">
                <input
                  type="checkbox"
                  checked={visibilitySdt === "public"}
                  onChange={(e) =>
                    setVisibilitySdt(e.target.checked ? "public" : "private")
                  }
                />
                <span>Công khai trên Journey</span>
              </label>
            </div>

            <div className="j-edit-field">
              <label htmlFor="ep-diachi" className="j-edit-label">
                Địa chỉ chi tiết
              </label>
              <textarea
                id="ep-diachi"
                className="j-edit-textarea"
                value={diaChiChiTiet}
                onChange={(e) => setDiaChiChiTiet(e.target.value)}
                maxLength={280}
                rows={2}
                placeholder="Số nhà, đường, phường/xã, quận/huyện…"
              />
              <p className="j-edit-hint">
                Tỉnh / thành phố lấy theo ô «Tỉnh / Thành phố» ở trên.
              </p>
              <label className="j-edit-checkbox">
                <input
                  type="checkbox"
                  checked={visibilityDiaChi === "public"}
                  onChange={(e) =>
                    setVisibilityDiaChi(e.target.checked ? "public" : "private")
                  }
                />
                <span>Công khai trên Journey</span>
              </label>
            </div>
          </div>

          <div className="j-edit-field">
            <span className="j-edit-label">Mạng xã hội & portfolio</span>
            <p className="j-edit-hint" style={{ marginTop: 0, marginBottom: 8 }}>
              Behance, Instagram, ArtStation… (tối đa 8 link).
            </p>
            <ul className="j-edit-links">
              {links.map((link, i) => (
                <li key={i} className="j-edit-link-row">
                  <input
                    type="text"
                    className="j-edit-input j-edit-input--label"
                    value={link.label ?? ""}
                    onChange={(e) => setLinkAt(i, { label: e.target.value })}
                    placeholder="Nhãn (vd: Behance)"
                    maxLength={40}
                  />
                  <input
                    type="url"
                    className="j-edit-input j-edit-input--url"
                    value={link.url}
                    onChange={(e) => setLinkAt(i, { url: e.target.value })}
                    placeholder="https://…"
                    maxLength={300}
                    autoComplete="url"
                  />
                  <button
                    type="button"
                    className="j-edit-link-remove"
                    onClick={() => removeLinkAt(i)}
                    aria-label="Xóa link"
                    title="Xóa"
                    disabled={isPending}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            {links.length < 8 ? (
              <button
                type="button"
                className="j-edit-link-add"
                onClick={addLinkRow}
                disabled={isPending}
              >
                + Thêm link
              </button>
            ) : (
              <p className="j-edit-hint">Đã đạt tối đa 8 link.</p>
            )}
          </div>

          <div className="j-edit-field">
            <span className="j-edit-label">Giai đoạn hiện tại</span>
            <ul
              className="j-edit-chips"
              role="radiogroup"
              aria-label="Chọn giai đoạn"
            >
              {GIAI_DOAN_OPTIONS.map((opt) => {
                const selected = giaiDoan === opt.value;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      data-accent={opt.accent}
                      className={
                        "j-edit-chip" + (selected ? " is-selected" : "")
                      }
                      onClick={() => setGiaiDoan(opt.value)}
                    >
                      <span className="j-edit-chip-label">{opt.label}</span>
                      <span className="j-edit-chip-hint">{opt.hint}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div ref={noticeRef}>
            {savedFlash ? (
              <p className="j-edit-ok" role="status" aria-live="polite">
                <span aria-hidden>✓</span> Đã lưu thay đổi — Journey vừa cập nhật.
              </p>
            ) : submitError ? (
              <p className="j-edit-err" role="alert">
                {submitError}
              </p>
            ) : null}
          </div>
          </div>
          <div
            id="j-edit-panel-customize"
            role="tabpanel"
            aria-labelledby="j-edit-tab-customize"
            className="j-edit-theme-panel"
            hidden={tab !== "customize"}
          >
            <div
              className="j-edit-subtabs"
              role="tablist"
              aria-label="Mục customize"
            >
              {CUSTOMIZE_SUB_TABS.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  role="tab"
                  id={`j-edit-subtab-${sub.id}`}
                  aria-selected={customizeSub === sub.id}
                  aria-controls={`j-edit-subpanel-${sub.id}`}
                  tabIndex={customizeSub === sub.id ? 0 : -1}
                  className={
                    "j-edit-subtab" +
                    (customizeSub === sub.id ? " is-active" : "")
                  }
                  onClick={() => setCustomizeSub(sub.id)}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            <div
              id="j-edit-subpanel-theme"
              role="tabpanel"
              aria-labelledby="j-edit-subtab-theme"
              className="j-edit-subpanel"
              hidden={customizeSub !== "theme"}
            >
              <JourneyThemePicker
                ref={themePickerRef}
                initialTheme={initial.profileTheme ?? null}
                onDirtyChange={onThemeDirtyChange}
              />
            </div>

            {(
              Object.keys(CUSTOMIZE_SOON) as Array<
                Exclude<CustomizeSubTab, "theme">
              >
            ).map((id) => {
              const soon = CUSTOMIZE_SOON[id];
              return (
                <div
                  key={id}
                  id={`j-edit-subpanel-${id}`}
                  role="tabpanel"
                  aria-labelledby={`j-edit-subtab-${id}`}
                  className="j-edit-subpanel j-edit-subpanel--soon"
                  hidden={customizeSub !== id}
                >
                  <p className="j-edit-soon-kicker">Sắp có</p>
                  <h3 className="j-edit-soon-title">{soon.title}</h3>
                  <p className="j-edit-soon-blurb">{soon.blurb}</p>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="j-edit-foot">
          {themeFooter ? (
            <>
              <button
                type="button"
                className="j-edit-btn j-edit-btn--ghost"
                onClick={() => void requestClose()}
                disabled={themeSaving}
              >
                Đóng
              </button>
              <button
                type="button"
                className="j-edit-btn j-edit-btn--primary"
                onClick={() => void saveThemeFromFooter()}
                disabled={!themeDirty || themeSaving}
              >
                {themeSaving
                  ? "Đang lưu…"
                  : themeDirty
                    ? "Lưu giao diện"
                    : "Đã lưu"}
              </button>
            </>
          ) : customizeStubFooter ? (
            <button
              type="button"
              className="j-edit-btn j-edit-btn--ghost"
              onClick={() => void requestClose()}
              disabled={themeSaving}
            >
              Đóng
            </button>
          ) : (
            <>
              <button
                type="button"
                className="j-edit-btn j-edit-btn--ghost"
                onClick={() => void requestClose()}
                disabled={isPending || themeSaving}
              >
                {savedFlash ? "Đóng" : "Hủy"}
              </button>
              <button
                type="button"
                className="j-edit-btn j-edit-btn--primary"
                onClick={() => void onSubmit()}
                disabled={isPending || savedFlash}
              >
                {savedFlash
                  ? "✓ Đã lưu"
                  : isPending
                    ? "Đang lưu…"
                    : "Lưu thay đổi"}
              </button>
            </>
          )}
        </footer>
      </section>
    </div>,
    document.body,
  );
}
