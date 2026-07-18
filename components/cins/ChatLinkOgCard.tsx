"use client";

import { useEffect, useState } from "react";

import type { LinkOgPreview } from "@/lib/link/og-preview";

type Props = {
  url: string;
  /** Bubble "is-me" — tông màu nhạt hơn trên nền xanh. */
  tone?: "me" | "them";
};

const clientCache = new Map<string, LinkOgPreview | null>();
const CLIENT_CACHE_VER = "v2";

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

function RichCinsCard({
  data,
  tone,
}: {
  data: LinkOgPreview;
  tone: "me" | "them";
}) {
  const isPost = data.kind === "bai_viet" || isBaiVietPath(data.url);
  const showAvatar =
    !isPost &&
    ENTITY_AVATAR_KINDS.has(data.kind ?? "") &&
    Boolean(data.avatar);

  return (
    <a
      className={`cins-chat-og-card is-cins${isPost ? " is-post" : ""}${showAvatar ? " has-avatar" : ""}${tone === "me" ? " is-me" : ""}`}
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {data.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="cins-chat-og-card-img"
          src={data.image}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
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
  const [data, setData] = useState<LinkOgPreview | null>(() =>
    clientCache.has(key) ? clientCache.get(key)! : null,
  );

  useEffect(() => {
    if (clientCache.has(key)) {
      setData(clientCache.get(key) ?? null);
      return;
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
        clientCache.set(key, preview);
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
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {data.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="cins-chat-og-card-img"
          src={data.image}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
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
