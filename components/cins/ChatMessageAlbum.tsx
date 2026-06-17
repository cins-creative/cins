import {
  albumGridColumnClass,
  chatMessageImageSrc,
} from "@/lib/chat/message-albums";
import type { ChatMessage } from "@/lib/chat/types";

type ChatMessageAlbumProps = {
  messages: ChatMessage[];
};

export function ChatMessageAlbum({ messages }: ChatMessageAlbumProps) {
  const columnClass = albumGridColumnClass(messages.length);

  return (
    <div
      className={`cins-chat-album-grid ${columnClass}`}
      data-count={messages.length}
    >
      {messages.map((message) => {
        const imageSrc = chatMessageImageSrc(message);
        if (!imageSrc) return null;

        return (
          <a
            key={message.id}
            className="cins-chat-album-cell cins-chat-msg-image-link"
            href={imageSrc}
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageSrc} alt="Ảnh đính kèm" />
          </a>
        );
      })}
    </div>
  );
}
