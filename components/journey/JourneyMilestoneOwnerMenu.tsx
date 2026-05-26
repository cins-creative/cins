"use client";

import {
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  ChevronRight,
  ExternalLink,
  Eye,
  FolderKanban,
  Globe,
  Link2,
  Lock,
  MoreVertical,
  Pencil,
  Star,
  Trash2,
  Trophy,
  UserCircle2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  deleteMilestone,
  updateMilestoneType,
  updateMilestoneVisibility,
} from "@/app/[slug]/journey/actions";
import type {
  MilestoneType,
  MilestoneVisibility,
} from "@/components/journey/milestone-types";
import type { LoaiMoc, Visibility } from "@/lib/editor/types";

type Props = {
  milestoneId: string;
  ownerSlug: string;
  /** Loại hiện tại (UI value) — dùng để highlight option đang chọn. */
  currentType: MilestoneType;
  /** Chế độ hiển thị hiện tại (UI value). */
  currentVisibility: MilestoneVisibility;
  /** Slug của tác phẩm đầu tiên gắn vào cột mốc — null = không có bài viết. */
  postSlug: string | null;
};

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ JourneyMilestoneOwnerMenu — kebab (3 chấm) trên góc phải card.   ║
   ║                                                                  ║
   ║ Chỉ render khi viewer là owner. Mở submenu cấp 2 cho "Nhóm" và   ║
   ║ "Hiển thị"; "Sửa bài viết" link sang editor, "Xoá" có confirm.   ║
   ║                                                                  ║
   ║ Click ngoài / Escape → đóng menu. Submenu hover-overlap chống   ║
   ║ flicker bằng `setTimeout(0)` defer cho `onMouseLeave`.            ║
   ╚══════════════════════════════════════════════════════════════════╝ */

type SubMenu = "none" | "type" | "visibility";

const TYPE_OPTIONS: ReadonlyArray<{
  ui: MilestoneType;
  db: LoaiMoc;
  label: string;
  Icon: LucideIcon;
}> = [
  { ui: "hoc", db: "hoc", label: "Học tập", Icon: BookOpen },
  { ui: "lam", db: "lam_viec", label: "Công việc", Icon: Briefcase },
  { ui: "du-an", db: "du_an", label: "Dự án", Icon: FolderKanban },
  { ui: "su-kien", db: "su_kien", label: "Sự kiện", Icon: Calendar },
  { ui: "thanh-tuu", db: "thanh_tuu", label: "Thành tựu", Icon: Trophy },
  { ui: "ca-nhan", db: "ca_nhan", label: "Cá nhân", Icon: UserCircle2 },
];

const VIS_OPTIONS: ReadonlyArray<{
  ui: MilestoneVisibility;
  db: Visibility;
  label: string;
  desc: string;
  Icon: LucideIcon;
}> = [
  {
    ui: "feature",
    db: "feature",
    label: "Nổi bật",
    desc: "Công khai & ghim lên đầu Journey",
    Icon: Star,
  },
  {
    ui: "public",
    db: "public",
    label: "Công khai",
    desc: "Hiện trên Gallery, ai cũng xem được",
    Icon: Globe,
  },
  {
    ui: "unlisted",
    db: "theo_nhom",
    label: "Theo nhóm",
    desc: "Chỉ nhóm bối cảnh được chọn",
    Icon: Users,
  },
  {
    ui: "private",
    db: "chi_minh",
    label: "Chỉ mình tôi",
    desc: "Riêng tư, không ai khác thấy",
    Icon: Lock,
  },
];

export function JourneyMilestoneOwnerMenu({
  milestoneId,
  ownerSlug,
  currentType,
  currentVisibility,
  postSlug,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState<SubMenu>("none");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setSub("none");
    setConfirmDelete(false);
    setError(null);
  }

  function handleChangeType(db: LoaiMoc) {
    setError(null);
    startTransition(async () => {
      const res = await updateMilestoneType(milestoneId, db);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      close();
      router.refresh();
    });
  }

  function handleChangeVisibility(db: Visibility) {
    setError(null);
    startTransition(async () => {
      const res = await updateMilestoneVisibility(milestoneId, db);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      close();
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteMilestone(milestoneId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      close();
      router.refresh();
    });
  }

  const editHref =
    postSlug !== null && postSlug.length > 0
      ? `/${ownerSlug}/p/${postSlug}/edit`
      : null;
  const viewHref =
    postSlug !== null && postSlug.length > 0
      ? `/${ownerSlug}/p/${postSlug}`
      : null;
  const [copied, setCopied] = useState(false);

  function copyLink() {
    if (!viewHref) return;
    /* Build absolute URL từ window.location nếu có (client-only). */
    const base =
      typeof window !== "undefined" ? window.location.origin : "";
    const full = base ? `${base}${viewHref}` : viewHref;
    try {
      navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard API có thể bị block — fallback: prompt user copy thủ công. */
      window.prompt("Sao chép URL bài viết:", full);
    }
  }

  return (
    <div
      className="j-m-menu"
      ref={rootRef}
      /* Chặn bubble lên `.j-milestone` để click vào menu không mở post modal. */
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="j-m-menu-btn"
        aria-label="Mở menu cột mốc"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
          setSub("none");
          setConfirmDelete(false);
        }}
      >
        <MoreVertical size={18} strokeWidth={2} aria-hidden />
      </button>

      {open ? (
        <div className="j-m-menu-pop" role="menu">
          {error ? <div className="j-m-menu-err">{error}</div> : null}

          {/* Mở trang riêng (permalink) */}
          {viewHref ? (
            <a
              href={viewHref}
              className="j-m-menu-item"
              role="menuitem"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => close()}
            >
              <span className="j-m-menu-ico" aria-hidden>
                <ExternalLink size={14} strokeWidth={1.7} />
              </span>
              <span className="j-m-menu-lbl">Mở trang riêng</span>
            </a>
          ) : null}

          {/* Sao chép URL */}
          {viewHref ? (
            <button
              type="button"
              className="j-m-menu-item"
              role="menuitem"
              onClick={copyLink}
            >
              <span className="j-m-menu-ico" aria-hidden>
                <Link2 size={14} strokeWidth={1.7} />
              </span>
              <span className="j-m-menu-lbl">
                {copied ? "Đã sao chép link!" : "Sao chép link"}
              </span>
            </button>
          ) : null}

          {/* Sửa bài viết */}
          {editHref ? (
            <a
              href={editHref}
              className="j-m-menu-item"
              role="menuitem"
              onClick={() => close()}
            >
              <span className="j-m-menu-ico" aria-hidden>
                <Pencil size={14} strokeWidth={1.7} />
              </span>
              <span className="j-m-menu-lbl">Sửa bài viết</span>
            </a>
          ) : (
            <div
              className="j-m-menu-item is-disabled"
              role="menuitem"
              aria-disabled="true"
              title="Cột mốc này chưa có bài viết để sửa."
            >
              <span className="j-m-menu-ico" aria-hidden>
                <Pencil size={14} strokeWidth={1.7} />
              </span>
              <span className="j-m-menu-lbl">Sửa bài viết</span>
              <span className="j-m-menu-hint">không có bài</span>
            </div>
          )}

          {/* Đổi nhóm filter */}
          <button
            type="button"
            className={`j-m-menu-item ${sub === "type" ? "is-open" : ""}`}
            role="menuitem"
            onClick={() => setSub(sub === "type" ? "none" : "type")}
          >
            <span className="j-m-menu-ico" aria-hidden>
              <FolderKanban size={14} strokeWidth={1.7} />
            </span>
            <span className="j-m-menu-lbl">Đổi nhóm filter</span>
            <span className="j-m-menu-chev" aria-hidden>
              <ChevronRight size={14} strokeWidth={1.8} />
            </span>
          </button>
          {sub === "type" ? (
            <div className="j-m-submenu">
              {TYPE_OPTIONS.map((opt) => {
                const active = opt.ui === currentType;
                return (
                  <button
                    key={opt.db}
                    type="button"
                    className={`j-m-submenu-item ${active ? "is-active" : ""}`}
                    role="menuitemradio"
                    aria-checked={active}
                    disabled={pending || active}
                    onClick={() => handleChangeType(opt.db)}
                  >
                    <span className="j-m-menu-ico" aria-hidden>
                      <opt.Icon size={14} strokeWidth={1.7} />
                    </span>
                    <span className="j-m-menu-lbl">{opt.label}</span>
                    {active ? (
                      <span className="j-m-menu-check" aria-hidden>
                        <Check size={14} strokeWidth={2.2} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Đổi chế độ hiển thị */}
          <button
            type="button"
            className={`j-m-menu-item ${sub === "visibility" ? "is-open" : ""}`}
            role="menuitem"
            onClick={() =>
              setSub(sub === "visibility" ? "none" : "visibility")
            }
          >
            <span className="j-m-menu-ico" aria-hidden>
              <Eye size={14} strokeWidth={1.7} />
            </span>
            <span className="j-m-menu-lbl">Chế độ hiển thị</span>
            <span className="j-m-menu-chev" aria-hidden>
              <ChevronRight size={14} strokeWidth={1.8} />
            </span>
          </button>
          {sub === "visibility" ? (
            <div className="j-m-submenu">
              {VIS_OPTIONS.map((opt) => {
                const active = opt.ui === currentVisibility;
                return (
                  <button
                    key={opt.db}
                    type="button"
                    className={`j-m-submenu-item ${active ? "is-active" : ""}`}
                    role="menuitemradio"
                    aria-checked={active}
                    disabled={pending || active}
                    onClick={() => handleChangeVisibility(opt.db)}
                  >
                    <span className="j-m-menu-ico" aria-hidden>
                      <opt.Icon size={14} strokeWidth={1.7} />
                    </span>
                    <span className="j-m-menu-lbl">
                      {opt.label}
                      <span className="j-m-menu-sub">{opt.desc}</span>
                    </span>
                    {active ? (
                      <span className="j-m-menu-check" aria-hidden>
                        <Check size={14} strokeWidth={2.2} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="j-m-menu-sep" aria-hidden />

          {/* Xoá */}
          {confirmDelete ? (
            <div className="j-m-menu-confirm">
              <p className="j-m-menu-confirm-msg">
                Xoá cột mốc này? Bài viết liên kết (nếu có) cũng sẽ bị xoá.
              </p>
              <div className="j-m-menu-confirm-actions">
                <button
                  type="button"
                  className="j-m-menu-confirm-cancel"
                  onClick={() => setConfirmDelete(false)}
                  disabled={pending}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="j-m-menu-confirm-ok"
                  onClick={handleDelete}
                  disabled={pending}
                >
                  {pending ? "Đang xoá…" : "Xoá luôn"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="j-m-menu-item is-danger"
              role="menuitem"
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
            >
              <span className="j-m-menu-ico" aria-hidden>
                <Trash2 size={14} strokeWidth={1.7} />
              </span>
              <span className="j-m-menu-lbl">Xoá cột mốc</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
