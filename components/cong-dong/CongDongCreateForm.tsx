"use client";

import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  EyeOff,
  Globe,
  ImagePlus,
  Lock,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useId,
  useMemo,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";

import { CongDongTopicPicker } from "@/components/cong-dong/CongDongTopicPicker";
import { TaoToChucPageShell } from "@/components/to-chuc/TaoToChucPageShell";
import type { CongDongCheDo } from "@/lib/cong-dong/constants";
import {
  CONG_DONG_CHE_DO,
  congDongCheDoLabel,
} from "@/lib/cong-dong/constants";
import type {
  CongDongCategory,
  CongDongLinhVuc,
} from "@/lib/cong-dong/types";

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
  const [cheDo, setCheDo] = useState<CongDongCheDo>(CONG_DONG_CHE_DO.CONG_KHAI);
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
  const [linhVucs, setLinhVucs] = useState<CongDongLinhVuc[]>([]);

  const slugPreview = slugOverride.trim() || slugifyPreview(ten);

  const cheDoHint = useMemo(() => {
    switch (cheDo) {
      case CONG_DONG_CHE_DO.NOI_BO:
        return "Ai cũng tìm thấy trang (tên, mô tả). Feed chỉ thành viên — người mới xin tham gia để admin duyệt, hoặc vào qua lời mời.";
      case CONG_DONG_CHE_DO.BI_MAT:
        return "Không hiện trên danh sách. Chỉ thành viên / người có lời mời xem được trang và bài.";
      default:
        return "Ai cũng xem được trang và bài đăng. Thành viên mới cần bấm Tham gia để đăng bài.";
    }
  }, [cheDo]);

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
            avatar_id: avatar.imageId || undefined,
            cover_id: cover.imageId || undefined,
            che_do: cheDo,
            category_article_ids: categories.map((c) => c.id),
            linh_vuc_ids: linhVucs.map((v) => v.id),
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          slug?: string;
          error?: string;
        } | null;
        if (!res.ok || !json?.slug) {
          setErr(json?.error ?? "Không tạo được cộng đồng.");
          return;
        }
        router.push(`/cong-dong/${json.slug}`);
        router.refresh();
      } catch {
        setErr("Lỗi mạng — thử lại sau.");
      }
    });
  }

  return (
    <TaoToChucPageShell wide cardLabel="Tạo cộng đồng">
      <h1 className="cins-login-title">Tạo cộng đồng</h1>
      <p className="cins-login-sub">
        Nơi thành viên đăng bài và thảo luận — mỗi người kèm ngữ cảnh nghề và
        hành trình đã verify trên CINs.
      </p>

      <form id={formId} className="ttc-form" onSubmit={onSubmit}>
        {err ? (
          <div className="ttc-alert" role="alert">
            {err}
          </div>
        ) : null}

        <div className="ttc-field">
          <label className="ttc-lbl" htmlFor={`${formId}-ten`}>
            Tên cộng đồng <span className="ttc-req">*</span>
          </label>
          <input
            id={`${formId}-ten`}
            name="ten"
            className="ttc-inp"
            required
            maxLength={120}
            placeholder="VD: Motion Designer Việt Nam"
            value={ten}
            onChange={(e) => setTen(e.target.value)}
          />
        </div>

        <div className="ttc-field">
          <label className="ttc-lbl" htmlFor={`${formId}-slug`}>
            Đường dẫn <span className="ttc-opt">(tuỳ chọn)</span>
          </label>
          <div className="ttc-slug-box">
            <span className="ttc-slug-pre">cins.vn/cong-dong/</span>
            <input
              id={`${formId}-slug`}
              name="slug"
              className="ttc-inp"
              maxLength={72}
              placeholder={slugifyPreview(ten)}
              value={slugOverride}
              onChange={(e) => setSlugOverride(e.target.value)}
            />
          </div>
          <p className="ttc-hint">
            Sẽ dùng <strong>{slugPreview}</strong> nếu để trống.
          </p>
        </div>

        <div className="ttc-field">
          <label className="ttc-lbl" htmlFor={`${formId}-mo-ta`}>
            Mô tả <span className="ttc-opt">(tuỳ chọn)</span>
          </label>
          <textarea
            id={`${formId}-mo-ta`}
            name="mo_ta"
            className="ttc-txt"
            maxLength={500}
            rows={3}
            placeholder="Cộng đồng này dành cho ai? Chia sẻ gì?"
          />
        </div>

        <div className="ttc-field">
          <span className="ttc-lbl">Chế độ hiển thị</span>
          <div className="ttc-privacy-options" role="radiogroup" aria-label="Chế độ hiển thị">
            <label
              className={`ttc-privacy-opt${cheDo === CONG_DONG_CHE_DO.CONG_KHAI ? " is-selected" : ""}`}
            >
              <input
                type="radio"
                name="che_do_ui"
                value={CONG_DONG_CHE_DO.CONG_KHAI}
                checked={cheDo === CONG_DONG_CHE_DO.CONG_KHAI}
                onChange={() => setCheDo(CONG_DONG_CHE_DO.CONG_KHAI)}
              />
              <Globe size={18} strokeWidth={1.6} aria-hidden />
              <span>
                <strong>{congDongCheDoLabel(CONG_DONG_CHE_DO.CONG_KHAI)}</strong>
                <small>Tìm thấy · xem bài · tham gia ngay</small>
              </span>
            </label>
            <label
              className={`ttc-privacy-opt${cheDo === CONG_DONG_CHE_DO.NOI_BO ? " is-selected" : ""}`}
            >
              <input
                type="radio"
                name="che_do_ui"
                value={CONG_DONG_CHE_DO.NOI_BO}
                checked={cheDo === CONG_DONG_CHE_DO.NOI_BO}
                onChange={() => setCheDo(CONG_DONG_CHE_DO.NOI_BO)}
              />
              <Lock size={18} strokeWidth={1.6} aria-hidden />
              <span>
                <strong>{congDongCheDoLabel(CONG_DONG_CHE_DO.NOI_BO)}</strong>
                <small>Tìm thấy · feed khóa · xin duyệt</small>
              </span>
            </label>
            <label
              className={`ttc-privacy-opt${cheDo === CONG_DONG_CHE_DO.BI_MAT ? " is-selected" : ""}`}
            >
              <input
                type="radio"
                name="che_do_ui"
                value={CONG_DONG_CHE_DO.BI_MAT}
                checked={cheDo === CONG_DONG_CHE_DO.BI_MAT}
                onChange={() => setCheDo(CONG_DONG_CHE_DO.BI_MAT)}
              />
              <EyeOff size={18} strokeWidth={1.6} aria-hidden />
              <span>
                <strong>{congDongCheDoLabel(CONG_DONG_CHE_DO.BI_MAT)}</strong>
                <small>Ẩn danh sách · chỉ lời mời</small>
              </span>
            </label>
          </div>
          <p className="ttc-hint">{cheDoHint}</p>
        </div>

        <div className="ttc-field">
          <span className="ttc-lbl">
            Lĩnh vực &amp; ngành <span className="ttc-opt">(tuỳ chọn)</span>
          </span>
          <p className="ttc-hint" style={{ marginTop: 0, marginBottom: 10 }}>
            Giúp phân bổ cộng đồng của bạn đến đúng người cần quan tâm
          </p>
          <CongDongTopicPicker
            linhVucs={linhVucs}
            onLinhVucsChange={setLinhVucs}
            nganhs={categories}
            onNganhsChange={setCategories}
          />
        </div>

        <details className="ttc-more">
          <summary className="ttc-more-head">
            <span className="ttc-more-ic">
              <SlidersHorizontal size={17} aria-hidden />
            </span>
            <span>
              <div className="ttc-more-title">Hình ảnh (tuỳ chọn)</div>
              <div className="ttc-more-sub">
                Cover và avatar — có thể thêm sau
              </div>
            </span>
            <ChevronDown size={18} className="ttc-more-chev" aria-hidden />
          </summary>
          <div className="ttc-more-body">
            <div className="ttc-field" style={{ marginTop: 16 }}>
              <span className="ttc-lbl">Ảnh bìa</span>
              <label className="ttc-cover-upload">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="ttc-file-input"
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
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover.previewUrl} alt="" />
                ) : (
                  <span className="ttc-cover-placeholder">
                    <ImagePlus size={20} strokeWidth={1.6} aria-hidden />
                    <span>{cover.uploading ? "Đang tải…" : "Thêm ảnh bìa"}</span>
                  </span>
                )}
              </label>
            </div>

            <div className="ttc-field">
              <span className="ttc-lbl">Avatar</span>
              <div className="ttc-logo-upload">
                <div className="ttc-logo-preview">
                  {avatar.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar.previewUrl} alt="" />
                  ) : (
                    <Users size={18} strokeWidth={1.6} aria-hidden />
                  )}
                </div>
                <label className="ttc-logo-btn">
                  {avatar.uploading ? "Đang tải…" : "Chọn ảnh"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
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
                </label>
              </div>
            </div>
          </div>
        </details>

        <div className="ttc-actions">
          <Link href="/cong-dong" className="ttc-btn ttc-btn-ghost" prefetch={false}>
            <ArrowLeft size={17} aria-hidden />
            Quay lại
          </Link>
          <div className="ttc-btn-spacer" />
          <button
            type="submit"
            className="ttc-btn ttc-btn-primary"
            disabled={pending}
          >
            {pending ? "Đang tạo…" : "Tạo cộng đồng"}
            <ArrowRight size={17} aria-hidden />
          </button>
        </div>
      </form>
    </TaoToChucPageShell>
  );
}
