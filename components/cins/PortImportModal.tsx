"use client";

import { Download, Loader2, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  CINS_PORT_MAX_WORKS,
  CINS_TRO_LY_EXT_ZIP_HREF,
  fetchWorkViaExtension,
  listProfileWorksViaExtension,
  pingPortExtension,
  type PortWorkListItem,
} from "@/lib/port/extension-bridge";

import "./port-import.css";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Slug người dùng — điều hướng về trang cá nhân xem bản nháp sau khi kéo. */
  profileSlug: string;
};

type RowStatus = "idle" | "ok" | "fail";
type Phase = "idle" | "scan" | "import";

export function PortImportModal({ open, onClose, profileSlug }: Props) {
  const titleId = useId();
  const cancelRef = useRef(false);

  const [extReady, setExtReady] = useState(false);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [err, setErr] = useState<string | null>(null);
  const [works, setWorks] = useState<PortWorkListItem[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [summary, setSummary] = useState<string | null>(null);

  const refreshExt = useCallback(async () => {
    const ok = await pingPortExtension();
    setExtReady(ok);
    return ok;
  }, []);

  const reset = useCallback(() => {
    setWorks(null);
    setSelected(new Set());
    setRowStatus({});
    setProgress(null);
    setSummary(null);
    setErr(null);
  }, []);

  const close = useCallback(() => {
    if (busy) return;
    reset();
    setPhase("idle");
    onClose();
  }, [busy, onClose, reset]);

  useEffect(() => {
    if (!open) return;
    // Ping bất đồng bộ — setExtReady chỉ chạy sau await, không phải render đồng bộ.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshExt();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, refreshExt]);

  async function runScan() {
    const name = username.trim();
    if (!name) {
      setErr("Nhập username hoặc link hồ sơ Behance.");
      return;
    }
    const hasExt = extReady || (await refreshExt());
    if (!hasExt) {
      setErr("Cần bật Trợ lý CINs để quét hồ sơ.");
      return;
    }
    setBusy(true);
    setPhase("scan");
    setErr(null);
    setSummary(null);
    setRowStatus({});
    try {
      const list = await listProfileWorksViaExtension(
        "behance",
        name,
        CINS_PORT_MAX_WORKS,
      );
      setWorks(list.items);
      setSelected(new Set(list.items.map((w) => w.projectId)));
      if (list.items.length === 0) {
        setErr("Không tìm thấy project nào trên hồ sơ (hoặc bị chặn).");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Quét hồ sơ thất bại.");
      setWorks(null);
    } finally {
      setBusy(false);
      setPhase("idle");
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll(on: boolean) {
    if (!works) return;
    setSelected(on ? new Set(works.map((w) => w.projectId)) : new Set());
  }

  async function importOne(work: PortWorkListItem): Promise<void> {
    const content = await fetchWorkViaExtension("behance", work.url);
    const previewRes = await fetch("/api/port/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: "behance",
        url: work.url,
        html: content.html,
        apply: false,
      }),
    });
    const previewJson = (await previewRes.json().catch(() => null)) as {
      preview?: unknown;
      error?: string;
    } | null;
    if (!previewRes.ok || !previewJson?.preview) {
      throw new Error(previewJson?.error ?? "Dựng bản nháp thất bại.");
    }
    const applyRes = await fetch("/api/port/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: "behance",
        url: work.url,
        apply: true,
        preview: previewJson.preview,
      }),
    });
    const applyJson = (await applyRes.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    if (!applyRes.ok || !applyJson?.ok) {
      throw new Error(applyJson?.error ?? "Tạo bản nháp thất bại.");
    }
  }

  async function runImport() {
    if (!works) return;
    const picks = works.filter((w) => selected.has(w.projectId));
    if (picks.length === 0) {
      setErr("Chọn ít nhất một tác phẩm.");
      return;
    }
    const hasExt = extReady || (await refreshExt());
    if (!hasExt) {
      setErr("Cần bật Trợ lý CINs để kéo tác phẩm.");
      return;
    }

    cancelRef.current = false;
    setBusy(true);
    setPhase("import");
    setErr(null);
    setSummary(null);
    setProgress({ done: 0, total: picks.length });

    let ok = 0;
    let fail = 0;
    for (let i = 0; i < picks.length; i++) {
      if (cancelRef.current) break;
      const w = picks[i]!;
      try {
        await importOne(w);
        ok += 1;
        setRowStatus((s) => ({ ...s, [w.projectId]: "ok" }));
      } catch (e) {
        fail += 1;
        setRowStatus((s) => ({ ...s, [w.projectId]: "fail" }));
        console.warn("[port-import]", w.url, e);
      }
      setProgress({ done: i + 1, total: picks.length });
    }

    const parts = [`Đã tạo ${ok}/${picks.length} bản nháp`];
    if (fail) parts.push(`${fail} lỗi`);
    if (cancelRef.current) parts.push("(đã dừng)");
    setSummary(parts.join(" · "));
    setBusy(false);
    setPhase("idle");
    setProgress(null);
    cancelRef.current = false;
  }

  if (!open || typeof document === "undefined") return null;

  const selectedCount = selected.size;
  const allOn =
    works != null && works.length > 0 && works.every((w) => selected.has(w.projectId));

  return createPortal(
    <div
      className="port-import-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) close();
      }}
    >
      <div
        className="port-import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="port-import-head">
          <h2 id={titleId}>
            <Sparkles size={18} aria-hidden /> Nhập tác phẩm từ Behance
          </h2>
          <button
            type="button"
            className="port-import-close"
            aria-label="Đóng"
            disabled={busy}
            onClick={close}
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className={`port-import-ext${extReady ? " is-ready" : ""}`}>
          <span className="port-import-ext-status">
            {extReady ? "Trợ lý CINs đã sẵn sàng" : "Bật Trợ lý CINs (một lần)"}
          </span>
          {extReady ? (
            <button
              type="button"
              className="port-import-btn"
              disabled={busy}
              onClick={() => void refreshExt()}
            >
              Kiểm tra lại
            </button>
          ) : (
            <a
              className="port-import-btn"
              href={CINS_TRO_LY_EXT_ZIP_HREF}
              download="cins-tro-ly.zip"
            >
              <Download size={15} aria-hidden /> Tải Trợ lý CINs
            </a>
          )}
        </div>

        <label className="port-import-field">
          <span>Username / link hồ sơ Behance</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="vd. johndoe hoặc behance.net/johndoe"
            disabled={busy}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runScan();
              }
            }}
          />
        </label>

        {err ? (
          <p className="port-import-err" role="alert">
            {err}
          </p>
        ) : null}
        {summary ? (
          <p className="port-import-summary" role="status">
            {summary}{" "}
            <Link href={`/${profileSlug}`} onClick={close}>
              Xem bản nháp trong trang cá nhân
            </Link>
          </p>
        ) : null}

        {progress ? (
          <div className="port-import-progress" role="status">
            <div className="port-import-progress-label">
              <Loader2 size={14} className="port-spin" aria-hidden /> Đang kéo về
              nháp ({progress.done}/{progress.total})
            </div>
            <div className="port-import-progress-bar">
              <span
                style={{
                  width: `${progress.total ? Math.round((100 * progress.done) / progress.total) : 8}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        {works ? (
          <div className="port-import-grid-wrap">
            <label className="port-import-all">
              <input
                type="checkbox"
                checked={allOn}
                disabled={busy}
                onChange={(e) => selectAll(e.target.checked)}
              />
              <span>
                {selectedCount}/{works.length} đã chọn
              </span>
            </label>
            <ul className="port-import-grid">
              {works.map((w) => {
                const st = rowStatus[w.projectId];
                return (
                  <li
                    key={w.projectId}
                    className={`port-import-card${st ? ` is-${st}` : ""}`}
                  >
                    <label>
                      <input
                        type="checkbox"
                        checked={selected.has(w.projectId)}
                        disabled={busy}
                        onChange={() => toggle(w.projectId)}
                      />
                      {w.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={w.coverUrl} alt="" loading="lazy" />
                      ) : (
                        <span className="port-import-card-empty" />
                      )}
                      <span className="port-import-card-title">
                        {w.title || "Không tên"}
                        {st === "ok" ? " · đã tạo" : st === "fail" ? " · lỗi" : ""}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <footer className="port-import-actions">
          {!works ? (
            <button
              type="button"
              className="port-import-primary"
              disabled={busy || !username.trim() || !extReady}
              onClick={() => void runScan()}
            >
              {busy && phase === "scan" ? (
                <Loader2 size={16} className="port-spin" aria-hidden />
              ) : (
                <Sparkles size={16} aria-hidden />
              )}
              Quét hồ sơ
            </button>
          ) : busy && phase === "import" ? (
            <button
              type="button"
              className="port-import-btn"
              onClick={() => {
                cancelRef.current = true;
              }}
            >
              Dừng
            </button>
          ) : (
            <>
              <button
                type="button"
                className="port-import-btn"
                disabled={busy}
                onClick={reset}
              >
                Quét lại
              </button>
              <button
                type="button"
                className="port-import-primary"
                disabled={busy || selectedCount === 0}
                onClick={() => void runImport()}
              >
                <Sparkles size={16} aria-hidden /> Kéo {selectedCount} tác phẩm về
                nháp
              </button>
            </>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
