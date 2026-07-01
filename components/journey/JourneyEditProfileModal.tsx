"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import {
  updateProfile,
  type EmailVisibility,
  type ProfileLinkInput,
} from "@/app/[slug]/journey/actions";
import type { GiaiDoan } from "@/lib/auth/session";

/* ─── Phải khớp 1-1 với enum `tinh_thanh_vn_enum` trong Supabase (đã verify
 *     bằng MCP). Lưu ý value của TP. HCM là `hcm` (không phải `ho_chi_minh`).
 *     34 đơn vị hành chính theo phương án sáp nhập 2025. ────────────────── */
const TINH_THANH_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "", label: "— Không khai báo —" },
  { value: "hcm", label: "TP. Hồ Chí Minh" },
  { value: "ha_noi", label: "Hà Nội" },
  { value: "da_nang", label: "Đà Nẵng" },
  { value: "hai_phong", label: "Hải Phòng" },
  { value: "can_tho", label: "Cần Thơ" },
  { value: "hue", label: "Huế" },
  { value: "khanh_hoa", label: "Khánh Hòa" },
  { value: "lam_dong", label: "Lâm Đồng" },
  { value: "dong_nai", label: "Đồng Nai" },
  { value: "quang_ninh", label: "Quảng Ninh" },
  { value: "bac_ninh", label: "Bắc Ninh" },
  { value: "nghe_an", label: "Nghệ An" },
  { value: "ha_tinh", label: "Hà Tĩnh" },
  { value: "thanh_hoa", label: "Thanh Hóa" },
  { value: "ninh_binh", label: "Ninh Bình" },
  { value: "hung_yen", label: "Hưng Yên" },
  { value: "phu_tho", label: "Phú Thọ" },
  { value: "thai_nguyen", label: "Thái Nguyên" },
  { value: "lao_cai", label: "Lào Cai" },
  { value: "tuyen_quang", label: "Tuyên Quang" },
  { value: "cao_bang", label: "Cao Bằng" },
  { value: "lang_son", label: "Lạng Sơn" },
  { value: "dien_bien", label: "Điện Biên" },
  { value: "lai_chau", label: "Lai Châu" },
  { value: "son_la", label: "Sơn La" },
  { value: "quang_tri", label: "Quảng Trị" },
  { value: "quang_ngai", label: "Quảng Ngãi" },
  { value: "gia_lai", label: "Gia Lai" },
  { value: "dak_lak", label: "Đắk Lắk" },
  { value: "tay_ninh", label: "Tây Ninh" },
  { value: "vinh_long", label: "Vĩnh Long" },
  { value: "dong_thap", label: "Đồng Tháp" },
  { value: "an_giang", label: "An Giang" },
  { value: "ca_mau", label: "Cà Mau" },
];

type AccentTone = "yellow" | "mint" | "orange" | "violet" | "blue";

const GIAI_DOAN_OPTIONS: ReadonlyArray<{
  value: GiaiDoan;
  label: string;
  hint: string;
  accent: AccentTone;
}> = [
  {
    value: "moi_bat_dau",
    label: "Mới bắt đầu",
    hint: "Đang tìm hiểu, chưa rõ hướng đi.",
    accent: "yellow",
  },
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
  mxhLinks: ProfileLinkInput[];
  giaiDoan: GiaiDoan;
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
 * Cập nhật các field mà owner tự khai: tên, bio, tỉnh thành, email + visibility,
 * link mạng xã hội (tối đa 8), giai đoạn (có thể đổi lại sau onboarding).
 *
 * KHÔNG đụng slug (đổi slug = đổi URL Journey → flow riêng).
 * KHÔNG đụng avatar / cover (cần upload Cloudflare — lượt sau).
 */
export function JourneyEditProfileModal({
  open,
  onClose,
  initial,
  ownerSlug,
}: Props) {
  const router = useRouter();
  const titleId = useId();

  const [tenHienThi, setTenHienThi] = useState(initial.tenHienThi);
  const [bio, setBio] = useState(initial.bio);
  const [tinhThanh, setTinhThanh] = useState(initial.tinhThanh);
  const [emailLienHe, setEmailLienHe] = useState(initial.emailLienHe);
  const [visibilityEmail, setVisibilityEmail] = useState<EmailVisibility>(
    initial.visibilityEmail,
  );
  const [links, setLinks] = useState<ProfileLinkInput[]>(
    initial.mxhLinks.length > 0
      ? initial.mxhLinks.map((l) => ({ label: l.label ?? "", url: l.url }))
      : [{ label: "", url: "" }],
  );
  const [giaiDoan, setGiaiDoan] = useState<GiaiDoan>(initial.giaiDoan);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isPending, startTransition] = useTransition();
  /* Timer cho auto-close sau khi lưu thành công — clear nếu unmount/đóng tay. */
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Ref banner thông báo (err / ok) — scroll vào view sau khi submit để
   * user không miss kết quả (modal có thể dài, banner nằm cuối body). */
  const noticeRef = useRef<HTMLDivElement>(null);

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
    setBio(initial.bio);
    setTinhThanh(initial.tinhThanh);
    setEmailLienHe(initial.emailLienHe);
    setVisibilityEmail(initial.visibilityEmail);
    setLinks(
      initial.mxhLinks.length > 0
        ? initial.mxhLinks.map((l) => ({ label: l.label ?? "", url: l.url }))
        : [{ label: "", url: "" }],
    );
    setGiaiDoan(initial.giaiDoan);
    setSubmitError(null);
    setSavedFlash(false);
  }, [open, initial]);

  /* Khóa scroll body khi modal mở + close on Esc. */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) handleClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isPending]);

  /* Đóng "an toàn" — clear timer auto-close (nếu user bấm x giữa lúc flash). */
  function handleClose() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    onClose();
  }

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
    /* Lọc trống ngay client để tránh trip server validator. */
    const cleanLinks = links
      .map((l) => ({
        label: (l.label ?? "").trim(),
        url: (l.url ?? "").trim(),
      }))
      .filter((l) => l.url.length > 0);

    startTransition(async () => {
      const result = await updateProfile({
        tenHienThi,
        bio,
        tinhThanh,
        emailLienHe,
        visibilityEmail,
        mxhLinks: cleanLinks,
        giaiDoan,
      });
      if (!result.ok) {
        console.error("[JourneyEditProfileModal] save failed:", result);
        setSubmitError(result.error);
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
       * reflect dữ liệu mới. Hiện flash success ~1.2s rồi tự đóng modal. */
      setSavedFlash(true);
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
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) handleClose();
      }}
    >
      <section className="j-edit-card" aria-busy={isPending}>
        <header className="j-edit-head">
          <div>
            <h2 id={titleId} className="j-edit-title">
              Chỉnh sửa hồ sơ
            </h2>
            <p className="j-edit-sub">
              cins.vn/<strong>{ownerSlug}</strong>
            </p>
          </div>
          <button
            type="button"
            className="j-edit-close"
            aria-label="Đóng"
            onClick={handleClose}
            disabled={isPending}
          >
            ×
          </button>
        </header>

        <div className="j-edit-body">
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

        <footer className="j-edit-foot">
          <button
            type="button"
            className="j-edit-btn j-edit-btn--ghost"
            onClick={handleClose}
            disabled={isPending}
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
        </footer>
      </section>
    </div>,
    document.body,
  );
}
