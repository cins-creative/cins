"use client";

import { Pencil, Settings2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  khoaTen: string;
  onManage: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function KhoaHocCardMenu({
  khoaTen,
  onManage,
  onEdit,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className={`cso-kh-card-menu-wrap${open ? " open" : ""}`}
    >
      <button
        type="button"
        className="cso-kh-card-menu"
        aria-label={`Tuỳ chọn khóa ${khoaTen}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span className="cso-kh-card-menu-dots" aria-hidden>
          ···
        </span>
      </button>
      {open ? (
        <div
          className="cso-kh-card-menu-pop"
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className="cso-kh-card-menu-item"
            onClick={() => {
              setOpen(false);
              onManage();
            }}
          >
            <Settings2 size={14} aria-hidden />
            Quản lý khóa học
          </button>
          <button
            type="button"
            role="menuitem"
            className="cso-kh-card-menu-item"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            <Pencil size={14} aria-hidden />
            Sửa thông tin
          </button>
          <button
            type="button"
            role="menuitem"
            className="cso-kh-card-menu-item cso-kh-card-menu-item--danger"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            <Trash2 size={14} aria-hidden />
            Xóa khóa học
          </button>
        </div>
      ) : null}
    </div>
  );
}
