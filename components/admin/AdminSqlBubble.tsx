"use client";

import { useCallback, useEffect, useState } from "react";

import { AdminSqlPanel } from "@/components/admin/AdminSqlPanel";

const STORAGE_KEY = "cins-admin-sql-open";

type Props = {
  dbReady: boolean;
  passwordReady: boolean;
};

function SqlFabIcon() {
  const p = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg {...p} aria-hidden>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
    </svg>
  );
}

export function AdminSqlBubble({ dbReady, passwordReady }: Props) {
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "1") setOpen(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setOpenPersist = useCallback((next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenPersist(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpenPersist]);

  if (!hydrated) {
    return (
      <div className="admin-sql-bubble-root" aria-hidden>
        <button type="button" className="admin-sql-bubble-fab" tabIndex={-1}>
          <SqlFabIcon />
        </button>
      </div>
    );
  }

  return (
    <div className={`admin-sql-bubble-root${open ? " is-open" : ""}`}>
      {open ? (
        <div
          className="admin-sql-bubble-panel"
          role="dialog"
          aria-label="SQL console"
          aria-modal="false"
        >
          <header className="admin-sql-bubble-header">
            <span className="admin-sql-bubble-title">SQL</span>
            <div className="admin-sql-bubble-header-actions">
              <button
                type="button"
                className="admin-sql-bubble-icon-btn"
                title="Thu gọn"
                aria-label="Thu gọn SQL"
                onClick={() => setOpenPersist(false)}
              >
                <span aria-hidden>−</span>
              </button>
            </div>
          </header>
          <div className="admin-sql-bubble-body">
            <AdminSqlPanel
              dbReady={dbReady}
              passwordReady={passwordReady}
              compact
            />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="admin-sql-bubble-fab"
        title={open ? "Thu gọn SQL" : "Mở SQL"}
        aria-label={open ? "Thu gọn SQL" : "Mở SQL console"}
        aria-expanded={open}
        onClick={() => setOpenPersist(!open)}
      >
        {open ? (
          <span className="admin-sql-bubble-fab-close" aria-hidden>
            ×
          </span>
        ) : (
          <SqlFabIcon />
        )}
      </button>
    </div>
  );
}
