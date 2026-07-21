"use client";

/**
 * Canvas ý tưởng của phòng chat — wrapper quanh CinsBoard (engine tự viết,
 * không còn tldraw): fetch board + nodes, adapter persist trỏ API
 * `/api/chat/rooms/[roomId]/canvas/**`, toolbar tiếng Việt.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  Eraser,
  Hand,
  Maximize2,
  MessageCircle,
  Minimize2,
  MousePointer2,
  Pencil,
  Redo2,
  RefreshCw,
  Square,
  StickyNote,
  Table2,
  Type,
  Undo2,
} from "lucide-react";

import { canvasBridge } from "@/components/cins/canvas/canvas-bridge";
import { CinsBoard } from "@/components/cins/board/CinsBoard";
import {
  CustomColorSwatch,
  STICKY_PALETTE,
  isPresetPaletteColor,
} from "@/components/cins/board/NodeCard";
import type {
  BoardHandle,
  BoardNode,
  BoardPersistAdapter,
  BoardSelectionSummary,
  BoardTool,
} from "@/components/cins/board/board-types";
import { fetchChatComposeImageUpload } from "@/lib/chat/compose-image-upload";
import { chatImageDeliveryUrl } from "@/lib/chat/image-url";
import type { ChatCanvas, ChatCanvasNode } from "@/lib/chat/canvas/types";
import type { ChatMessage } from "@/lib/chat/types";

type Props = {
  roomId: string;
  onJumpToMessage: (messageId: string) => void;
};

export default function ChatCanvasBoard({ roomId, onJumpToMessage }: Props) {
  const [nodes, setNodes] = useState<ChatCanvasNode[] | null>(null);
  const [canvas, setCanvas] = useState<ChatCanvas | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [stickyColor, setStickyColor] = useState(STICKY_PALETTE[0]!);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [tool, setTool] = useState<BoardTool>("select");
  const [selection, setSelection] = useState<BoardSelectionSummary>({
    selectedCount: 0,
    cardCount: 0,
    frame: null,
    hasSticky: false,
    nodeCount: 0,
    canUndo: false,
    canRedo: false,
  });
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<BoardHandle>(null);
  // Node cần zoom tới sau hydrate (mở canvas từ menu «Xem trên canvas»).
  const [pendingFocusNodeId] = useState<string | null>(() => {
    const id = canvasBridge.pendingFocusNodeId;
    canvasBridge.pendingFocusNodeId = null;
    return id;
  });
  const [pendingHighlightIds] = useState<string[] | null>(() => {
    const ids = canvasBridge.pendingHighlightNodeIds;
    canvasBridge.pendingHighlightNodeIds = null;
    return ids;
  });

  const locked = canvas?.trangThai === "khoa";

  /* ---------- bridge với overlay chat ---------- */

  useEffect(() => {
    canvasBridge.jumpToMessage = onJumpToMessage;
    return () => {
      canvasBridge.jumpToMessage = null;
    };
  }, [onJumpToMessage]);

  useEffect(() => {
    canvasBridge.ingestNode = (node) => boardRef.current?.ingestNode(node);
    return () => {
      canvasBridge.ingestNode = null;
    };
  }, []);

  // Flush node thêm lúc board chưa mount / chưa hydrate.
  useEffect(() => {
    if (nodes === null) return;
    const pending = canvasBridge.pendingIngestNode;
    if (!pending) return;
    canvasBridge.pendingIngestNode = null;
    const id = window.requestAnimationFrame(() => {
      boardRef.current?.ingestNode(pending);
    });
    return () => window.cancelAnimationFrame(id);
  }, [nodes]);

  useEffect(() => {
    canvasBridge.highlightNodes = (ids) =>
      boardRef.current?.highlightNodes(ids);
    return () => {
      canvasBridge.highlightNodes = null;
    };
  }, []);

  useEffect(() => {
    const onFsChange = () =>
      setFullscreen(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    if (!clearConfirmOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setClearConfirmOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearConfirmOpen]);

  useEffect(() => {
    if (!paletteOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!paletteRef.current?.contains(e.target as Node)) {
        setPaletteOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPaletteOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [paletteOpen]);

  useEffect(() => {
    if (locked) setPaletteOpen(false);
  }, [locked]);

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void el.requestFullscreen().catch(() => {});
    }
  }, []);

  /* ---------- load board ---------- */

  useEffect(() => {
    let alive = true;
    void fetch(`/api/chat/rooms/${roomId}/canvas`)
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as
          | { canvas: ChatCanvas; nodes: ChatCanvasNode[] }
          | { error: string }
          | null;
        if (!alive) return;
        if (!res.ok || !data || "error" in data) {
          setError(
            (data && "error" in data && data.error) || "Không tải được canvas.",
          );
          return;
        }
        setCanvas(data.canvas);
        setNodes(data.nodes);
      })
      .catch(() => {
        if (alive) setError("Không tải được canvas.");
      });
    return () => {
      alive = false;
    };
  }, [roomId]);

  /* ---------- persist adapter ---------- */

  const persist = useMemo<BoardPersistAdapter>(
    () => ({
      createNode: async (input) => {
        const res = await fetch(`/api/chat/rooms/${roomId}/canvas/nodes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }).catch(() => null);
        if (!res?.ok) return null;
        const data = (await res.json().catch(() => null)) as {
          node?: BoardNode;
          notice?: ChatMessage | null;
        } | null;
        if (data?.notice) {
          canvasBridge.ingestCommentNotice?.(data.notice);
        }
        return data?.node ?? null;
      },
      patchNode: async (nodeId, patch) => {
        await fetch(`/api/chat/rooms/${roomId}/canvas/nodes/${nodeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }).catch(() => {});
      },
      deleteNode: async (node) => {
        // Server: xóa row + ẩn tin (nếu message-backed) + xóa CF (ảnh canvas-only).
        if (node.id.startsWith("local-")) return;
        await fetch(`/api/chat/rooms/${roomId}/canvas/nodes/${node.id}`, {
          method: "DELETE",
        }).catch(() => {});
      },
      recreateNode: async (node) => {
        // Node message-backed từng bị ẩn — bỏ ẩn để sync sau không bỏ sót.
        if (node.messageId) {
          await fetch(`/api/chat/rooms/${roomId}/canvas/hidden`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messageId: node.messageId }),
          }).catch(() => {});
        }
        const res = await fetch(`/api/chat/rooms/${roomId}/canvas/nodes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loai: node.loai,
            layout: node.layout,
            noiDung: node.noiDung,
            url: node.url,
            messageId: node.messageId,
          }),
        }).catch(() => null);
        if (!res?.ok) return null;
        const data = (await res.json().catch(() => null)) as {
          node?: BoardNode;
        } | null;
        return data?.node ?? null;
      },
    }),
    [roomId],
  );

  const uploadImage = useCallback(async (file: File) => {
    const result = await fetchChatComposeImageUpload(file);
    if (!result.ok) return null;
    return (
      result.url?.trim() ||
      chatImageDeliveryUrl(result.imageId) ||
      null
    );
  }, []);

  /* ---------- toolbar actions ---------- */

  const resync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/canvas/sync`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as {
        nodes: ChatCanvasNode[];
      } | null;
      if (!res.ok || !data?.nodes) return;
      for (const node of data.nodes) {
        if (node.loai === "connector") continue;
        boardRef.current?.ingestNode(node);
      }
    } finally {
      setSyncing(false);
    }
  }, [roomId]);

  if (error) {
    return <p className="cins-chat-side-empty">{error}</p>;
  }

  return (
    <div
      ref={wrapRef}
      className={"cins-canvas-wrap" + (fullscreen ? " is-fullscreen" : "")}
    >
      <div className="cins-canvas-toolbar">
        <div
          className="cins-canvas-tool-seg"
          role="group"
          aria-label="Công cụ"
        >
          <button
            type="button"
            className={
              "cins-canvas-tool-btn cins-canvas-tool-btn--icon" +
              (tool === "select" ? " is-active" : "")
            }
            onClick={() => boardRef.current?.setTool("select")}
            title="Chọn / di chuyển (V)"
            aria-label="Công cụ chọn"
            aria-pressed={tool === "select"}
          >
            <MousePointer2 size={15} strokeWidth={1.9} aria-hidden />
          </button>
          <button
            type="button"
            className={
              "cins-canvas-tool-btn cins-canvas-tool-btn--icon" +
              (tool === "pan" ? " is-active" : "")
            }
            onClick={() => boardRef.current?.setTool("pan")}
            title="Bàn tay — kéo canvas (H, hoặc giữ Space)"
            aria-label="Công cụ bàn tay"
            aria-pressed={tool === "pan"}
          >
            <Hand size={15} strokeWidth={1.9} aria-hidden />
          </button>
          <button
            type="button"
            className={
              "cins-canvas-tool-btn cins-canvas-tool-btn--icon" +
              (tool === "draw" ? " is-active" : "")
            }
            onClick={() => boardRef.current?.setTool("draw")}
            disabled={locked}
            title={
              locked
                ? "Canvas đang khóa"
                : "Vẽ tự do (D) — kéo trên nền trống"
            }
            aria-label="Vẽ tự do"
            aria-pressed={tool === "draw"}
          >
            <Pencil size={15} strokeWidth={1.9} aria-hidden />
          </button>
        </div>
        <span className="cins-canvas-tool-sep" aria-hidden />
        <div
          className="cins-canvas-tool-seg"
          role="group"
          aria-label="Thêm nội dung"
        >
          <button
            type="button"
            className="cins-canvas-tool-btn cins-canvas-tool-btn--icon"
            onClick={() => void boardRef.current?.addSticky(stickyColor)}
            disabled={locked}
            title={locked ? "Canvas đang khóa" : "Thêm ghi chú"}
            aria-label="Thêm ghi chú"
          >
            <StickyNote size={15} strokeWidth={1.9} aria-hidden />
          </button>
          <button
            type="button"
            className="cins-canvas-tool-btn cins-canvas-tool-btn--icon"
            onClick={() => void boardRef.current?.addText()}
            disabled={locked}
            title={locked ? "Canvas đang khóa" : "Thêm khối chữ (không nền)"}
            aria-label="Thêm chữ"
          >
            <Type size={15} strokeWidth={1.9} aria-hidden />
          </button>
          <button
            type="button"
            className="cins-canvas-tool-btn cins-canvas-tool-btn--icon"
            onClick={() => void boardRef.current?.addShape(stickyColor, "rect")}
            disabled={locked}
            title={
              locked
                ? "Canvas đang khóa"
                : "Thêm hình — chọn hình rồi đổi kiểu chữ nhật / elip / thoi"
            }
            aria-label="Thêm hình"
          >
            <Square size={15} strokeWidth={1.9} aria-hidden />
          </button>
          <button
            type="button"
            className="cins-canvas-tool-btn cins-canvas-tool-btn--icon"
            onClick={() => void boardRef.current?.addTable(3, 3)}
            disabled={locked}
            title={locked ? "Canvas đang khóa" : "Thêm bảng 3×3"}
            aria-label="Thêm bảng"
          >
            <Table2 size={15} strokeWidth={1.9} aria-hidden />
          </button>
          <button
            type="button"
            className="cins-canvas-tool-btn cins-canvas-tool-btn--icon"
            onClick={() => void boardRef.current?.addComment()}
            disabled={locked}
            title={locked ? "Canvas đang khóa" : "Thêm bình luận"}
            aria-label="Thêm bình luận"
          >
            <MessageCircle size={15} strokeWidth={1.9} aria-hidden />
          </button>
          <button
            type="button"
            className={
              "cins-canvas-tool-btn cins-canvas-tool-btn--icon" +
              (syncing ? " is-busy" : "")
            }
            onClick={() => void resync()}
            disabled={syncing}
            title="Đồng bộ ảnh/link mới từ chat"
            aria-label={syncing ? "Đang đồng bộ" : "Đồng bộ"}
          >
            <RefreshCw
              size={15}
              strokeWidth={1.9}
              aria-hidden
              className={syncing ? "cins-canvas-spin" : undefined}
            />
          </button>
        </div>
        <span className="cins-canvas-tool-sep" aria-hidden />
        <div className="cins-canvas-palette" ref={paletteRef}>
          <button
            type="button"
            className={
              "cins-canvas-colorwheel" + (paletteOpen ? " is-open" : "")
            }
            disabled={locked}
            aria-label="Màu ghi chú / hình / nét vẽ"
            aria-expanded={paletteOpen}
            aria-haspopup="dialog"
            title="Màu — chọn trước khi thêm ghi chú, hình hoặc vẽ"
            onClick={() => setPaletteOpen((open) => !open)}
          >
            <span className="cins-canvas-colorwheel-ring" aria-hidden />
            <span
              className="cins-canvas-colorwheel-current"
              style={{ background: stickyColor }}
              aria-hidden
            />
          </button>
          {paletteOpen ? (
            <div
              className="cins-canvas-palette-pop"
              role="group"
              aria-label="Bảng màu"
            >
              {STICKY_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={
                    "cins-canvas-swatch" +
                    (stickyColor === color ? " is-active" : "")
                  }
                  style={{ background: color }}
                  aria-label={`Màu ${color}`}
                  aria-pressed={stickyColor === color}
                  onClick={() => {
                    setStickyColor(color);
                    setPaletteOpen(false);
                  }}
                />
              ))}
              <CustomColorSwatch
                value={stickyColor}
                isActive={!isPresetPaletteColor(stickyColor, STICKY_PALETTE)}
                ariaLabel="Màu tùy chọn"
                onPick={(hex) => {
                  setStickyColor(hex);
                  setPaletteOpen(false);
                }}
              />
            </div>
          ) : null}
        </div>
        <span className="cins-canvas-tool-sep" aria-hidden />
        <div
          className="cins-canvas-tool-seg"
          role="group"
          aria-label="Chỉnh sửa"
        >
          <button
            type="button"
            className="cins-canvas-tool-btn cins-canvas-tool-btn--icon cins-canvas-tool-btn--danger"
            onClick={() => setClearConfirmOpen(true)}
            disabled={locked || selection.nodeCount === 0}
            title={
              locked
                ? "Canvas đang khóa"
                : selection.nodeCount === 0
                  ? "Canvas trống"
                  : "Xóa hết nội dung trên canvas"
            }
            aria-label="Xóa hết canvas"
          >
            <Eraser size={15} strokeWidth={1.9} aria-hidden />
          </button>
          <button
            type="button"
            className="cins-canvas-tool-btn cins-canvas-tool-btn--icon"
            onClick={() => boardRef.current?.undo()}
            disabled={!selection.canUndo || locked}
            title="Hoàn tác (Ctrl+Z)"
            aria-label="Hoàn tác"
          >
            <Undo2 size={15} strokeWidth={1.9} aria-hidden />
          </button>
          <button
            type="button"
            className="cins-canvas-tool-btn cins-canvas-tool-btn--icon"
            onClick={() => boardRef.current?.redo()}
            disabled={!selection.canRedo || locked}
            title="Làm lại (Ctrl+Shift+Z)"
            aria-label="Làm lại"
          >
            <Redo2 size={15} strokeWidth={1.9} aria-hidden />
          </button>
        </div>
        <span className="cins-canvas-tool-sep" aria-hidden />
        <div
          className="cins-canvas-tool-seg"
          role="group"
          aria-label="Xem"
        >
          {locked ? (
            <span className="cins-canvas-lock-badge">Đã khóa</span>
          ) : null}
          <button
            type="button"
            className="cins-canvas-tool-btn cins-canvas-tool-btn--icon"
            onClick={toggleFullscreen}
            title={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            aria-label={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          >
            {fullscreen ? (
              <Minimize2 size={15} strokeWidth={1.9} aria-hidden />
            ) : (
              <Maximize2 size={15} strokeWidth={1.9} aria-hidden />
            )}
          </button>
        </div>
      </div>
      {clearConfirmOpen ? (
        <div
          className="cins-canvas-clear-backdrop"
          role="presentation"
          onClick={() => setClearConfirmOpen(false)}
        >
          <div
            className="cins-canvas-clear-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cins-canvas-clear-title"
            aria-describedby="cins-canvas-clear-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="cins-canvas-clear-icon" aria-hidden>
              <AlertTriangle size={22} strokeWidth={2} />
            </span>
            <h4 id="cins-canvas-clear-title">Xóa hết nội dung canvas?</h4>
            <p id="cins-canvas-clear-desc">
              Toàn bộ ghi chú, hình, bảng, nét vẽ và ảnh trên board sẽ bị gỡ.
              Ảnh chỉ tồn tại trên canvas cũng bị xóa khỏi Cloudflare. Thao tác
              này không hoàn tác được.
            </p>
            <div className="cins-canvas-clear-actions">
              <button
                type="button"
                className="cins-canvas-tool-btn"
                onClick={() => setClearConfirmOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="cins-canvas-tool-btn cins-canvas-clear-confirm"
                onClick={() => {
                  boardRef.current?.clearBoard();
                  setClearConfirmOpen(false);
                }}
              >
                Xóa hết
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="cins-canvas-board">
        {nodes === null && !error ? (
          <p className="cins-canvas-loading">Đang tải canvas…</p>
        ) : null}
        <CinsBoard
          ref={boardRef}
          nodes={nodes}
          locked={Boolean(locked)}
          persist={persist}
          onJumpToMessage={onJumpToMessage}
          onSelectionChange={setSelection}
          onToolChange={setTool}
          uploadImage={uploadImage}
          inkColor={stickyColor === "transparent" ? "#1a1a1a" : stickyColor}
          pendingFocusNodeId={pendingFocusNodeId}
          pendingHighlightNodeIds={pendingHighlightIds}
        />
      </div>
    </div>
  );
}
