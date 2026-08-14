"use client";

import { Check, Users, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { listMyCongDongForShareAction } from "@/app/[slug]/journey/actions";
import type { ShareCongDongTarget } from "@/lib/cong-dong/types";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Cộng đồng bài đang đứng (nếu đã ở feed cộng đồng). */
  currentOrgId?: string | null;
  pending?: boolean;
  error?: string | null;
  onShare: (org: ShareCongDongTarget) => void;
};

/** Popup danh sách cộng đồng — gửi cột mốc Journey vào feed org. */
export function ShareMilestoneToCongDongModal({
  open,
  onClose,
  currentOrgId = null,
  pending = false,
  error = null,
  onShare,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [communities, setCommunities] = useState<ShareCongDongTarget[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key !== "Escape" || pending) return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
    document.addEventListener("keydown", onEsc, true);
    return () => document.removeEventListener("keydown", onEsc, true);
  }, [open, pending, onClose]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void listMyCongDongForShareAction().then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setLoadError(res.error);
        setCommunities(null);
        return;
      }
      setCommunities(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const list = communities ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (org) =>
        org.ten.toLowerCase().includes(q) ||
        org.slug.toLowerCase().includes(q),
    );
  }, [communities, query]);

  if (!open || !mounted) return null;

  const empty = !loading && !loadError && (communities?.length ?? 0) === 0;
  const noMatch = !loading && !empty && filtered.length === 0;

  return createPortal(
    <div className="j-share-cd-root" role="presentation">
      <button
        type="button"
        className="j-share-cd-backdrop"
        aria-label="Đóng"
        disabled={pending}
        onClick={() => {
          if (!pending) onClose();
        }}
      />
      <div
        className="j-share-cd-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="j-share-cd-title"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="j-share-cd-head">
          <div className="j-share-cd-head-copy">
            <span className="j-share-cd-icon" aria-hidden>
              <Users size={16} strokeWidth={1.8} />
            </span>
            <div>
              <h2 id="j-share-cd-title">Chia sẻ vào cộng đồng</h2>
              <p>Chọn cộng đồng để bài hiện trên feed của nhóm.</p>
            </div>
          </div>
          <button
            type="button"
            className="j-share-cd-close"
            aria-label="Đóng"
            disabled={pending}
            onClick={onClose}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {error ? (
          <p className="j-m-share-friends-error" role="alert">
            {error}
          </p>
        ) : null}

        {!empty && !loadError ? (
          <div className="j-m-share-friends-search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm cộng đồng"
              aria-label="Tìm cộng đồng"
              disabled={pending || loading}
              autoComplete="off"
            />
          </div>
        ) : null}

        <div className="j-share-cd-body">
          {loading ? (
            <p className="j-m-share-friends-empty">Đang tải cộng đồng…</p>
          ) : loadError ? (
            <p className="j-m-share-friends-empty">{loadError}</p>
          ) : empty ? (
            <p className="j-m-share-friends-empty">
              Bạn chưa tham gia cộng đồng nào.
              <Link href="/community" className="j-m-submenu-empty-link">
                Khám phá cộng đồng
              </Link>
            </p>
          ) : noMatch ? (
            <p className="j-m-share-friends-empty">
              Không tìm thấy cộng đồng phù hợp.
            </p>
          ) : (
            <ul
              className="j-m-share-friends-list j-share-cd-list"
              role="listbox"
              aria-label="Cộng đồng của bạn"
            >
              {filtered.map((org) => {
                const active = currentOrgId === org.id;
                return (
                  <li key={org.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      disabled={pending || active}
                      className={
                        "j-m-share-friends-row" +
                        (active ? " is-selected" : "")
                      }
                      onClick={() => onShare(org)}
                    >
                      {org.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={org.avatarUrl}
                          alt=""
                          className="j-m-share-friends-avatar is-org"
                          width={32}
                          height={32}
                        />
                      ) : (
                        <span
                          className="j-m-share-friends-avatar is-fallback is-org"
                          aria-hidden
                        >
                          {org.ten.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="j-m-share-friends-copy">
                        <strong>{org.ten}</strong>
                        <span>
                          {active ? "Đã chia sẻ vào đây" : `@${org.slug}`}
                        </span>
                      </span>
                      {active ? (
                        <span className="j-share-cd-check" aria-hidden>
                          <Check size={14} strokeWidth={2.2} />
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
