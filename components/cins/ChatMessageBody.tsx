"use client";

import { useState } from "react";

import { ChatImageLightbox } from "@/components/cins/ChatImageLightbox";
import { ChatMessageMediaImage } from "@/components/cins/ChatMessageMediaImage";
import { InlineExternalVideoEmbed } from "@/components/shared/InlineExternalVideoEmbed";
import { chatImageDeliveryUrl } from "@/lib/chat/image-url";
import type { ChatMessage } from "@/lib/chat/types";
import { parseTextWithExternalVideoEmbed } from "@/lib/link/external-video-embed";

const CHAT_CONTEXT_LABEL: Record<string, string> = {
  tuyen_dung: "Tin tuyển dụng",
  su_kien: "Sự kiện",
  tuyen_sinh: "Tuyển sinh",
  khoa_hoc: "Khóa học",
};

type ChatMessageBodyProps = {
  msg: ChatMessage;
  /** Chỉ render ảnh/meme, bỏ caption (ThreadItems render caption riêng). */
  mediaOnly?: boolean;
};

export function ChatMessageBody({ msg, mediaOnly = false }: ChatMessageBodyProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isSticker = msg.kind === "sticker";
  const imageSrc =
    msg.imageUrl ??
    (msg.imageId
      ? chatImageDeliveryUrl(msg.imageId, isSticker ? "thumbnail" : "public")
      : null);
  const { displayText, iframeSrc } = parseTextWithExternalVideoEmbed(msg.body);
  const showCaption = !mediaOnly && !isSticker && Boolean(displayText);

  if (msg.nguCanh) {
    const card = msg.nguCanh;
    const kindLabel = CHAT_CONTEXT_LABEL[card.loai] ?? "Nội dung";
    const inner = (
      <>
        {card.anh ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="cins-chat-ctx-card-img" src={card.anh} alt="" />
        ) : null}
        <span className="cins-chat-ctx-card-body">
          <span className="cins-chat-ctx-card-kind">{kindLabel}</span>
          <span className="cins-chat-ctx-card-title">{card.tieuDe}</span>
          {card.orgTen ? (
            <span className="cins-chat-ctx-card-org">{card.orgTen}</span>
          ) : null}
          {card.moTa ? (
            <span className="cins-chat-ctx-card-desc">{card.moTa}</span>
          ) : null}
        </span>
      </>
    );

    return (
      <span className="cins-chat-ctx-card-wrap">
        <span className="cins-chat-ctx-card-note">Trao đổi về nội dung này</span>
        {card.href ? (
          <a
            className="cins-chat-ctx-card"
            href={card.href}
            target="_blank"
            rel="noreferrer"
          >
            {inner}
          </a>
        ) : (
          <span className="cins-chat-ctx-card">{inner}</span>
        )}
        {displayText ? <p>{displayText}</p> : null}
      </span>
    );
  }

  return (
    <>
      {imageSrc ? (
        isSticker ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="cins-chat-msg-sticker"
            src={imageSrc}
            alt="Meme"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <ChatMessageMediaImage
            src={imageSrc}
            alt={msg.body.trim() || "Ảnh đính kèm"}
  stacked={mediaOnly}
            onClick={() => setLightboxOpen(true)}
          />
        )
      ) : null}
      {showCaption ? <p>{displayText}</p> : null}
      {!mediaOnly && iframeSrc ? <InlineExternalVideoEmbed src={iframeSrc} /> : null}

      {lightboxOpen && imageSrc && !isSticker ? (
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
