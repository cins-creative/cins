"use client";

import { ImageUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import {
  checkSlugAvailable,
  submitOnboarding,
} from "@/app/[slug]/journey/actions";
import {
  JourneyAvatarEditor,
  type AvatarEditorComplete,
} from "@/components/journey/JourneyAvatarEditor";
import type { GiaiDoan } from "@/lib/auth/session";
import {
  DEFAULT_AVATAR_OPTIONS,
  DEFAULT_AVATAR_PATHS,
  defaultAvatarForGioiTinh,
  getDefaultAvatarPublicPath,
  isDefaultAvatarId,
  type DefaultAvatarId,
  type GioiTinhOnboarding,
} from "@/lib/journey/default-avatars";
import { getAvatarUrl } from "@/lib/journey/profile";

type Props = {
  initialTenHienThi: string;
  initialSlug: string;
};

type SlugStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "ok"; slug: string }
  | { kind: "error"; message: string };

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
    hint: "Mình đang tìm hiểu, chưa biết hợp với hướng nào.",
    accent: "yellow",
  },
  {
    value: "dang_hoc",
    label: "Đang học",
    hint: "Mình là sinh viên, học sinh, hoặc đang theo một khóa.",
    accent: "mint",
  },
  {
    value: "dang_lam",
    label: "Đang làm",
    hint: "Mình đang đi làm full-time ở studio / công ty.",
    accent: "blue",
  },
  {
    value: "tim_viec",
    label: "Tìm việc",
    hint: "Mình vừa tốt nghiệp hoặc đang muốn đổi job.",
    accent: "orange",
  },
  {
    value: "freelance",
    label: "Freelance",
    hint: "Mình làm tự do, nhận dự án theo job.",
    accent: "violet",
  },
  {
    value: "dang_day",
    label: "Giáo viên",
    hint: "Mình là mentor, giảng viên, hoặc đào tạo nội bộ.",
    accent: "blue",
  },
];

const GIOI_TINH_OPTIONS: ReadonlyArray<{
  value: GioiTinhOnboarding;
  label: string;
}> = [
  { value: "nam", label: "Nam" },
  { value: "nu", label: "Nữ" },
  { value: "khong_muon_noi", label: "Không muốn nói" },
];

function normalizeSlugInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}

/**
 * Form onboarding 3 bước cho route `/onboarding` — full page, không backdrop.
 *
 * 1. Bạn là ai? (tên + slug)
 * 2. Bạn đang là...? (giai đoạn)
 * 3. Thông tin cơ bản (giới tính, ngày sinh, avatar) — có thể bỏ qua
 *
 * Sau submit thành công → redirect `/{slug}?welcome=1`.
 */
export function OnboardingForm({ initialTenHienThi, initialSlug }: Props) {
  const router = useRouter();
  const titleId = useId();
  const tenInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [tenHienThi, setTenHienThi] = useState(initialTenHienThi);
  const [slug, setSlug] = useState(initialSlug);
  const [slugDirty, setSlugDirty] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ kind: "idle" });
  const [giaiDoan, setGiaiDoan] = useState<GiaiDoan | null>(null);

  const [gioiTinh, setGioiTinh] = useState<GioiTinhOnboarding | null>(null);
  const [ngaySinh, setNgaySinh] = useState("");
  /** `default-*` hoặc Cloudflare imageId sau khi upload. */
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [avatarTouched, setAvatarTouched] = useState(false);
  const [customPreviewUrl, setCustomPreviewUrl] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (step === 1) tenInputRef.current?.focus();
  }, [step]);

  /* Preload avatar mặc định khi vào bước 2 — sẵn sàng khi tới bước 3. */
  useEffect(() => {
    if (step < 2) return;
    for (const src of DEFAULT_AVATAR_PATHS) {
      const img = new window.Image();
      img.decoding = "async";
      img.src = src;
    }
  }, [step]);

  useEffect(() => {
    return () => {
      if (customPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(customPreviewUrl);
      }
    };
  }, [customPreviewUrl]);

  const previewSrc =
    customPreviewUrl ??
    (isDefaultAvatarId(avatarId)
      ? getDefaultAvatarPublicPath(avatarId)
      : null);

  async function runSlugCheck(value: string): Promise<boolean> {
    setSlugStatus({ kind: "checking" });
    const result = await checkSlugAvailable(value);
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
    const next = normalizeSlugInput(e.target.value);
    setSlug(next);
    setSlugDirty(true);
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
    void runSlugCheck(slug);
  }

  function canAdvanceToStep2(): boolean {
    if (tenHienThi.trim().length < 2) return false;
    if (slug.trim().length < 3) return false;
    if (slugStatus.kind === "error") return false;
    if (slugStatus.kind === "checking") return false;
    return true;
  }

  function onPickGioiTinh(value: GioiTinhOnboarding) {
    setGioiTinh(value);
    if (!avatarTouched) {
      setAvatarId(defaultAvatarForGioiTinh(value));
      setCustomPreviewUrl(null);
    }
  }

  function onPickAvatar(id: DefaultAvatarId) {
    setAvatarId(id);
    setAvatarTouched(true);
    setCustomPreviewUrl(null);
  }

  function onCropComplete(result: AvatarEditorComplete) {
    setAvatarId(result.imageId);
    setCustomPreviewUrl(result.url ?? getAvatarUrl(result.imageId));
    setAvatarTouched(true);
  }

  function onSubmit(opts?: { skipBasics?: boolean }) {
    if (!giaiDoan) {
      setSubmitError("Hãy chọn giai đoạn hiện tại của bạn.");
      return;
    }
    setSubmitError(null);
    const skip = opts?.skipBasics === true;
    startTransition(async () => {
      const result = await submitOnboarding({
        tenHienThi,
        slug,
        giaiDoan,
        gioiTinh: skip ? null : gioiTinh,
        ngaySinh: skip ? null : ngaySinh.trim() || null,
        avatarId: skip ? null : avatarId,
      });
      if (!result.ok) {
        setSubmitError(result.error);
        if (result.field === "slug") {
          setStep(1);
          setSlugStatus({ kind: "error", message: result.error });
        }
        if (result.field === "ten_hien_thi") {
          setStep(1);
        }
        if (result.field === "gioi_tinh" || result.field === "ngay_sinh" || result.field === "avatar_id") {
          setStep(3);
        }
        return;
      }
      const newSlug = result.data.slug;
      router.replace(`/${encodeURIComponent(newSlug)}?welcome=1`);
    });
  }

  return (
    <section
      className="cins-onb-card"
      role="region"
      aria-labelledby={titleId}
    >
      <ol className="cins-onb-steps" aria-label="Tiến độ onboarding">
        <li className={step >= 1 ? "is-active" : ""}>
          <span className="cins-onb-step-no">1</span>
          <span>Bạn là ai?</span>
        </li>
        <li className={step >= 2 ? "is-active" : ""}>
          <span className="cins-onb-step-no">2</span>
          <span>Bạn đang là...?</span>
        </li>
        <li className={step >= 3 ? "is-active" : ""}>
          <span className="cins-onb-step-no">3</span>
          <span>Thông tin cơ bản</span>
        </li>
      </ol>

      {step === 1 ? (
        <div className="cins-onb-fields">
          <div className="cins-onb-field">
            <label htmlFor="onb-name" className="cins-onb-label">
              Mọi người gọi bạn là gì?
              <span className="cins-onb-required" aria-hidden>
                *
              </span>
            </label>
            <input
              id="onb-name"
              ref={tenInputRef}
              className="cins-onb-input"
              type="text"
              value={tenHienThi}
              onChange={(e) => setTenHienThi(e.target.value)}
              placeholder="Vd: Mai Anh, Tú Nguyễn, Studio Sao Mai…"
              maxLength={80}
              autoComplete="name"
            />
            <p className="cins-onb-hint">
              Tên này hiện trên Journey, milestone và mọi nơi bạn xuất hiện
              trên CINs.
            </p>
          </div>

          <div className="cins-onb-field">
            <label htmlFor="onb-slug" className="cins-onb-label">
              Địa chỉ Journey của bạn
              <span className="cins-onb-required" aria-hidden>
                *
              </span>
            </label>
            <div className="cins-onb-slug-row">
              <span className="cins-onb-slug-prefix">cins.vn/</span>
              <input
                id="onb-slug"
                className="cins-onb-input cins-onb-input--slug"
                type="text"
                value={slug}
                onChange={onSlugChange}
                onBlur={onSlugBlur}
                placeholder="vd: mai-anh"
                maxLength={48}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
              />
            </div>

            {slugStatus.kind === "checking" ? (
              <p className="cins-onb-hint cins-onb-hint--info">
                Đang kiểm tra…
              </p>
            ) : slugStatus.kind === "ok" ? (
              <p className="cins-onb-hint cins-onb-hint--ok">
                ✓ Tuyệt, địa chỉ này còn trống — của bạn rồi nhé.
              </p>
            ) : slugStatus.kind === "error" ? (
              <p className="cins-onb-hint cins-onb-hint--err" role="alert">
                {slugStatus.message}
              </p>
            ) : (
              <p className="cins-onb-hint">
                Đây là link bạn gửi cho người khác xem Journey. Dùng chữ
                thường, số, dấu <code>-</code> hoặc <code>_</code>.
              </p>
            )}
          </div>
        </div>
      ) : step === 2 ? (
        <div className="cins-onb-fields">
          <p className="cins-onb-q">
            Bạn đang ở giai đoạn nào trong hành trình sáng tạo?
          </p>
          <p className="cins-onb-q-sub">
            Chọn cái gần với bạn nhất — không cần chính xác 100%, mình dùng
            để gợi ý nội dung phù hợp thôi.
          </p>
          <ul
            className="cins-onb-chips"
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
                      "cins-onb-chip" + (selected ? " is-selected" : "")
                    }
                    onClick={() => setGiaiDoan(opt.value)}
                  >
                    <span className="cins-onb-chip-label">{opt.label}</span>
                    <span className="cins-onb-chip-hint">{opt.hint}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="cins-onb-fields">
          <p className="cins-onb-q">Thông tin cơ bản</p>
          <p className="cins-onb-q-sub">
            Giúp Journey của bạn trông gần gũi hơn. Bạn có thể bỏ qua hoặc
            thay đổi sau trong phần chỉnh sửa hồ sơ.
          </p>

          <div className="cins-onb-field">
            <span className="cins-onb-label" id="onb-gioi-tinh-label">
              Bạn là
            </span>
            <ul
              className="cins-onb-gender"
              role="radiogroup"
              aria-labelledby="onb-gioi-tinh-label"
            >
              {GIOI_TINH_OPTIONS.map((opt) => {
                const selected = gioiTinh === opt.value;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={
                        "cins-onb-gender-btn" +
                        (selected ? " is-selected" : "")
                      }
                      onClick={() => onPickGioiTinh(opt.value)}
                    >
                      {opt.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="cins-onb-field">
            <label htmlFor="onb-ngay-sinh" className="cins-onb-label">
              Ngày sinh
            </label>
            <input
              id="onb-ngay-sinh"
              className="cins-onb-input cins-onb-input--date"
              type="date"
              value={ngaySinh}
              onChange={(e) => setNgaySinh(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>

          <div className="cins-onb-field">
            <span className="cins-onb-label" id="onb-avatar-label">
              Chọn avatar
            </span>

            <div className="cins-onb-avatar-stage">
              <div
                className={
                  "cins-onb-avatar-preview" +
                  (previewSrc ? " has-image" : "")
                }
                aria-hidden={!previewSrc}
              >
                {previewSrc ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={previewSrc}
                    src={previewSrc}
                    alt=""
                    width={128}
                    height={128}
                    decoding="async"
                    fetchPriority="high"
                  />
                ) : (
                  <span className="cins-onb-avatar-preview-empty">
                    Chọn một ảnh bên dưới
                  </span>
                )}
              </div>

              <ul
                className="cins-onb-avatars"
                role="radiogroup"
                aria-labelledby="onb-avatar-label"
              >
                <li>
                  <button
                    type="button"
                    className={
                      "cins-onb-avatar-btn cins-onb-avatar-btn--upload" +
                      (customPreviewUrl ? " is-selected" : "")
                    }
                    aria-label="Tải ảnh của bạn lên"
                    disabled={isPending}
                    onClick={() => setCropOpen(true)}
                  >
                    {customPreviewUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={customPreviewUrl}
                        alt=""
                        width={48}
                        height={48}
                        decoding="async"
                      />
                    ) : (
                      <span className="cins-onb-avatar-upload-inner">
                        <ImageUp size={18} strokeWidth={1.8} aria-hidden />
                        <span>Tải lên</span>
                      </span>
                    )}
                  </button>
                </li>
                {DEFAULT_AVATAR_OPTIONS.map((opt) => {
                  const selected =
                    !customPreviewUrl && avatarId === opt.id;
                  return (
                    <li key={opt.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={opt.label}
                        disabled={isPending}
                        className={
                          "cins-onb-avatar-btn" +
                          (selected ? " is-selected" : "")
                        }
                        onClick={() => onPickAvatar(opt.id)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getDefaultAvatarPublicPath(opt.id)}
                          alt=""
                          width={48}
                          height={48}
                          decoding="async"
                          loading="lazy"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <p className="cins-onb-hint">
              Chọn sẵn hoặc tải ảnh rồi cắt khung. Bạn có thể thay đổi sau trên
              Journey.
            </p>
          </div>
        </div>
      )}

      {submitError ? (
        <p className="cins-onb-submit-err" role="alert">
          {submitError}
        </p>
      ) : null}

      <footer className="cins-onb-foot">
        {step === 1 ? (
          <>
            <span className="cins-onb-step-label">Bước 1 / 3</span>
            <button
              type="button"
              className="cins-onb-btn cins-onb-btn--primary"
              disabled={!canAdvanceToStep2() || isPending}
              onClick={() => {
                if (!slugDirty && slugStatus.kind === "idle") {
                  void runSlugCheck(slug).then((ok) => {
                    if (ok) setStep(2);
                  });
                } else {
                  setStep(2);
                }
              }}
            >
              Tiếp tục →
            </button>
          </>
        ) : step === 2 ? (
          <>
            <button
              type="button"
              className="cins-onb-btn cins-onb-btn--ghost"
              disabled={isPending}
              onClick={() => setStep(1)}
            >
              ← Quay lại
            </button>
            <div className="cins-onb-foot-right">
              <span className="cins-onb-step-label">Bước 2 / 3</span>
              <button
                type="button"
                className="cins-onb-btn cins-onb-btn--primary"
                disabled={!giaiDoan || isPending}
                onClick={() => setStep(3)}
              >
                Tiếp tục →
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              className="cins-onb-btn cins-onb-btn--ghost"
              disabled={isPending}
              onClick={() => setStep(2)}
            >
              ← Quay lại
            </button>
            <div className="cins-onb-foot-right">
              <button
                type="button"
                className="cins-onb-btn cins-onb-btn--ghost"
                disabled={isPending}
                onClick={() => onSubmit({ skipBasics: true })}
              >
                Bỏ qua
              </button>
              <button
                type="button"
                className="cins-onb-btn cins-onb-btn--primary"
                disabled={isPending}
                onClick={() => onSubmit()}
              >
                {isPending ? "Đang lưu…" : "Bắt đầu Journey →"}
              </button>
            </div>
          </>
        )}
      </footer>

      <JourneyAvatarEditor
        open={cropOpen}
        onClose={() => setCropOpen(false)}
        currentAvatarUrl={customPreviewUrl}
        hasAvatar={!!customPreviewUrl}
        persist={false}
        allowDelete={false}
        title="Cắt ảnh đại diện"
        saveLabel="Dùng ảnh này"
        onComplete={onCropComplete}
      />
    </section>
  );
}
