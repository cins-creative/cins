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
  Tag,
  Trash2,
  UserCircle2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  deleteMilestone,
  updateForeignMilestoneJourneyVisibility,
  updateMilestoneType,
  updateMilestoneVisibility,
} from "@/app/[slug]/journey/actions";
import { useJourneyCompose } from "@/components/journey/JourneyComposeContext";
import type {
  MilestoneType,
  MilestoneVisibility,
} from "@/components/journey/milestone-types";
import type { LoaiMoc, Visibility } from "@/lib/editor/types";
import { JOURNEY_MILESTONE_TYPE_OPTIONS } from "@/lib/journey/milestone-type-options";
import { MilestonePersonalFilterOptions } from "@/components/journey/MilestonePersonalFilterOptions";
import { useMilestonePersonalFilterAttach } from "@/components/journey/useMilestonePersonalFilterAttach";
import { dispatchMilestoneInlinePatch } from "@/lib/journey/milestone-inline-patch";

type Props = {
  milestoneId: string;
  ownerSlug: string;
  /** Slug dùng cho permalink bài (mặc định = ownerSlug; bookmark → tác giả gốc). */
  permalinkOwnerSlug?: string | null;
  /** Loại hiện tại (UI value) — dùng để highlight option đang chọn. */
  currentType: MilestoneType;
  /** Chế độ hiển thị hiện tại (UI value). */
  currentVisibility: MilestoneVisibility;
  /** Slug của tác phẩm đầu tiên gắn vào cột mốc — null = không có bài viết. */
  postSlug: string | null;
  /** Ẩn đổi nhóm filter (cột mốc Lưu về). */
  hideTypeChange?: boolean;
  /** Ẩn sửa bài (không sửa bài người khác từ Journey Lưu về). */
  hideEdit?: boolean;
  /** Ẩn xoá cột mốc (bài được người khác gắn lên Journey). */
  hideDelete?: boolean;
  /** Gọi sau khi đổi loại/hiển thị/xoá thành công (vd. refetch modal post). */
  onAfterChange?: () => void;
  /** Tagged / Lưu về — đổi hiển thị trên Journey của viewer. */
  foreignJourney?: {
    variant: "tagged" | "bookmark";
    cotMocId: string;
    tacPhamId: string;
  };
  /** Class wrapper — vd. `post-byline-menu` trong JourneyPostBody. */
  className?: string;
  /** Nhãn lọc đang gắn — để gán/bỏ trong menu. */
  personalFilterSlugs?: string[];
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

type SubMenu = "none" | "type" | "visibility" | "personalFilter";

const TYPE_OPTIONS = JOURNEY_MILESTONE_TYPE_OPTIONS;

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
    label: "Bạn bè",
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
  permalinkOwnerSlug,
  currentType,
  currentVisibility,
  postSlug,
  hideTypeChange = false,
  hideEdit = false,
  hideDelete = false,
  onAfterChange,
  foreignJourney,
  className,
  personalFilterSlugs = [],
}: Props) {
  const router = useRouter();
  const personalAttach = useMilestonePersonalFilterAttach(
    milestoneId,
    foreignJourney ? [] : personalFilterSlugs,
  );
  const { openCompose, canCompose } = useJourneyCompose();
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
    const option = TYPE_OPTIONS.find((o) => o.db === db);
    if (!option || option.ui === currentType) return;
    if (pending || personalAttach.pending) return;

    const previous = currentType;
    setError(null);
    close();

    dispatchMilestoneInlinePatch({
      milestoneId,
      kind: "type",
      value: option.ui,
    });

    startTransition(async () => {
      const res = await updateMilestoneType(milestoneId, db);
      if (!res.ok) {
        setError(res.error);
        dispatchMilestoneInlinePatch({
          milestoneId,
          kind: "type",
          value: previous,
        });
        return;
      }
      router.refresh();
      onAfterChange?.();
    });
  }

  function handleSelectPersonalFilter(slug: string) {
    if (pending || personalAttach.pending) return;
    setError(null);
    close();
    if (personalAttach.selectedSlug === slug) {
      void personalAttach.clear();
      return;
    }
    void personalAttach.select(slug);
  }

  function handleChangeVisibility(db: Visibility) {
    const option = VIS_OPTIONS.find((o) => o.db === db);
    if (!option || option.ui === currentVisibility) return;
    const previous = currentVisibility;
    setError(null);
    close();
    dispatchMilestoneInlinePatch({
      milestoneId,
      kind: "visibility",
      value: option.ui,
    });
    startTransition(async () => {
      const res = foreignJourney
        ? await updateForeignMilestoneJourneyVisibility({
            variant: foreignJourney.variant,
            cotMocId: foreignJourney.cotMocId,
            tacPhamId: foreignJourney.tacPhamId,
            visibility: db,
          })
        : await updateMilestoneVisibility(milestoneId, db);
      if (!res.ok) {
        setError(res.error);
        dispatchMilestoneInlinePatch({
          milestoneId,
          kind: "visibility",
          value: previous,
        });
        return;
      }
      router.refresh();
      onAfterChange?.();
    });
  }

  const visibilityOptions = foreignJourney
    ? VIS_OPTIONS.filter((opt) => opt.ui !== "unlisted").map((opt) =>
        opt.ui === "private"
          ? {
              ...opt,
              label: "Ẩn khỏi Journey",
              desc: "Chỉ ẩn trên Journey của bạn",
            }
          : opt,
      )
    : VIS_OPTIONS;

  function handleDelete() {
    setError(null);
    close();

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cins:milestone-deleted", {
          detail: { milestoneId, ownerSlug },
        }),
      );
    }

    void (async () => {
      const res = await deleteMilestone(milestoneId);
      if (!res.ok) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("cins:milestone-delete-failed", {
              detail: { milestoneId, ownerSlug, error: res.error },
            }),
          );
        }
        return;
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("cins:journey-gallery-sync", {
            detail: { ownerSlug },
          }),
        );
      }

      const onPostPage =
        typeof window !== "undefined" &&
        window.location.pathname.startsWith(`/${ownerSlug}/p/`);
      if (onPostPage) {
        router.push(`/${ownerSlug}`);
      }
      onAfterChange?.();
    })();
  }

  const linkOwnerSlug = permalinkOwnerSlug || ownerSlug;
  const editHref =
    !hideEdit && postSlug !== null && postSlug.length > 0
      ? `/${linkOwnerSlug}/p/${postSlug}/edit`
      : null;
  const viewHref =
    postSlug !== null && postSlug.length > 0
      ? `/${linkOwnerSlug}/p/${postSlug}`
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
      className={className ? `j-m-menu ${className}` : "j-m-menu"}
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
          {!hideEdit ? (
            postSlug ? (
              <button
                type="button"
                className="j-m-menu-item"
                role="menuitem"
                onClick={() => {
                  close();
                  if (canCompose) {
                    openCompose({ kind: "edit", postSlug });
                  } else if (editHref) {
                    window.location.href = editHref;
                  }
                }}
              >
                <span className="j-m-menu-ico" aria-hidden>
                  <Pencil size={14} strokeWidth={1.7} />
                </span>
                <span className="j-m-menu-lbl">Sửa bài viết</span>
              </button>
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
            )
          ) : null}

          {/* Đổi nhóm filter */}
          {!hideTypeChange ? (
            <>
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
                        disabled={pending || personalAttach.pending}
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
            </>
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
              {visibilityOptions.map((opt) => {
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

          {!foreignJourney && personalAttach.canAttach ? (
            <>
              <button
                type="button"
                className={`j-m-menu-item ${sub === "personalFilter" ? "is-open" : ""}`}
                role="menuitem"
                onClick={() =>
                  setSub(sub === "personalFilter" ? "none" : "personalFilter")
                }
              >
                <span className="j-m-menu-ico" aria-hidden>
                  <Tag size={14} strokeWidth={1.7} />
                </span>
                <span className="j-m-menu-lbl">Nhãn riêng</span>
                <span className="j-m-menu-chev" aria-hidden>
                  <ChevronRight size={14} strokeWidth={1.8} />
                </span>
              </button>
              {sub === "personalFilter" ? (
                <div className="j-m-submenu">
                  <MilestonePersonalFilterOptions
                    variant="submenu"
                    filters={personalAttach.filters}
                    selectedSlug={personalAttach.selectedSlug}
                    pending={personalAttach.pending}
                    onSelect={handleSelectPersonalFilter}
                  />
                </div>
              ) : null}
            </>
          ) : null}

          {hideDelete ? null : (
            <>
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
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
