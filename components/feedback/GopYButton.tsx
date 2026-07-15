"use client";

import { MessageSquarePlus, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { isPersonalPostViewPath } from "@/lib/journey/post-view-path";

import { GopYContentEditor, type GopYContent } from "./GopYContentEditor";
import "./gop-y-button.css";

type Status = "idle" | "sending" | "done" | "error";

const EMPTY_CONTENT: GopYContent = {
  noiDung: "",
  anhUrl: "",
  hasText: false,
  hasImage: false,
};

export function GopYButton() {
  const pathname = usePathname() ?? "";
  const hideFab = isPersonalPostViewPath(pathname);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [content, setContent] = useState<GopYContent>(EMPTY_CONTENT);
  const [uploading, setUploading] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
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
      setContent(EMPTY_CONTENT);
      setUploading(false);
      setEditorKey((k) => k + 1);
      setEmail("");
    }, 1400);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending" || uploading) return;
    const { noiDung, anhUrl, hasText, hasImage } = content;
    if (!hasText && !hasImage) {
      setErrorMsg("Vui lòng nhập nội dung hoặc chèn ảnh góp ý.");
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
          noiDung,
          email: email.trim() || undefined,
          trangUrl: trangUrl.trim() || undefined,
          anhUrl: anhUrl || undefined,
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

  if (hideFab && !open) return null;

  return (
    <>
      {hideFab ? null : (
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
      )}

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
                  Hiện dự án đang ở giai đoạn beta nên có thể sẽ gặp lỗi, các bạn
                  giúp CINs góp ý để cải thiện nha!
                  <br />
                  Nếu bạn cần thêm tính năng hay chỗ nào bất hợp lý cũng có thể góp
                  ý để mình cân nhắc sửa
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
                    <div className="gopy-field">
                      <span className="gopy-label">Nội dung góp ý *</span>
                      <GopYContentEditor
                        key={editorKey}
                        onContentChange={setContent}
                        onUploadingChange={setUploading}
                        onError={(msg) => {
                          setErrorMsg(msg);
                          setStatus("error");
                        }}
                        onClearError={() => {
                          setErrorMsg(null);
                          setStatus((s) => (s === "error" ? "idle" : s));
                        }}
                      />
                    </div>

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

                    <label className="gopy-field">
                      <span className="gopy-label">
                        Trang bạn góp ý{" "}
                        <span className="gopy-optional">(có thể sửa)</span>
                      </span>
                      <input
                        type="text"
                        className="gopy-input gopy-input--url"
                        value={trangUrl}
                        onChange={(e) => setTrangUrl(e.target.value)}
                        placeholder="https://…"
                        maxLength={2000}
                      />
                    </label>

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
                        disabled={status === "sending" || uploading}
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
