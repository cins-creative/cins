"use client";

import "@/app/cins-feed-composer.css";

import { CirclePlay, Code2, Flag, Image as ImageIcon } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { EmbedPlatformPicker } from "@/components/cins/EmbedPlatformPicker";
import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";
import { imageFilesFromClipboard } from "@/lib/files/clipboard-images";
import { getNameInitials } from "@/lib/journey/profile";
import { useT } from "@/lib/i18n/use-t";

function dataTransferHasFiles(dt: DataTransfer | null): boolean {
  if (!dt) return false;
  return Array.from(dt.types).includes("Files");
}

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
  placeholder,
  showMilestone = true,
  layout = "feed",
}: Props) {
  const t = useT();
  const router = useRouter();
  const ph = placeholder ?? t("gallery.addPost");
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
  const [dragOver, setDragOver] = useState(false);
  const dragDepthRef = useRef(0);

  useEffect(() => {
    if (!embedPickerOpen) return;
    setHasRiveFileDraft(hasComposeEmbedFileDraft("rive"));
    setHasLottieFileDraft(hasComposeEmbedFileDraft("lottie"));
  }, [embedPickerOpen, hasComposeEmbedFileDraft]);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const initials = getNameInitials(ownerName, ownerSlug);

  const clearDragOver = () => {
    dragDepthRef.current = 0;
    setDragOver(false);
  };

  const onComposerDragEnter = (e: DragEvent<HTMLDivElement>) => {
    if (!canCompose || !dataTransferHasFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setDragOver(true);
  };

  const onComposerDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!canCompose || !dataTransferHasFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const onComposerDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!canCompose || !dataTransferHasFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragOver(false);
  };

  const onComposerDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    clearDragOver();
    if (!canCompose) return;
    const files = imageFilesFromClipboard(e.dataTransfer);
    if (files.length === 0) return;
    openComposeWithPhotos(files);
  };

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
      <div
        className={`wj-composer${dragOver ? " is-dragover" : ""}`}
        onDragEnter={onComposerDragEnter}
        onDragOver={onComposerDragOver}
        onDragLeave={onComposerDragLeave}
        onDrop={onComposerDrop}
      >
        {avatar ?? (
          <Link
            href={`/${ownerSlug}`}
            className="wj-av"
            aria-label={`Trang cá nhân @${ownerSlug}`}
            prefetch={false}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" />
            ) : (
              initials
            )}
          </Link>
        )}
        <button
          type="button"
          className="wj-ph"
          onClick={openMinimal}
        >
          {ph}
        </button>
        <div className="wj-composer-icons">
          <button
            type="button"
            className="wj-icon-btn wj-ci-image"
            aria-label={t("gallery.addPhoto")}
            onClick={() => photoInputRef.current?.click()}
          >
            <ImageIcon size={16} />
          </button>
          <button
            type="button"
            className="wj-icon-btn wj-ci-video"
            aria-label={t("gallery.addVideo")}
            onClick={() => videoInputRef.current?.click()}
          >
            <CirclePlay size={16} strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            className="wj-icon-btn wj-ci-embed"
            aria-label={t("composer.embed")}
            title={t("composer.embedHint")}
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
              aria-label={t("composer.addMilestone")}
              title={t("composer.addMilestone")}
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
