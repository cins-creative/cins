"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Link2,
  SlidersHorizontal,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";

import { TaoToChucPageShell } from "@/components/to-chuc/TaoToChucPageShell";
import { LOAI_CO_SO_OPTIONS } from "@/lib/to-chuc/constants";
import {
  CO_SO_DEFAULT_TAB,
  coSoTabPath,
} from "@/lib/to-chuc/co-so-routes";
import { TINH_THANH_OPTIONS } from "@/lib/truong/contact";

function slugifyPreview(value: string): string {
  const cleaned = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return cleaned || "co-so";
}

type FieldErrors = Partial<
  Record<
    "ten" | "slug" | "loai_co_so" | "nam_thanh_lap" | "email_lien_he" | "website",
    string
  >
>;

export function CoSoDaoTaoCreateForm({ userSlug }: { userSlug: string }) {
  const router = useRouter();
  const logoInputId = useId();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<"form" | "success">("form");
  const [globalErr, setGlobalErr] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [ten, setTen] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const slugDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoId, setLogoId] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const slugValue = slug.trim() || slugifyPreview(ten);
  const createdSlugRef = useRef("");

  useEffect(() => {
    if (slugEdited) return;
    setSlug(slugifyPreview(ten));
  }, [ten, slugEdited]);

  const checkSlug = useCallback(async (value: string) => {
    const s = value.trim();
    if (!s) {
      setSlugAvailable(null);
      return;
    }
    setSlugChecking(true);
    try {
      const res = await fetch(`/api/to-chuc/slug?slug=${encodeURIComponent(s)}`);
      const json = (await res.json().catch(() => null)) as {
        available?: boolean;
        error?: string;
      } | null;
      if (!json) {
        setSlugAvailable(null);
        return;
      }
      setSlugAvailable(json.available ?? false);
      if (!json.available && json.error) {
        setFieldErrors((prev) => ({ ...prev, slug: json.error }));
      } else if (json.available) {
        setFieldErrors((prev) => {
          if (!prev.slug) return prev;
          const next = { ...prev };
          delete next.slug;
          return next;
        });
      }
    } finally {
      setSlugChecking(false);
    }
  }, []);

  useEffect(() => {
    if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
    if (!slugValue) {
      setSlugAvailable(null);
      return;
    }
    slugDebounceRef.current = setTimeout(() => {
      checkSlug(slugValue);
    }, 400);
    return () => {
      if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
    };
  }, [slugValue, checkSlug]);

  useEffect(() => {
    if (step !== "success" || !createdSlugRef.current) return;
    const t = setTimeout(() => {
      router.push(coSoTabPath(createdSlugRef.current, CO_SO_DEFAULT_TAB));
      router.refresh();
    }, 1800);
    return () => clearTimeout(t);
  }, [step, router]);

  async function onLogoChange(file: File) {
    const localPreview = URL.createObjectURL(file);
    setLogoPreview(localPreview);
    setLogoUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/avatar/upload", { method: "POST", body: form });
      const json = (await res.json().catch(() => null)) as {
        imageId?: string;
        url?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.imageId) {
        throw new Error(json?.error ?? "Upload logo thất bại.");
      }
      setLogoId(json.imageId);
      if (json.url) setLogoPreview(json.url);
    } catch (e) {
      URL.revokeObjectURL(localPreview);
      setLogoPreview(null);
      setLogoId(null);
      setGlobalErr(e instanceof Error ? e.message : "Upload logo thất bại.");
    } finally {
      setLogoUploading(false);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalErr(null);
    setFieldErrors({});

    const form = new FormData(e.currentTarget);
    const tenValue = String(form.get("ten") ?? "").trim();
    const slugInput = String(form.get("slug") ?? "").trim() || slugifyPreview(tenValue);
    const loaiCoSo = String(form.get("loai_co_so") ?? "").trim();

    if (!tenValue) {
      setFieldErrors({ ten: "Tên cơ sở không được trống." });
      return;
    }
    if (!loaiCoSo) {
      setFieldErrors({ loai_co_so: "Chọn loại cơ sở." });
      return;
    }
    if (slugAvailable === false) {
      setFieldErrors({ slug: "Đường dẫn này đã có người dùng." });
      return;
    }

    startTransition(async () => {
      try {
        const body: Record<string, unknown> = {
          loai_to_chuc: "co_so_dao_tao",
          ten: tenValue,
          slug: slugInput,
          loai_co_so: loaiCoSo,
        };

        const optionalFields: Array<[string, string]> = [
          ["mo_ta", "mo_ta"],
          ["ten_chinh_thuc", "ten_chinh_thuc"],
          ["tinh_thanh", "tinh_thanh"],
          ["dia_chi", "dia_chi"],
          ["dien_thoai", "dien_thoai"],
          ["email_lien_he", "email_lien_he"],
          ["website", "website"],
          ["giay_phep_dao_tao", "giay_phep_dao_tao"],
        ];
        for (const [formKey, jsonKey] of optionalFields) {
          const v = String(form.get(formKey) ?? "").trim();
          if (v) body[jsonKey] = v;
        }

        const nam = String(form.get("nam_thanh_lap") ?? "").trim();
        if (nam) body.nam_thanh_lap = nam;

        if (logoId) body.avatar_id = logoId;

        const res = await fetch("/api/to-chuc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json().catch(() => null)) as {
          redirect?: string;
          slug?: string;
          error?: string;
          field?: FieldErrors extends Record<string, string>
            ? keyof FieldErrors
            : string;
        } | null;

        if (!res.ok) {
          if (json?.field && json.error) {
            setFieldErrors({ [json.field]: json.error } as FieldErrors);
          } else {
            setGlobalErr(json?.error ?? "Không tạo được cơ sở đào tạo.");
          }
          return;
        }

        const finalSlug =
          json?.slug ?? slugInput;
        createdSlugRef.current = finalSlug;
        setStep("success");
      } catch {
        setGlobalErr("Lỗi mạng — thử lại sau.");
      }
    });
  }

  const slugStatusIcon =
    slugChecking || slugAvailable === null
      ? null
      : slugAvailable
        ? <CheckCircle2 size={17} aria-hidden />
        : <XCircle size={17} aria-hidden />;

  if (step === "success") {
    return (
      <TaoToChucPageShell wide cardLabel="Đã tạo cơ sở đào tạo">
        <div className="ttc-success">
          <div className="ttc-success-ico">
            <Check size={34} aria-hidden />
          </div>
          <h3>Đã tạo cơ sở đào tạo</h3>
          <p>
            Trang của bạn đã sẵn sàng nhưng còn trống. Hãy thêm khóa học,
            hình ảnh và bài đăng để hoàn thiện.
          </p>
          <span className="ttc-slug-show">
            <Link2 size={15} aria-hidden />
            cins.vn/co-so/<b>{createdSlugRef.current}</b>
          </span>
          <div className="ttc-redirect">
            <span className="ttc-spin" aria-hidden />
            Đang chuyển tới trang quản lý…
          </div>
        </div>
      </TaoToChucPageShell>
    );
  }

  return (
    <TaoToChucPageShell wide cardLabel="Tạo cơ sở đào tạo">
      <p className="cins-login-eyebrow">@{userSlug} · tạo tổ chức</p>
      <h1 className="cins-login-title">Tạo cơ sở đào tạo</h1>
      <p className="cins-login-sub">
        Chỉ cần vài thông tin để bắt đầu. Phần còn lại bổ sung sau trong
        trang quản lý.
      </p>

      <form className="ttc-form" onSubmit={onSubmit}>
          {globalErr ? (
            <div className="ttc-alert" role="alert">{globalErr}</div>
          ) : null}

          <div className="ttc-field">
            <label className="ttc-lbl" htmlFor="ten">
              Tên cơ sở <span className="ttc-req">*</span>
            </label>
            <input
              id="ten"
              name="ten"
              className={`ttc-inp${fieldErrors.ten ? " is-error" : ""}`}
              placeholder="VD: Sine Art"
              value={ten}
              onChange={(e) => setTen(e.target.value)}
              required
            />
            {fieldErrors.ten ? (
              <p className="ttc-field-err">{fieldErrors.ten}</p>
            ) : (
              <p className="ttc-hint">
                Tên hiển thị công khai. Tên đầy đủ / pháp lý có thể thêm sau.
              </p>
            )}
          </div>

          <div className="ttc-field">
            <label className="ttc-lbl" htmlFor="loai_co_so">
              Loại cơ sở <span className="ttc-req">*</span>
            </label>
            <select
              id="loai_co_so"
              name="loai_co_so"
              className={`ttc-sel${fieldErrors.loai_co_so ? " is-error" : ""}`}
              required
              defaultValue="trung_tam"
            >
              {LOAI_CO_SO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {fieldErrors.loai_co_so ? (
              <p className="ttc-field-err">{fieldErrors.loai_co_so}</p>
            ) : null}
          </div>

          <div className="ttc-field">
            <label className="ttc-lbl" htmlFor="slug">
              Đường dẫn trang <span className="ttc-req">*</span>
            </label>
            <div
              className={`ttc-slug-box${fieldErrors.slug ? " is-error" : ""}`}
            >
              <span className="ttc-slug-pre">cins.vn/co-so/</span>
              <input
                id="slug"
                name="slug"
                className="ttc-inp"
                placeholder="sine-art"
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(e.target.value);
                }}
                required
              />
              {slugStatusIcon ? (
                <span
                  className={`ttc-slug-ok${slugAvailable ? "" : " is-bad"}`}
                  aria-hidden
                >
                  {slugStatusIcon}
                </span>
              ) : null}
            </div>
            {fieldErrors.slug ? (
              <p className="ttc-field-err">{fieldErrors.slug}</p>
            ) : (
              <p className="ttc-hint">
                Tự tạo từ tên, bạn có thể sửa. Không trùng với tổ chức khác.
              </p>
            )}
          </div>

          <details className="ttc-more">
            <summary className="ttc-more-head">
              <span className="ttc-more-ic">
                <SlidersHorizontal size={17} aria-hidden />
              </span>
              <span>
                <div className="ttc-more-title">Bổ sung (tùy chọn)</div>
                <div className="ttc-more-sub">
                  Logo, mô tả, liên hệ, giấy phép — có thể thêm sau
                </div>
              </span>
              <ChevronDown size={18} className="ttc-more-chev" aria-hidden />
            </summary>
            <div className="ttc-more-body">
              <div className="ttc-field" style={{ marginTop: 16 }}>
                <span className="ttc-lbl">
                  Logo <span className="ttc-opt">(tùy chọn)</span>
                </span>
                <div className="ttc-logo-upload">
                  <div className="ttc-logo-preview">
                    {logoPreview ? (
                      <img src={logoPreview} alt="" />
                    ) : (
                      <span>Logo</span>
                    )}
                  </div>
                  <label className="ttc-logo-btn" htmlFor={logoInputId}>
                    {logoUploading ? "Đang tải…" : "Chọn ảnh"}
                    <input
                      id={logoInputId}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onLogoChange(file);
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="ttc-field">
                <label className="ttc-lbl" htmlFor="ten_chinh_thuc">
                  Tên đầy đủ / pháp lý <span className="ttc-opt">(tùy chọn)</span>
                </label>
                <input
                  id="ten_chinh_thuc"
                  name="ten_chinh_thuc"
                  className="ttc-inp"
                  placeholder="VD: Trung tâm đào tạo Mỹ thuật Sine Art"
                />
              </div>

              <div className="ttc-field">
                <label className="ttc-lbl" htmlFor="mo_ta">
                  Mô tả ngắn <span className="ttc-opt">(tùy chọn)</span>
                </label>
                <textarea
                  id="mo_ta"
                  name="mo_ta"
                  className="ttc-txt"
                  placeholder="Một câu giới thiệu cơ sở của bạn"
                />
              </div>

              <div className="ttc-row2">
                <div className="ttc-field">
                  <label className="ttc-lbl" htmlFor="tinh_thanh">
                    Tỉnh / Thành <span className="ttc-opt">(tùy chọn)</span>
                  </label>
                  <select id="tinh_thanh" name="tinh_thanh" className="ttc-sel">
                    {TINH_THANH_OPTIONS.map((o) => (
                      <option key={o.value || "empty"} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ttc-field">
                  <label className="ttc-lbl" htmlFor="nam_thanh_lap">
                    Năm thành lập <span className="ttc-opt">(tùy chọn)</span>
                  </label>
                  <input
                    id="nam_thanh_lap"
                    name="nam_thanh_lap"
                    className={`ttc-inp${fieldErrors.nam_thanh_lap ? " is-error" : ""}`}
                    placeholder="VD: 2018"
                    inputMode="numeric"
                  />
                  {fieldErrors.nam_thanh_lap ? (
                    <p className="ttc-field-err">{fieldErrors.nam_thanh_lap}</p>
                  ) : null}
                </div>
              </div>

              <div className="ttc-field">
                <label className="ttc-lbl" htmlFor="dia_chi">
                  Địa chỉ <span className="ttc-opt">(tùy chọn)</span>
                </label>
                <input
                  id="dia_chi"
                  name="dia_chi"
                  className="ttc-inp"
                  placeholder="Số nhà, đường, phường/xã"
                />
              </div>

              <div className="ttc-row2">
                <div className="ttc-field">
                  <label className="ttc-lbl" htmlFor="dien_thoai">
                    Điện thoại <span className="ttc-opt">(tùy chọn)</span>
                  </label>
                  <input
                    id="dien_thoai"
                    name="dien_thoai"
                    className="ttc-inp"
                    placeholder="028 …"
                  />
                </div>
                <div className="ttc-field">
                  <label className="ttc-lbl" htmlFor="email_lien_he">
                    Email liên hệ <span className="ttc-opt">(tùy chọn)</span>
                  </label>
                  <input
                    id="email_lien_he"
                    name="email_lien_he"
                    className={`ttc-inp${fieldErrors.email_lien_he ? " is-error" : ""}`}
                    placeholder="hello@…"
                  />
                  {fieldErrors.email_lien_he ? (
                    <p className="ttc-field-err">{fieldErrors.email_lien_he}</p>
                  ) : null}
                </div>
              </div>

              <div className="ttc-field">
                <label className="ttc-lbl" htmlFor="website">
                  Website <span className="ttc-opt">(tùy chọn)</span>
                </label>
                <input
                  id="website"
                  name="website"
                  className={`ttc-inp${fieldErrors.website ? " is-error" : ""}`}
                  placeholder="https://…"
                />
                {fieldErrors.website ? (
                  <p className="ttc-field-err">{fieldErrors.website}</p>
                ) : null}
              </div>

              <div className="ttc-field" style={{ marginBottom: 4 }}>
                <label className="ttc-lbl" htmlFor="giay_phep_dao_tao">
                  Giấy phép đào tạo <span className="ttc-opt">(tùy chọn)</span>
                </label>
                <input
                  id="giay_phep_dao_tao"
                  name="giay_phep_dao_tao"
                  className="ttc-inp"
                  placeholder="Số giấy phép / tải lên sau"
                />
                <p className="ttc-hint">
                  Cần để xin huy hiệu &quot;Đã xác thực&quot;. Bỏ trống vẫn tạo
                  được — cơ sở hiển thị trạng thái chưa xác thực.
                </p>
              </div>
            </div>
          </details>

          <div className="ttc-actions">
            <Link href="/tao-to-chuc" className="ttc-btn ttc-btn-ghost" prefetch={false}>
              <ArrowLeft size={17} aria-hidden />
              Quay lại
            </Link>
            <div className="ttc-btn-spacer" />
            <button
              type="submit"
              className="ttc-btn ttc-btn-primary"
              disabled={pending || slugChecking || slugAvailable === false}
            >
              {pending ? "Đang tạo…" : "Tạo cơ sở"}
              <ArrowRight size={17} aria-hidden />
            </button>
          </div>
        </form>
    </TaoToChucPageShell>
  );
}
