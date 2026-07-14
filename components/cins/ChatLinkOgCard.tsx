"use client";

import { useEffect, useState } from "react";

import type { LinkOgPreview } from "@/lib/link/og-preview";

type Props = {
  url: string;
  /** Bubble "is-me" — tông màu nhạt hơn trên nền xanh. */
  tone?: "me" | "them";
};

const clientCache = new Map<string, LinkOgPreview | null>();

export function ChatLinkOgCard({ url, tone = "them" }: Props) {
  const [data, setData] = useState<LinkOgPreview | null>(() =>
    clientCache.has(url) ? clientCache.get(url)! : null,
  );
  const [failed, setFailed] = useState(() => clientCache.get(url) === null);

  useEffect(() => {
    if (clientCache.has(url)) {
      const cached = clientCache.get(url) ?? null;
      setData(cached);
      setFailed(cached === null);
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
          clientCache.set(url, null);
          setFailed(true);
          setData(null);
          return;
        }
        clientCache.set(url, preview);
        setData(preview);
        setFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        clientCache.set(url, null);
        setFailed(true);
        setData(null);
      });

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [url]);

  if (failed || !data) return null;

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
