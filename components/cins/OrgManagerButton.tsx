"use client";

import {
  Building2,
  PlusCircle,
  Store,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  managedEntityKindLabel,
  type ManagedEntity,
  type ManagedEntityKind,
} from "@/lib/cins/managed-entities-types";
import {
  navigateManageHref,
  webHref,
} from "@/lib/cins/manage-site";
import { OPEN_ACCOUNT_SETTINGS_EVENT } from "@/lib/cins/open-account-settings";
import { computeFixedMenuPosition } from "@/lib/ui/clamp-fixed-menu-position";

import "./org-manager.css";

const MENU_WIDTH = 320;
const MENU_EST_HEIGHT = 360;
const MENU_GAP = 10;
const MENU_MARGIN = 16;
const MOBILE_MQ = "(max-width: 960px)";

const KIND_ORDER: ManagedEntityKind[] = [
  "shop",
  "co_so_dao_tao",
  "studio",
  "cong_dong",
];

const KIND_ICON: Record<ManagedEntityKind, LucideIcon> = {
  shop: Store,
  co_so_dao_tao: Building2,
  studio: Building2,
  cong_dong: Building2,
};

function groupEntities(
  entities: ManagedEntity[],
): Array<{ kind: ManagedEntityKind; items: ManagedEntity[] }> {
  const map = new Map<ManagedEntityKind, ManagedEntity[]>();
  for (const e of entities) {
    const list = map.get(e.kind) ?? [];
    list.push(e);
    map.set(e.kind, list);
  }
  return KIND_ORDER.filter((k) => map.has(k)).map((kind) => ({
    kind,
    items: map.get(kind)!,
  }));
}

type Props = {
  entities: ManagedEntity[];
};

/** Ô botbar «Quản lý tổ chức» — 0 / 1 / ≥2 thực thể. */
export function OrgManagerButton({ entities }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [isMobileOverlay, setIsMobileOverlay] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      navigateManageHref(href, router);
    },
    [router],
  );

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useLayoutEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobileOverlay(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    if (isMobileOverlay) {
      setMenuStyle({ top: 0, left: 0 });
      return;
    }
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setMenuStyle(
      computeFixedMenuPosition(
        rect,
        { width: MENU_WIDTH, height: MENU_EST_HEIGHT },
        { gap: MENU_GAP, margin: MENU_MARGIN },
      ),
    );
  }, [open, isMobileOverlay]);

  useEffect(() => {
    if (!open || !isMobileOverlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobileOverlay]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      if (
        t instanceof Element &&
        t.closest(".org-mgr-overlay-scrim")
      ) {
        setOpen(false);
        return;
      }
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    /* Đợi sau click mở — tránh nuốt cùng pointerdown. */
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* 1 thực thể → đi thẳng. */
  if (entities.length === 1) {
    const only = entities[0]!;
    return (
      <div className="org-mgr">
        <Link
          href={only.href}
          className="org-mgr-trigger"
          aria-label={`Quản lý ${only.ten}`}
          onClick={(e) => {
            e.preventDefault();
            go(only.href);
          }}
        >
          <Building2 size={20} strokeWidth={1.8} aria-hidden />
        </Link>
      </div>
    );
  }

  const groups = groupEntities(entities);
  const isEmpty = entities.length === 0;
  const title = isEmpty ? "Tạo tổ chức hoặc mở shop" : "Tổ chức bạn quản lý";

  const menuBody = isEmpty ? (
    <div className="org-mgr-empty">
      <p className="org-mgr-empty-copy">Bạn chưa quản lý tổ chức nào.</p>
      <Link
        href={webHref("/create-organization")}
        className="org-mgr-empty-btn"
        onClick={() => setOpen(false)}
      >
        <PlusCircle size={16} strokeWidth={2} aria-hidden />
        Tạo tổ chức
      </Link>
      <button
        type="button"
        className="org-mgr-empty-btn is-shop"
        onClick={() => {
          setOpen(false);
          window.dispatchEvent(
            new CustomEvent(OPEN_ACCOUNT_SETTINGS_EVENT, {
              detail: { section: "ban-hang" },
            }),
          );
        }}
      >
        <Store size={16} strokeWidth={2} aria-hidden />
        Mở shop
      </button>
    </div>
  ) : (
    <ul className="org-mgr-list">
      {groups.map(({ kind, items }) => {
        const Icon = KIND_ICON[kind];
        return (
          <li key={kind} className="org-mgr-group">
            <span className="org-mgr-group-label">
              {managedEntityKindLabel(kind)}
            </span>
            <ul className="org-mgr-group-items">
              {items.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className="org-mgr-item"
                    onClick={() => go(e.href)}
                  >
                    <span className="org-mgr-ava" aria-hidden>
                      {e.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.avatarUrl} alt="" />
                      ) : (
                        <Icon size={16} strokeWidth={1.8} />
                      )}
                    </span>
                    <span className="org-mgr-item-meta">
                      <strong>{e.ten}</strong>
                      <span>{managedEntityKindLabel(e.kind)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );

  const menu =
    open && portalReady && menuStyle
      ? createPortal(
          <>
            {isMobileOverlay ? (
              <div
                className="org-mgr-overlay-scrim"
                aria-hidden
                onClick={() => setOpen(false)}
              />
            ) : null}
            <div
              ref={menuRef}
              className={`org-mgr-menu is-portal${isMobileOverlay ? " is-overlay" : ""}`}
              role="dialog"
              aria-modal={isMobileOverlay}
              aria-labelledby="org-mgr-title"
              style={
                isMobileOverlay
                  ? undefined
                  : { top: menuStyle.top, left: menuStyle.left }
              }
            >
              <div className="org-mgr-head">
                <strong id="org-mgr-title">{title}</strong>
                <button
                  type="button"
                  className="org-mgr-panel-close"
                  aria-label="Đóng"
                  onClick={() => setOpen(false)}
                >
                  <X size={18} strokeWidth={2} aria-hidden />
                </button>
              </div>
              {menuBody}
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <div className="org-mgr">
      <button
        ref={triggerRef}
        type="button"
        className={`org-mgr-trigger${open ? " is-open" : ""}`}
        aria-label="Quản lý tổ chức"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <Building2 size={20} strokeWidth={1.8} aria-hidden />
      </button>
      {menu}
    </div>
  );
}
