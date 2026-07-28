"use client";

import { Download, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  CINS_PORT_MAX_WORKS,
  CINS_TRO_LY_EXT_ZIP_HREF,
  fetchWorkViaExtension,
  listProfileWorksViaExtension,
  normalizePortProjectUrl,
  pingPortExtension,
  type PortPlatform,
  type PortWorkListItem,
} from "@/lib/port/extension-bridge";

import "./port-import.css";

const PLATFORMS: ReadonlyArray<{
  id: PortPlatform;
  label: string;
  profilePlaceholder: string;
  projectPlaceholder: string;
}> = [
  {
    id: "behance",
    label: "Behance",
    profilePlaceholder: "vd. johndoe hoặc behance.net/johndoe",
    projectPlaceholder: "vd. behance.net/gallery/123456789/ten-du-an",
  },
  {
    id: "artstation",
    label: "ArtStation",
    profilePlaceholder: "vd. johndoe hoặc artstation.com/johndoe",
    projectPlaceholder: "vd. artstation.com/artwork/abc123",
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  /** Slug người dùng — điều hướng về trang cá nhân xem bản nháp sau khi kéo. */
  profileSlug: string;
};

type RowStatus = "idle" | "ok" | "fail";
type Phase = "idle" | "scan" | "import";
type Mode = "one" | "all";

const EXT_MISSING_HINT =
  "Chưa thấy Trợ lý CINs trên trang này. Tải tiện ích bên dưới → cài ở chrome://extensions (bật Chế độ nhà phát triển → Tải tiện ích đã giải nén) → tải lại trang này (F5).";

export function PortImportModal({ open, onClose, profileSlug }: Props) {
  const titleId = useId();
  const cancelRef = useRef(false);

  const [platform, setPlatform] = useState<PortPlatform>("behance");
  const [mode, setMode] = useState<Mode>("one");
  const [extReady, setExtReady] = useState(false);
  const [extVersion, setExtVersion] = useState<string | null>(null);
  const [extChecking, setExtChecking] = useState(true);
  const [username, setUsername] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
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
    setExtChecking(true);
    const status = await pingPortExtension();
    setExtReady(status.ready);
    setExtVersion(status.version);
    setExtChecking(false);
    return status.ready;
  }, []);

  const reset = useCallback(() => {
    setWorks(null);
    setSelected(new Set());
    setRowStatus({});
    setProgress(null);
    setSummary(null);
    setErr(null);
  }, []);

  const switchMode = useCallback(
    (next: Mode) => {
      if (busy || next === mode) return;
      setMode(next);
      reset();
    },
    [busy, mode, reset],
  );

  const switchPlatform = useCallback(
    (next: PortPlatform) => {
      if (busy || next === platform) return;
      setPlatform(next);
      reset();
    },
    [busy, platform, reset],
  );

  const meta = PLATFORMS.find((p) => p.id === platform) ?? PLATFORMS[0]!;

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
    // Quay lại tab sau khi cài tiện ích → ping lại, khỏi phải bấm "Kiểm tra lại".
    const onFocus = () => void refreshExt();
    window.addEventListener("keydown", onKey);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("focus", onFocus);
    };
  }, [open, close, refreshExt]);

  async function runScan() {
    const name = username.trim();
    if (!name) {
      setErr(`Nhập username hoặc link hồ sơ ${meta.label}.`);
      return;
    }
    const hasExt = extReady || (await refreshExt());
    if (!hasExt) {
      setErr(EXT_MISSING_HINT);
      return;
    }
    setBusy(true);
    setPhase("scan");
    setErr(null);
    setSummary(null);
    setRowStatus({});
    try {
      const list = await listProfileWorksViaExtension(
        platform,
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

  async function runImportOne() {
    const url = normalizePortProjectUrl(projectUrl);
    if (!url) {
      setErr(`Dán link project ${meta.label}.`);
      return;
    }
    const hasExt = extReady || (await refreshExt());
    if (!hasExt) {
      setErr(EXT_MISSING_HINT);
      return;
    }
    setBusy(true);
    setPhase("import");
    setErr(null);
    setSummary(null);
    setProgress({ done: 0, total: 1 });
    try {
      await importOne({ projectId: url, url, title: null, coverUrl: null });
      setProgress({ done: 1, total: 1 });
      setSummary("Đã tạo 1 bản nháp");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kéo project thất bại.");
    } finally {
      setBusy(false);
      setPhase("idle");
      setProgress(null);
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
    const content = await fetchWorkViaExtension(platform, work.url);
    const previewRes = await fetch("/api/port/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
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
        platform,
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
      setErr(EXT_MISSING_HINT);
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
            <Sparkles size={18} aria-hidden /> Nhập tác phẩm từ {meta.label}
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
            {extChecking
              ? "Đang tìm Trợ lý CINs…"
              : extReady
                ? `Trợ lý CINs đã sẵn sàng${extVersion ? ` (v${extVersion})` : ""}`
                : "Chưa thấy Trợ lý CINs — cần cài một lần"}
          </span>
          <span className="port-import-ext-actions">
            {extReady ? null : (
              <a
                className="port-import-btn"
                href={CINS_TRO_LY_EXT_ZIP_HREF}
                download="cins-tro-ly.zip"
              >
                <Download size={15} aria-hidden /> Tải tiện ích
              </a>
            )}
            <button
              type="button"
              className="port-import-btn"
              disabled={busy || extChecking}
              onClick={() => void refreshExt()}
            >
              <RefreshCw size={15} aria-hidden /> Kiểm tra lại
            </button>
          </span>
        </div>

        {extReady ? null : (
          <ol className="port-import-steps">
            <li>
              Tải tiện ích ở trên rồi giải nén — được thư mục{" "}
              <code>cins-tro-ly</code>.
            </li>
            <li>
              Mở <code>chrome://extensions</code> → bật <b>Chế độ nhà phát triển</b>{" "}
              → <b>Tải tiện ích đã giải nén</b> → chọn thư mục{" "}
              <code>cins-tro-ly</code>.
            </li>
            <li>
              Quay lại đây và <b>tải lại trang</b> (F5) — tiện ích không tự chèn vào
              tab đã mở trước khi cài.
            </li>
            <li>
              Đăng nhập {meta.label} ở tab khác (nếu hồ sơ cần đăng nhập mới xem
              được).
            </li>
          </ol>
        )}

        <div className="port-import-platforms" role="tablist" aria-label="Nền tảng">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={platform === p.id}
              className={`port-import-platform${platform === p.id ? " is-active" : ""}`}
              disabled={busy}
              onClick={() => switchPlatform(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="port-import-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "one"}
            className={`port-import-tab${mode === "one" ? " is-active" : ""}`}
            disabled={busy}
            onClick={() => switchMode("one")}
          >
            Một project
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "all"}
            className={`port-import-tab${mode === "all" ? " is-active" : ""}`}
            disabled={busy}
            onClick={() => switchMode("all")}
          >
            Cả hồ sơ
          </button>
        </div>

        {mode === "one" ? (
          <label className="port-import-field">
            <span>Link project {meta.label}</span>
            <input
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              placeholder={meta.projectPlaceholder}
              disabled={busy}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void runImportOne();
                }
              }}
            />
          </label>
        ) : (
          <label className="port-import-field">
            <span>Username / link hồ sơ {meta.label}</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={meta.profilePlaceholder}
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
        )}

        <p className="port-import-hint">
          {mode === "one"
            ? `Tiện ích mở ${meta.label} trong tab ẩn bằng phiên đăng nhập của bạn, lấy nội dung project rồi tạo 1 bài nháp riêng tư (chỉ mình) trong Journey để bạn duyệt.`
            : `Tiện ích quét tối đa ${CINS_PORT_MAX_WORKS} project trên hồ sơ, bạn chọn cái nào muốn lấy — mỗi project thành 1 bài nháp riêng tư trong Journey.`}
        </p>

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
          {mode === "one" ? (
            <button
              type="button"
              className="port-import-primary"
              disabled={busy || !projectUrl.trim()}
              onClick={() => void runImportOne()}
            >
              {busy && phase === "import" ? (
                <Loader2 size={16} className="port-spin" aria-hidden />
              ) : (
                <Sparkles size={16} aria-hidden />
              )}
              Kéo project về nháp
            </button>
          ) : !works ? (
            <button
              type="button"
              className="port-import-primary"
              disabled={busy || !username.trim()}
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
