"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  AVATAR_DISPLAY_PX,
  AVATAR_VARIANT_PX,
} from "@/lib/cloudflare/cf-image-variants";

type Props = {
  avatarUrl: string | null;
  initials: string;
  alt: string;
};

/** CF variant còn sống — `medium` không có trên Dashboard (403). */
function profileLightboxSrc(url: string): string {
  if (/\/avatar\/?$/i.test(url)) {
    return url.replace(/\/avatar\/?$/i, "/public");
  }
  return url;
}

function imagedeliveryPublicUrl(url: string): string {
  return url.replace(
    /(https:\/\/imagedelivery\.net\/[^/]+\/[^/]+)\/(?:thumbnail|medium|cover|avatar|grid|gridsm)(?=\/|\?|$)/i,
    "$1/public",
  );
}

/**
 * Avatar sidebar khi xem Journey người khác — click mở lightbox phóng to.
 * Không có ảnh → khối tĩnh (initials), không hover.
 */
export function JourneyVisitorAvatar({ avatarUrl, initials, alt }: Props) {
  const [open, setOpen] = useState(false);

  if (!avatarUrl) {
    return (
      <div className="j-avatar">
        <span aria-hidden>{initials}</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="j-avatar j-avatar-viewable"
        onClick={() => setOpen(true)}
        aria-label={`Xem ảnh đại diện của ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={alt}
          width={AVATAR_DISPLAY_PX}
          height={AVATAR_DISPLAY_PX}
          decoding="async"
        />
      </button>

      {open ? (
        <JourneyProfileMediaLightbox
          src={profileLightboxSrc(avatarUrl)}
          alt={alt}
          variant="avatar"
          width={AVATAR_VARIANT_PX}
          height={AVATAR_VARIANT_PX}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

type CoverProps = {
  coverUrl: string | null;
  alt: string;
};

/** Cover sidebar khi xem Journey người khác — click mở lightbox. */
export function JourneyVisitorCover({ coverUrl, alt }: CoverProps) {
  const [open, setOpen] = useState(false);

  if (!coverUrl) {
    return (
      <div className="j-profile-cover" aria-hidden>
        <div className="j-profile-cover-blob" />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="j-profile-cover j-profile-cover-viewable has-img"
        onClick={() => setOpen(true)}
        aria-label={`Xem ảnh bìa của ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverUrl} alt="" className="j-profile-cover-img" />
      </button>

      {open ? (
        <JourneyProfileMediaLightbox
          src={coverUrl}
          alt={alt}
          variant="cover"
          width={1200}
          height={480}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function JourneyProfileMediaLightbox({
  src,
  alt,
  variant,
  width,
  height,
  onClose,
}: {
  src: string;
  alt: string;
  variant: "avatar" | "cover";
  width: number;
  height: number;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="image-lightbox j-profile-media-lightbox"
      aria-label={variant === "avatar" ? "Xem ảnh đại diện" : "Xem ảnh bìa"}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="image-lightbox-inner">
        <button
          type="button"
          className="image-lightbox-close"
          aria-label="Đóng"
          onClick={onClose}
        >
          <X size={22} strokeWidth={2} aria-hidden />
        </button>
        <figure
          className={
            variant === "avatar"
              ? "image-lightbox-figure j-profile-media-lightbox-figure--avatar"
              : "image-lightbox-figure"
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            decoding="async"
            onError={(event) => {
              const img = event.currentTarget;
              const current = img.currentSrc || img.src;
              if (
                /imagedelivery\.net/i.test(current) &&
                img.dataset.cfPublicFallback !== "1"
              ) {
                const next = imagedeliveryPublicUrl(current);
                if (next !== current) {
                  img.dataset.cfPublicFallback = "1";
                  img.src = next;
                }
              }
            }}
          />
        </figure>
      </div>
    </dialog>,
    document.body,
  );
}
