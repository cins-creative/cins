"use client";

import { MessageSquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import "./gop-y-button.css";

type Status = "idle" | "sending" | "done" | "error";

export function GopYButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [noiDung, setNoiDung] = useState("");
  const [email, setEmail] = useState("");
  const [trangUrl, setTrangUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (typeof window !== "undefined") setTrangUrl(window.location.href);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function resetSoon() {
    setTimeout(() => {
      setOpen(false);
      setStatus("idle");
      setNoiDung("");
      setEmail("");
    }, 1400);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    if (noiDung.trim().length < 2) {
      setErrorMsg("Vui lòng nhập nội dung góp ý.");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/gop-y", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noiDung: noiDung.trim(),
          email: email.trim() || undefined,
          trangUrl,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "Không gửi được góp ý. Thử lại sau nhé.");
        setStatus("error");
        return;
      }
      setStatus("done");
      resetSoon();
    } catch {
      setErrorMsg("Lỗi mạng. Thử lại sau nhé.");
      setStatus("error");
    }
  }

  return (
    <>
      <button
        type="button"
        className="gopy-fab"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <MessageSquarePlus size={18} strokeWidth={2.2} aria-hidden />
        <span className="gopy-fab-label">Góp ý</span>
      </button>

      {mounted && open
        ? createPortal(
            <div
              className="gopy-backdrop"
              role="presentation"
              onClick={() => setOpen(false)}
            >
              <div
                className="gopy-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="gopy-title"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="gopy-close"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng"
                  title="Đóng"
                >
                  <X size={18} strokeWidth={2.2} aria-hidden />
                </button>

                <h2 id="gopy-title" className="gopy-title">
                  Đóng góp ý kiến
                </h2>
                <p className="gopy-sub">
                  Cho tụi mình biết bạn thích gì, gặp lỗi gì, hay muốn thêm gì
                  trên CINs.
                </p>

                {status === "done" ? (
                  <div className="gopy-done">
                    <p className="gopy-done-title">Cảm ơn bạn đã góp ý! 🎉</p>
                    <p className="gopy-done-sub">
                      Tụi mình đã nhận được và sẽ xem xét sớm.
                    </p>
                  </div>
                ) : (
                  <form className="gopy-form" onSubmit={handleSubmit}>
                    <label className="gopy-field">
                      <span className="gopy-label">Nội dung góp ý *</span>
                      <textarea
                        className="gopy-textarea"
                        rows={5}
                        value={noiDung}
                        onChange={(e) => setNoiDung(e.target.value)}
                        placeholder="Mình nghĩ trang này nên…"
                        autoFocus
                        maxLength={5000}
                      />
                    </label>

                    <label className="gopy-field">
                      <span className="gopy-label">
                        Email <span className="gopy-optional">(không bắt buộc)</span>
                      </span>
                      <input
                        type="email"
                        className="gopy-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Để CINs phản hồi lại bạn"
                        maxLength={200}
                      />
                    </label>

                    <div className="gopy-page">
                      <span className="gopy-page-label">Trang bạn góp ý</span>
                      <span className="gopy-page-url" title={trangUrl}>
                        {trangUrl || "—"}
                      </span>
                    </div>

                    {status === "error" && errorMsg ? (
                      <p className="gopy-error">{errorMsg}</p>
                    ) : null}

                    <div className="gopy-actions">
                      <button
                        type="button"
                        className="gopy-btn gopy-btn-ghost"
                        onClick={() => setOpen(false)}
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="gopy-btn gopy-btn-primary"
                        disabled={status === "sending"}
                      >
                        {status === "sending" ? "Đang gửi…" : "Gửi góp ý"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
