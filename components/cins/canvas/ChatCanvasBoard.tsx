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
  AlignHorizontalSpaceAround,
  Hand,
  Maximize2,
  MessageCircle,
  Minimize2,
  MousePointer2,
  Pencil,
  Redo2,
  RefreshCw,
  Search,
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

  useEffect(() => {
    if (tool === "sticky" || tool === "shape") {
      boardRef.current?.setTool(tool, { mau: stickyColor });
    }
  }, [stickyColor, tool]);

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
        const res = await fetch(
          `/api/chat/rooms/${roomId}/canvas/nodes/${nodeId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          },
        ).catch(() => null);
        if (!res?.ok) return;
        const data = (await res.json().catch(() => null)) as {
          notice?: ChatMessage | null;
        } | null;
        if (data?.notice) {
          canvasBridge.ingestCommentNotice?.(data.notice);
        }
      },
      patchNodesLayoutBatch: async (patches) => {
        const res = await fetch(
          `/api/chat/rooms/${roomId}/canvas/nodes/batch`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patches }),
          },
        ).catch(() => null);
        if (!res?.ok) {
          const data = (await res?.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(data?.error ?? "Không lưu được layout.");
        }
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
      <div className="cins-canvas-toolbar is-wrap">
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
            className={
              "cins-canvas-tool-btn cins-canvas-tool-btn--icon" +
              (tool === "sticky" ? " is-active" : "")
            }
            onClick={() => {
              if (tool === "sticky") boardRef.current?.setTool("select");
              else boardRef.current?.setTool("sticky", { mau: stickyColor });
            }}
            disabled={locked}
            title={
              locked
                ? "Canvas đang khóa"
                : "Thêm ghi chú — bấm trên canvas để đặt"
            }
            aria-label="Thêm ghi chú"
            aria-pressed={tool === "sticky"}
          >
            <StickyNote size={15} strokeWidth={1.9} aria-hidden />
          </button>
          <button
            type="button"
            className={
              "cins-canvas-tool-btn cins-canvas-tool-btn--icon" +
              (tool === "text" ? " is-active" : "")
            }
            onClick={() => boardRef.current?.setTool("text")}
            disabled={locked}
            title={
              locked
                ? "Canvas đang khóa"
                : "Thêm chữ (T) — click: dòng chữ ôm nội dung · kéo: vùng chữ ôm khung"
            }
            aria-label="Thêm chữ"
            aria-pressed={tool === "text"}
          >
            <Type size={15} strokeWidth={1.9} aria-hidden />
          </button>
          <button
            type="button"
            className={
              "cins-canvas-tool-btn cins-canvas-tool-btn--icon" +
              (tool === "shape" ? " is-active" : "")
            }
            onClick={() => {
              if (tool === "shape") boardRef.current?.setTool("select");
              else {
                boardRef.current?.setTool("shape", {
                  mau: stickyColor,
                  shapeKind: "rect",
                });
              }
            }}
            disabled={locked}
            title={
              locked
                ? "Canvas đang khóa"
                : "Thêm hình — bấm trên canvas để đặt, rồi đổi chữ nhật / elip / thoi"
            }
            aria-label="Thêm hình"
            aria-pressed={tool === "shape"}
          >
            <Square size={15} strokeWidth={1.9} aria-hidden />
          </button>
          <button
            type="button"
            className={
              "cins-canvas-tool-btn cins-canvas-tool-btn--icon" +
              (tool === "table" ? " is-active" : "")
            }
            onClick={() => {
              if (tool === "table") boardRef.current?.setTool("select");
              else boardRef.current?.setTool("table", { rows: 3, cols: 3 });
            }}
            disabled={locked}
            title={
              locked
                ? "Canvas đang khóa"
                : "Thêm bảng 3×3 — bấm trên canvas để đặt"
            }
            aria-label="Thêm bảng"
            aria-pressed={tool === "table"}
          >
            <Table2 size={15} strokeWidth={1.9} aria-hidden />
          </button>
          <button
            type="button"
            className={
              "cins-canvas-tool-btn cins-canvas-tool-btn--icon" +
              (tool === "comment" ? " is-active" : "")
            }
            onClick={() => {
              if (tool === "comment") boardRef.current?.setTool("select");
              else boardRef.current?.setTool("comment");
            }}
            disabled={locked}
            title={
              locked
                ? "Canvas đang khóa"
                : "Thêm bình luận — bấm trên canvas để đặt"
            }
            aria-label="Thêm bình luận"
            aria-pressed={tool === "comment"}
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
            className="cins-canvas-tool-btn cins-canvas-tool-btn--icon"
            onClick={() => boardRef.current?.autoLayout()}
            disabled={locked || selection.nodeCount === 0}
            title={
              locked
                ? "Canvas đang khóa"
                : selection.nodeCount === 0
                  ? "Canvas trống"
                  : "Tự sắp xếp — xếp lại block ngăn nắp"
            }
            aria-label="Tự sắp xếp"
          >
            <AlignHorizontalSpaceAround size={15} strokeWidth={1.9} aria-hidden />
          </button>
          <button
            type="button"
            className="cins-canvas-tool-btn cins-canvas-tool-btn--icon"
            onClick={() => boardRef.current?.zoomToFit()}
            disabled={selection.nodeCount === 0}
            title={
              selection.nodeCount === 0
                ? "Canvas trống"
                : "Phóng vừa vùng có nội dung"
            }
            aria-label="Phóng vừa vùng có nội dung"
          >
            <Search size={15} strokeWidth={1.9} aria-hidden />
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
