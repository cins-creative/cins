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

import { CongDongFeedFilterDropdown } from "@/components/cong-dong/CongDongFeedFilterDropdown";
import { PostTagFields } from "@/components/tag/PostTagFields";
import type { ArticleTagRef } from "@/lib/editor/article-tag";
import { publishPost } from "@/app/[slug]/p/new/actions";
import { updatePost } from "@/app/[slug]/p/[postSlug]/edit/actions";
import { rememberCfAccountHashFromDeliveryUrl } from "@/lib/cloudflare/account-hash";
import { ImageGrid } from "@/components/journey/ImageGrid";
import { bunnyIframeSrc, classifyBunnyVideoUrl } from "@/lib/bunny/embed";
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
import { isValidMediaVideoUrl } from "@/lib/journey/video-url";
import {
  registerVideoUpload,
  releaseVideoUpload,
} from "@/lib/journey/video-upload-session";
import type { CongDongComposeConfig } from "@/lib/cong-dong/types";

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
  /** Ảnh đã chọn trước khi mở overlay (từ nút Thêm ảnh trên timeline). */
  initialPhotoFiles?: File[];
  /** Video đã chọn trước khi mở overlay (từ nút Thêm video trên timeline). */
  initialVideoFile?: File;
  /** Mở hộp chọn file ngay khi mount (trang /p/new/photo hoặc /p/new/video). */
  autoOpenFilePicker?: boolean;
  congDongCompose?: CongDongComposeConfig;
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
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

type BunnyPrepareResponse = {
  videoId: string;
  libraryId: string;
  embedUrl: string;
  authorizationSignature: string;
  authorizationExpire: number;
  error?: string;
};

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
  initialPhotoFiles,
  initialVideoFile,
  autoOpenFilePicker = false,
  congDongCompose,
  onClose,
  onPublished,
}: Props) {
  const router = useRouter();
  const isEdit = !!editInitial;
  const isOverlay = presentation === "overlay";
  const [caption, setCaption] = useState(editInitial?.caption ?? "");
  const [videoUrl, setVideoUrl] = useState(editInitial?.videoUrl ?? "");
  const [bunnyVideoId, setBunnyVideoId] = useState<string | null>(() => {
    if (!editInitial?.videoUrl) return null;
    return classifyBunnyVideoUrl(editInitial.videoUrl)?.videoId ?? null;
  });
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [localVideoPreviewUrl, setLocalVideoPreviewUrl] = useState<string | null>(
    null,
  );
  const [photos, setPhotos] = useState<PhotoItem[]>(() =>
    editInitial?.photoImageIds?.length
      ? photoItemsFromIds(editInitial.photoImageIds)
      : [],
  );
  const [tags, setTags] = useState<ArticleTagRef[]>([]);
  const [vis, setVis] = useState<Visibility>(
    editInitial?.visibility ?? "public",
  );
  const [visOpen, setVisOpen] = useState(false);
  const sortedCongDongFilters = useMemo(
    () =>
      [...(congDongCompose?.filters ?? [])].sort(
        (a, b) => a.thuTu - b.thuTu || a.ten.localeCompare(b.ten, "vi"),
      ),
    [congDongCompose?.filters],
  );
  const [composeFilterSlugs, setComposeFilterSlugs] = useState<string[]>(() => {
    const first = sortedCongDongFilters[0]?.slug;
    return first ? [first] : [];
  });
  const publishVisibility: Visibility = congDongCompose ? "public" : vis;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const visRef = useRef<HTMLDivElement | null>(null);
  const uploadLockRef = useRef(false);
  const uploadSessionRef = useRef(0);
  const activeUploadRef = useRef<InstanceType<
    typeof import("tus-js-client").Upload
  > | null>(null);
  const pendingBunnyRef = useRef<{ videoId: string; embedUrl: string } | null>(
    null,
  );
  const initialVideoStartedRef = useRef(false);
  const avatarUrl = getAvatarUrl(ownerAvatarId ?? null);
  const bunnyPreview = useMemo(
    () => (videoUrl ? classifyBunnyVideoUrl(videoUrl) : null),
    [videoUrl],
  );

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
      if (localVideoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(localVideoPreviewUrl);
      }
    };
  }, [photos, localVideoPreviewUrl]);

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

  const abortActiveVideoUpload = useCallback(() => {
    activeUploadRef.current?.abort();
    activeUploadRef.current = null;
    const pending = pendingBunnyRef.current;
    if (pending) {
      releaseVideoUpload(pending.videoId);
      pendingBunnyRef.current = null;
    }
  }, []);

  const uploadVideoFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/")) {
        setVideoUploadError("File không phải video.");
        return;
      }
      if (file.size > MAX_VIDEO_BYTES) {
        setVideoUploadError("Video quá lớn (giới hạn 500MB).");
        return;
      }

      const session = ++uploadSessionRef.current;
      abortActiveVideoUpload();
      uploadLockRef.current = true;

      setVideoUploading(true);
      setVideoUploadError(null);
      setError(null);
      setVideoUrl("");
      setBunnyVideoId(null);
      setLocalVideoPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });

      try {
        const prepRes = await fetch("/api/post-video/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: file.name }),
        });
        const prep = (await prepRes.json()) as BunnyPrepareResponse;
        if (session !== uploadSessionRef.current) return;
        if (
          !prepRes.ok ||
          !prep.embedUrl ||
          !prep.videoId ||
          !prep.libraryId ||
          !prep.authorizationSignature
        ) {
          throw new Error(prep.error || "Không chuẩn bị được upload video.");
        }

        pendingBunnyRef.current = {
          videoId: prep.videoId,
          embedUrl: prep.embedUrl,
        };

        const { Upload } = await import("tus-js-client");
        if (session !== uploadSessionRef.current) return;
        const upload = new Upload(file, {
          endpoint: "https://video.bunnycdn.com/tusupload",
          retryDelays: [0, 1000, 3000, 5000, 10000],
          headers: {
            AuthorizationSignature: prep.authorizationSignature,
            AuthorizationExpire: String(prep.authorizationExpire),
            VideoId: prep.videoId,
            LibraryId: String(prep.libraryId),
          },
          metadata: {
            filetype: file.type,
            title: file.name,
          },
          onError: (err) => {
            if (session !== uploadSessionRef.current) return;
            releaseVideoUpload(prep.videoId);
            pendingBunnyRef.current = null;
            activeUploadRef.current = null;
            uploadLockRef.current = false;
            setVideoUploading(false);
            setVideoUploadError(
              err instanceof Error ? err.message : "Upload video thất bại.",
            );
          },
          onSuccess: () => {
            if (session !== uploadSessionRef.current) return;
            releaseVideoUpload(prep.videoId);
            pendingBunnyRef.current = null;
            activeUploadRef.current = null;
            uploadLockRef.current = false;
            setVideoUrl(prep.embedUrl);
            setBunnyVideoId(prep.videoId);
            setVideoUploading(false);
            setLocalVideoPreviewUrl((prev) => {
              if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
              return null;
            });
          },
        });

        activeUploadRef.current = upload;
        registerVideoUpload(prep.videoId, upload);
        upload.start();
      } catch (e) {
        if (session !== uploadSessionRef.current) return;
        pendingBunnyRef.current = null;
        activeUploadRef.current = null;
        uploadLockRef.current = false;
        setVideoUploadError(
          e instanceof Error ? e.message : "Upload video thất bại.",
        );
        setVideoUploading(false);
      }
    },
    [abortActiveVideoUpload],
  );

  useEffect(() => {
    if (!initialPhotoFiles?.length || isEdit) return;
    addFiles(initialPhotoFiles);
  }, [initialPhotoFiles, isEdit, addFiles]);

  useEffect(() => {
    if (!initialVideoFile || isEdit || initialVideoStartedRef.current) return;
    initialVideoStartedRef.current = true;
    void uploadVideoFile(initialVideoFile);
  }, [initialVideoFile, isEdit, uploadVideoFile]);

  useEffect(() => {
    if (
      !autoOpenFilePicker ||
      isEdit ||
      initialPhotoFiles?.length ||
      initialVideoFile
    ) {
      return;
    }
    if (isPhoto && photos.length === 0) {
      fileInputRef.current?.click();
      return;
    }
    if (!isPhoto && !videoUrl && !videoUploading) {
      videoFileInputRef.current?.click();
    }
  }, [
    autoOpenFilePicker,
    isPhoto,
    isEdit,
    initialPhotoFiles,
    initialVideoFile,
    photos.length,
    videoUrl,
    videoUploading,
  ]);

  const onVideoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadVideoFile(file);
  };

  const onVideoDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadVideoFile(file);
  };

  const clearVideo = () => {
    abortActiveVideoUpload();
    if (bunnyVideoId) releaseVideoUpload(bunnyVideoId);
    uploadLockRef.current = false;
    initialVideoStartedRef.current = false;
    setVideoUrl("");
    setBunnyVideoId(null);
    setVideoUploadError(null);
    setVideoUploading(false);
    setLocalVideoPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
  };

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
    : isValidMediaVideoUrl(videoUrl) && !videoUploading && !isPending;

  const onPublish = () => {
    setError(null);
    if (congDongCompose && composeFilterSlugs.length === 0) {
      setError("Chọn loại bài đăng trước khi đăng.");
      return;
    }
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
        const trimmedUrl = videoUrl.trim().slice(0, 2048);
        const bunny = classifyBunnyVideoUrl(trimmedUrl);

        blocks.push({
          id: newBlockId(),
          loai: "embed",
          thu_tu: blocks.length,
          config: {
            url: trimmedUrl,
            ...(bunny
              ? {
                  bunnyVideoId: bunny.videoId,
                  ...(!isEdit ? { videoProcessing: true } : {}),
                }
              : {}),
          },
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
              tags,
              visibility: publishVisibility,
              loaiMoc: editInitial.loaiMoc,
              thoiDiem: editInitial.thoiDiem,
              blocks,
            })
          : await publishPost({
              ownerSlug,
              tieuDe,
              moTa: trimmedCaption.slice(0, 280),
              coverSeed: null,
              tags,
              visibility: publishVisibility,
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
            {congDongCompose ? (
              <CongDongFeedFilterDropdown
                filters={sortedCongDongFilters}
                activeFilterSlugs={composeFilterSlugs}
                onChange={setComposeFilterSlugs}
                variant="compose"
                className="cd-v4-filter-dd--editor"
                menuZIndex={9200}
              />
            ) : (
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
            )}
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

          {!congDongCompose ? (
            <PostTagFields
              tags={tags}
              onChange={setTags}
              disabled={isPending}
            />
          ) : null}

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
            <>
              {localVideoPreviewUrl ? (
                <div className="mc-video-preview mc-video-preview--local">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video src={localVideoPreviewUrl} controls playsInline />
                  {videoUploading ? (
                    <div className="mc-video-uploading" aria-live="polite">
                      <Loader2 size={18} strokeWidth={2} className="mc-spin" aria-hidden />
                      <span>Đang tải video lên…</span>
                    </div>
                  ) : null}
                </div>
              ) : bunnyPreview ? (
                <div className="mc-video-preview">
                  <iframe
                    src={bunnyIframeSrc(bunnyPreview)}
                    title="Xem trước video"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowFullScreen
                  />
                </div>
              ) : null}

              {!videoUrl && !videoUploading ? (
                <div
                  className="mc-video-drop"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onVideoDrop}
                  onClick={() => videoFileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      videoFileInputRef.current?.click();
                    }
                  }}
                >
                  <Video size={28} strokeWidth={1.6} aria-hidden />
                  <strong>Chọn video</strong>
                  <span>Kéo thả hoặc bấm để chọn — MP4, MOV, WebM (tối đa 500MB)</span>
                </div>
              ) : null}

              <input
                ref={videoFileInputRef}
                type="file"
                accept="video/*"
                hidden
                onChange={onVideoFileChange}
              />

              {videoUploadError ? (
                <p className="mc-compose-error">{videoUploadError}</p>
              ) : null}
            </>
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

        {!isPhoto && (videoUrl || localVideoPreviewUrl) ? (
          <div className="mc-compose-toolbar">
            <button
              type="button"
              className="mc-compose-toolbar-btn"
              onClick={() => videoFileInputRef.current?.click()}
            >
              <Video size={16} strokeWidth={1.8} aria-hidden />
              Đổi video
            </button>
            <button
              type="button"
              className="mc-compose-toolbar-btn mc-compose-toolbar-btn--danger"
              onClick={clearVideo}
            >
              <Trash2 size={16} strokeWidth={1.8} aria-hidden />
              Xóa video
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
