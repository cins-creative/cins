"use client";

/**
 * Undo/redo command stack cho board engine.
 *
 * Mỗi command mô tả dữ liệu trước/sau; CinsBoard là nơi duy nhất
 * thực thi (apply state + persist). Undo lệnh xóa tạo lại node với id DB
 * mới — gọi `remapNodeId` để mọi entry cũ trỏ sang id mới, tránh 404
 * khi redo/undo tiếp.
 */

import { useCallback, useMemo, useRef } from "react";

import type { BoardNode } from "@/components/cins/board/board-types";

export type BoardLayoutSnapshot = {
  nodeId: string;
  layout: BoardNode["layout"];
  noiDung: string | null;
};

export type BoardCommand =
  | {
      type: "layout";
      before: BoardLayoutSnapshot[];
      after: BoardLayoutSnapshot[];
    }
  | { type: "create"; node: BoardNode }
  | { type: "delete"; node: BoardNode }
  | {
      /** Gom nhóm: tạo frame + set groupId các con. */
      type: "group";
      frame: BoardNode;
      before: BoardLayoutSnapshot[];
      after: BoardLayoutSnapshot[];
    }
  | {
      /** Tách nhóm: xóa frame + clear groupId các con. */
      type: "ungroup";
      frame: BoardNode;
      before: BoardLayoutSnapshot[];
      after: BoardLayoutSnapshot[];
    };

const HISTORY_CAP = 100;

function remapLayout(
  layout: BoardNode["layout"],
  oldId: string,
  newId: string,
): BoardNode["layout"] {
  if (
    layout.groupId !== oldId &&
    layout.from !== oldId &&
    layout.to !== oldId
  ) {
    return layout;
  }
  return {
    ...layout,
    groupId: layout.groupId === oldId ? newId : layout.groupId,
    from: layout.from === oldId ? newId : layout.from,
    to: layout.to === oldId ? newId : layout.to,
  };
}

function remapSnapshot(
  list: BoardLayoutSnapshot[],
  oldId: string,
  newId: string,
): void {
  for (const snap of list) {
    if (snap.nodeId === oldId) snap.nodeId = newId;
    snap.layout = remapLayout(snap.layout, oldId, newId);
  }
}

export function useBoardHistory() {
  const undoRef = useRef<BoardCommand[]>([]);
  const redoRef = useRef<BoardCommand[]>([]);

  const push = useCallback((command: BoardCommand) => {
    undoRef.current.push(command);
    if (undoRef.current.length > HISTORY_CAP) undoRef.current.shift();
    redoRef.current = [];
  }, []);

  const popUndo = useCallback((): BoardCommand | null => {
    const cmd = undoRef.current.pop() ?? null;
    if (cmd) redoRef.current.push(cmd);
    return cmd;
  }, []);

  const popRedo = useCallback((): BoardCommand | null => {
    const cmd = redoRef.current.pop() ?? null;
    if (cmd) undoRef.current.push(cmd);
    return cmd;
  }, []);

  const canUndo = useCallback(() => undoRef.current.length > 0, []);
  const canRedo = useCallback(() => redoRef.current.length > 0, []);

  const clear = useCallback(() => {
    undoRef.current = [];
    redoRef.current = [];
  }, []);

  /** Node được tạo lại với id mới (undo delete) — remap toàn bộ stack. */
  const remapNodeId = useCallback((oldId: string, newId: string) => {
    for (const stack of [undoRef.current, redoRef.current]) {
      for (const cmd of stack) {
        if (cmd.type === "layout") {
          remapSnapshot(cmd.before, oldId, newId);
          remapSnapshot(cmd.after, oldId, newId);
          continue;
        }
        if (cmd.type === "create" || cmd.type === "delete") {
          if (cmd.node.id === oldId) cmd.node = { ...cmd.node, id: newId };
          cmd.node = {
            ...cmd.node,
            layout: remapLayout(cmd.node.layout, oldId, newId),
          };
          continue;
        }
        if (cmd.frame.id === oldId) cmd.frame = { ...cmd.frame, id: newId };
        remapSnapshot(cmd.before, oldId, newId);
        remapSnapshot(cmd.after, oldId, newId);
      }
    }
  }, []);

  return useMemo(
    () => ({ push, popUndo, popRedo, canUndo, canRedo, clear, remapNodeId }),
    [push, popUndo, popRedo, canUndo, canRedo, clear, remapNodeId],
  );
}
