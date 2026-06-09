"use client";

import {
  Award,
  CalendarDays,
  Check,
  ChevronDown,
  GraduationCap,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useOrgBaiDangFilterOptional } from "@/components/truong/OrgBaiDangFilterContext";
import { useBaiDangActions } from "@/components/truong/inline/TruongBaiDangEdit";
import { DEFAULT_FILTER_MAU } from "@/lib/filter/constants";
import {
  BAI_DANG_LOAI_LABELS,
  BAI_DANG_LOAI_VALUES,
  loaiBaiDangCssClass,
  loaiBaiDangLabel,
  normalizeLoaiBaiDang,
  type BaiDangLoai,
} from "@/lib/truong/bai-dang";
import type { TruongBaiDang } from "@/lib/truong/types";

const LOAI_ICON: Record<BaiDangLoai, LucideIcon> = {
  thong_bao: Megaphone,
  tuyen_sinh: GraduationCap,
  hoc_bong: Award,
  su_kien: CalendarDays,
  khac: Megaphone,
};

type Props = {
  post: TruongBaiDang;
};

function badgeClass(lc: string, editable = false): string {
  return [
    "org-baidang-loai-badge",
    `org-baidang-loai-badge--${lc}`,
    editable ? "org-baidang-loai-badge--editable" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function OrgBaiDangLoaiBadge({ post }: Props) {
  const actions = useBaiDangActions();
  const filterCtx = useOrgBaiDangFilterOptional();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const loai = normalizeLoaiBaiDang(post.loai_bai_dang);
  const lc = loaiBaiDangCssClass(post.loai_bai_dang);
  const LoaiIcon = LOAI_ICON[loai];
  const loaiLabel = loaiBaiDangLabel(post.loai_bai_dang);
  /** Menu chỉ một lựa chọn — nhãn riêng hoặc loại bài đăng. */
  const activeNhan = post.personalFilters?.[0] ?? null;
  const displayLabel = activeNhan ? activeNhan.ten : loaiLabel;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const badgeContent = activeNhan ? (
    <>
      <span
        className="org-baidang-loai-badge-dot"
        style={{ background: activeNhan.mau ?? DEFAULT_FILTER_MAU }}
        aria-hidden
      />
      <span className="org-baidang-loai-badge-label">{displayLabel}</span>
    </>
  ) : (
    <>
      <span className="org-baidang-loai-badge-icon" aria-hidden>
        <LoaiIcon size={13} strokeWidth={2} />
      </span>
      <span className="org-baidang-loai-badge-label">{displayLabel}</span>
    </>
  );

  if (!actions) {
    return <span className={badgeClass(lc)}>{badgeContent}</span>;
  }

  return (
    <div
      className={`org-baidang-loai-picker${open ? " is-open" : ""}`}
      ref={wrapRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={badgeClass(lc, true)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Nhãn bài đăng: ${displayLabel}. Chọn nhãn khác`}
        onClick={() => setOpen((v) => !v)}
      >
        {badgeContent}
        <ChevronDown
          size={14}
          strokeWidth={2}
          className="org-baidang-loai-badge-caret"
          aria-hidden
        />
      </button>
      <div className="org-baidang-loai-menu" role="menu">
        <p className="org-baidang-loai-menu-title">Loại bài đăng</p>
        {BAI_DANG_LOAI_VALUES.map((value) => {
          const Icon = LOAI_ICON[value];
          const optLc = loaiBaiDangCssClass(value);
          const active = !activeNhan && loai === value;
          return (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              className={`org-baidang-loai-menu-item${active ? " is-active" : ""}`}
              onClick={() => {
                setOpen(false);
                if (activeNhan) {
                  void actions.updatePersonalFilters(post.id, []).then(() => {
                    if (loai !== value) {
                      void actions.updateLoaiBaiDang(post.id, value);
                    }
                  });
                  return;
                }
                if (loai !== value) {
                  void actions.updateLoaiBaiDang(post.id, value);
                }
              }}
            >
              <span
                className={`org-baidang-loai-menu-icon org-baidang-loai-badge--${optLc}`}
                aria-hidden
              >
                <Icon size={14} strokeWidth={2} />
              </span>
              <span className="org-baidang-loai-menu-label">
                {BAI_DANG_LOAI_LABELS[value]}
              </span>
              {active ? (
                <Check
                  size={15}
                  strokeWidth={2.5}
                  className="org-baidang-loai-menu-check"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
        {actions && filterCtx && filterCtx.filters.length > 0 ? (
          <>
            <div className="org-baidang-loai-menu-divider" aria-hidden />
            <p className="org-baidang-loai-menu-title">Nhãn riêng</p>
            {filterCtx.filters.map((filter) => {
              const active = activeNhan?.id === filter.id;
              const mau = filter.mau ?? DEFAULT_FILTER_MAU;
              return (
                <button
                  key={filter.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  className={`org-baidang-loai-menu-item${active ? " is-active" : ""}`}
                  onClick={() => {
                    setOpen(false);
                    void actions.updatePersonalFilters(
                      post.id,
                      active ? [] : [filter.id],
                    );
                  }}
                >
                  <span
                    className="org-baidang-loai-menu-dot"
                    style={{ background: mau }}
                    aria-hidden
                  />
                  <span className="org-baidang-loai-menu-label">{filter.ten}</span>
                  {active ? (
                    <Check
                      size={15}
                      strokeWidth={2.5}
                      className="org-baidang-loai-menu-check"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </>
        ) : null}
      </div>
    </div>
  );
}
