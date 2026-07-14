"use client";

import { useState } from "react";

import { ChatImageLightbox } from "@/components/cins/ChatImageLightbox";
import { ChatLinkOgCard } from "@/components/cins/ChatLinkOgCard";
import { ChatMentionText } from "@/components/cins/ChatMentionText";
import { ChatMessageMediaImage } from "@/components/cins/ChatMessageMediaImage";
import { ChatMocNoticeBubble } from "@/components/cins/ChatMocNoticeBubble";
import { ChatPollBubble } from "@/components/cins/ChatPollBubble";
import { InlineExternalVideoEmbed } from "@/components/shared/InlineExternalVideoEmbed";
import { chatImageDeliveryUrl } from "@/lib/chat/image-url";
import type { ChatMessage, ChatPollSummary } from "@/lib/chat/types";
import { parseTextWithExternalVideoEmbed } from "@/lib/link/external-video-embed";
import {
  findFirstOgPreviewUrl,
  isUrlOnlyBody,
} from "@/lib/link/og-preview";

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
  roomId?: string;
  viewerUserId?: string | null;
  onPollUpdated?: (messageId: string, poll: ChatPollSummary) => void;
};

function MessageCaption({
  text,
  msg,
  viewerUserId,
}: {
  text: string;
  msg: ChatMessage;
  viewerUserId?: string | null;
}) {
  return (
    <p>
      <ChatMentionText
        text={text}
        mentions={msg.mentions}
        viewerUserId={viewerUserId}
        tone={msg.from === "me" ? "me" : "them"}
      />
    </p>
  );
}

export function ChatMessageBody({
  msg,
  mediaOnly = false,
  roomId,
  viewerUserId,
  onPollUpdated,
}: ChatMessageBodyProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isSticker = msg.kind === "sticker";
  const isMe = msg.from === "me";
  /* Inline: meme dùng thumbnail gọn; lightbox luôn bản public đủ nét. */
  const imageSrc =
    msg.imageUrl ??
    (msg.imageId
      ? chatImageDeliveryUrl(msg.imageId, isSticker ? "thumbnail" : "public")
      : null);
  const lightboxSrc =
    msg.imageUrl ??
    (msg.imageId ? chatImageDeliveryUrl(msg.imageId, "public") : null) ??
    imageSrc;
  const { displayText: videoDisplayText, iframeSrc, videoUrl } =
    parseTextWithExternalVideoEmbed(msg.body);

  const ogUrl =
    !mediaOnly && !isSticker && !iframeSrc
      ? findFirstOgPreviewUrl(msg.body)
      : null;

  let displayText = videoDisplayText;
  if (ogUrl && isUrlOnlyBody(msg.body, ogUrl)) {
    displayText = "";
  }

  const showCaption = !mediaOnly && !isSticker && Boolean(displayText);

  if (msg.kind === "moc_nhac" || msg.mocNhac) {
    if (msg.mocNhac) {
      return (
        <ChatMocNoticeBubble notice={msg.mocNhac} fallbackBody={msg.body} />
      );
    }
    return <p className="cins-chat-moc-notice-fallback">{msg.body || "Nhắc mốc"}</p>;
  }

  if (msg.kind === "binh_chon" || msg.poll) {
    if (!roomId || !onPollUpdated) {
      return <p>{msg.poll?.question || msg.body || "Bình chọn"}</p>;
    }
    return (
      <ChatPollBubble
        message={msg}
        roomId={roomId}
        onPollUpdated={onPollUpdated}
      />
    );
  }

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
        {displayText ? (
          <MessageCaption
            text={displayText}
            msg={msg}
            viewerUserId={viewerUserId}
          />
        ) : null}
        {ogUrl ? <ChatLinkOgCard url={ogUrl} tone={isMe ? "me" : "them"} /> : null}
      </span>
    );
  }

  return (
    <>
      {imageSrc ? (
        isSticker ? (
          <button
            type="button"
            className="cins-chat-msg-sticker-btn"
            aria-label="Xem meme phóng to"
            onClick={() => setLightboxOpen(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="cins-chat-msg-sticker"
              src={imageSrc}
              alt="Meme"
              loading="lazy"
              decoding="async"
            />
          </button>
        ) : (
          <ChatMessageMediaImage
            src={imageSrc}
            alt={msg.body.trim() || "Ảnh đính kèm"}
            stacked={mediaOnly}
            onClick={() => setLightboxOpen(true)}
          />
        )
      ) : null}
      {showCaption ? (
        <MessageCaption
          text={displayText}
          msg={msg}
          viewerUserId={viewerUserId}
        />
      ) : null}
      {!mediaOnly && iframeSrc ? (
        <InlineExternalVideoEmbed
          src={iframeSrc}
          href={videoUrl}
          openMode="new-tab"
          gate={false}
          title="Video"
        />
      ) : null}
      {ogUrl ? <ChatLinkOgCard url={ogUrl} tone={isMe ? "me" : "them"} /> : null}

      {lightboxOpen && lightboxSrc ? (
        <ChatImageLightbox
          images={[lightboxSrc]}
          index={0}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={() => {}}
        />
      ) : null}
    </>
  );
}
