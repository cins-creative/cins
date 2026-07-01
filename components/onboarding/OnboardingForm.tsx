"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import {
  checkSlugAvailable,
  submitOnboarding,
} from "@/app/[slug]/journey/actions";
import type { GiaiDoan } from "@/lib/auth/session";

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

function normalizeSlugInput(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}

/**
 * Form onboarding 2 bước cho route `/onboarding` — full page, không backdrop.
 *
 * Sử dụng CINs design system (`--cins-*` tokens + Be Vietnam Pro + Crimson Pro).
 * Class prefix `cins-onb-*`.
 *
 * Sau submit thành công → redirect `/{slug}?welcome=1`.
 */
export function OnboardingForm({ initialTenHienThi, initialSlug }: Props) {
  const router = useRouter();
  const titleId = useId();
  const tenInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [tenHienThi, setTenHienThi] = useState(initialTenHienThi);
  const [slug, setSlug] = useState(initialSlug);
  const [slugDirty, setSlugDirty] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ kind: "idle" });
  const [giaiDoan, setGiaiDoan] = useState<GiaiDoan | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (step === 1) tenInputRef.current?.focus();
  }, [step]);

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

  async function onSubmit() {
    if (!giaiDoan) {
      setSubmitError("Hãy chọn giai đoạn hiện tại của bạn.");
      return;
    }
    setSubmitError(null);
    startTransition(async () => {
      const result = await submitOnboarding({
        tenHienThi,
        slug,
        giaiDoan,
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
          <span>Bạn đang ở đâu?</span>
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
      ) : (
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
      )}

      {submitError ? (
        <p className="cins-onb-submit-err" role="alert">
          {submitError}
        </p>
      ) : null}

      <footer className="cins-onb-foot">
        {step === 1 ? (
          <>
            <span className="cins-onb-step-label">Bước 1 / 2</span>
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
        ) : (
          <>
            <button
              type="button"
              className="cins-onb-btn cins-onb-btn--ghost"
              disabled={isPending}
              onClick={() => setStep(1)}
            >
              ← Quay lại
            </button>
            <button
              type="button"
              className="cins-onb-btn cins-onb-btn--primary"
              disabled={!giaiDoan || isPending}
              onClick={() => void onSubmit()}
            >
              {isPending ? "Đang lưu…" : "Bắt đầu Journey →"}
            </button>
          </>
        )}
      </footer>
    </section>
  );
}
