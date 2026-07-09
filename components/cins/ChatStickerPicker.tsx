"use client";

import { ClipboardPaste, Loader2, Plus, Settings2, Star, Trash2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { fetchChatComposeImageUpload } from "@/lib/chat/compose-image-upload";
import { readImageFileFromClipboard } from "@/lib/files/clipboard-images";
import {
  addUserEmojiMucClient,
  createUserEmojiBoClient,
  deleteUserEmojiBoClient,
  deleteUserEmojiMucClient,
  fetchUserEmojiPack,
  updateUserEmojiBoCoverClient,
} from "@/lib/user-emoji/client";
import {
  MAX_USER_EMOJI_BO,
  MAX_USER_EMOJI_MUC_PER_BO,
} from "@/lib/user-emoji/constants";
import { boThumbnailUrl } from "@/lib/user-emoji/thumbnail";
import type { UserEmojiBo, UserEmojiMuc } from "@/lib/user-emoji/types";

function withBoThumbnail(bo: UserEmojiBo): UserEmojiBo {
  return {
    ...bo,
    thumbnailUrl: boThumbnailUrl(bo.cloudflareIdAnhBia, bo.items),
  };
}

type Props = {
  onClose: () => void;
  onSend: (item: UserEmojiMuc) => void;
  disabled?: boolean;
};

export function ChatStickerPicker({ onClose, onSend, disabled }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [boList, setBoList] = useState<UserEmojiBo[]>([]);
  const [activeBoId, setActiveBoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manageMode, setManageMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [creatingBo, setCreatingBo] = useState(false);
  const [newBoName, setNewBoName] = useState("");

  const activeBo = boList.find((bo) => bo.id === activeBoId) ?? boList[0] ?? null;
  const canAddBo = boList.length < MAX_USER_EMOJI_BO;
  const itemCount = activeBo?.items.length ?? 0;
  const canAddItem = itemCount < MAX_USER_EMOJI_MUC_PER_BO;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pack = await fetchUserEmojiPack();
      setBoList(pack.boList);
      setActiveBoId((prev) => {
        if (prev && pack.boList.some((bo) => bo.id === prev)) return prev;
        return pack.boList[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được bộ meme.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.("[data-sticker-trigger]")) return;
      onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [onClose]);

  const handleCreateBo = async () => {
    const ten = newBoName.trim();
    if (!ten) return;
    setCreatingBo(true);
    setError(null);
    try {
      const bo = await createUserEmojiBoClient(ten);
      setBoList((prev) => [...prev, bo]);
      setActiveBoId(bo.id);
      setNewBoName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được bộ meme.");
    } finally {
      setCreatingBo(false);
    }
  };

  const handleDeleteBo = async (boId: string) => {
    if (!window.confirm("Xóa bộ meme này và toàn bộ meme bên trong?")) return;
    setError(null);
    try {
      await deleteUserEmojiBoClient(boId);
      setBoList((prev) => {
        const next = prev.filter((bo) => bo.id !== boId);
        setActiveBoId((current) =>
          current === boId ? (next[0]?.id ?? null) : current,
        );
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được bộ meme.");
    }
  };

  const addFileToActiveBo = useCallback(
    async (file: File) => {
      if (!activeBo) return;

      setUploading(true);
      setError(null);
      try {
        const uploaded = await fetchChatComposeImageUpload(file);
        if (!uploaded.ok) throw new Error(uploaded.error);
        const item = await addUserEmojiMucClient(activeBo.id, uploaded.imageId);
        setBoList((prev) =>
          prev.map((bo) => {
            if (bo.id !== activeBo.id) return bo;
            const items = [...bo.items, item];
            const cloudflareIdAnhBia = bo.cloudflareIdAnhBia ?? item.cloudflareId;
            return withBoThumbnail({
              ...bo,
              items,
              cloudflareIdAnhBia,
            });
          }),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thêm được meme.");
      } finally {
        setUploading(false);
      }
    },
    [activeBo],
  );

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !activeBo) return;
    await addFileToActiveBo(file);
  };

  const handlePasteFromClipboard = useCallback(async () => {
    if (!activeBo || !canAddItem || uploading) return;

    const file = await readImageFileFromClipboard();
    if (!file) {
      setError("Không có ảnh trong bộ nhớ tạm. Sao chép ảnh rồi bấm lại.");
      return;
    }

    await addFileToActiveBo(file);
  }, [activeBo, addFileToActiveBo, canAddItem, uploading]);

  const handleDeleteItem = async (boId: string, itemId: string) => {
    setError(null);
    try {
      const targetBo = boList.find((bo) => bo.id === boId);
      const removed = targetBo?.items.find((item) => item.id === itemId);
      await deleteUserEmojiMucClient(boId, itemId);
      const coverRemoved =
        Boolean(removed) && targetBo?.cloudflareIdAnhBia === removed?.cloudflareId;
      const nextItems =
        targetBo?.items.filter((item) => item.id !== itemId) ?? [];
      const nextCover = coverRemoved
        ? (nextItems[0]?.cloudflareId ?? null)
        : (targetBo?.cloudflareIdAnhBia ?? null);
      if (coverRemoved) {
        await updateUserEmojiBoCoverClient(boId, nextCover);
      }
      setBoList((prev) =>
        prev.map((bo) => {
          if (bo.id !== boId) return bo;
          return withBoThumbnail({
            ...bo,
            items: nextItems,
            cloudflareIdAnhBia: nextCover,
          });
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được meme.");
    }
  };

  const handleSetBoCover = async (boId: string, item: UserEmojiMuc) => {
    setError(null);
    try {
      await updateUserEmojiBoCoverClient(boId, item.cloudflareId);
      setBoList((prev) =>
        prev.map((bo) =>
          bo.id === boId
            ? withBoThumbnail({
                ...bo,
                cloudflareIdAnhBia: item.cloudflareId,
              })
            : bo,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đặt được ảnh bìa.");
    }
  };

  return (
    <div ref={panelRef} className="cins-chat-sticker-picker" role="dialog" aria-label="Meme của tôi">
      <header className="cins-chat-sticker-picker-head">
        <span className="cins-chat-sticker-picker-title">Meme của tôi</span>
        <div className="cins-chat-sticker-picker-actions">
          <button
            type="button"
            className={`cins-chat-sticker-picker-icon${manageMode ? " is-active" : ""}`}
            aria-label={manageMode ? "Xong quản lý" : "Quản lý bộ meme"}
            aria-pressed={manageMode}
            onClick={() => setManageMode((value) => !value)}
          >
            <Settings2 size={16} strokeWidth={1.8} aria-hidden />
          </button>
          <button
            type="button"
            className="cins-chat-sticker-picker-icon"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </header>

      <div className="cins-chat-sticker-picker-tabs" role="tablist" aria-label="Bộ meme">
        {boList.map((bo) => (
          <button
            key={bo.id}
            type="button"
            role="tab"
            aria-selected={activeBo?.id === bo.id}
            className={`cins-chat-sticker-picker-tab${activeBo?.id === bo.id ? " is-active" : ""}`}
            onClick={() => setActiveBoId(bo.id)}
          >
            {bo.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="cins-chat-sticker-picker-tab-thumb"
                src={bo.thumbnailUrl}
                alt=""
                aria-hidden
              />
            ) : (
              <span className="cins-chat-sticker-picker-tab-fallback" aria-hidden />
            )}
            <span className="cins-chat-sticker-picker-tab-label">{bo.ten}</span>
          </button>
        ))}
        {canAddBo && !manageMode ? (
          <button
            type="button"
            className="cins-chat-sticker-picker-tab is-add"
            aria-label="Thêm bộ meme"
            onClick={() => setManageMode(true)}
          >
            <Plus size={14} strokeWidth={2} aria-hidden />
          </button>
        ) : null}
      </div>

      {manageMode && canAddBo ? (
        <form
          className="cins-chat-sticker-picker-new-bo"
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreateBo();
          }}
        >
          <input
            type="text"
            value={newBoName}
            onChange={(event) => setNewBoName(event.target.value)}
            placeholder="Tên bộ meme mới"
            maxLength={40}
            disabled={creatingBo}
          />
          <button type="submit" disabled={creatingBo || !newBoName.trim()}>
            {creatingBo ? <Loader2 size={14} className="is-spin" aria-hidden /> : "Tạo"}
          </button>
        </form>
      ) : null}

      {loading ? (
        <p className="cins-chat-sticker-picker-status">
          <Loader2 size={18} className="is-spin" aria-hidden /> Đang tải…
        </p>
      ) : error ? (
        <p className="cins-chat-sticker-picker-error" role="alert">
          {error}
        </p>
      ) : !activeBo ? (
        <p className="cins-chat-sticker-picker-empty">
          Chưa có bộ meme. Bấm + để tạo bộ đầu tiên.
        </p>
      ) : (
        <>
          <div className="cins-chat-sticker-picker-grid">
            {activeBo.items.map((item) => (
              <div key={item.id} className="cins-chat-sticker-picker-cell">
                <button
                  type="button"
                  className="cins-chat-sticker-picker-sticker"
                  disabled={disabled || manageMode}
                  aria-label={item.tenGoi ?? "Gửi meme"}
                  onClick={() => onSend(item)}
                >
                  {item.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.url} alt="" />
                  ) : null}
                </button>
                {manageMode ? (
                  <>
                    <button
                      type="button"
                      className={`cins-chat-sticker-picker-cover${
                        activeBo.cloudflareIdAnhBia === item.cloudflareId
                          ? " is-active"
                          : ""
                      }`}
                      aria-label="Đặt làm ảnh bìa bộ"
                      title="Ảnh bìa"
                      onClick={() => void handleSetBoCover(activeBo.id, item)}
                    >
                      <Star size={10} strokeWidth={2} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="cins-chat-sticker-picker-remove"
                      aria-label="Xóa meme"
                      onClick={() => void handleDeleteItem(activeBo.id, item.id)}
                    >
                      <X size={10} strokeWidth={2.5} aria-hidden />
                    </button>
                  </>
                ) : null}
              </div>
            ))}
          </div>

          {manageMode ? (
            <footer className="cins-chat-sticker-picker-foot">
              <span className="cins-chat-sticker-picker-count">
                {itemCount}/{MAX_USER_EMOJI_MUC_PER_BO} meme
              </span>
              <div className="cins-chat-sticker-picker-foot-actions">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="cins-chat-sticker-picker-file"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(event) => void handleUpload(event)}
                />
                <button
                  type="button"
                  className="cins-chat-sticker-picker-upload"
                  disabled={!canAddItem || uploading}
                  onClick={() => void handlePasteFromClipboard()}
                >
                  {uploading ? (
                    <Loader2 size={14} className="is-spin" aria-hidden />
                  ) : (
                    <ClipboardPaste size={14} strokeWidth={1.8} aria-hidden />
                  )}
                  Dán ảnh
                </button>
                <button
                  type="button"
                  className="cins-chat-sticker-picker-upload"
                  disabled={!canAddItem || uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 size={14} className="is-spin" aria-hidden />
                  ) : (
                    <Plus size={14} strokeWidth={2} aria-hidden />
                  )}
                  Thêm meme
                </button>
                <button
                  type="button"
                  className="cins-chat-sticker-picker-delete-bo"
                  onClick={() => void handleDeleteBo(activeBo.id)}
                >
                  <Trash2 size={14} strokeWidth={1.8} aria-hidden />
                  Xóa bộ
                </button>
              </div>
            </footer>
          ) : null}
        </>
      )}
    </div>
  );
}
