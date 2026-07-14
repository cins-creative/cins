"use client";

import { BarChart2, CalendarPlus, Image as ImageIcon, Loader2, Plus, X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
  canAddMoc: boolean;
  onAddMoc: () => void;
  onAttachImage: () => void;
  onCreatePoll: (input: {
    question: string;
    options: string[];
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function ChatComposeToolsMenu({
  open,
  onOpenChange,
  disabled = false,
  canAddMoc,
  onAddMoc,
  onAttachImage,
  onCreatePoll,
}: Props) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"menu" | "poll">("menu");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setMode("menu");
      setQuestion("");
      setOptions(["", ""]);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      const t = event.target;
      if (!(t instanceof Node)) return;
      if (rootRef.current?.contains(t)) return;
      onOpenChange(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const submitPoll = () => {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await onCreatePoll({
        question,
        options: options.map((o) => o.trim()).filter(Boolean),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
    });
  };

  return (
    <div
      ref={rootRef}
      className={`cins-chat-compose-tools${open ? " is-open" : ""}`}
    >
      <button
        type="button"
        className="cins-chat-attach"
        aria-label="Tính năng bổ trợ"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={() => onOpenChange(!open)}
      >
        <Plus size={18} strokeWidth={1.9} aria-hidden />
      </button>

      {open ? (
        <div
          id={menuId}
          className="cins-chat-compose-tools-panel"
          role="menu"
        >
          {mode === "menu" ? (
            <>
              <button
                type="button"
                role="menuitem"
                className="cins-chat-compose-tools-item"
                onClick={() => {
                  onOpenChange(false);
                  onAttachImage();
                }}
              >
                <ImageIcon size={16} strokeWidth={1.9} aria-hidden />
                <span>
                  <strong>Đính kèm ảnh</strong>
                  <em>JPEG, PNG, WebP hoặc GIF</em>
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="cins-chat-compose-tools-item"
                disabled={!canAddMoc}
                onClick={() => {
                  if (!canAddMoc) return;
                  onOpenChange(false);
                  onAddMoc();
                }}
              >
                <CalendarPlus size={16} strokeWidth={1.9} aria-hidden />
                <span>
                  <strong>Thêm mốc</strong>
                  <em>
                    {canAddMoc
                      ? "Deadline, sync, bàn giao…"
                      : "Chỉ admin nhóm mới thêm mốc"}
                  </em>
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="cins-chat-compose-tools-item"
                onClick={() => setMode("poll")}
              >
                <BarChart2 size={16} strokeWidth={1.9} aria-hidden />
                <span>
                  <strong>Bình chọn</strong>
                  <em>Hỏi nhanh, mọi người bỏ phiếu trong chat</em>
                </span>
              </button>
            </>
          ) : (
            <div className="cins-chat-compose-poll-form">
              <header className="cins-chat-compose-poll-form-head">
                <strong>Tạo bình chọn</strong>
                <button
                  type="button"
                  className="cins-chat-icon-btn"
                  aria-label="Đóng"
                  onClick={() => setMode("menu")}
                >
                  <X size={14} />
                </button>
              </header>
              <input
                type="text"
                maxLength={200}
                placeholder="Câu hỏi…"
                value={question}
                disabled={pending}
                onChange={(e) => setQuestion(e.target.value)}
              />
              {options.map((opt, index) => (
                <div key={index} className="cins-chat-compose-poll-option-row">
                  <input
                    type="text"
                    maxLength={80}
                    placeholder={`Lựa chọn ${index + 1}`}
                    value={opt}
                    disabled={pending}
                    onChange={(e) => {
                      const next = [...options];
                      next[index] = e.target.value;
                      setOptions(next);
                    }}
                  />
                  {options.length > 2 ? (
                    <button
                      type="button"
                      className="cins-chat-icon-btn"
                      aria-label="Xóa lựa chọn"
                      disabled={pending}
                      onClick={() =>
                        setOptions((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
              ))}
              {options.length < 6 ? (
                <button
                  type="button"
                  className="cins-chat-compose-poll-add-opt"
                  disabled={pending}
                  onClick={() => setOptions((prev) => [...prev, ""])}
                >
                  + Thêm lựa chọn
                </button>
              ) : null}
              {error ? (
                <p className="cins-chat-compose-poll-error">{error}</p>
              ) : null}
              <button
                type="button"
                className="cins-chat-compose-poll-submit"
                disabled={
                  pending ||
                  !question.trim() ||
                  options.filter((o) => o.trim()).length < 2
                }
                onClick={submitPoll}
              >
                {pending ? <Loader2 size={14} className="spin" /> : null}
                Đăng bình chọn
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
