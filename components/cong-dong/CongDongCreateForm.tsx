"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Globe,
  ImagePlus,
  Lock,
  MapPin,
  Users,
} from "lucide-react";
import {
  useId,
  useMemo,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";

import { CongDongCategoryPicker } from "@/components/cong-dong/CongDongCategoryPicker";
import type { CongDongCategory } from "@/lib/cong-dong/types";
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
  return cleaned || "cong-dong";
}

type UploadState = {
  imageId: string | null;
  previewUrl: string | null;
  uploading: boolean;
};

export function CongDongCreateForm() {
  const router = useRouter();
  const formId = useId();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [ten, setTen] = useState("");
  const [slugOverride, setSlugOverride] = useState("");
  const [cheDo, setCheDo] = useState<"cong_khai" | "rieng_tu">("cong_khai");
  const [avatar, setAvatar] = useState<UploadState>({
    imageId: null,
    previewUrl: null,
    uploading: false,
  });
  const [cover, setCover] = useState<UploadState>({
    imageId: null,
    previewUrl: null,
    uploading: false,
  });
  const [categories, setCategories] = useState<CongDongCategory[]>([]);

  const slugPreview = slugOverride.trim() || slugifyPreview(ten);

  const cheDoHint = useMemo(
    () =>
      cheDo === "cong_khai"
        ? "Ai cũng xem được trang và bài đăng. Thành viên mới cần bấm Tham gia để đăng bài."
        : "Chỉ thành viên mới xem được nội dung. Phù hợp nhóm nhỏ hoặc đang thử nghiệm.",
    [cheDo],
  );

  async function uploadImage(
    file: File,
    kind: "avatar" | "cover",
    setState: Dispatch<SetStateAction<UploadState>>,
  ) {
    const localPreview = URL.createObjectURL(file);
    setState((s) => ({ ...s, previewUrl: localPreview, uploading: true }));
    const endpoint = kind === "avatar" ? "/api/avatar/upload" : "/api/cover/upload";
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(endpoint, { method: "POST", body: form });
      const json = (await res.json().catch(() => null)) as {
        imageId?: string;
        url?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.imageId) {
        throw new Error(json?.error ?? "Upload ảnh thất bại.");
      }
      setState({
        imageId: json.imageId,
        previewUrl: json.url ?? localPreview,
        uploading: false,
      });
    } catch (uploadErr) {
      URL.revokeObjectURL(localPreview);
      setState({ imageId: null, previewUrl: null, uploading: false });
      throw uploadErr;
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const form = new FormData(e.currentTarget);
    const tenValue = String(form.get("ten") ?? "").trim();
    const slug = String(form.get("slug") ?? "").trim();
    const moTa = String(form.get("mo_ta") ?? "").trim();
    const tinhThanh = String(form.get("tinh_thanh") ?? "").trim();

    startTransition(async () => {
      try {
        const res = await fetch("/api/to-chuc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loai_to_chuc: "cong_dong",
            ten: tenValue,
            slug: slug || undefined,
            mo_ta: moTa || undefined,
            tinh_thanh: tinhThanh || undefined,
            avatar_id: avatar.imageId ?? undefined,
            cover_id: cover.imageId ?? undefined,
            che_do: cheDo,
            danh_muc: categories.map((c) => c.id),
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          redirect?: string;
          slug?: string;
          error?: string;
        } | null;
        if (!res.ok) {
          setErr(json?.error ?? "Không tạo được cộng đồng.");
          return;
        }
        const target = json?.redirect ?? `/cong-dong/${json?.slug ?? ""}`;
        router.push(target);
        router.refresh();
      } catch {
        setErr("Lỗi mạng — thử lại sau.");
      }
    });
  }

  return (
    <div className="cd-create-shell">
      <header className="cd-create-top">
        <Link href="/" className="cd-create-logo" prefetch={false}>
          <span className="cd-create-logo-mark">C</span>
          <span>C.INS</span>
        </Link>
        <Link href="/" className="cd-create-back" prefetch={false}>
          ← Về trang chủ
        </Link>
      </header>

      <main className="cd-create-main">
        <div className="cd-create-intro">
          <p className="cd-create-eyebrow">Cộng đồng nghề</p>
          <h1>Tạo cộng đồng</h1>
          <p className="cd-create-lead">
            Nơi thành viên đăng bài và thảo luận — mỗi người kèm ngữ cảnh nghề
            và hành trình đã verify trên CINs.
          </p>
        </div>

        <form id={formId} className="cd-create-card" onSubmit={onSubmit}>
          {err ? (
            <div className="cd-create-alert" role="alert">
              {err}
            </div>
          ) : null}

          <section className="cd-create-section">
            <h2 className="cd-create-section-title">Hình ảnh</h2>
            <p className="cd-create-section-hint">
              Cover và avatar giúp cộng đồng dễ nhận diện. Có thể bỏ qua và thêm
              sau.
            </p>
            <div className="cd-create-media">
              <label className="cd-create-cover">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="cd-create-file-input"
                  disabled={cover.uploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setErr(null);
                    try {
                      await uploadImage(file, "cover", setCover);
                    } catch (uploadErr) {
                      setErr(
                        uploadErr instanceof Error
                          ? uploadErr.message
                          : "Upload cover lỗi.",
                      );
                    }
                    e.target.value = "";
                  }}
                />
                {cover.previewUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={cover.previewUrl} alt="" className="cd-create-cover-img" />
                ) : (
                  <span className="cd-create-cover-placeholder">
                    <ImagePlus size={22} strokeWidth={1.6} />
                    <span>Thêm ảnh bìa</span>
                    <small>Tỷ lệ ngang, tối đa 5MB</small>
                  </span>
                )}
                {cover.uploading ? (
                  <span className="cd-create-uploading">Đang tải…</span>
                ) : null}
              </label>

              <label className="cd-create-avatar">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="cd-create-file-input"
                  disabled={avatar.uploading}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setErr(null);
                    try {
                      await uploadImage(file, "avatar", setAvatar);
                    } catch (uploadErr) {
                      setErr(
                        uploadErr instanceof Error
                          ? uploadErr.message
                          : "Upload avatar lỗi.",
                      );
                    }
                    e.target.value = "";
                  }}
                />
                {avatar.previewUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatar.previewUrl} alt="" />
                ) : (
                  <span className="cd-create-avatar-placeholder">
                    <Users size={20} strokeWidth={1.6} />
                  </span>
                )}
                <span className="cd-create-avatar-label">Avatar</span>
              </label>
            </div>
          </section>

          <section className="cd-create-section">
            <h2 className="cd-create-section-title">Thông tin cơ bản</h2>
            <div className="cd-create-field">
              <label htmlFor={`${formId}-ten`}>Tên cộng đồng *</label>
              <input
                id={`${formId}-ten`}
                name="ten"
                required
                maxLength={120}
                placeholder="VD: Motion Designer Việt Nam"
                value={ten}
                onChange={(e) => setTen(e.target.value)}
              />
            </div>
            <div className="cd-create-field">
              <label htmlFor={`${formId}-slug`}>
                Đường dẫn
                <span className="cd-create-field-optional">tuỳ chọn</span>
              </label>
              <div className="cd-create-slug-wrap">
                <span className="cd-create-slug-prefix">/cong-dong/</span>
                <input
                  id={`${formId}-slug`}
                  name="slug"
                  maxLength={72}
                  placeholder={slugifyPreview(ten)}
                  value={slugOverride}
                  onChange={(e) => setSlugOverride(e.target.value)}
                />
              </div>
              <p className="cd-create-field-hint">
                Sẽ dùng <code>{slugPreview}</code> nếu để trống.
              </p>
            </div>
            <div className="cd-create-field">
              <label htmlFor={`${formId}-mo-ta`}>Mô tả</label>
              <textarea
                id={`${formId}-mo-ta`}
                name="mo_ta"
                maxLength={500}
                rows={4}
                placeholder="Cộng đồng này dành cho ai? Chia sẻ gì?"
              />
            </div>
          </section>

          <section className="cd-create-section">
            <h2 className="cd-create-section-title">Chủ đề nghề &amp; ngành</h2>
            <p className="cd-create-section-hint">
              Gắn tối đa 4 bài nghề hoặc ngành học — giúp người đọc tìm thấy
              cộng đồng qua các trang đó. Có thể bỏ qua và thêm sau.
            </p>
            <CongDongCategoryPicker
              value={categories}
              onChange={setCategories}
            />
          </section>

          <section className="cd-create-section">
            <h2 className="cd-create-section-title">Vị trí & quyền riêng tư</h2>
            <div className="cd-create-field">
              <label htmlFor={`${formId}-tinh-thanh`}>
                <MapPin size={14} aria-hidden />
                Tỉnh / thành
              </label>
              <select id={`${formId}-tinh-thanh`} name="tinh_thanh" defaultValue="">
                {TINH_THANH_OPTIONS.map((opt) => (
                  <option key={opt.value || "none"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="cd-create-privacy">
              <legend>Chế độ hiển thị</legend>
              <div className="cd-create-privacy-options">
                <label
                  className={`cd-create-privacy-opt${cheDo === "cong_khai" ? " is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="che_do_ui"
                    value="cong_khai"
                    checked={cheDo === "cong_khai"}
                    onChange={() => setCheDo("cong_khai")}
                  />
                  <Globe size={18} strokeWidth={1.6} aria-hidden />
                  <span>
                    <strong>Công khai</strong>
                    <small>Mọi người xem được trang</small>
                  </span>
                </label>
                <label
                  className={`cd-create-privacy-opt${cheDo === "rieng_tu" ? " is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="che_do_ui"
                    value="rieng_tu"
                    checked={cheDo === "rieng_tu"}
                    onChange={() => setCheDo("rieng_tu")}
                  />
                  <Lock size={18} strokeWidth={1.6} aria-hidden />
                  <span>
                    <strong>Riêng tư</strong>
                    <small>Chỉ thành viên xem nội dung</small>
                  </span>
                </label>
              </div>
              <p className="cd-create-field-hint">{cheDoHint}</p>
            </fieldset>
          </section>

          <footer className="cd-create-footer">
            <button type="submit" className="cd-create-submit" disabled={pending}>
              {pending ? "Đang tạo…" : "Tạo cộng đồng"}
            </button>
            <Link href="/" className="cd-create-cancel" prefetch={false}>
              Huỷ
            </Link>
          </footer>
        </form>
      </main>
    </div>
  );
}
