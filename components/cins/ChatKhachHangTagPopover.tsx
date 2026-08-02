"use client";

import { Check, Plus, Tags, Trash2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import {
  ROOM_TAG_COLOR_PALETTE,
  resolveRoomTagColor,
  roomTagChipStyle,
} from "@/lib/chat/tag-colors";
import type { ShopKhachHangTag } from "@/lib/shop/khach-hang-types";

export type { ShopKhachHangTag };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: ShopKhachHangTag[];
  selectedTagIds: string[];
  busy?: boolean;
  onToggleTag: (tagId: string) => void;
  onCreateTag: (ten: string, mau: string) => Promise<boolean>;
  onDeleteTag: (tagId: string) => Promise<boolean>;
  onRenameTag?: (tagId: string, ten: string) => Promise<boolean>;
};

/**
 * Popover chọn / thêm / xóa thẻ phân loại khách hàng (chỉ seller).
 */
export function ChatKhachHangTagPopover({
  open,
  onOpenChange,
  tags,
  selectedTagIds,
  busy = false,
  onToggleTag,
  onCreateTag,
  onDeleteTag,
  onRenameTag,
}: Props) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(ROOM_TAG_COLOR_PALETTE[0]!);
  const [creatingBusy, setCreatingBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (!open) {
      setCreating(false);
      setNewName("");
      setEditingId(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open, onOpenChange]);

  if (!open) {
    return (
      <button
        type="button"
        className="cins-chat-icon-btn"
        aria-label="Thẻ phân loại khách hàng"
        title="Thẻ phân loại"
        aria-expanded={false}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenChange(true);
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Tags size={16} strokeWidth={1.9} aria-hidden />
      </button>
    );
  }

  return (
    <div className="cins-chat-khach-tag-wrap" ref={rootRef}>
      <button
        type="button"
        className="cins-chat-icon-btn is-active"
        aria-label="Thẻ phân loại khách hàng"
        title="Thẻ phân loại"
        aria-expanded
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenChange(false);
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Tags size={16} strokeWidth={1.9} aria-hidden />
      </button>
      <div
        id={panelId}
        className="cins-chat-khach-tag-popover"
        role="dialog"
        aria-label="Thẻ phân loại khách hàng"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="cins-chat-khach-tag-popover-head">
          <strong>Thẻ phân loại</strong>
          <button
            type="button"
            className="cins-chat-icon-btn"
            aria-label="Đóng"
            onClick={() => onOpenChange(false)}
          >
            <X size={14} strokeWidth={2} aria-hidden />
          </button>
        </header>

        {tags.length === 0 && !creating ? (
          <p className="cins-chat-khach-tag-empty">
            Chưa có thẻ. Thêm thẻ để phân loại khách hàng.
          </p>
        ) : (
          <ul className="cins-chat-khach-tag-list">
            {tags.map((tag) => {
              const color = resolveRoomTagColor(tag.id, tag.mau);
              const selected = selectedTagIds.includes(tag.id);
              const isEditing = editingId === tag.id;
              return (
                <li key={tag.id}>
                  {isEditing && onRenameTag ? (
                    <form
                      className="cins-chat-khach-tag-edit-row"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void (async () => {
                          const ok = await onRenameTag(tag.id, editName);
                          if (ok) setEditingId(null);
                        })();
                      }}
                    >
                      <input
                        type="text"
                        value={editName}
                        maxLength={40}
                        autoFocus
                        onChange={(e) => setEditName(e.target.value)}
                        aria-label="Tên thẻ"
                      />
                      <button type="submit" aria-label="Lưu" disabled={busy}>
                        <Check size={14} strokeWidth={2.2} />
                      </button>
                      <button
                        type="button"
                        aria-label="Hủy"
                        onClick={() => setEditingId(null)}
                      >
                        <X size={14} strokeWidth={2} />
                      </button>
                    </form>
                  ) : (
                    <div className="cins-chat-khach-tag-row">
                      <button
                        type="button"
                        className={`cins-chat-khach-tag-toggle${selected ? " is-selected" : ""}`}
                        style={roomTagChipStyle(color, { active: selected })}
                        disabled={busy}
                        onClick={() => onToggleTag(tag.id)}
                        onDoubleClick={() => {
                          if (!onRenameTag) return;
                          setEditingId(tag.id);
                          setEditName(tag.ten);
                        }}
                        title="Click chọn · double-click đổi tên"
                      >
                        <span
                          className="cins-chat-khach-tag-dot"
                          style={{ background: color }}
                          aria-hidden
                        />
                        <span>{tag.ten}</span>
                        {selected ? (
                          <Check size={12} strokeWidth={2.4} aria-hidden />
                        ) : null}
                      </button>
                      <button
                        type="button"
                        className="cins-chat-khach-tag-delete"
                        aria-label={`Xóa thẻ ${tag.ten}`}
                        title="Xóa thẻ"
                        disabled={busy}
                        onClick={() => {
                          const confirmed = window.confirm(
                            `Xóa thẻ «${tag.ten}»? Thẻ sẽ gỡ khỏi mọi khách.`,
                          );
                          if (!confirmed) return;
                          void onDeleteTag(tag.id);
                        }}
                      >
                        <Trash2 size={13} strokeWidth={1.9} aria-hidden />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {creating ? (
          <form
            className="cins-chat-khach-tag-create"
            onSubmit={(e) => {
              e.preventDefault();
              void (async () => {
                setCreatingBusy(true);
                try {
                  const ok = await onCreateTag(newName, newColor);
                  if (ok) {
                    setCreating(false);
                    setNewName("");
                    setNewColor(ROOM_TAG_COLOR_PALETTE[0]!);
                  }
                } finally {
                  setCreatingBusy(false);
                }
              })();
            }}
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tên thẻ mới"
              maxLength={40}
              autoFocus
              aria-label="Tên thẻ mới"
            />
            <div
              className="cins-chat-khach-tag-palette"
              role="listbox"
              aria-label="Màu thẻ"
            >
              {ROOM_TAG_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="option"
                  aria-selected={newColor === c}
                  className={`cins-chat-khach-tag-swatch${newColor === c ? " is-active" : ""}`}
                  style={{ background: c }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
            <div className="cins-chat-khach-tag-create-actions">
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                }}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={creatingBusy || !newName.trim()}
              >
                Thêm
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="cins-chat-khach-tag-add"
            onClick={() => setCreating(true)}
            disabled={busy}
          >
            <Plus size={14} strokeWidth={2.2} aria-hidden />
            Thêm thẻ
          </button>
        )}
      </div>
    </div>
  );
}
