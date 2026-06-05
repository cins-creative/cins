"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  ImagePlus,
  Loader2,
  Lock,
  Star,
  Trash2,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type DragEvent,
} from "react";

import { publishPost } from "@/app/[slug]/p/new/actions";
import { updatePost } from "@/app/[slug]/p/[postSlug]/edit/actions";
import { rememberCfAccountHashFromDeliveryUrl } from "@/lib/cloudflare/account-hash";
import { ImageGrid } from "@/components/journey/ImageGrid";
import type { Block, Visibility } from "@/lib/editor/types";
import {
  GRID_IMAGE_DEFAULT_HEIGHT,
  GRID_IMAGE_DEFAULT_WIDTH,
  gridThumbSrc,
  type GridImage,
} from "@/lib/journey/image-grid";
import {
  deriveMediaPostTitle,
  type MediaEditInitial,
} from "@/lib/journey/post-media";
import { getAvatarUrl } from "@/lib/journey/profile";

export type MediaComposeMode = "photo" | "video";

export type { MediaEditInitial };

type Props = {
  mode: MediaComposeMode;
  ownerSlug: string;
  ownerName: string;
  ownerAvatarId?: string | null;
  presentation?: "page" | "overlay";
  /** Chỉnh sửa bài ảnh/video đã đăng — cùng UI với tạo mới. */
  editInitial?: MediaEditInitial | null;
  onClose?: () => void;
  onPublished?: () => void;
};

type PhotoItem = {
  localId: string;
  previewUrl: string;
  imageId: string | null;
  uploading: boolean;
  error?: string;
};

const VIS_OPTIONS: ReadonlyArray<{
  value: Visibility;
  label: string;
  Icon: LucideIcon;
}> = [
  { value: "feature", label: "Nổi bật", Icon: Star },
  { value: "public", label: "Công khai", Icon: Globe },
  { value: "theo_nhom", label: "Theo nhóm", Icon: Users },
  { value: "chi_minh", label: "Chỉ mình tôi", Icon: Lock },
];

const MAX_PHOTOS = 10;

function isValidVideoUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  return (
    u.includes("youtube.com/") ||
    u.includes("youtu.be/") ||
    u.includes("vimeo.com/")
  );
}

function newBlockId(): string {
  return `b-${crypto.randomUUID()}`;
}

function photoItemsFromIds(imageIds: string[]): PhotoItem[] {
  return imageIds.map((imageId) => ({
    localId: imageId,
    imageId,
    previewUrl: gridThumbSrc({
      id: imageId,
      width: GRID_IMAGE_DEFAULT_WIDTH,
      height: GRID_IMAGE_DEFAULT_HEIGHT,
    }),
    uploading: false,
  }));
}

export function MediaComposeView({
  mode,
  ownerSlug,
  ownerName,
  ownerAvatarId,
  presentation = "page",
  editInitial = null,
  onClose,
  onPublished,
}: Props) {
  const router = useRouter();
  const isEdit = !!editInitial;
  const isOverlay = presentation === "overlay";
  const [caption, setCaption] = useState(editInitial?.caption ?? "");
  const [videoUrl, setVideoUrl] = useState(editInitial?.videoUrl ?? "");
  const [photos, setPhotos] = useState<PhotoItem[]>(() =>
    editInitial?.photoImageIds?.length
      ? photoItemsFromIds(editInitial.photoImageIds)
      : [],
  );
  const [vis, setVis] = useState<Visibility>(
    editInitial?.visibility ?? "public",
  );
  const [visOpen, setVisOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const visRef = useRef<HTMLDivElement | null>(null);
  const avatarUrl = getAvatarUrl(ownerAvatarId ?? null);

  const isPhoto = mode === "photo";
  const pageTitle = isEdit
    ? isPhoto
      ? "Sửa ảnh"
      : "Sửa video"
    : isPhoto
      ? "Thêm ảnh"
      : "Thêm video";
  const publishLabel = isEdit ? "Lưu" : "Đăng";
  /* Huỷ → journey (không link `/p/slug` — intercept modal sẽ mở popup thay vì thoát edit). */
  const cancelHref = `/${ownerSlug}`;

  useEffect(() => {
    if (!visOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!visRef.current?.contains(e.target as Node)) setVisOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [visOpen]);

  useEffect(() => {
    return () => {
      for (const p of photos) {
        if (p.previewUrl.startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
      }
    };
  }, [photos]);

  const gridImages = useMemo<GridImage[]>(
    () =>
      photos.map((p) => ({
        id: p.imageId ?? p.localId,
        previewSrc: p.previewUrl,
        width: GRID_IMAGE_DEFAULT_WIDTH,
        height: GRID_IMAGE_DEFAULT_HEIGHT,
      })),
    [photos],
  );

  const uploadingSlots = useMemo(() => {
    const set = new Set<number>();
    photos.forEach((p, i) => {
      if (p.uploading) set.add(i);
    });
    return set;
  }, [photos]);

  const uploadPhoto = useCallback(async (file: File, localId: string) => {
    if (!file.type.startsWith("image/")) {
      setPhotos((prev) =>
        prev.map((p) =>
          p.localId === localId
            ? { ...p, uploading: false, error: "File không phải ảnh." }
            : p,
        ),
      );
      return;
    }

    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/post-image/upload", { method: "POST", body: form });
      const data = (await res.json()) as { imageId?: string; url?: string; error?: string };
      if (!res.ok || !data.imageId) {
        throw new Error(data.error || "Upload thất bại.");
      }
      if (data.url) rememberCfAccountHashFromDeliveryUrl(data.url);
      setPhotos((prev) =>
        prev.map((p) =>
          p.localId === localId
            ? { ...p, imageId: data.imageId!, uploading: false, error: undefined }
            : p,
        ),
      );
    } catch (e) {
      setPhotos((prev) =>
        prev.map((p) =>
          p.localId === localId
            ? {
                ...p,
                uploading: false,
                error: e instanceof Error ? e.message : "Upload thất bại.",
              }
            : p,
        ),
      );
    }
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (list.length === 0) return;

      setPhotos((prev) => {
        const room = MAX_PHOTOS - prev.length;
        const batch = list.slice(0, room);
        const next = [...prev];

        for (const file of batch) {
          const localId = crypto.randomUUID();
          const previewUrl = URL.createObjectURL(file);
          next.push({ localId, previewUrl, imageId: null, uploading: true });
          void uploadPhoto(file, localId);
        }
        return next;
      });
    },
    [uploadPhoto],
  );

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const photosReady =
    photos.length > 0 && photos.every((p) => p.imageId && !p.uploading && !p.error);
  const canPublish = isPhoto
    ? photosReady
    : isValidVideoUrl(videoUrl) && !isPending;

  const onPublish = () => {
    setError(null);
    startTransition(async () => {
      const blocks: Block[] = [];
      const trimmedCaption = caption.trim();

      if (trimmedCaption) {
        blocks.push({
          id: newBlockId(),
          loai: "body",
          thu_tu: blocks.length,
          config: { html: trimmedCaption.slice(0, 8000) },
        });
      }

      if (isPhoto) {
        const imageIds = photos
          .map((p) => p.imageId)
          .filter((id): id is string => Boolean(id));
        if (imageIds.length === 0) {
          setError("Cần ít nhất một ảnh.");
          return;
        }

        /* Mỗi ảnh = 1 block — gom thành Facebook grid lúc render. */
        for (const imageId of imageIds) {
          blocks.push({
            id: newBlockId(),
            loai: "imgs",
            thu_tu: blocks.length,
            config: {
              layout: "full",
              rounded: false,
              cap: "",
              imgs: [imageId],
            },
          });
        }
      } else {
        blocks.push({
          id: newBlockId(),
          loai: "embed",
          thu_tu: blocks.length,
          config: { url: videoUrl.trim().slice(0, 2048) },
        });
      }

      const tieuDe = deriveMediaPostTitle(
        trimmedCaption,
        isPhoto ? "photo" : "video",
      );

      const res =
        isEdit && editInitial
          ? await updatePost({
              ownerSlug,
              tacPhamId: editInitial.tacPhamId,
              cotMocId: editInitial.cotMocId,
              tieuDe,
              moTa: trimmedCaption.slice(0, 280),
              coverSeed: null,
              tags: [],
              visibility: vis,
              loaiMoc: editInitial.loaiMoc,
              thoiDiem: editInitial.thoiDiem,
              blocks,
            })
          : await publishPost({
              ownerSlug,
              tieuDe,
              moTa: trimmedCaption.slice(0, 280),
              coverSeed: null,
              tags: [],
              visibility: vis,
              loaiMoc: "ca_nhan",
              thoiDiem: new Date().toISOString().slice(0, 10),
              blocks,
            });

      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (isOverlay && onPublished) {
        onPublished();
        return;
      }
      if (isEdit && editInitial) {
        router.push(`/${ownerSlug}/p/${editInitial.postSlug}`);
      } else if (!isEdit && "slug" in res && res.slug) {
        router.push(`/${ownerSlug}/p/${res.slug}`);
      } else {
        router.push(`/${ownerSlug}`);
      }
      router.refresh();
    });
  };

  const visCurrent = VIS_OPTIONS.find((o) => o.value === vis) ?? VIS_OPTIONS[1];

  return (
    <div className={`cins-editor-page mc-compose-page${isOverlay ? " is-overlay" : ""}`}>
      <header className="ed-topbar">
        <div className="ed-topbar-inner">
          {isOverlay && onClose ? (
            <button type="button" className="mc-compose-back" onClick={onClose}>
              <ArrowLeft size={18} strokeWidth={1.8} aria-hidden />
              <span>Hủy</span>
            </button>
          ) : (
            <Link href={cancelHref} className="mc-compose-back" prefetch={false}>
              <ArrowLeft size={18} strokeWidth={1.8} aria-hidden />
              <span>Hủy</span>
            </Link>
          )}
          <div className="mc-compose-top-title">{pageTitle}</div>
          <div className="mc-compose-top-actions">
            <div className="mc-compose-vis" ref={visRef}>
              <button
                type="button"
                className="mc-compose-vis-btn"
                aria-expanded={visOpen}
                onClick={() => setVisOpen((v) => !v)}
              >
                <visCurrent.Icon size={14} strokeWidth={1.8} aria-hidden />
                <span>{visCurrent.label}</span>
              </button>
              {visOpen ? (
                <div className="mc-compose-vis-menu" role="menu">
                  {VIS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="menuitem"
                      className={`mc-compose-vis-opt${opt.value === vis ? " is-active" : ""}`}
                      onClick={() => {
                        setVis(opt.value);
                        setVisOpen(false);
                      }}
                    >
                      <opt.Icon size={14} strokeWidth={1.8} aria-hidden />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="ed-btn primary mc-compose-publish"
              disabled={!canPublish}
              onClick={onPublish}
            >
              {isPending ? (
                <Loader2 size={16} strokeWidth={2} className="mc-spin" aria-hidden />
              ) : null}
              {publishLabel}
            </button>
          </div>
        </div>
      </header>

      <main className="mc-compose-main">
        <div className="mc-compose-card">
          <div className="mc-compose-author">
            <span className="mc-compose-author-ava" aria-hidden>
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={avatarUrl} alt="" />
              ) : (
                ownerName.slice(0, 1).toUpperCase()
              )}
            </span>
            <div>
              <strong>{ownerName}</strong>
              <span>{visCurrent.label}</span>
            </div>
          </div>

          <textarea
            className="mc-compose-caption"
            placeholder={
              isPhoto
                ? "Viết gì đó về những bức ảnh này…"
                : "Viết gì đó về video này…"
            }
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
          />

          {isPhoto ? (
            <>
              {photos.length > 0 ? (
                <ImageGrid
                  images={gridImages}
                  isFirstGroup
                  uploadingSlots={uploadingSlots}
                />
              ) : null}

              {photos.length < MAX_PHOTOS ? (
                <div
                  className="mc-photo-drop"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <ImagePlus size={28} strokeWidth={1.6} aria-hidden />
                  <strong>Thêm ảnh</strong>
                  <span>
                    Kéo thả hoặc bấm để chọn — layout tự động theo số ảnh (tối đa{" "}
                    {MAX_PHOTOS})
                  </span>
                </div>
              ) : null}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={onFileChange}
              />
            </>
          ) : (
            <div className="mc-video-field">
              <label className="mc-video-label" htmlFor="mc-video-url">
                <Video size={18} strokeWidth={1.8} aria-hidden />
                Link video (YouTube hoặc Vimeo)
              </label>
              <input
                id="mc-video-url"
                type="url"
                className="mc-video-input"
                placeholder="https://www.youtube.com/watch?v=…"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              {videoUrl.trim() && !isValidVideoUrl(videoUrl) ? (
                <p className="mc-compose-error">Chỉ hỗ trợ link YouTube hoặc Vimeo.</p>
              ) : null}
            </div>
          )}

          {error ? <p className="mc-compose-error">{error}</p> : null}
        </div>

        {isPhoto && photos.length > 0 ? (
          <div className="mc-compose-toolbar">
            <button
              type="button"
              className="mc-compose-toolbar-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={photos.length >= MAX_PHOTOS}
            >
              <ImagePlus size={16} strokeWidth={1.8} aria-hidden />
              Thêm ảnh
            </button>
            <button
              type="button"
              className="mc-compose-toolbar-btn mc-compose-toolbar-btn--danger"
              onClick={() => {
                setPhotos((prev) => {
                  for (const p of prev) {
                    if (p.previewUrl.startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
                  }
                  return [];
                });
              }}
            >
              <Trash2 size={16} strokeWidth={1.8} aria-hidden />
              Xóa tất cả
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
