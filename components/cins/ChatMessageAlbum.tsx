"use client";

import { useMemo, useState } from "react";

import { ChatImageLightbox } from "@/components/cins/ChatImageLightbox";
import {
  albumGridColumnClass,
  chatMessageImageSrc,
} from "@/lib/chat/message-albums";
import type { ChatMessage } from "@/lib/chat/types";

type ChatMessageAlbumProps = {
  messages: ChatMessage[];
};

export function ChatMessageAlbum({ messages }: ChatMessageAlbumProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const columnClass = albumGridColumnClass(messages.length);

  const imageEntries = useMemo(
    () =>
      messages
        .map((message) => {
          const src = chatMessageImageSrc(message);
          return src ? { id: message.id, src } : null;
        })
        .filter((entry): entry is { id: string; src: string } => entry != null),
    [messages],
  );

  const lightboxUrls = useMemo(
    () => imageEntries.map((entry) => entry.src),
    [imageEntries],
  );

  return (
    <>
      <div
        className={`cins-chat-album-grid ${columnClass}`}
        data-count={messages.length}
      >
        {imageEntries.map((entry, index) => (
          <button
            key={entry.id}
            type="button"
            className="cins-chat-album-cell cins-chat-msg-image-link"
            aria-label={`Xem ảnh ${index + 1}`}
            onClick={() => setLightboxIndex(index)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={entry.src} alt="Ảnh đính kèm" />
          </button>
        ))}
      </div>

      {lightboxIndex != null && lightboxUrls.length > 0 ? (
        <ChatImageLightbox
          images={lightboxUrls}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      ) : null}
    </>
  );
}
