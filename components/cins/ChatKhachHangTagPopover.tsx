"use client";

import {
  Check,
  ChevronDown,
  Pencil,
  Tags,
  Trash2,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

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
  /** Single-select — null = chưa gắn thẻ. */
  selectedTagId: string | null;
  busy?: boolean;
  onSelectTag: (tagId: string | null) => void;
  onUpdateTag: (
    tagId: string,
    patch: { ten?: string; mau?: string | null },
  ) => Promise<ShopKhachHangTag | null>;
  onDeleteTag: (tagId: string) => Promise<boolean>;
};

/**
 * Popover thẻ khách hàng.
 * - Mặc định: chỉ chọn / bỏ thẻ.
 * - Nút sửa → đổi tên·màu / xóa thẻ có sẵn.
 */
export function ChatKhachHangTagPopover({
  open,
  onOpenChange,
  tags,
  selectedTagId,
  busy = false,
  onSelectTag,
  onUpdateTag,
  onDeleteTag,
}: Props) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const [managing, setManaging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string>(
    ROOM_TAG_COLOR_PALETTE[0]!,
  );
  const [submitting, setSubmitting] = useState(false);

  const selectedTag = useMemo(
    () => tags.find((tag) => tag.id === selectedTagId) ?? null,
    [tags, selectedTagId],
  );

  useEffect(() => {
    if (!open) {
      setManaging(false);
      setEditingId(null);
      setEditName("");
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingId) {
          setEditingId(null);
          return;
        }
        if (managing) {
          setManaging(false);
          return;
        }
        onOpenChange(false);
      }
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
  }, [open, onOpenChange, managing, editingId]);

  useEffect(() => {
    if (!editingId) return;
    const t = window.setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [editingId]);

  const handleSelect = (tagId: string) => {
    if (busy || submitting || managing) return;
    onSelectTag(selectedTagId === tagId ? null : tagId);
    onOpenChange(false);
  };

  const startEdit = (tag: ShopKhachHangTag) => {
    setEditingId(tag.id);
    setEditName(tag.ten);
    setEditColor(resolveRoomTagColor(tag.id, tag.mau));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = async () => {
    if (!editingId || busy || submitting) return;
    const ten = editName.trim();
    if (!ten) return;
    const current = tags.find((t) => t.id === editingId);
    if (!current) return;

    const patch: { ten?: string; mau?: string | null } = {};
    if (ten !== current.ten) patch.ten = ten;
    const currentColor = resolveRoomTagColor(current.id, current.mau);
    if (editColor !== currentColor) patch.mau = editColor;
    if (patch.ten === undefined && patch.mau === undefined) {
      cancelEdit();
      return;
    }

    setSubmitting(true);
    try {
      const updated = await onUpdateTag(editingId, patch);
      if (updated) cancelEdit();
    } finally {
      setSubmitting(false);
    }
  };

  const selectedColor = selectedTag
    ? resolveRoomTagColor(selectedTag.id, selectedTag.mau)
    : null;

  const trigger = (
    <button
      type="button"
      className={`cins-chat-khach-tag-trigger${selectedTag ? "" : " is-empty"}${open ? " is-open" : ""}`}
      style={
        selectedColor
          ? roomTagChipStyle(selectedColor, { active: open })
          : undefined
      }
      aria-label={
        selectedTag
          ? `Thẻ: ${selectedTag.ten}. Đổi thẻ phân loại`
          : "Thêm thẻ phân loại khách hàng"
      }
      title={selectedTag ? selectedTag.ten : "Thẻ phân loại"}
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      aria-haspopup="dialog"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenChange(!open);
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {selectedTag && selectedColor ? (
        <span
          className="cins-chat-khach-tag-dot"
          style={{ background: open ? "#fff" : selectedColor }}
          aria-hidden
        />
      ) : (
        <Tags size={14} strokeWidth={1.9} aria-hidden />
      )}
      <span className="cins-chat-khach-tag-trigger-label">
        {selectedTag ? selectedTag.ten : "Thẻ"}
      </span>
      <ChevronDown size={12} strokeWidth={2.2} aria-hidden />
    </button>
  );

  return (
    <div className="cins-chat-khach-tag-wrap" ref={rootRef}>
      {trigger}
      {open ? (
        <div
          id={panelId}
          className={`cins-chat-khach-tag-popover${managing ? " is-managing" : ""}`}
          role="dialog"
          aria-label="Thẻ phân loại khách hàng"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <header className="cins-chat-khach-tag-popover-head">
            <strong>{managing ? "Sửa thẻ" : "Thẻ phân loại"}</strong>
            <button
              type="button"
              className={`cins-chat-icon-btn is-plain${managing ? " is-active" : ""}`}
              aria-label={managing ? "Xong sửa thẻ" : "Sửa danh sách thẻ"}
              title={managing ? "Xong" : "Sửa thẻ"}
              aria-pressed={managing}
              onClick={() => {
                setEditingId(null);
                setManaging((v) => !v);
              }}
            >
              {managing ? (
                <Check size={14} strokeWidth={2.2} aria-hidden />
              ) : (
                <Pencil size={14} strokeWidth={1.9} aria-hidden />
              )}
            </button>
          </header>

          {tags.length === 0 ? (
            <p className="cins-chat-khach-tag-empty">Chưa có thẻ nào.</p>
          ) : (
            <ul className="cins-chat-khach-tag-list" role="listbox">
              {tags.map((tag) => {
                const color = resolveRoomTagColor(tag.id, tag.mau);
                const selected = selectedTagId === tag.id;
                const isEditing = managing && editingId === tag.id;

                if (isEditing) {
                  return (
                    <li key={tag.id}>
                      <div className="cins-chat-khach-tag-edit-panel">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={40}
                          aria-label={`Sửa tên thẻ ${tag.ten}`}
                          disabled={busy || submitting}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void saveEdit();
                            }
                          }}
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
                              aria-selected={editColor === c}
                              className={`cins-chat-khach-tag-swatch${editColor === c ? " is-active" : ""}`}
                              style={{ background: c }}
                              onClick={() => setEditColor(c)}
                              disabled={busy || submitting}
                            />
                          ))}
                        </div>
                        <div className="cins-chat-khach-tag-edit-actions">
                          <button
                            type="button"
                            className="cins-chat-khach-tag-edit-cancel"
                            disabled={busy || submitting}
                            onClick={cancelEdit}
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            className="cins-chat-khach-tag-edit-save"
                            disabled={
                              busy || submitting || !editName.trim()
                            }
                            onClick={() => void saveEdit()}
                          >
                            Lưu
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={tag.id}>
                    <div className="cins-chat-khach-tag-row">
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`cins-chat-khach-tag-toggle${selected ? " is-selected" : ""}`}
                        style={roomTagChipStyle(color, {
                          active: selected && !managing,
                        })}
                        disabled={busy || submitting}
                        onClick={() => {
                          if (managing) {
                            startEdit(tag);
                            return;
                          }
                          handleSelect(tag.id);
                        }}
                      >
                        <span
                          className="cins-chat-khach-tag-dot"
                          style={{
                            background:
                              selected && !managing ? "#fff" : color,
                          }}
                          aria-hidden
                        />
                        <span>{tag.ten}</span>
                        {!managing && selected ? (
                          <Check size={12} strokeWidth={2.4} aria-hidden />
                        ) : null}
                      </button>
                      {managing ? (
                        <>
                          <button
                            type="button"
                            className="cins-chat-khach-tag-edit"
                            aria-label={`Sửa thẻ ${tag.ten}`}
                            title="Sửa"
                            disabled={busy || submitting}
                            onClick={() => startEdit(tag)}
                          >
                            <Pencil size={13} strokeWidth={1.9} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="cins-chat-khach-tag-delete"
                            aria-label={`Xóa thẻ ${tag.ten}`}
                            title="Xóa thẻ"
                            disabled={busy || submitting}
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
                        </>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {!managing && selectedTagId ? (
            <button
              type="button"
              className="cins-chat-khach-tag-clear"
              disabled={busy || submitting}
              onClick={() => {
                onSelectTag(null);
                onOpenChange(false);
              }}
            >
              Gỡ thẻ
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
