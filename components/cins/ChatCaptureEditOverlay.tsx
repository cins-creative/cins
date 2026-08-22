"use client";

import { Pencil, Send, Smile, Type, Undo2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

import { EMOJI_GROUPS } from "@/lib/editor/emoji-catalog";
import { useT } from "@/lib/i18n/use-t";

const MAX_EDGE = 1920;
const COLORS = ["#ffffff", "#111111", "#1F74C9", "#FFB85C", "#FDE859", "#E24B4A"];

type Point = { x: number; y: number };
type StrokeOp = { kind: "stroke"; points: Point[]; color: string; width: number };
type TextOp = {
  kind: "text";
  id: string;
  x: number;
  y: number;
  text: string;
  size: number;
  color: string;
};
type IconOp = {
  kind: "icon";
  id: string;
  x: number;
  y: number;
  emoji: string;
  size: number;
};
type EditorOp = StrokeOp | TextOp | IconOp;
type Tool = "draw" | "text" | "icon";

type Props = {
  file: File;
  onCancel: () => void;
  onSend: (file: File) => void;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("load"));
    img.src = src;
  });
}

function fitSize(nw: number, nh: number): { w: number; h: number } {
  const scale = Math.min(1, MAX_EDGE / Math.max(nw, nh, 1));
  return {
    w: Math.max(1, Math.round(nw * scale)),
    h: Math.max(1, Math.round(nh * scale)),
  };
}

function clientToImage(
  el: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  imgW: number,
  imgH: number,
): Point {
  const rect = el.getBoundingClientRect();
  const x = ((clientX - rect.left) / Math.max(rect.width, 1)) * imgW;
  const y = ((clientY - rect.top) / Math.max(rect.height, 1)) * imgH;
  return {
    x: Math.min(imgW, Math.max(0, x)),
    y: Math.min(imgH, Math.max(0, y)),
  };
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Pick<StrokeOp, "points" | "color" | "width">,
) {
  if (stroke.points.length === 0) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.beginPath();
  ctx.moveTo(stroke.points[0]!.x, stroke.points[0]!.y);
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i]!.x, stroke.points[i]!.y);
  }
  if (stroke.points.length === 1) {
    ctx.lineTo(stroke.points[0]!.x + 0.01, stroke.points[0]!.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, op: TextOp) {
  const label = op.text.trim() || " ";
  ctx.save();
  ctx.font = `600 ${op.size}px "Be Vietnam Pro", system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  ctx.lineWidth = Math.max(2, op.size * 0.12);
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.fillStyle = op.color;
  ctx.strokeText(label, op.x, op.y);
  ctx.fillText(label, op.x, op.y);
  ctx.restore();
}

function drawIcon(ctx: CanvasRenderingContext2D, op: IconOp) {
  ctx.save();
  ctx.font = `${op.size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(op.emoji, op.x, op.y);
  ctx.restore();
}

function paintOps(
  ctx: CanvasRenderingContext2D,
  ops: EditorOp[],
  live: StrokeOp | null,
) {
  for (const op of ops) {
    if (op.kind === "stroke") drawStroke(ctx, op);
    else if (op.kind === "text") drawText(ctx, op);
    else drawIcon(ctx, op);
  }
  if (live) drawStroke(ctx, live);
}

function hitTest(ops: EditorOp[], p: Point): string | null {
  for (let i = ops.length - 1; i >= 0; i--) {
    const op = ops[i]!;
    if (op.kind === "icon") {
      const r = op.size * 0.55;
      if ((p.x - op.x) ** 2 + (p.y - op.y) ** 2 <= r * r) return op.id;
    }
    if (op.kind === "text") {
      const w = Math.max(op.size * Math.max(op.text.length, 1) * 0.55, op.size);
      const h = op.size * 1.3;
      if (
        p.x >= op.x - 8 &&
        p.x <= op.x + w &&
        p.y >= op.y - h / 2 &&
        p.y <= op.y + h / 2
      ) {
        return op.id;
      }
    }
  }
  return null;
}

export function ChatCaptureEditOverlay({ file, onCancel, onSend }: Props) {
  const t = useT();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const drawingRef = useRef(false);

  const [srcUrl] = useState(() => URL.createObjectURL(file));
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 });
  const [ops, setOps] = useState<EditorOp[]>([]);
  const [liveStroke, setLiveStroke] = useState<StrokeOp | null>(null);
  const [tool, setTool] = useState<Tool>("draw");
  const [color, setColor] = useState(COLORS[0]!);
  const [iconOpen, setIconOpen] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [sending, setSending] = useState(false);

  const brushW = Math.max(5, Math.round(Math.min(imgSize.w, imgSize.h) * 0.012));
  const textSize = Math.max(28, Math.round(Math.min(imgSize.w, imgSize.h) * 0.055));
  const iconSize = Math.max(48, Math.round(Math.min(imgSize.w, imgSize.h) * 0.1));

  useEffect(() => {
    return () => URL.revokeObjectURL(srcUrl);
  }, [srcUrl]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      onCancel();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  useEffect(() => {
    let gone = false;
    void (async () => {
      try {
        const img = await loadImage(srcUrl);
        if (gone) return;
        const { w, h } = fitSize(img.naturalWidth, img.naturalHeight);
        const base = document.createElement("canvas");
        base.width = w;
        base.height = h;
        const ctx = base.getContext("2d");
        if (!ctx) throw new Error("ctx");
        ctx.drawImage(img, 0, 0, w, h);
        baseRef.current = base;
        setImgSize({ w, h });
        setReady(true);
      } catch {
        if (!gone) setLoadError(true);
      }
    })();
    return () => {
      gone = true;
    };
  }, [srcUrl]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const base = baseRef.current;
    if (!canvas || !stage || !base || !ready) return;
    const maxW = stage.clientWidth;
    const maxH = stage.clientHeight;
    const scale = Math.min(maxW / imgSize.w, maxH / imgSize.h);
    const cssW = Math.max(1, Math.floor(imgSize.w * scale));
    const cssH = Math.max(1, Math.floor(imgSize.h * scale));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(base, 0, 0, cssW, cssH);
    ctx.save();
    ctx.scale(cssW / imgSize.w, cssH / imgSize.h);
    paintOps(ctx, ops, liveStroke);
    ctx.restore();
  }, [imgSize.h, imgSize.w, liveStroke, ops, ready]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => redraw());
    ro.observe(stage);
    return () => ro.disconnect();
  }, [redraw]);

  useEffect(() => {
    if (!editingTextId) return;
    textInputRef.current?.focus();
  }, [editingTextId]);

  const commitText = useCallback(() => {
    if (!editingTextId) return;
    const next = textDraft.trim();
    setOps((prev) => {
      if (!next) return prev.filter((op) => !(op.kind === "text" && op.id === editingTextId));
      return prev.map((op) =>
        op.kind === "text" && op.id === editingTextId ? { ...op, text: next } : op,
      );
    });
    setEditingTextId(null);
    setTextDraft("");
  }, [editingTextId, textDraft]);

  const undo = useCallback(() => {
    if (editingTextId) {
      setOps((prev) => prev.filter((op) => !(op.kind === "text" && op.id === editingTextId)));
      setEditingTextId(null);
      setTextDraft("");
      return;
    }
    setLiveStroke(null);
    drawingRef.current = false;
    setOps((prev) => prev.slice(0, -1));
  }, [editingTextId]);

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!ready || sending) return;
    const canvas = e.currentTarget;
    canvas.setPointerCapture(e.pointerId);
    const p = clientToImage(canvas, e.clientX, e.clientY, imgSize.w, imgSize.h);

    if (tool === "draw") {
      drawingRef.current = true;
      setLiveStroke({ kind: "stroke", points: [p], color, width: brushW });
      return;
    }

    const hit = hitTest(ops, p);
    if (hit) {
      const target = ops.find(
        (op) => (op.kind === "text" || op.kind === "icon") && op.id === hit,
      );
      if (target && (target.kind === "text" || target.kind === "icon")) {
        dragRef.current = { id: hit, dx: p.x - target.x, dy: p.y - target.y };
        if (target.kind === "text" && tool === "text") {
          setEditingTextId(target.id);
          setTextDraft(target.text);
        }
      }
      return;
    }

    if (tool === "text") {
      commitText();
      const id = `t-${Date.now()}`;
      setOps((prev) => [
        ...prev,
        { kind: "text", id, x: p.x, y: p.y, text: "", size: textSize, color },
      ]);
      setEditingTextId(id);
      setTextDraft("");
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const p = clientToImage(canvas, e.clientX, e.clientY, imgSize.w, imgSize.h);
    if (drawingRef.current) {
      setLiveStroke((prev) =>
        prev ? { ...prev, points: [...prev.points, p] } : prev,
      );
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    setOps((prev) =>
      prev.map((op) =>
        (op.kind === "text" || op.kind === "icon") && op.id === drag.id
          ? { ...op, x: p.x - drag.dx, y: p.y - drag.dy }
          : op,
      ),
    );
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (drawingRef.current) {
      drawingRef.current = false;
      setLiveStroke((stroke) => {
        if (stroke && stroke.points.length > 0) {
          setOps((prev) => [...prev, stroke]);
        }
        return null;
      });
    }
    dragRef.current = null;
  };

  const placeIcon = (emoji: string) => {
    setOps((prev) => [
      ...prev,
      {
        kind: "icon",
        id: `i-${Date.now()}`,
        x: imgSize.w / 2,
        y: imgSize.h / 2,
        emoji,
        size: iconSize,
      },
    ]);
    setIconOpen(false);
    setTool("icon");
  };

  const handleSend = async () => {
    if (!ready || sending || !baseRef.current) return;
    let exportOps = ops;
    if (editingTextId) {
      const next = textDraft.trim();
      exportOps = next
        ? ops.map((op) =>
            op.kind === "text" && op.id === editingTextId
              ? { ...op, text: next }
              : op,
          )
        : ops.filter((op) => !(op.kind === "text" && op.id === editingTextId));
      setEditingTextId(null);
      setTextDraft("");
      setOps(exportOps);
    }
    setSending(true);
    try {
      if (exportOps.length === 0) {
        onSend(file);
        return;
      }
      const out = document.createElement("canvas");
      out.width = imgSize.w;
      out.height = imgSize.h;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("ctx");
      ctx.drawImage(baseRef.current, 0, 0);
      paintOps(ctx, exportOps, null);
      const blob = await new Promise<Blob | null>((resolve) =>
        out.toBlob(resolve, "image/jpeg", 0.88),
      );
      if (!blob) throw new Error("blob");
      const edited = new File([blob], "chat-capture.jpg", { type: "image/jpeg" });
      onSend(edited);
    } catch {
      setSending(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className="cins-chat-capture-edit"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
    >
      <div className="cins-chat-capture-edit-shell">
        <header className="cins-chat-capture-edit-bar">
          <button
            type="button"
            className="cins-chat-capture-edit-text-btn"
            onClick={onCancel}
          >
            <X size={18} strokeWidth={2.25} aria-hidden />
            {t("chat.captureEdit.cancel")}
          </button>
          <h2 id={titleId}>{t("chat.captureEdit.title")}</h2>
          <button
            type="button"
            className="cins-chat-capture-edit-send"
            disabled={!ready || sending || loadError}
            onClick={() => void handleSend()}
          >
            <Send size={16} strokeWidth={2.25} aria-hidden />
            {sending ? t("chat.captureEdit.sending") : t("chat.send")}
          </button>
        </header>

        <div ref={stageRef} className="cins-chat-capture-edit-stage">
          {loadError ? (
            <p className="cins-chat-capture-edit-err">{t("chat.captureEdit.error")}</p>
          ) : (
            <canvas
              ref={canvasRef}
              className="cins-chat-capture-edit-canvas"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          )}
        </div>

        {editingTextId ? (
          <div className="cins-chat-capture-edit-text-dock">
            <input
              ref={textInputRef}
              type="text"
              className="cins-chat-capture-edit-input"
              value={textDraft}
              placeholder={t("chat.captureEdit.textPh")}
              enterKeyHint="done"
              onChange={(e) => {
                const next = e.target.value;
                setTextDraft(next);
                setOps((prev) =>
                  prev.map((op) =>
                    op.kind === "text" && op.id === editingTextId
                      ? { ...op, text: next, color }
                      : op,
                  ),
                );
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitText();
                }
              }}
            />
            <button type="button" onClick={commitText}>
              {t("chat.captureEdit.done")}
            </button>
          </div>
        ) : null}

        {iconOpen ? (
          <div className="cins-chat-capture-edit-icons" role="listbox" aria-label={t("chat.captureEdit.icon")}>
            {EMOJI_GROUPS.flatMap((g) => g.emojis)
              .slice(0, 96)
              .map((em, i) => (
              <button
                key={`${em}-${i}`}
                type="button"
                role="option"
                onClick={() => placeIcon(em)}
              >
                {em}
              </button>
            ))}
          </div>
        ) : null}

        <footer className="cins-chat-capture-edit-tools">
          <div className="cins-chat-capture-edit-colors" role="group" aria-label={t("chat.captureEdit.color")}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={c === color ? "is-on" : undefined}
                style={{ background: c }}
                aria-label={c}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <div className="cins-chat-capture-edit-actions">
            <button
              type="button"
              disabled={ops.length === 0 && !editingTextId}
              onClick={undo}
              aria-label={t("chat.captureEdit.undo")}
            >
              <Undo2 size={20} strokeWidth={2.2} aria-hidden />
              <span>{t("chat.captureEdit.undo")}</span>
            </button>
            <button
              type="button"
              className={tool === "draw" ? "is-on" : undefined}
              aria-pressed={tool === "draw"}
              onClick={() => {
                commitText();
                setTool("draw");
                setIconOpen(false);
              }}
            >
              <Pencil size={20} strokeWidth={2.2} aria-hidden />
              <span>{t("chat.captureEdit.draw")}</span>
            </button>
            <button
              type="button"
              className={tool === "text" ? "is-on" : undefined}
              aria-pressed={tool === "text"}
              onClick={() => {
                setTool("text");
                setIconOpen(false);
              }}
            >
              <Type size={20} strokeWidth={2.2} aria-hidden />
              <span>{t("chat.captureEdit.text")}</span>
            </button>
            <button
              type="button"
              className={tool === "icon" || iconOpen ? "is-on" : undefined}
              aria-pressed={iconOpen}
              onClick={() => {
                commitText();
                setTool("icon");
                setIconOpen((open) => !open);
              }}
            >
              <Smile size={20} strokeWidth={2.2} aria-hidden />
              <span>{t("chat.captureEdit.icon")}</span>
            </button>
          </div>
        </footer>
      </div>
    </dialog>,
    document.body,
  );
}
