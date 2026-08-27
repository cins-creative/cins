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
  ClipboardPaste,
  Copy,
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
import {
  CINS_INK_COLOR,
  DEFAULT_DRAW_WIDTH,
  DRAW_WIDTH_PRESETS,
  INK_PALETTE,
} from "@/components/cins/board/content-kinds";
import type {
  BoardHandle,
  BoardNode,
  BoardPersistAdapter,
  BoardSelectionSummary,
  BoardTool,
} from "@/components/cins/board/board-types";
import { fetchChatComposeImageUpload } from "@/lib/chat/compose-image-upload";
import { chatImageDeliveryUrl } from "@/lib/chat/image-url";
import {
  buildClipboardPayload,
  parseClipboardPayload,
  readCanvasClipboard,
  rememberCanvasClipboard,
  writeCanvasClipboard,
} from "@/lib/chat/canvas/clipboard";
import type {
  CanvasCheDoSaoChep,
  CanvasClipboardPayload,
  ChatCanvas,
  ChatCanvasNode,
} from "@/lib/chat/canvas/types";
import type { ChatGroupMember, ChatMessage } from "@/lib/chat/types";

type Props = {
  roomId: string;
  onJumpToMessage: (messageId: string) => void;
  viewerUserId?: string | null;
  /** Chỉ phòng nhóm (`nhom`) mới hiện Private/Public; 1-1 luôn Public. */
  isGroup?: boolean;
};

export default function ChatCanvasBoard({
  roomId,
  onJumpToMessage,
  viewerUserId = null,
  isGroup = false,
}: Props) {
  const [nodes, setNodes] = useState<ChatCanvasNode[] | null>(null);
  const [canvas, setCanvas] = useState<ChatCanvas | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [stickyColor, setStickyColor] = useState(STICKY_PALETTE[0]!);
  const [inkColor, setInkColor] = useState(CINS_INK_COLOR);
  const [inkWidth, setInkWidth] = useState(DEFAULT_DRAW_WIDTH);
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
  const [mentionMembers, setMentionMembers] = useState<ChatGroupMember[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeBusy, setNoticeBusy] = useState(false);
  const [pasting, setPasting] = useState(false);
  const pastingRef = useRef(false);
  const noticeTimerRef = useRef(0);

  const locked = canvas?.trangThai === "khoa";
  /** 1-1 / không phải nhóm: luôn cho copy, không UI quyền. */
  const copyPolicyManaged = isGroup;
  const copyEnabled =
    !copyPolicyManaged || canvas?.cheDoSaoChep === "public";

  const flash = useCallback((msg: string, opts?: { sticky?: boolean }) => {
    setNotice(msg);
    setNoticeBusy(Boolean(opts?.sticky));
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = 0;
    if (opts?.sticky) return;
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      setNoticeBusy(false);
      noticeTimerRef.current = 0;
    }, 2800);
  }, []);

  useEffect(
    () => () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    },
    [],
  );

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
          | {
              canvas: ChatCanvas;
              nodes: ChatCanvasNode[];
              canManage?: boolean;
            }
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
        setCanManage(Boolean(data.canManage));
      })
      .catch(() => {
        if (alive) setError("Không tải được canvas.");
      });
    return () => {
      alive = false;
    };
  }, [roomId]);

  useEffect(() => {
    let alive = true;
    void fetch(`/api/chat/rooms/${roomId}/members`)
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as
          | { members?: ChatGroupMember[] }
          | null;
        if (!alive) return;
        if (res.ok && Array.isArray(data?.members)) {
          setMentionMembers(data.members);
        }
      })
      .catch(() => {
        /* DM / không phải nhóm — bỏ @gợi ý */
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

  const handleCopy = useCallback(() => {
    if (!copyEnabled) {
      flash("Canvas đang Private — không sao chép được.");
      return;
    }
    if (!canvas) return;
    const selected = boardRef.current?.getNodesForCopy() ?? [];
    if (selected.length === 0) {
      flash("Chọn nội dung để sao chép.");
      return;
    }
    const payload = buildClipboardPayload({
      canvasId: canvas.id,
      roomId,
      nodes: selected,
    });
    if (!payload) return;
    void writeCanvasClipboard(payload).then(() => {
      flash(`Đã sao chép ${payload.nodes.length} mục.`);
    });
  }, [canvas, copyEnabled, flash, roomId]);

  const pasteFromPayload = useCallback(
    async (payload: CanvasClipboardPayload): Promise<boolean> => {
      if (locked) {
        flash("Canvas đang khóa.");
        return true;
      }
      if (pastingRef.current) {
        flash("Đang dán — chờ xong rồi thử lại.");
        return true;
      }
      const approx = payload.nodes.filter((n) => n.loai !== "frame").length;
      pastingRef.current = true;
      setPasting(true);
      /* Báo ngay trước await — double rAF để browser kịp paint. */
      flash(
        approx > 1 ? `Đang dán ${approx} mục…` : "Đang dán…",
        { sticky: true },
      );
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      try {
        const res = await fetch(`/api/chat/rooms/${roomId}/canvas/nodes/paste`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodes: payload.nodes }),
        }).catch(() => null);
        const data = (await res?.json().catch(() => null)) as
          | { nodes?: BoardNode[]; error?: string }
          | null;
        if (!res?.ok || !data?.nodes) {
          flash(data?.error ?? "Không dán được.");
          return true;
        }
        boardRef.current?.ingestNodes(data.nodes);
        flash(`Đã dán ${data.nodes.length} mục.`);
        return true;
      } finally {
        pastingRef.current = false;
        setPasting(false);
      }
    },
    [flash, locked, roomId],
  );

  const pasteFromClipboardText = useCallback(
    async (text: string): Promise<boolean> => {
      const payload = parseClipboardPayload(text);
      if (!payload) return false;
      rememberCanvasClipboard(payload);
      return pasteFromPayload(payload);
    },
    [pasteFromPayload],
  );

  const handlePasteToolbar = useCallback(() => {
    if (locked) {
      flash("Canvas đang khóa.");
      return;
    }
    void (async () => {
      const { payload, denied } = await readCanvasClipboard();
      if (payload) {
        await pasteFromPayload(payload);
        return;
      }
      if (denied) {
        flash("Trình duyệt chặn clipboard — Copy lại rồi bấm Dán, hoặc Ctrl+V.");
        return;
      }
      flash("Clipboard không có nội dung canvas — hãy Copy trước.");
    })();
  }, [flash, locked, pasteFromPayload]);

  const setCheDoSaoChep = useCallback(
    async (cheDo: CanvasCheDoSaoChep) => {
      if (!copyPolicyManaged || !canManage || canvas?.cheDoSaoChep === cheDo) {
        return;
      }
      const prev = canvas?.cheDoSaoChep ?? "private";
      setCanvas((c) => (c ? { ...c, cheDoSaoChep: cheDo } : c));
      const res = await fetch(`/api/chat/rooms/${roomId}/canvas`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cheDoSaoChep: cheDo }),
      }).catch(() => null);
      const data = (await res?.json().catch(() => null)) as
        | { canvas?: ChatCanvas; error?: string }
        | null;
      if (!res?.ok || !data?.canvas) {
        setCanvas((c) => (c ? { ...c, cheDoSaoChep: prev } : c));
        flash(data?.error ?? "Không đổi chế độ sao chép.");
        return;
      }
      setCanvas(data.canvas);
      flash(
        cheDo === "public"
          ? "Canvas Public — thành viên có thể sao chép."
          : "Canvas Private — không sao chép được.",
      );
    },
    [canManage, canvas?.cheDoSaoChep, copyPolicyManaged, flash, roomId],
  );

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
            onClick={() => {
              boardRef.current?.setTool("draw");
              boardRef.current?.setInkWidth(inkWidth);
            }}
            disabled={locked}
            title={
              locked
                ? "Canvas đang khóa"
                : "Vẽ tự do (D) — kéo trên canvas (kể cả lên object)"
            }
            aria-label="Vẽ tự do"
            aria-pressed={tool === "draw"}
          >
            <Pencil size={15} strokeWidth={1.9} aria-hidden />
          </button>
          {tool === "draw" ? (
            <div
              className="cins-board-wire-opts cins-canvas-ink-width"
              role="group"
              aria-label="Độ dày nét"
            >
              {DRAW_WIDTH_PRESETS.map((width) => (
                <button
                  key={width}
                  type="button"
                  className={
                    "cins-board-wire-opt cins-board-ink-width-opt" +
                    (inkWidth === width ? " is-active" : "")
                  }
                  title={`Nét ${width}px`}
                  aria-label={`Độ dày nét ${width}`}
                  aria-pressed={inkWidth === width}
                  disabled={locked}
                  onClick={() => {
                    setInkWidth(width);
                    boardRef.current?.setInkWidth(width);
                  }}
                >
                  <span
                    className="cins-board-ink-width-sample"
                    style={{ height: Math.max(2, width * 0.7) }}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          ) : null}
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
                : "Thêm ghi chú (S) — bấm một lần trên canvas (kể cả lên nhóm), rồi về công cụ chọn"
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
                : "Thêm chữ — click một lần rồi về chọn · kéo: vùng chữ ôm khung"
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
                : "Thêm hình (R) — bấm một lần trên canvas (kể cả lên nhóm), rồi về công cụ chọn"
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
                : "Thêm bảng 3×3 (T) — bấm một lần trên canvas (kể cả lên nhóm), rồi về công cụ chọn"
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
                : "Thêm bình luận (C) — bấm một lần trên canvas (kể cả lên nhóm), rồi về công cụ chọn"
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
            aria-label={
              tool === "draw" ? "Màu nét vẽ" : "Màu ghi chú / hình / nét vẽ"
            }
            aria-expanded={paletteOpen}
            aria-haspopup="dialog"
            title={
              tool === "draw"
                ? "Màu nét vẽ"
                : "Màu — chọn trước khi thêm ghi chú, hình hoặc vẽ"
            }
            onClick={() => setPaletteOpen((open) => !open)}
          >
            <span className="cins-canvas-colorwheel-ring" aria-hidden />
            <span
              className="cins-canvas-colorwheel-current"
              style={{
                background: tool === "draw" ? inkColor : stickyColor,
              }}
              aria-hidden
            />
          </button>
          {paletteOpen ? (
            <div
              className="cins-canvas-palette-pop"
              role="group"
              aria-label="Bảng màu"
            >
              {(tool === "draw" ? INK_PALETTE : STICKY_PALETTE).map((color) => (
                <button
                  key={color}
                  type="button"
                  className={
                    "cins-canvas-swatch" +
                    ((tool === "draw" ? inkColor : stickyColor) === color
                      ? " is-active"
                      : "")
                  }
                  style={{ background: color }}
                  aria-label={`Màu ${color}`}
                  aria-pressed={
                    (tool === "draw" ? inkColor : stickyColor) === color
                  }
                  onClick={() => {
                    if (tool === "draw") setInkColor(color);
                    else setStickyColor(color);
                    setPaletteOpen(false);
                  }}
                />
              ))}
              <CustomColorSwatch
                value={tool === "draw" ? inkColor : stickyColor}
                isActive={
                  !isPresetPaletteColor(
                    tool === "draw" ? inkColor : stickyColor,
                    tool === "draw" ? INK_PALETTE : STICKY_PALETTE,
                  )
                }
                ariaLabel="Màu tùy chọn"
                onPick={(hex) => {
                  if (tool === "draw") setInkColor(hex);
                  else setStickyColor(hex);
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
            onClick={handleCopy}
            disabled={selection.selectedCount === 0}
            title={
              copyEnabled
                ? "Sao chép (Ctrl+C)"
                : "Canvas Private — không sao chép được"
            }
            aria-label="Sao chép"
          >
            <Copy size={15} strokeWidth={1.9} aria-hidden />
          </button>
          <button
            type="button"
            className="cins-canvas-tool-btn cins-canvas-tool-btn--icon"
            onClick={handlePasteToolbar}
            disabled={Boolean(locked) || pasting}
            title={
              locked
                ? "Canvas đang khóa"
                : pasting
                  ? "Đang dán…"
                  : "Dán nội dung canvas (Ctrl+V)"
            }
            aria-label="Dán"
            aria-busy={pasting}
          >
            <ClipboardPaste size={15} strokeWidth={1.9} aria-hidden />
          </button>
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
          {copyPolicyManaged && canManage ? (
            <div
              className="cins-canvas-tool-seg cins-canvas-copy-mode"
              role="group"
              aria-label="Chế độ sao chép"
            >
              <button
                type="button"
                className={
                  "cins-canvas-tool-btn" +
                  (canvas?.cheDoSaoChep !== "public" ? " is-active" : "")
                }
                onClick={() => void setCheDoSaoChep("private")}
                title="Private — không sao chép được"
                aria-pressed={canvas?.cheDoSaoChep !== "public"}
              >
                Private
              </button>
              <button
                type="button"
                className={
                  "cins-canvas-tool-btn" +
                  (canvas?.cheDoSaoChep === "public" ? " is-active" : "")
                }
                onClick={() => void setCheDoSaoChep("public")}
                title="Public — cho phép sao chép sang canvas khác"
                aria-pressed={canvas?.cheDoSaoChep === "public"}
              >
                Public
              </button>
            </div>
          ) : copyPolicyManaged ? (
            canvas?.cheDoSaoChep === "public" ? (
              <span className="cins-canvas-lock-badge" title="Cho phép sao chép">
                Public
              </span>
            ) : (
              <span
                className="cins-canvas-lock-badge"
                title="Không sao chép được"
              >
                Private
              </span>
            )
          ) : null}
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
      {notice ? (
        <p
          className={
            "cins-canvas-notice" + (noticeBusy ? " is-busy" : "")
          }
          role="status"
          aria-live="polite"
        >
          {noticeBusy ? (
            <RefreshCw
              size={14}
              strokeWidth={2}
              className="cins-canvas-spin"
              aria-hidden
            />
          ) : null}
          {notice}
        </p>
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
          inkColor={inkColor}
          pendingFocusNodeId={pendingFocusNodeId}
          pendingHighlightNodeIds={pendingHighlightIds}
          mentionMembers={mentionMembers}
          viewerUserId={
            viewerUserId ??
            mentionMembers.find((m) => m.isViewer)?.userId ??
            null
          }
          copyEnabled={copyEnabled}
          onCopyRequest={handleCopy}
          onPasteCanvasText={pasteFromClipboardText}
        />
      </div>
    </div>
  );
}
