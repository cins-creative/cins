"use client";

import { Users } from "lucide-react";
import { useCallback, useEffect, useState, type MouseEvent } from "react";

import { ChatGroupInviteDialog } from "@/components/cins/ChatGroupInviteClient";
import { JourneyCoverImage } from "@/components/journey/JourneyCoverImage";
import {
  isGroupInviteUrl,
  parseGroupInviteCodeFromUrl,
} from "@/lib/chat/group-invite-path";
import type { LinkOgPreview } from "@/lib/link/og-preview";

type Props = {
  url: string;
  /** Bubble "is-me" — tông màu nhạt hơn trên nền xanh. */
  tone?: "me" | "them";
};

const clientCache = new Map<string, LinkOgPreview | null>();
/** Bump khi đổi quy luật thumb (gallery / CF fallback) — bỏ cache client cũ. */
const CLIENT_CACHE_VER = "v8";

function cacheKey(url: string): string {
  return `${CLIENT_CACHE_VER}:${url}`;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function FallbackLinkCard({
  url,
  tone,
}: {
  url: string;
  tone: "me" | "them";
}) {
  const hostname = hostnameOf(url);
  return (
    <a
      className={`cins-chat-og-card is-fallback${tone === "me" ? " is-me" : ""}`}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="cins-chat-og-card-body">
        <span className="cins-chat-og-card-site">{hostname}</span>
        <span className="cins-chat-og-card-title">{url}</span>
      </span>
    </a>
  );
}

function GroupInviteLinkCard({
  url,
  tone,
  data,
}: {
  url: string;
  tone: "me" | "them";
  data: LinkOgPreview | null;
}) {
  const maMoi = parseGroupInviteCodeFromUrl(url);
  const [open, setOpen] = useState(false);
  const title = data?.title?.trim() || "Nhóm chat";
  const meta =
    data?.meta?.trim() ||
    data?.description?.trim() ||
    "Lời mời tham gia nhóm bạn bè";
  const avatar = data?.avatar?.trim() || null;

  const openInvite = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (!maMoi) return;
      setOpen(true);
    },
    [maMoi],
  );

  if (!maMoi) {
    return <FallbackLinkCard url={url} tone={tone} />;
  }

  return (
    <>
      <button
        type="button"
        className={`cins-chat-og-card is-group-invite${tone === "me" ? " is-me" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openInvite}
      >
        <span className="cins-chat-group-invite-art" aria-hidden>
          {avatar ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatar} alt="" />
          ) : (
            <Users size={28} strokeWidth={1.7} />
          )}
        </span>
        <span className="cins-chat-og-card-body">
          <span className="cins-chat-og-card-badge">Mời vào nhóm</span>
          <span className="cins-chat-og-card-title">{title}</span>
          <span className="cins-chat-og-card-desc">{meta}</span>
          <span className="cins-chat-group-invite-cta">Xem lời mời</span>
        </span>
      </button>
      <ChatGroupInviteDialog
        maMoi={maMoi}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

/** Card CINs — bài viết: cover+title+mô tả; journey/org/cộng đồng: avatar lớn + tên căn giữa. */
const ENTITY_AVATAR_KINDS = new Set(["journey", "org", "cong_dong"]);

/** `/:slug/p/:postSlug` — bài viết; không phụ thuộc `kind` (tránh cache/API thiếu field). */
function isBaiVietPath(url: string): boolean {
  try {
    return /^\/[^/]+\/p\/[^/]+\/?$/.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function isBaiVietPreview(preview: LinkOgPreview): boolean {
  if (preview.kind === "bai_viet") return true;
  return isBaiVietPath(preview.url);
}

/**
 * Preview bài cần refetch: thiếu ảnh, hoặc còn URL CF flexible crop (OG Facebook)
 * — variant này hay 403 trên card chat trong khi Gallery dùng `/grid` + fallback `/public`.
 */
function isStalePostPreview(preview: LinkOgPreview | null): boolean {
  if (!preview?.title || preview.source !== "cins") return false;
  if (!isBaiVietPreview(preview)) return false;
  const image = preview.image?.trim() || "";
  if (!image) return true;
  return /imagedelivery\.net\/[^/]+\/[^/]+\/w=\d+/i.test(image);
}

function RichCinsCard({
  data,
  tone,
}: {
  data: LinkOgPreview;
  tone: "me" | "them";
}) {
  const isPost = isBaiVietPreview(data);
  const showAvatar =
    !isPost &&
    ENTITY_AVATAR_KINDS.has(data.kind ?? "") &&
    Boolean(data.avatar);
  const [imageBroken, setImageBroken] = useState(false);
  const imageSrc = data.image?.trim() || null;

  useEffect(() => {
    setImageBroken(false);
  }, [imageSrc]);

  const showImage = Boolean(imageSrc) && !imageBroken;

  return (
    <a
      className={`cins-chat-og-card is-cins${isPost ? " is-post" : ""}${showAvatar ? " has-avatar" : ""}${tone === "me" ? " is-me" : ""}`}
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {showImage ? (
        <JourneyCoverImage
          className="cins-chat-og-card-img"
          src={imageSrc!}
          alt=""
          onFinalError={() => setImageBroken(true)}
        />
      ) : (
        <span className="cins-chat-og-card-cover-fallback" aria-hidden />
      )}
      {showAvatar ? (
        <span className="cins-chat-og-card-identity">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="cins-chat-og-card-avatar"
            src={data.avatar!}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        </span>
      ) : null}
      <span className="cins-chat-og-card-body">
        <span className="cins-chat-og-card-title">{data.title}</span>
        {data.description ? (
          <span className="cins-chat-og-card-desc">{data.description}</span>
        ) : null}
      </span>
    </a>
  );
}

export function ChatLinkOgCard({ url, tone = "them" }: Props) {
  const key = cacheKey(url);
  const [data, setData] = useState<LinkOgPreview | null>(() => {
    if (!clientCache.has(key)) return null;
    const cached = clientCache.get(key) ?? null;
    if (isStalePostPreview(cached)) {
      clientCache.delete(key);
      return null;
    }
    return cached;
  });

  useEffect(() => {
    if (clientCache.has(key)) {
      const cached = clientCache.get(key) ?? null;
      if (!isStalePostPreview(cached)) {
        setData(cached);
        return;
      }
      clientCache.delete(key);
    }

    let cancelled = false;
    const ctrl = new AbortController();

    fetch(`/api/link/og?url=${encodeURIComponent(url)}`, {
      signal: ctrl.signal,
      credentials: "same-origin",
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as LinkOgPreview;
      })
      .then((preview) => {
        if (cancelled) return;
        if (!preview?.title) {
          clientCache.set(key, null);
          setData(null);
          return;
        }
        /* Thiếu/ảnh CF crop cũ: hiện card nhưng không cache — lần sau fetch lại. */
        if (isStalePostPreview(preview)) {
          clientCache.delete(key);
        } else {
          clientCache.set(key, preview);
        }
        setData(preview);
      })
      .catch(() => {
        if (cancelled) return;
        clientCache.set(key, null);
        setData(null);
      });

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [key, url]);

  if (isGroupInviteUrl(url)) {
    return (
      <GroupInviteLinkCard
        url={url}
        tone={tone}
        data={data?.kind === "group_invite" ? data : null}
      />
    );
  }

  if (!data) {
    return <FallbackLinkCard url={url} tone={tone} />;
  }

  if (data.source === "cins") {
    return <RichCinsCard data={data} tone={tone} />;
  }

  const hostname = (() => {
    try {
      return new URL(data.url).hostname.replace(/^www\./, "");
    } catch {
      return data.siteName || "";
    }
  })();

  return (
    <a
      className={`cins-chat-og-card${tone === "me" ? " is-me" : ""}`}
      /* Link tới URL người dùng gửi (giữ path/room), không dùng og:url —
         nhiều site (vd Google Meet) đặt canonical về trang chủ. */
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {data.image ? (
        <JourneyCoverImage
          className="cins-chat-og-card-img"
          src={data.image}
          alt=""
        />
      ) : null}
      <span className="cins-chat-og-card-body">
        <span className="cins-chat-og-card-site">
          {data.siteName || hostname}
        </span>
        <span className="cins-chat-og-card-title">{data.title}</span>
        {data.description ? (
          <span className="cins-chat-og-card-desc">{data.description}</span>
        ) : null}
      </span>
    </a>
  );
}
