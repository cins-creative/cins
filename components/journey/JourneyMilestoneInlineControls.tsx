"use client";

import { Check, SlidersHorizontal, Users, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import {
  graduateCongDongMilestoneAction,
  updateForeignMilestoneJourneyVisibility,
  updateMilestoneType,
  updateMilestoneVisibility,
  updateMilestoneVisibilityCustom,
} from "@/app/[slug]/journey/actions";
import { CongDongGraduateConfirmModal } from "@/components/journey/CongDongGraduateConfirmModal";
import { MilestonePersonalFilterOptions } from "@/components/journey/MilestonePersonalFilterOptions";
import { MilestoneVisibilityCustomModal } from "@/components/journey/MilestoneVisibilityCustomModal";
import type {
  MilestoneType,
  MilestoneVisibility,
  MilestoneVisibilityCustom,
} from "@/components/journey/milestone-types";
import { useMilestonePersonalFilterAttach } from "@/components/journey/useMilestonePersonalFilterAttach";
import { CONG_DONG_PERSONAL_FILTER_SLUG } from "@/lib/filter/cong-dong-personal-filter.shared";
import { isTypeMirrorPersonalFilterSlug } from "@/lib/filter/default-personal-filters.shared";
import type { LoaiMoc, Visibility } from "@/lib/editor/types";
import { dispatchMilestoneInlinePatch } from "@/lib/journey/milestone-inline-patch";
import { milestoneVisibilityHint } from "@/lib/journey/milestone-visibility-hints";
import { VISIBILITY_CUSTOM_BASE } from "@/lib/journey/milestone-visibility-custom.shared";
import { mapCheDoToMilestoneVisibility } from "@/lib/journey/milestone-ui-map";

const MENU_MIN_WIDTH = 168;
const VIS_HINT_TIP_W = 248;
const VIS_HINT_TIP_EST_H = 72;
const VIS_HINT_TIP_Z = 9700;

function computeVisHintPosition(
  rect: DOMRect,
  size: { width: number; height: number },
): { top: number; left: number } {
  const margin = 8;
  const gap = 10;
  const { width, height } = size;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = rect.left - width - gap;
  if (left < margin) {
    left = rect.right + gap;
  }
  left = Math.max(margin, Math.min(left, vw - width - margin));

  let top = rect.top + (rect.height - height) / 2;
  top = Math.max(margin, Math.min(top, vh - height - margin));

  return { top, left };
}

function InlineControlVisibilityOption({
  option,
  active,
  pending,
  portalReady,
  hint,
  onChoose,
  allowReselect = false,
}: {
  option: VisibilityOption;
  active: boolean;
  pending: boolean;
  portalReady: boolean;
  hint: string;
  onChoose: () => void;
  allowReselect?: boolean;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [hintPos, setHintPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const hintId = useId();

  const showHint = Boolean(hint && hintPos && portalReady);

  const revealHint = () => {
    const wrap = wrapRef.current;
    if (!wrap || !hint) return;
    const rect = wrap.getBoundingClientRect();
    setHintPos(
      computeVisHintPosition(rect, {
        width: VIS_HINT_TIP_W,
        height: VIS_HINT_TIP_EST_H,
      }),
    );
  };

  return (
    <>
      <span
        ref={wrapRef}
        className="j-inline-control-option-wrap"
        onMouseEnter={revealHint}
        onMouseLeave={() => setHintPos(null)}
        onFocus={revealHint}
        onBlur={() => setHintPos(null)}
      >
        <button
          type="button"
          className={`j-inline-control-option${active ? " is-active" : ""}`}
          role="menuitemradio"
          aria-checked={active}
          aria-describedby={showHint ? hintId : undefined}
          disabled={pending || (active && !allowReselect)}
          onClick={(event) => {
            event.stopPropagation();
            onChoose();
          }}
        >
          <option.Icon size={14} strokeWidth={1.8} aria-hidden />
          <span>{option.label}</span>
          {active ? (
            <Check size={13} strokeWidth={2.1} aria-hidden />
          ) : null}
        </button>
      </span>
      {showHint
        ? createPortal(
            <div
              id={hintId}
              className="j-inline-control-hint"
              role="tooltip"
              style={{
                position: "fixed",
                top: hintPos!.top,
                left: hintPos!.left,
                width: VIS_HINT_TIP_W,
                zIndex: VIS_HINT_TIP_Z,
              }}
            >
              {hint}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

type TypeOption = {
  ui: MilestoneType;
  db: LoaiMoc;
  label: string;
  Icon: LucideIcon;
};

type VisibilityOption = {
  ui: MilestoneVisibility;
  db: Visibility;
  label: string;
  Icon: LucideIcon;
};

type ForeignJourneyContext = {
  variant: "tagged" | "bookmark" | "org_tagged";
  cotMocId: string;
  tacPhamId?: string;
};

type CongDongContext = {
  orgName?: string | null;
  orgSlug?: string | null;
  orgAvatarUrl?: string | null;
  orgCoverUrl?: string | null;
  orgInitial?: string | null;
  postTitle?: string | null;
};

type GraduateIntent =
  | { kind: "type"; loaiMoc: LoaiMoc; uiType: MilestoneType }
  | { kind: "personalFilter"; slug: string }
  | { kind: "visibility"; ui: MilestoneVisibility; db: Visibility };

type Props =
  | {
      kind: "type";
      milestoneId: string;
      current: MilestoneType;
      options: ReadonlyArray<TypeOption>;
      personalFilterSlugs?: string[];
      congDongPost?: CongDongContext;
      children: ReactNode;
    }
  | {
      kind: "visibility";
      milestoneId: string;
      current: MilestoneVisibility;
      options: ReadonlyArray<VisibilityOption>;
      visibilityCustom?: MilestoneVisibilityCustom | null;
      foreignJourney?: ForeignJourneyContext;
      congDongPost?: CongDongContext;
      children: ReactNode;
    };

function notifyTimelineChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("cins:journey-timeline-changed"));
  window.dispatchEvent(new CustomEvent("cins:journey-gallery-sync"));
}

export function JourneyMilestoneInlineControls(props: Props) {
  const router = useRouter();
  const isCongDongPost = Boolean(props.congDongPost);
  const graduateOrgPreview = props.congDongPost
    ? {
        name: props.congDongPost.orgName ?? "Cộng đồng",
        postTitle: props.congDongPost.postTitle,
        slug: props.congDongPost.orgSlug,
        avatarUrl: props.congDongPost.orgAvatarUrl,
        coverUrl: props.congDongPost.orgCoverUrl,
        initial: props.congDongPost.orgInitial,
      }
    : null;
  const showPersonalFilters =
    props.kind === "type" && props.personalFilterSlugs !== undefined;
  const personalAttach = useMilestonePersonalFilterAttach(
    props.milestoneId,
    showPersonalFilters ? (props.personalFilterSlugs ?? []) : [],
  );
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const [graduateIntent, setGraduateIntent] = useState<GraduateIntent | null>(
    null,
  );
  const [graduateError, setGraduateError] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const updateMenuPosition = () => {
    const btn = triggerRef.current;
    if (!btn) {
      setMenuStyle(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    setMenuStyle({
      top: rect.bottom + 8,
      left: Math.max(8, rect.right - MENU_MIN_WIDTH),
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const timerId = window.setTimeout(() => {
      document.addEventListener("mousedown", onDoc);
    }, 0);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const chooseType = (option: TypeOption) => {
    if (props.kind !== "type") return;
    if (option.ui === props.current && !isCongDongPost) return;
    if (pending || personalAttach.pending) return;

    setOpen(false);

    if (isCongDongPost) {
      setGraduateError(null);
      setGraduateIntent({ kind: "type", loaiMoc: option.db, uiType: option.ui });
      return;
    }

    const previousType = props.current;

    dispatchMilestoneInlinePatch({
      milestoneId: props.milestoneId,
      kind: "type",
      value: option.ui,
    });

    startTransition(async () => {
      const res = await updateMilestoneType(props.milestoneId, option.db);
      if (!res.ok) {
        dispatchMilestoneInlinePatch({
          milestoneId: props.milestoneId,
          kind: "type",
          value: previousType,
        });
        return;
      }
      notifyTimelineChanged();
      router.refresh();
    });
  };

  const choosePersonalFilter = (slug: string) => {
    if (props.kind !== "type" || pending || personalAttach.pending) return;

    if (isCongDongPost) {
      if (slug === CONG_DONG_PERSONAL_FILTER_SLUG) return;
      setOpen(false);
      setGraduateError(null);
      setGraduateIntent({ kind: "personalFilter", slug });
      return;
    }

    const isActive = personalAttach.selectedSlug === slug;
    setOpen(false);

    if (isActive) {
      void personalAttach.clear();
      return;
    }

    void personalAttach.select(slug);
  };

  const chooseVisibility = (option: VisibilityOption) => {
    if (props.kind !== "visibility") return;
    const alreadyActive =
      !props.visibilityCustom && option.ui === props.current;
    if (pending || alreadyActive) return;

    setOpen(false);

    if (isCongDongPost) {
      setGraduateError(null);
      setGraduateIntent({
        kind: "visibility",
        ui: option.ui,
        db: option.db,
      });
      return;
    }

    const previous = props.current;
    const previousCustom = props.visibilityCustom ?? null;
    dispatchMilestoneInlinePatch({
      milestoneId: props.milestoneId,
      kind: "visibility",
      value: option.ui,
      visibilityCustom: null,
    });

    startTransition(async () => {
      const res = props.foreignJourney
        ? await updateForeignMilestoneJourneyVisibility({
            variant: props.foreignJourney.variant,
            cotMocId: props.foreignJourney.cotMocId,
            tacPhamId: props.foreignJourney.tacPhamId,
            visibility: option.db,
          })
        : await updateMilestoneVisibility(props.milestoneId, option.db);
      if (!res.ok) {
        dispatchMilestoneInlinePatch({
          milestoneId: props.milestoneId,
          kind: "visibility",
          value: previous,
          visibilityCustom: previousCustom,
        });
        return;
      }
      notifyTimelineChanged();
      router.refresh();
    });
  };

  const openCustomVisibility = () => {
    if (props.kind !== "visibility") return;
    if (props.foreignJourney) return;
    setOpen(false);
    setCustomError(null);
    setCustomOpen(true);
  };

  const saveCustomVisibility = async (payload: {
    mode: "chan" | "cho_phep";
    people: NonNullable<MilestoneVisibilityCustom>["people"];
  }) => {
    if (props.kind !== "visibility" || pending) return;
    const previous = props.current;
    const previousCustom = props.visibilityCustom ?? null;
    const nextVis = mapCheDoToMilestoneVisibility(
      VISIBILITY_CUSTOM_BASE[payload.mode],
    );
    const nextCustom: MilestoneVisibilityCustom = {
      mode: payload.mode,
      people: payload.people,
    };

    dispatchMilestoneInlinePatch({
      milestoneId: props.milestoneId,
      kind: "visibility",
      value: nextVis,
      visibilityCustom: nextCustom,
    });

    startTransition(async () => {
      setCustomError(null);
      const res = await updateMilestoneVisibilityCustom({
        milestoneId: props.milestoneId,
        mode: payload.mode,
        peopleIds: payload.people.map((p) => p.id),
      });
      if (!res.ok) {
        dispatchMilestoneInlinePatch({
          milestoneId: props.milestoneId,
          kind: "visibility",
          value: previous,
          visibilityCustom: previousCustom,
        });
        setCustomError(res.error ?? "Không lưu được tùy chỉnh.");
        return;
      }
      setCustomOpen(false);
      notifyTimelineChanged();
      router.refresh();
    });
  };

  const confirmGraduate = () => {
    if (!graduateIntent || pending) return;

    startTransition(async () => {
      setGraduateError(null);
      const input: Parameters<typeof graduateCongDongMilestoneAction>[0] = {
        milestoneId: props.milestoneId,
      };

      if (graduateIntent.kind === "type") {
        input.loaiMoc = graduateIntent.loaiMoc;
        input.visibility = "public";
        dispatchMilestoneInlinePatch({
          milestoneId: props.milestoneId,
          kind: "type",
          value: graduateIntent.uiType,
        });
        dispatchMilestoneInlinePatch({
          milestoneId: props.milestoneId,
          kind: "visibility",
          value: "public",
        });
        dispatchMilestoneInlinePatch({
          milestoneId: props.milestoneId,
          kind: "personalFilters",
          value: [],
          personalFilters: [],
        });
      } else if (graduateIntent.kind === "personalFilter") {
        input.personalFilterSlug = graduateIntent.slug;
        input.visibility = "public";
        dispatchMilestoneInlinePatch({
          milestoneId: props.milestoneId,
          kind: "visibility",
          value: "public",
        });
        dispatchMilestoneInlinePatch({
          milestoneId: props.milestoneId,
          kind: "personalFilters",
          value: [graduateIntent.slug],
        });
      } else {
        input.visibility = graduateIntent.db;
        dispatchMilestoneInlinePatch({
          milestoneId: props.milestoneId,
          kind: "visibility",
          value: graduateIntent.ui,
        });
        dispatchMilestoneInlinePatch({
          milestoneId: props.milestoneId,
          kind: "personalFilters",
          value: [],
          personalFilters: [],
        });
      }

      const res = await graduateCongDongMilestoneAction(input);
      if (!res.ok) {
        setGraduateError(res.error ?? "Không gỡ được khỏi cộng đồng.");
        return;
      }

      setGraduateIntent(null);
      notifyTimelineChanged();
      router.refresh();
    });
  };

  const attachFilters = personalAttach.filters.filter((f) => {
    /* Cùng menu với «Loại cột mốc» — ẩn nhãn hệ thống trùng tên loại. */
    if (props.kind === "type" && isTypeMirrorPersonalFilterSlug(f.slug)) {
      return false;
    }
    return true;
  });

  const showPersonalFilterSection =
    showPersonalFilters &&
    personalAttach.canAttach &&
    attachFilters.length > 0;

  const menu =
    open && menuStyle ? (
      <div
        ref={menuRef}
        className="j-inline-control-menu is-portal"
        role="menu"
        style={{
          position: "fixed",
          top: menuStyle.top,
          left: menuStyle.left,
          minWidth: MENU_MIN_WIDTH,
          zIndex: 9600,
        }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {props.kind === "type" ? (
          <>
            {isCongDongPost ? (
              <>
                <button
                  type="button"
                  className="j-inline-control-option is-active"
                  role="menuitemradio"
                  aria-checked
                  disabled
                >
                  <Users size={14} strokeWidth={1.8} aria-hidden />
                  <span>Cộng đồng</span>
                  <Check size={13} strokeWidth={2.1} aria-hidden />
                </button>
                <div className="j-inline-control-divider" aria-hidden />
              </>
            ) : null}
            <div className="j-inline-control-section-label">Loại cột mốc</div>
            {props.options.map((option) => {
              const active = !isCongDongPost && option.ui === props.current;
              return (
                <button
                  key={option.ui}
                  type="button"
                  className={`j-inline-control-option${active ? " is-active" : ""}`}
                  role="menuitemradio"
                  aria-checked={active}
                  disabled={pending || personalAttach.pending}
                  onClick={(event) => {
                    event.stopPropagation();
                    chooseType(option);
                  }}
                >
                  <option.Icon size={14} strokeWidth={1.8} aria-hidden />
                  <span>{option.label}</span>
                  {active ? (
                    <Check size={13} strokeWidth={2.1} aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </>
        ) : (
          <>
            {props.options.map((option) => {
              const active =
                !props.visibilityCustom && option.ui === props.current;
              const hintContext = props.foreignJourney ? "foreign" : "self";
              return (
                <InlineControlVisibilityOption
                  key={option.ui}
                  option={option}
                  active={active}
                  pending={pending}
                  portalReady={portalReady}
                  hint={milestoneVisibilityHint(option.db, hintContext)}
                  onChoose={() => chooseVisibility(option)}
                />
              );
            })}
            {!props.foreignJourney ? (
              <InlineControlVisibilityOption
                option={{
                  ui: "private",
                  db: "chi_minh",
                  label: "Tùy chỉnh",
                  Icon: SlidersHorizontal,
                }}
                active={Boolean(props.visibilityCustom)}
                pending={pending}
                portalReady={portalReady}
                hint={milestoneVisibilityHint("tuy_chinh")}
                onChoose={openCustomVisibility}
                allowReselect
              />
            ) : null}
          </>
        )}
        {showPersonalFilterSection ? (
          <>
            <div className="j-inline-control-divider" aria-hidden />
            <div className="j-inline-control-section-label">Nhãn riêng</div>
            <MilestonePersonalFilterOptions
              variant="inline"
              filters={attachFilters}
              selectedSlug={
                isCongDongPost ? CONG_DONG_PERSONAL_FILTER_SLUG : personalAttach.selectedSlug
              }
              pending={personalAttach.pending}
              onSelect={choosePersonalFilter}
            />
          </>
        ) : null}
      </div>
    ) : null;

  return (
    <span
      className="j-inline-control"
      ref={rootRef}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        className="j-inline-control-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        {props.children}
      </button>
      {portalReady && menu ? createPortal(menu, document.body) : null}
      <CongDongGraduateConfirmModal
        open={Boolean(graduateIntent)}
        org={graduateOrgPreview}
        pending={pending}
        error={graduateError}
        onCancel={() => {
          if (pending) return;
          setGraduateIntent(null);
          setGraduateError(null);
        }}
        onConfirm={confirmGraduate}
      />
      {props.kind === "visibility" && !props.foreignJourney ? (
        <MilestoneVisibilityCustomModal
          open={customOpen}
          onClose={() => {
            if (pending) return;
            setCustomOpen(false);
            setCustomError(null);
          }}
          onSave={saveCustomVisibility}
          initial={props.visibilityCustom}
          pending={pending}
          error={customError}
        />
      ) : null}
    </span>
  );
}
