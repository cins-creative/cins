import { chatImageDeliveryUrl } from "@/lib/chat/image-url";
import type { ChatMessage } from "@/lib/chat/types";

export function ChatMessageBody({ msg }: { msg: ChatMessage }) {
  const imageSrc =
    msg.imageUrl ?? (msg.imageId ? chatImageDeliveryUrl(msg.imageId) : null);

  return (
    <>
      {imageSrc ? (
        <a
          className="j-chat-mini-msg-image-link cins-chat-msg-image-link"
          href={imageSrc}
          target="_blank"
          rel="noopener noreferrer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="j-chat-mini-msg-image cins-chat-msg-image"
            src={imageSrc}
            alt={msg.body || "Ảnh đính kèm"}
          />
        </a>
      ) : null}
      {msg.body ? <p>{msg.body}</p> : null}
    </>
  );
}
