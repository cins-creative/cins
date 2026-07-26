"use client";

import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { ChatMessageActionHandlers } from "@/components/cins/ChatMessageActions";
import {
  patchChatMessage,
  toggleChatReaction,
} from "@/lib/chat/message-actions-client";
import { applyOptimisticReaction } from "@/lib/chat/optimistic-reactions";
import { updateMessageInList } from "@/lib/chat/patch-thread-messages";
import type { ChatMessage } from "@/lib/chat/types";

type Options = {
  roomId: string | null | undefined;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  onError?: (message: string) => void;
};

/**
 * Action hover bubble (reply / react / pin / edit / recall) cho inbox staff
 * dùng chung API phòng với overlay — không canvas / forward.
 */
export function useChatRoomMessageActions({
  roomId,
  setMessages,
  onError,
}: Options) {
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");

  const clearComposeExtras = useCallback(() => {
    setReplyTarget(null);
    setEditingMessageId(null);
    setEditingDraft("");
  }, []);

  const actionHandlers = useMemo<ChatMessageActionHandlers | undefined>(() => {
    if (!roomId) return undefined;
    const rid = roomId;
    return {
      onReply: (msg) => {
        setReplyTarget(msg);
        setEditingMessageId(null);
        setEditingDraft("");
      },
      onRecall: (msg) => {
        const snapshot = { ...msg };
        setMessages((msgs) =>
          updateMessageInList(msgs, msg.id, { deleted: true, body: "" }),
        );
        void patchChatMessage(rid, msg.id, { action: "recall" }).then((res) => {
          if (res.error) {
            setMessages((msgs) =>
              updateMessageInList(msgs, msg.id, snapshot),
            );
            onError?.(res.error);
            return;
          }
          if (res.message) {
            setMessages((msgs) =>
              msgs.map((m) => (m.id === msg.id ? { ...m, ...res.message! } : m)),
            );
          }
        });
      },
      onEdit: (msg) => {
        setEditingMessageId(msg.id);
        setEditingDraft(msg.body);
        setReplyTarget(null);
      },
      onPin: (msg, pinned) => {
        setMessages((msgs) =>
          updateMessageInList(msgs, msg.id, { pinned }),
        );
        void patchChatMessage(rid, msg.id, { action: "pin", pinned }).then(
          (res) => {
            if (res.error) {
              setMessages((msgs) =>
                updateMessageInList(msgs, msg.id, { pinned: !pinned }),
              );
              onError?.(res.error);
            }
          },
        );
      },
      onReaction: (msg, emoji, activeReaction) => {
        const prevReactions = msg.reactions;
        const nextReactions = applyOptimisticReaction(
          msg.reactions,
          emoji,
          activeReaction,
        );
        setMessages((msgs) =>
          updateMessageInList(msgs, msg.id, { reactions: nextReactions }),
        );
        void toggleChatReaction(rid, msg.id, emoji, activeReaction).then(
          (res) => {
            if (res.error) {
              setMessages((msgs) =>
                updateMessageInList(msgs, msg.id, {
                  reactions: prevReactions,
                }),
              );
              onError?.(res.error);
              return;
            }
            if (res.reactions) {
              setMessages((msgs) =>
                updateMessageInList(msgs, msg.id, {
                  reactions: res.reactions,
                }),
              );
            }
          },
        );
      },
    };
  }, [roomId, setMessages, onError]);

  const handleSaveEdit = useCallback(
    (msg: ChatMessage) => {
      if (!roomId) return;
      const body = editingDraft.trim();
      if (!body || body === msg.body) {
        setEditingMessageId(null);
        setEditingDraft("");
        return;
      }
      const snapshot = {
        body: msg.body,
        edited: msg.edited,
        editedAt: msg.editedAt,
      };
      const now = new Date().toISOString();
      setMessages((msgs) =>
        updateMessageInList(msgs, msg.id, {
          body,
          edited: true,
          editedAt: now,
        }),
      );
      setEditingMessageId(null);
      setEditingDraft("");
      void patchChatMessage(roomId, msg.id, {
        action: "edit",
        noi_dung: body,
      }).then((res) => {
        if (res.error) {
          setMessages((msgs) =>
            updateMessageInList(msgs, msg.id, snapshot),
          );
          onError?.(res.error);
          return;
        }
        if (res.message) {
          setMessages((msgs) =>
            msgs.map((m) => (m.id === msg.id ? { ...m, ...res.message! } : m)),
          );
        }
      });
    },
    [roomId, editingDraft, setMessages, onError],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingDraft("");
  }, []);

  return {
    actionHandlers,
    replyTarget,
    setReplyTarget,
    editingMessageId,
    editingDraft,
    setEditingDraft,
    handleSaveEdit,
    handleCancelEdit,
    clearComposeExtras,
  };
}
