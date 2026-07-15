"use client";

import "@/app/cins-feed-composer.css";

import { Code2, Flag, Image as ImageIcon, Video } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { EmbedPlatformPicker } from "@/components/cins/EmbedPlatformPicker";
import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";
import { getNameInitials } from "@/lib/journey/profile";

type Props = {
  ownerSlug?: string;
  ownerName?: string | null;
  avatarUrl?: string | null;
  /** Thay avatar mặc định (vd. TruongOrgAvatar trên timeline org). */
  avatar?: ReactNode;
  placeholder?: string;
  /** Hiện nút cột mốc trong thanh composer (Journey user). */
  showMilestone?: boolean;
  /** `journey` — margin theo timeline; `feed` — World Journey / org. */
  layout?: "journey" | "feed";
};

export function CinsFeedComposer({
  ownerSlug: ownerSlugProp,
  ownerName: ownerNameProp,
  avatarUrl: avatarUrlProp,
  avatar,
  placeholder = "Thêm bài viết",
  showMilestone = true,
  layout = "feed",
}: Props) {
  const router = useRouter();
  const {
    openCompose,
    openComposeWithPhotos,
    openComposeWithVideo,
    openComposeWithEmbed,
    openComposeWithRiveFile,
    openComposeWithLottieFile,
    openComposeEmbedFileDraft,
    hasComposeEmbedFileDraft,
    canCompose,
    ownerSlug: ctxSlug,
    ownerName: ctxName,
    ownerAvatarUrl: ctxAvatar,
  } = useJourneyCompose();

  const ownerSlug = ownerSlugProp || ctxSlug;
  const ownerName = ownerNameProp ?? ctxName;
  const avatarUrl = avatarUrlProp ?? ctxAvatar;

  const [embedPickerOpen, setEmbedPickerOpen] = useState(false);
  const [hasRiveFileDraft, setHasRiveFileDraft] = useState(false);
  const [hasLottieFileDraft, setHasLottieFileDraft] = useState(false);

  useEffect(() => {
    if (!embedPickerOpen) return;
    setHasRiveFileDraft(hasComposeEmbedFileDraft("rive"));
    setHasLottieFileDraft(hasComposeEmbedFileDraft("lottie"));
  }, [embedPickerOpen, hasComposeEmbedFileDraft]);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const initials = getNameInitials(ownerName, ownerSlug);

  const openMinimal = () => {
    if (canCompose) {
      openCompose({ kind: "article", intent: "minimal" });
      return;
    }
    router.push(`/${ownerSlug}/p/new`);
  };

  const openMilestone = () => {
    if (canCompose) {
      openCompose({ kind: "milestone" });
      return;
    }
    router.push(`/${ownerSlug}/journey?compose=milestone`);
  };

  const onPhotoPick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0) return;
    if (canCompose) {
      openComposeWithPhotos(files);
      return;
    }
    router.push(`/${ownerSlug}/p/new/photo`);
  };

  const onVideoPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (canCompose) {
      openComposeWithVideo(file);
      return;
    }
    router.push(`/${ownerSlug}/p/new/video`);
  };

  if (!ownerSlug) return null;
  if (!canCompose && layout === "feed") return null;

  return (
    <div
      className={`cins-feed-composer-row${layout === "journey" ? " cins-feed-composer-row--journey" : ""}`}
    >
      <div className="wj-composer">
        {avatar ?? (
          <div className="wj-av" aria-hidden>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" />
            ) : (
              initials
            )}
          </div>
        )}
        <button
          type="button"
          className="wj-ph"
          onClick={openMinimal}
        >
          {placeholder}
        </button>
        <div className="wj-composer-icons">
          <button
            type="button"
            className="wj-icon-btn wj-ci-image"
            aria-label="Thêm ảnh"
            onClick={() => photoInputRef.current?.click()}
          >
            <ImageIcon size={16} />
          </button>
          <button
            type="button"
            className="wj-icon-btn wj-ci-video"
            aria-label="Thêm video"
            onClick={() => videoInputRef.current?.click()}
          >
            <Video size={16} />
          </button>
          <button
            type="button"
            className="wj-icon-btn wj-ci-embed"
            aria-label="Nhúng tác phẩm"
            title="Nhúng từ YouTube, Sketchfab, Figma…"
            onClick={() => {
              if (canCompose) {
                setEmbedPickerOpen(true);
                return;
              }
              router.push(`/${ownerSlug}/p/new`);
            }}
          >
            <Code2 size={16} strokeWidth={2} aria-hidden />
          </button>
          {showMilestone ? (
            <button
              type="button"
              className="wj-icon-btn wj-ci-milestone"
              aria-label="Thêm cột mốc"
              title="Thêm cột mốc"
              onClick={openMilestone}
            >
              <Flag size={16} strokeWidth={1.9} aria-hidden />
            </button>
          ) : null}
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          hidden
          aria-hidden
          tabIndex={-1}
          onChange={onPhotoPick}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          hidden
          aria-hidden
          tabIndex={-1}
          onChange={onVideoPick}
        />
      </div>
      <EmbedPlatformPicker
        open={embedPickerOpen}
        onClose={() => setEmbedPickerOpen(false)}
        hasRiveFileDraft={hasRiveFileDraft}
        hasLottieFileDraft={hasLottieFileDraft}
        onSelect={(selection) => {
          if (selection.type === "rive-file-resume") {
            if (canCompose) {
              openComposeEmbedFileDraft("rive");
              return;
            }
            router.push(
              `/${ownerSlug}/p/new?compose=embed&platform=rive&source=file`,
            );
            return;
          }
          if (selection.type === "lottie-file-resume") {
            if (canCompose) {
              openComposeEmbedFileDraft("lottie");
              return;
            }
            router.push(
              `/${ownerSlug}/p/new?compose=embed&platform=lottie&source=file`,
            );
            return;
          }
          if (selection.type === "rive-file") {
            if (canCompose) {
              openComposeWithRiveFile(selection.file, {
                replaceDraft: selection.replaceDraft,
              });
              return;
            }
            router.push(
              `/${ownerSlug}/p/new?compose=embed&platform=rive&source=file`,
            );
            return;
          }
          if (selection.type === "lottie-file") {
            if (canCompose) {
              openComposeWithLottieFile(selection.file, {
                replaceDraft: selection.replaceDraft,
              });
              return;
            }
            router.push(
              `/${ownerSlug}/p/new?compose=embed&platform=lottie&source=file`,
            );
            return;
          }
          if (canCompose) {
            openComposeWithEmbed(selection.platform);
            return;
          }
          router.push(
            `/${ownerSlug}/p/new?compose=embed&platform=${selection.platform}`,
          );
        }}
      />
    </div>
  );
}
