"use client";

import { useEffect, useRef, useState } from "react";

import {
  applyStreamAudio,
  bindStreamPlayer,
  pauseStream,
  playStreamWithAudio,
  type StreamPlayer,
} from "@/lib/cloudflare/stream-player-sdk";
import { buildStreamIframeUrl } from "@/lib/cloudflare/stream-embed";
import type { GalleryMainItem } from "@/lib/journey/gallery-page-fetch";

function previewIframeSrc(uid: string): string {
  const params = new URLSearchParams({
    autoplay: "true",
    muted: "true",
    controls: "false",
    preload: "auto",
    loop: "true",
  });
  return `${buildStreamIframeUrl(uid)}?${params.toString()}`;
}

function postStreamPlay(el: HTMLIFrameElement | null) {
  try {
    el?.contentWindow?.postMessage(JSON.stringify({ event: "play" }), "*");
  } catch {
    /* ignore */
  }
}

/** Hover/press trên lưới Video — iframe Stream muted, hiện khi đã phát. */
export function WorldJourneyVideoListingPreview({
  item,
  playing,
}: {
  item: GalleryMainItem;
  playing: boolean;
}) {
  const uid = item.streamUid?.trim() || "";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<StreamPlayer | null>(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!playing) setReady(false);
  }, [playing]);

  useEffect(() => {
    const el = iframeRef.current;
    if (!el || !uid || !playing) {
      playerRef.current = null;
      return;
    }
    let cancelled = false;
    let player: StreamPlayer | null = null;
    const retryIds: number[] = [];

    const kick = () => {
      if (cancelled || !playingRef.current) return;
      if (player) {
        applyStreamAudio(player, true, el);
        void playStreamWithAudio(player, true, el).then(() => {
          if (!cancelled && playingRef.current) setReady(true);
        });
        return;
      }
      postStreamPlay(el);
    };

    const onPlay = () => {
      if (cancelled || !playingRef.current) return;
      setReady(true);
    };

    const attach = async () => {
      try {
        const next = await bindStreamPlayer(el);
        if (cancelled) return;
        player = next;
        playerRef.current = next;
        next.loop = true;
        applyStreamAudio(next, true, el);
        next.addEventListener("play", onPlay);
        next.addEventListener("playing", onPlay);
        kick();
        retryIds.push(
          window.setTimeout(kick, 280),
          window.setTimeout(kick, 900),
        );
      } catch {
        if (!cancelled) postStreamPlay(el);
      }
    };

    const onLoad = () => {
      void attach();
    };
    void attach();
    el.addEventListener("load", onLoad);
    return () => {
      cancelled = true;
      for (const id of retryIds) window.clearTimeout(id);
      el.removeEventListener("load", onLoad);
      if (player) {
        player.removeEventListener("play", onPlay);
        player.removeEventListener("playing", onPlay);
        pauseStream(player, el);
      }
      if (playerRef.current === player) playerRef.current = null;
    };
  }, [playing, uid]);

  if (item.videoProcessing || !uid || !playing) return null;

  return (
    <iframe
      ref={iframeRef}
      className={"wj-video-listing-clip" + (ready ? " is-on" : "")}
      src={previewIframeSrc(uid)}
      title={item.label || "Video"}
      allow="autoplay; encrypted-media"
      referrerPolicy="strict-origin-when-cross-origin"
      tabIndex={-1}
      aria-hidden
    />
  );
}

export function kickListingPreviewFromGesture(
  root: HTMLElement | null,
  _item: GalleryMainItem,
) {
  const iframe = root?.querySelector("iframe.wj-video-listing-clip");
  if (iframe instanceof HTMLIFrameElement) postStreamPlay(iframe);
}
