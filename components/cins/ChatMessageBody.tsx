"use client";

import { useState } from "react";

import { ChatImageLightbox } from "@/components/cins/ChatImageLightbox";
import { chatImageDeliveryUrl } from "@/lib/chat/image-url";
import type { ChatMessage } from "@/lib/chat/types";

export function ChatMessageBody({ msg }: { msg: ChatMessage }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const imageSrc =
    msg.imageUrl ?? (msg.imageId ? chatImageDeliveryUrl(msg.imageId) : null);

  return (
    <>
      {imageSrc ? (
        <button
          type="button"
          className="j-chat-mini-msg-image-link cins-chat-msg-image-link"
          aria-label="Xem ảnh đính kèm"
          onClick={() => setLightboxOpen(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="j-chat-mini-msg-image cins-chat-msg-image"
            src={imageSrc}
            alt={msg.body || "Ảnh đính kèm"}
          />
        </button>
      ) : null}
      {msg.body ? <p>{msg.body}</p> : null}

      {lightboxOpen && imageSrc ? (
        <ChatImageLightbox
          images={[imageSrc]}
          index={0}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={() => {}}
        />
      ) : null}
    </>
  );
}
