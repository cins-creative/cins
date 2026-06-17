import { Fragment, useMemo, type ReactNode } from "react";

import { ChatMessageAlbum } from "@/components/cins/ChatMessageAlbum";
import { ChatMessageBody } from "@/components/cins/ChatMessageBody";
import { formatChatTime } from "@/lib/chat/avatar";
import { groupChatMessages } from "@/lib/chat/message-albums";
import type { ChatMessage } from "@/lib/chat/types";

type ChatMessageThreadItemsProps = {
  messages: ChatMessage[];
  renderTheirAvatar?: () => ReactNode;
};

export function ChatMessageThreadItems({
  messages,
  renderTheirAvatar,
}: ChatMessageThreadItemsProps) {
  const items = useMemo(() => groupChatMessages(messages), [messages]);

  return (
    <>
      {items.map((item) => {
        if (item.type === "single") {
          const msg = item.message;
          const hasImage = Boolean(msg.imageId || msg.imageUrl);

          return (
            <div
              key={msg.id}
              className={`cins-chat-bubble-row${msg.from === "me" ? " is-me" : ""}`}
            >
              {msg.from === "them" ? renderTheirAvatar?.() : null}
              <div
                className={`cins-chat-bubble${msg.from === "me" ? " is-me" : " is-them"}${hasImage ? " has-image" : ""}`}
              >
                <ChatMessageBody msg={msg} />
                <time dateTime={msg.sentAt}>{formatChatTime(msg.sentAt)}</time>
              </div>
            </div>
          );
        }

        const firstId = item.messages[0].id;
        const isMe = item.from === "me";
        const caption = item.messages[0].body.trim();
        const captionAt = item.messages[0].sentAt;

        return (
          <Fragment key={`album-${firstId}`}>
            {caption ? (
              <div
                className={`cins-chat-bubble-row${isMe ? " is-me" : ""}`}
              >
                {item.from === "them" ? renderTheirAvatar?.() : null}
                <div
                  className={`cins-chat-bubble${isMe ? " is-me" : " is-them"}`}
                >
                  <p>{caption}</p>
                  <time dateTime={captionAt}>{formatChatTime(captionAt)}</time>
                </div>
              </div>
            ) : null}
            <div
              className={`cins-chat-bubble-row${isMe ? " is-me" : ""}${!isMe && caption ? " is-album-follow" : ""}`}
            >
              {item.from === "them" && !caption ? renderTheirAvatar?.() : null}
              <div className="cins-chat-album-block">
                <ChatMessageAlbum messages={item.messages} />
                <time className="cins-chat-album-time" dateTime={item.sentAt}>
                  {formatChatTime(item.sentAt)}
                </time>
              </div>
            </div>
          </Fragment>
        );
      })}
    </>
  );
}
