"use client";

import { BellRing } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export type OrgNotifySettingsOrg = {
  orgId: string;
  orgTen: string;
};

type Props = {
  /** Một org (vd. OrgInboxPanel). */
  orgId?: string;
  orgTen?: string;
  /** Nhiều org — menu trên tiêu đề «Tổ chức của tôi». */
  orgs?: OrgNotifySettingsOrg[];
  /** Chỉ owner/admin mới đổi được — nếu false thì ẩn menu (single-org). */
  canManage?: boolean;
};

type OrgState = {
  thongBaoChung: boolean;
  loaded: boolean;
  saving: boolean;
  error: string | null;
};

/**
 * Menu «Quản lý thông báo» — bật/tắt đọc dùng chung giữa admin.
 * Single-org (inbox) hoặc multi-org (tiêu đề section Tổ chức của tôi).
 */
export function OrgNotifySettingsMenu({
  orgId,
  orgTen,
  orgs: orgsProp,
  canManage = true,
}: Props) {
  const orgs = useMemo((): OrgNotifySettingsOrg[] => {
    if (orgsProp && orgsProp.length > 0) return orgsProp;
    if (orgId && canManage) {
      return [{ orgId, orgTen: orgTen?.trim() || "Tổ chức" }];
    }
    return [];
  }, [orgsProp, orgId, orgTen, canManage]);

  const [open, setOpen] = useState(false);
  const [byOrg, setByOrg] = useState<Record<string, OrgState>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const loadOrg = useCallback(async (id: string) => {
    setByOrg((prev) => ({
      ...prev,
      [id]: {
        thongBaoChung: prev[id]?.thongBaoChung ?? false,
        loaded: false,
        saving: false,
        error: null,
      },
    }));
    try {
      const res = await fetch(`/api/org/${id}/chat/thong-bao`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as {
        thongBaoChung?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setByOrg((prev) => ({
          ...prev,
          [id]: {
            thongBaoChung: false,
            loaded: false,
            saving: false,
            error: json.error ?? "Không tải được cấu hình.",
          },
        }));
        return;
      }
      setByOrg((prev) => ({
        ...prev,
        [id]: {
          thongBaoChung: json.thongBaoChung === true,
          loaded: true,
          saving: false,
          error: null,
        },
      }));
    } catch {
      setByOrg((prev) => ({
        ...prev,
        [id]: {
          thongBaoChung: false,
          loaded: false,
          saving: false,
          error: "Lỗi mạng.",
        },
      }));
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    for (const org of orgs) {
      const state = byOrg[org.orgId];
      if (!state?.loaded && !state?.error) {
        void loadOrg(org.orgId);
      }
    }
    // Chỉ khi mở / đổi danh sách org — không phụ thuộc byOrg để tránh loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orgs, loadOrg]);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = triggerRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      const rect = anchor.getBoundingClientRect();
      const mw = panel.offsetWidth;
      const mh = panel.offsetHeight;
      const pad = 8;
      const vv = window.visualViewport;
      const vw = vv?.width ?? window.innerWidth;
      const vh = vv?.height ?? window.innerHeight;
      const vTop = vv?.offsetTop ?? 0;
      const vLeft = vv?.offsetLeft ?? 0;
      let top = rect.bottom + 4;
      let left = rect.right - mw;
      if (left < vLeft + pad) left = vLeft + pad;
      if (left + mw > vLeft + vw - pad) {
        left = Math.max(vLeft + pad, vLeft + vw - pad - mw);
      }
      if (top + mh > vTop + vh - pad) top = rect.top - mh - 4;
      if (top < vTop + pad) top = vTop + pad;
      panel.style.position = "fixed";
      panel.style.top = `${Math.round(top)}px`;
      panel.style.left = `${Math.round(left)}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      panel.style.transform = "none";
      panel.style.zIndex = "12050";
    };
    place();
    const id = window.requestAnimationFrame(place);
    return () => window.cancelAnimationFrame(id);
  }, [open, byOrg, orgs]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function save(id: string, next: boolean) {
    const cur = byOrg[id];
    if (cur?.saving) return;
    setByOrg((prev) => ({
      ...prev,
      [id]: {
        thongBaoChung: prev[id]?.thongBaoChung ?? false,
        loaded: prev[id]?.loaded ?? false,
        saving: true,
        error: null,
      },
    }));
    try {
      const res = await fetch(`/api/org/${id}/chat/thong-bao`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thongBaoChung: next }),
      });
      const json = (await res.json()) as {
        thongBaoChung?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setByOrg((prev) => ({
          ...prev,
          [id]: {
            thongBaoChung: prev[id]?.thongBaoChung ?? false,
            loaded: prev[id]?.loaded ?? false,
            saving: false,
            error: json.error ?? "Không lưu được.",
          },
        }));
        return;
      }
      setByOrg((prev) => ({
        ...prev,
        [id]: {
          thongBaoChung: json.thongBaoChung === true,
          loaded: true,
          saving: false,
          error: null,
        },
      }));
    } catch {
      setByOrg((prev) => ({
        ...prev,
        [id]: {
          thongBaoChung: prev[id]?.thongBaoChung ?? false,
          loaded: prev[id]?.loaded ?? false,
          saving: false,
          error: "Lỗi mạng.",
        },
      }));
    }
  }

  if (orgs.length === 0) return null;

  const multi = orgs.length > 1;

  const panel =
    open && portalReady
      ? createPortal(
          <div
            ref={panelRef}
            className="cins-chat-thread-menu-panel is-floating cins-chat-org-notify-panel"
            role="dialog"
            aria-label="Quản lý thông báo"
          >
            <p className="cins-chat-org-notify-title">Quản lý thông báo</p>
            <p className="cins-chat-org-notify-hint">
              Khi nhiều người quản trị: một người xem nội dung trong trang quản
              trị thì người khác có cần thấy lại không.
            </p>
            {orgs.map((org) => {
              const state = byOrg[org.orgId];
              const loaded = state?.loaded === true;
              const saving = state?.saving === true;
              const thongBaoChung = state?.thongBaoChung === true;
              const error = state?.error ?? null;
              return (
                <div
                  key={org.orgId}
                  className="cins-chat-org-notify-org-block"
                >
                  {multi ? (
                    <p className="cins-chat-org-notify-org-name">{org.orgTen}</p>
                  ) : null}
                  {!loaded && !error ? (
                    <p className="cins-chat-org-notify-hint">Đang tải…</p>
                  ) : null}
                  {error ? (
                    <p className="cins-chat-org-notify-error" role="alert">
                      {error}
                    </p>
                  ) : null}
                  <label className="cins-chat-org-notify-option">
                    <input
                      type="radio"
                      name={`org-notify-${org.orgId}`}
                      checked={loaded && !thongBaoChung}
                      disabled={!loaded || saving}
                      onChange={() => void save(org.orgId, false)}
                    />
                    <span>
                      <strong>Hiển thị đầy đủ</strong>
                      <small>
                        Mỗi người quản trị có thông báo riêng (mặc định)
                      </small>
                    </span>
                  </label>
                  <label className="cins-chat-org-notify-option">
                    <input
                      type="radio"
                      name={`org-notify-${org.orgId}`}
                      checked={loaded && thongBaoChung}
                      disabled={!loaded || saving}
                      onChange={() => void save(org.orgId, true)}
                    />
                    <span>
                      <strong>Ẩn khi đã có người xem</strong>
                      <small>
                        Một người mở hội thoại trong quản trị là đủ — không báo
                        lại cho người khác
                      </small>
                    </span>
                  </label>
                </div>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={`cins-chat-org-notify-menu${open ? " is-open" : ""}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className="cins-chat-icon-btn is-plain cins-chat-org-notify-btn"
        aria-label="Quản lý thông báo"
        title="Quản lý thông báo"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <BellRing size={16} strokeWidth={1.8} aria-hidden />
      </button>
      {panel}
    </div>
  );
}
