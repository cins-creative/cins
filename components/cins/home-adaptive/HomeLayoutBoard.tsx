"use client";

import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Columns2,
  GripVertical,
  Loader2,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";

import {
  HomeModuleLivePreview,
  HomeModulePreviewSkeleton,
} from "@/components/cins/home-adaptive/HomeModuleLivePreview";
import { HomeModuleMockCard } from "@/components/cins/home-adaptive/HomeModuleMockCard";
import { DraftModuleLimitProvider } from "@/components/cins/home-adaptive/draft-module-limit";
import {
  moduleMatchesCapabilities,
  type HomeCapability,
} from "@/lib/cins/home-adaptive/capability-types";
import {
  HOME_LAYOUT_ITEM_LIMIT_DEFAULT,
  HOME_LAYOUT_ITEM_LIMIT_MAX,
  HOME_LAYOUT_ITEM_LIMIT_MIN,
  clampItemLimit,
  type HomeLayoutItemLimits,
} from "@/lib/cins/home-adaptive/layout-prefs";
import {
  MODULE_GROUP_LABEL,
  MODULE_META,
  moduleGroupOrderForPersona,
  type ModuleMeta,
} from "@/lib/cins/home-adaptive/module-meta";
import type { ModulePreviewPayload } from "@/lib/cins/home-adaptive/module-preview-types";
import type { ModuleId, Persona } from "@/lib/cins/home-adaptive/persona";

type Side = "left" | "right";

type Draft = {
  left: ModuleId[];
  right: ModuleId[];
  hidden: ModuleId[];
  limits: HomeLayoutItemLimits;
};

type PreviewEntry =
  | { status: "loading"; forLimit: number }
  | { status: "ok"; payload: ModulePreviewPayload; forLimit: number }
  | { status: "error"; forLimit: number };

type LayoutEditCtx = {
  editing: boolean;
  persona: Persona;
  viewerProfileId: string;
  draft: Draft;
  dirty: boolean;
  newlyInjected: ReadonlySet<ModuleId>;
  childMap: Map<string, ReactElement>;
  previews: ReadonlyMap<ModuleId, PreviewEntry>;
  /** Khối đang xem preview theo limit draft (sau khi đổi số). */
  limitPreviewIds: ReadonlySet<ModuleId>;
  ensurePreview: (id: ModuleId, limit?: number) => void;
  ensurePreviews: (ids: ModuleId[]) => void;
  dragId: ModuleId | null;
  dragOver: { side: Side; index: number } | null;
  setDragId: (id: ModuleId | null) => void;
  setDragOver: (v: { side: Side; index: number } | null) => void;
  applyDrop: (id: ModuleId, toSide: Side, toIndex: number) => void;
  removeModule: (id: ModuleId) => void;
  addModule: (id: ModuleId, side: Side, index: number) => void;
  moveInColumn: (side: Side, id: ModuleId, dir: -1 | 1) => void;
  moveToOtherColumn: (id: ModuleId, from: Side) => void;
  setItemLimit: (id: ModuleId, limit: number) => void;
  available: ModuleMeta[];
  /** Vị trí đang mở panel thêm (giữa các khối). */
  addAt: { side: Side; index: number } | null;
  setAddAt: (v: { side: Side; index: number } | null) => void;
  menuId: ModuleId | null;
  setMenuId: (id: ModuleId | null) => void;
  /** Có khối chỉ có live preview (chưa SSR) — cần soft-refresh nền sau lưu. */
  needsServerHydrate: boolean;
  discardDraft: () => void;
  markSaved: () => void;
  exitEditing: (opts?: { refresh?: boolean }) => void;
};

const Ctx = createContext<LayoutEditCtx | null>(null);

function useLayoutEdit(): LayoutEditCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("HomeLayoutEditProvider missing");
  return v;
}

/** Khối tự slice client-side — không cần đổi sang live preview khi đổi limit. */
const CLIENT_LIMIT_MODULES = new Set<ModuleId>([
  "tin_nhan_ban_be",
  "tin_nhan_to_chuc",
  "tin_nhan_mua_ban",
  "don_can_xu_ly",
]);

function collectChildMap(children: ReactNode): Map<string, ReactElement> {
  const map = new Map<string, ReactElement>();
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as { "data-ha-module"?: string };
    const fromData = props["data-ha-module"];
    const fromKey =
      child.key != null
        ? String(child.key).replace(/^\.\$/, "").replace(/^\./, "")
        : null;
    const key = fromData || fromKey;
    if (!key) return;
    map.set(key, child);
  });
  return map;
}

function sameDraft(a: Draft, b: Draft): boolean {
  const limA = a.limits ?? {};
  const limB = b.limits ?? {};
  const keys = new Set([...Object.keys(limA), ...Object.keys(limB)]);
  for (const k of keys) {
    const ka = k as ModuleId;
    if ((limA[ka] ?? HOME_LAYOUT_ITEM_LIMIT_DEFAULT) !==
      (limB[ka] ?? HOME_LAYOUT_ITEM_LIMIT_DEFAULT)) {
      return false;
    }
  }
  return (
    a.left.join(",") === b.left.join(",") &&
    a.right.join(",") === b.right.join(",") &&
    a.hidden.join(",") === b.hidden.join(",")
  );
}

type ProviderProps = {
  editing: boolean;
  persona: Persona;
  viewerProfileId: string;
  initialLeft: ModuleId[];
  initialRight: ModuleId[];
  initialHidden: ModuleId[];
  initialLimits?: HomeLayoutItemLimits;
  newlyInjected?: ModuleId[];
  children: ReactNode;
  /** Nội dung module server — keyed by ModuleId. */
  moduleNodes: ReactNode;
  exitEditing: (opts?: { refresh?: boolean }) => void;
  capabilities?: readonly HomeCapability[];
};

export function HomeLayoutEditProvider({
  editing,
  persona,
  viewerProfileId,
  initialLeft,
  initialRight,
  initialHidden,
  initialLimits = {},
  newlyInjected = [],
  children,
  moduleNodes,
  exitEditing,
  capabilities = [],
}: ProviderProps) {
  const childMap = useMemo(
    () => collectChildMap(moduleNodes),
    [moduleNodes],
  );
  const [baseline, setBaseline] = useState<Draft>(() => ({
    left: [...initialLeft],
    right: [...initialRight],
    hidden: [...initialHidden],
    limits: { ...initialLimits },
  }));
  const [draft, setDraft] = useState<Draft>(baseline);
  const [dragId, setDragId] = useState<ModuleId | null>(null);
  const [dragOver, setDragOver] = useState<{
    side: Side;
    index: number;
  } | null>(null);
  const [addAt, setAddAt] = useState<{ side: Side; index: number } | null>(
    null,
  );
  const [menuId, setMenuId] = useState<ModuleId | null>(null);
  const [previews, setPreviews] = useState<Map<ModuleId, PreviewEntry>>(
    () => new Map(),
  );
  const [limitPreviewIds, setLimitPreviewIds] = useState<Set<ModuleId>>(
    () => new Set(),
  );
  const previewInflight = useRef<Set<string>>(new Set());
  const previewsRef = useRef(previews);
  previewsRef.current = previews;
  const dirty = !sameDraft(draft, baseline);
  const newSet = useMemo(() => new Set(newlyInjected), [newlyInjected]);

  const serverIdsKey = `${initialLeft.join(",")}|${initialRight.join(",")}|${initialHidden.join(",")}|${JSON.stringify(initialLimits)}`;
  useEffect(() => {
    const next: Draft = {
      left: [...initialLeft],
      right: [...initialRight],
      hidden: [...initialHidden],
      limits: { ...initialLimits },
    };
    setBaseline(next);
    setDraft(next);
    setPreviews(new Map());
    setLimitPreviewIds(new Set());
    previewInflight.current.clear();
    // Chỉ sync khi SSR layout đổi (sau refresh), không reset khi đang kéo thả.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional key
  }, [serverIdsKey]);

  useEffect(() => {
    if (!editing || !dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [editing, dirty]);

  /** Đang gắn cột — `hidden` vẫn hiện trong «Thêm khối» để bật lại. */
  const used = useMemo(
    () => new Set<ModuleId>([...draft.left, ...draft.right]),
    [draft],
  );

  const available = useMemo(() => {
    const list = Object.values(MODULE_META).filter((m) => {
      if (m.id === "quay_cua_toi") return false;
      if (used.has(m.id)) return false;
      return moduleMatchesCapabilities(capabilities, {
        requires: m.requires,
        requiresAny: m.requiresAny,
      });
    });
    list.sort((a, b) => {
      const aFit = a.defaultPersonas.includes(persona) ? 0 : 1;
      const bFit = b.defaultPersonas.includes(persona) ? 0 : 1;
      if (aFit !== bFit) return aFit - bFit;
      return a.label.localeCompare(b.label, "vi");
    });
    return list;
  }, [used, persona, capabilities]);

  const needsServerHydrate = useMemo(() => {
    for (const id of [...draft.left, ...draft.right]) {
      if (!childMap.has(id)) return true;
    }
    return false;
  }, [draft.left, draft.right, childMap]);

  const ensurePreview = useCallback(
    (id: ModuleId, limit: number = 3) => {
      const forLimit =
        clampItemLimit(limit) ?? HOME_LAYOUT_ITEM_LIMIT_DEFAULT;
      const inflightKey = `${id}:${forLimit}`;
      if (previewInflight.current.has(inflightKey)) return;
      const cur = previewsRef.current.get(id);
      if (cur?.status === "ok" && cur.forLimit === forLimit) return;
      if (cur?.status === "loading" && cur.forLimit === forLimit) return;

      setPreviews((prev) => {
        const next = new Map(prev);
        next.set(id, { status: "loading", forLimit });
        return next;
      });
      previewInflight.current.add(inflightKey);
      void (async () => {
        try {
          const res = await fetch(
            `/api/home/module-preview?id=${encodeURIComponent(id)}&limit=${forLimit}`,
          );
          if (!res.ok) throw new Error("preview failed");
          const payload = (await res.json()) as ModulePreviewPayload;
          setPreviews((prev) => {
            const next = new Map(prev);
            next.set(id, { status: "ok", payload, forLimit });
            return next;
          });
        } catch {
          setPreviews((prev) => {
            const next = new Map(prev);
            next.set(id, { status: "error", forLimit });
            return next;
          });
        } finally {
          previewInflight.current.delete(inflightKey);
        }
      })();
    },
    [],
  );

  /** Một round-trip batch — catalog thêm khối (luôn 3 dòng). */
  const ensurePreviews = useCallback((ids: ModuleId[]) => {
    const forLimit = 3;
    const need = ids.filter((id) => {
      const inflightKey = `${id}:${forLimit}`;
      if (previewInflight.current.has(inflightKey)) return false;
      const cur = previewsRef.current.get(id);
      return !(cur?.status === "ok" && cur.forLimit === forLimit);
    });
    if (need.length === 0) return;

    for (const id of need) {
      previewInflight.current.add(`${id}:${forLimit}`);
    }
    setPreviews((prev) => {
      const next = new Map(prev);
      for (const id of need) {
        next.set(id, { status: "loading", forLimit });
      }
      return next;
    });

    void (async () => {
      try {
        const res = await fetch(
          `/api/home/module-previews?ids=${need.map(encodeURIComponent).join(",")}`,
        );
        if (!res.ok) throw new Error("batch preview failed");
        const json = (await res.json()) as {
          previews?: Record<string, ModulePreviewPayload>;
        };
        const map = json.previews ?? {};
        setPreviews((prev) => {
          const next = new Map(prev);
          for (const id of need) {
            const payload = map[id];
            if (payload) {
              next.set(id, { status: "ok", payload, forLimit });
            } else {
              next.set(id, { status: "error", forLimit });
            }
          }
          return next;
        });
      } catch {
        setPreviews((prev) => {
          const next = new Map(prev);
          for (const id of need) {
            next.set(id, { status: "error", forLimit });
          }
          return next;
        });
      } finally {
        for (const id of need) {
          previewInflight.current.delete(`${id}:${forLimit}`);
        }
      }
    })();
  }, []);

  const removeModule = useCallback((id: ModuleId) => {
    if (!MODULE_META[id].hideable) return;
    setDraft((prev) => ({
      ...prev,
      left: prev.left.filter((x) => x !== id),
      right: prev.right.filter((x) => x !== id),
      hidden: prev.hidden.includes(id) ? prev.hidden : [...prev.hidden, id],
    }));
    setMenuId(null);
  }, []);

  const addModule = useCallback(
    (id: ModuleId, side: Side, index: number) => {
      setDraft((prev) => {
        const list = [
          ...prev[side].filter((x) => x !== id),
        ];
        const clamped = Math.max(0, Math.min(index, list.length));
        list.splice(clamped, 0, id);
        return {
          ...prev,
          left: side === "left" ? list : prev.left.filter((x) => x !== id),
          right: side === "right" ? list : prev.right.filter((x) => x !== id),
          hidden: prev.hidden.filter((x) => x !== id),
        };
      });
      setAddAt(null);
      ensurePreview(id);
    },
    [ensurePreview],
  );

  const moveInColumn = useCallback((side: Side, id: ModuleId, dir: -1 | 1) => {
    setDraft((prev) => {
      const list = [...prev[side]];
      const idx = list.indexOf(id);
      if (idx < 0) return prev;
      const to = idx + dir;
      if (to < 0 || to >= list.length) return prev;
      const tmp = list[idx];
      list[idx] = list[to];
      list[to] = tmp;
      return { ...prev, [side]: list };
    });
    setMenuId(null);
  }, []);

  const moveToOtherColumn = useCallback((id: ModuleId, from: Side) => {
    const to: Side = from === "left" ? "right" : "left";
    setDraft((prev) => ({
      ...prev,
      [from]: prev[from].filter((x) => x !== id),
      [to]: [...prev[to].filter((x) => x !== id), id],
    }));
    setMenuId(null);
  }, []);

  const setItemLimit = useCallback(
    (id: ModuleId, limit: number) => {
      const n = clampItemLimit(limit);
      if (n == null) return;
      setDraft((prev) => ({
        ...prev,
        limits: { ...prev.limits, [id]: n },
      }));
      if (!CLIENT_LIMIT_MODULES.has(id)) {
        setLimitPreviewIds((prev) => {
          if (prev.has(id)) return prev;
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        ensurePreview(id, n);
      }
    },
    [ensurePreview],
  );

  const applyDrop = useCallback(
    (id: ModuleId, toSide: Side, toIndex: number) => {
      setDraft((prev) => {
        const leftBase = prev.left.filter((x) => x !== id);
        const rightBase = prev.right.filter((x) => x !== id);
        const list = toSide === "left" ? [...leftBase] : [...rightBase];
        const clamped = Math.max(0, Math.min(toIndex, list.length));
        list.splice(clamped, 0, id);
        return {
          ...prev,
          left: toSide === "left" ? list : leftBase,
          right: toSide === "right" ? list : rightBase,
          hidden: prev.hidden.filter((x) => x !== id),
        };
      });
    },
    [],
  );

  const discardDraft = useCallback(() => {
    setDraft(baseline);
    setAddAt(null);
    setMenuId(null);
    setPreviews(new Map());
    setLimitPreviewIds(new Set());
    previewInflight.current.clear();
  }, [baseline]);

  const markSaved = useCallback(() => {
    setBaseline(draft);
    setLimitPreviewIds(new Set());
  }, [draft]);

  const value = useMemo<LayoutEditCtx>(
    () => ({
      editing,
      persona,
      viewerProfileId,
      draft,
      dirty,
      newlyInjected: newSet,
      childMap,
      previews,
      limitPreviewIds,
      ensurePreview,
      ensurePreviews,
      dragId,
      dragOver,
      setDragId,
      setDragOver,
      applyDrop,
      removeModule,
      addModule,
      moveInColumn,
      moveToOtherColumn,
      setItemLimit,
      available,
      addAt,
      setAddAt,
      menuId,
      setMenuId,
      needsServerHydrate,
      discardDraft,
      markSaved,
      exitEditing,
    }),
    [
      editing,
      persona,
      viewerProfileId,
      draft,
      dirty,
      newSet,
      childMap,
      previews,
      limitPreviewIds,
      ensurePreview,
      ensurePreviews,
      dragId,
      dragOver,
      applyDrop,
      removeModule,
      addModule,
      moveInColumn,
      moveToOtherColumn,
      setItemLimit,
      available,
      addAt,
      menuId,
      needsServerHydrate,
      discardDraft,
      markSaved,
      exitEditing,
    ],
  );

  return (
    <DraftModuleLimitProvider editing={editing} limits={draft.limits}>
      <Ctx.Provider value={value}>
        {children}
        {editing && addAt ? (
          <AddModuleOverlay
            items={available}
            onPick={(id) => addModule(id, addAt.side, addAt.index)}
            onClose={() => setAddAt(null)}
          />
        ) : null}
      </Ctx.Provider>
    </DraftModuleLimitProvider>
  );
}

function SlotBody({ id, meta }: { id: ModuleId; meta: ModuleMeta }) {
  const ctx = useLayoutEdit();
  const content = ctx.childMap.get(id);
  const limit =
    ctx.draft.limits[id] ?? HOME_LAYOUT_ITEM_LIMIT_DEFAULT;
  const useLimitPreview =
    ctx.editing &&
    ctx.limitPreviewIds.has(id) &&
    !CLIENT_LIMIT_MODULES.has(id);

  useEffect(() => {
    if (!useLimitPreview) return;
    ctx.ensurePreview(id, limit);
  }, [useLimitPreview, id, limit, ctx.ensurePreview]);

  if (useLimitPreview) {
    const preview = ctx.previews.get(id);
    if (preview?.status === "ok" && preview.forLimit === limit) {
      return (
        <HomeModuleLivePreview
          payload={preview.payload}
          viewerProfileId={ctx.viewerProfileId}
        />
      );
    }
    if (preview?.status === "loading" || !preview) {
      return <HomeModulePreviewSkeleton id={id} />;
    }
    if (preview?.status === "error") {
      return <ModulePlaceholder meta={meta} failed />;
    }
  }

  if (content) return content;

  const preview = ctx.previews.get(id);
  if (preview?.status === "ok") {
    return (
      <HomeModuleLivePreview
        payload={preview.payload}
        viewerProfileId={ctx.viewerProfileId}
      />
    );
  }

  if (!ctx.editing) return null;

  if (preview?.status === "loading") {
    return <HomeModulePreviewSkeleton id={id} />;
  }
  if (preview?.status === "error") {
    return <ModulePlaceholder meta={meta} failed />;
  }
  return <ModulePlaceholder meta={meta} />;
}

/** Cho phép xóa hết để gõ lại; commit ngay khi số hợp lệ (1–10). */
function HaEditLimitInput({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (n: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commitText = (raw: string) => {
    const n = clampItemLimit(Number(raw));
    if (n == null) {
      setText(String(value));
      return;
    }
    onCommit(n);
    setText(String(n));
  };

  return (
    <input
      type="number"
      min={HOME_LAYOUT_ITEM_LIMIT_MIN}
      max={HOME_LAYOUT_ITEM_LIMIT_MAX}
      step={1}
      value={text}
      onChange={(e) => {
        const next = e.target.value;
        if (!(next === "" || /^\d{1,2}$/.test(next))) return;
        setText(next);
        const n = clampItemLimit(Number(next));
        if (n != null) onCommit(n);
      }}
      onBlur={() => commitText(text)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      aria-label="Số nội dung hiển thị"
      title="Số nội dung hiển thị — đổi để xem trước danh sách"
    />
  );
}

export function HomeEditableColumn({ side }: { side: Side }) {
  const ctx = useLayoutEdit();
  const ids = ctx.draft[side];
  const solo = ids.length === 1;
  const showLimitControls = ctx.editing && ids.length > 1;
  /** Chỉ cho phép drag khi mousedown bắt đầu từ grip. */
  const gripDragId = useRef<ModuleId | null>(null);

  return (
    <aside
      className={`wj-guest-aside wj-guest-aside--${side} ha-col ha-col--${side}${
        ctx.editing ? " ha-col--editing" : ""
      }${solo ? " ha-col--solo" : ""}`}
      data-ha-solo={solo ? "1" : undefined}
      aria-label={
        ctx.editing
          ? side === "left"
            ? "Cột trái — đang chỉnh sửa"
            : "Cột phải — đang chỉnh sửa"
          : "Gợi ý theo nhóm"
      }
      onDragOver={
        ctx.editing
          ? (e) => {
              e.preventDefault();
              if (!ctx.dragId) return;
              ctx.setDragOver({ side, index: ids.length });
            }
          : undefined
      }
      onDrop={
        ctx.editing
          ? (e) => {
              e.preventDefault();
              const id = (e.dataTransfer.getData("text/ha-module") ||
                ctx.dragId) as ModuleId | null;
              if (!id || !MODULE_META[id]) return;
              const idx =
                ctx.dragOver?.side === side ? ctx.dragOver.index : ids.length;
              ctx.applyDrop(id, side, idx);
              ctx.setDragId(null);
              ctx.setDragOver(null);
            }
          : undefined
      }
    >
      {ctx.editing ? (
        <InsertGap
          side={side}
          index={0}
          open={ctx.addAt?.side === side && ctx.addAt.index === 0}
        />
      ) : null}

      {ids.map((id, index) => {
        const meta = MODULE_META[id];
        const isNew = ctx.newlyInjected.has(id) || !ctx.childMap.has(id);
        const overHere =
          ctx.dragOver?.side === side &&
          ctx.dragOver.index === index &&
          ctx.dragId !== id;

        const hasLivePreview = ctx.previews.get(id)?.status === "ok";
        if (!ctx.editing && !ctx.childMap.has(id) && !hasLivePreview) {
          return null;
        }

        return (
          <div key={id} className="ha-edit-slot-wrap">
            {ctx.editing && overHere ? (
              <div className="ha-edit-drop-line" aria-hidden />
            ) : null}
            <div
              className={`ha-edit-slot${
                ctx.editing ? " ha-edit-slot--edit" : ""
              }${ctx.dragId === id ? " ha-edit-slot--dragging" : ""}`}
              data-module-id={id}
              draggable={ctx.editing}
              onDragStart={
                ctx.editing
                  ? (e: DragEvent) => {
                      if (gripDragId.current !== id) {
                        e.preventDefault();
                        return;
                      }
                      e.dataTransfer.setData("text/ha-module", id);
                      e.dataTransfer.effectAllowed = "move";
                      ctx.setDragId(id);
                      ctx.setMenuId(null);
                      ctx.setAddAt(null);
                    }
                  : undefined
              }
              onDragEnd={
                ctx.editing
                  ? () => {
                      gripDragId.current = null;
                      ctx.setDragId(null);
                      ctx.setDragOver(null);
                    }
                  : undefined
              }
              onDragOver={
                ctx.editing
                  ? (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      ctx.setDragOver({ side, index });
                    }
                  : undefined
              }
              onDrop={
                ctx.editing
                  ? (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const dropId = (e.dataTransfer.getData(
                        "text/ha-module",
                      ) || ctx.dragId) as ModuleId | null;
                      if (!dropId || !MODULE_META[dropId]) return;
                      ctx.applyDrop(dropId, side, index);
                      ctx.setDragId(null);
                      ctx.setDragOver(null);
                    }
                  : undefined
              }
            >
              {ctx.editing ? (
                <div className="ha-edit-chrome">
                  <span
                    className="ha-edit-grip"
                    title="Kéo để sắp xếp"
                    aria-hidden
                    onMouseDown={() => {
                      gripDragId.current = id;
                    }}
                    onMouseUp={() => {
                      gripDragId.current = null;
                    }}
                  >
                    <GripVertical size={15} strokeWidth={2.2} />
                  </span>
                  <div className="ha-edit-chrome-main">
                    <span className="ha-edit-label">{meta.label}</span>
                    {isNew ? <span className="ha-edit-new">Mới</span> : null}
                  </div>
                  {showLimitControls ? (
                    <div
                      className="ha-edit-limit"
                      title="Số nội dung hiển thị"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <HaEditLimitInput
                        value={
                          ctx.draft.limits[id] ?? HOME_LAYOUT_ITEM_LIMIT_DEFAULT
                        }
                        onCommit={(n) => ctx.setItemLimit(id, n)}
                      />
                    </div>
                  ) : null}
                  <div className="ha-edit-actions">
                    <button
                      type="button"
                      className="ha-edit-more"
                      aria-label="Tuỳ chọn khối"
                      aria-expanded={ctx.menuId === id}
                      title="Sắp xếp"
                      onClick={() =>
                        ctx.setMenuId(ctx.menuId === id ? null : id)
                      }
                    >
                      <Columns2 size={14} strokeWidth={2} aria-hidden />
                    </button>
                    {meta.hideable ? (
                      <button
                        type="button"
                        className="ha-edit-remove"
                        aria-label={`Ẩn ${meta.label}`}
                        title="Ẩn khối này"
                        onClick={() => ctx.removeModule(id)}
                      >
                        <X size={14} strokeWidth={2.2} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                  {ctx.menuId === id ? (
                    <div className="ha-edit-menu" role="menu">
                      <button
                        type="button"
                        role="menuitem"
                        disabled={index === 0}
                        onClick={() => ctx.moveInColumn(side, id, -1)}
                      >
                        <ChevronUp size={14} strokeWidth={2} aria-hidden />
                        Đưa lên
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={index >= ids.length - 1}
                        onClick={() => ctx.moveInColumn(side, id, 1)}
                      >
                        <ChevronDown size={14} strokeWidth={2} aria-hidden />
                        Đưa xuống
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => ctx.moveToOtherColumn(id, side)}
                      >
                        <Columns2 size={14} strokeWidth={2} aria-hidden />
                        {side === "left"
                          ? "Chuyển sang cột phải"
                          : "Chuyển sang cột trái"}
                      </button>
                      {meta.hideable ? (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => ctx.removeModule(id)}
                        >
                          <X size={14} strokeWidth={2} aria-hidden />
                          Ẩn khối này
                        </button>
                      ) : (
                        <p className="ha-edit-menu-note">
                          Không thể ẩn — đây là việc bạn cần xử lý.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="ha-edit-body">
                <SlotBody id={id} meta={meta} />
              </div>
            </div>

            {ctx.editing ? (
              <InsertGap
                side={side}
                index={index + 1}
                open={
                  ctx.addAt?.side === side && ctx.addAt.index === index + 1
                }
              />
            ) : null}
          </div>
        );
      })}
    </aside>
  );
}

export function HomeEditToolbar() {
  const ctx = useLayoutEdit();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!ctx.editing) return null;

  const exit = (confirmIfDirty: boolean) => {
    if (confirmIfDirty && ctx.dirty) {
      const ok = window.confirm(
        "Bạn có thay đổi chưa lưu. Rời khỏi chế độ chỉnh sửa?",
      );
      if (!ok) return;
      ctx.discardDraft();
    }
    ctx.exitEditing();
  };

  const save = async () => {
    if (saving || !ctx.dirty) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/user/home-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          left: ctx.draft.left,
          right: ctx.draft.right,
          hidden: ctx.draft.hidden,
          limits: ctx.draft.limits,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không lưu được bố cục.");
        return;
      }
      ctx.markSaved();
      // Thoát ngay — soft-refresh để SSR lại theo limits / khối mới.
      ctx.exitEditing({ refresh: true });
    } catch {
      setErr("Không lưu được bố cục.");
    } finally {
      setSaving(false);
    }
  };

  const resetDefault = async () => {
    const ok = window.confirm(
      "Khôi phục bố cục mặc định theo giai đoạn của bạn?",
    );
    if (!ok) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/user/home-layout", { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setErr(json?.error ?? "Không khôi phục được.");
        return;
      }
      ctx.exitEditing({ refresh: true });
    } catch {
      setErr("Không khôi phục được.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ha-edit-bar" role="region" aria-label="Tuỳ chỉnh trang chủ">
      <div className="ha-edit-bar-inner">
        <div className="ha-edit-bar-copy">
          <p className="ha-edit-bar-title">Đang tuỳ chỉnh trang chủ</p>
          <p className="ha-edit-bar-hint">
            Kéo để sắp xếp · Bấm + giữa các khối để thêm · ✕ để ẩn
          </p>
          {err ? <p className="ha-edit-bar-err">{err}</p> : null}
        </div>
        <div className="ha-edit-bar-actions">
          <button
            type="button"
            className="ha-edit-bar-btn ha-edit-bar-btn--ghost"
            onClick={() => void resetDefault()}
            disabled={saving}
          >
            <RotateCcw size={14} strokeWidth={2} aria-hidden />
            Khôi phục mặc định
          </button>
          <button
            type="button"
            className="ha-edit-bar-btn ha-edit-bar-btn--ghost"
            onClick={() => exit(true)}
            disabled={saving}
          >
            Huỷ
          </button>
          <button
            type="button"
            className="ha-edit-bar-btn ha-edit-bar-btn--primary"
            onClick={() => void save()}
            disabled={saving || !ctx.dirty}
          >
            {saving ? (
              <Loader2 size={14} className="ha-spin" aria-hidden />
            ) : (
              <Check size={14} strokeWidth={2.4} aria-hidden />
            )}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

function InsertGap({
  side,
  index,
  open,
}: {
  side: Side;
  index: number;
  open: boolean;
}) {
  const ctx = useLayoutEdit();
  return (
    <div className={`ha-edit-gap${open ? " ha-edit-gap--open" : ""}`}>
      <button
        type="button"
        className="ha-edit-gap-btn"
        aria-label={`Thêm khối tại vị trí ${index + 1}`}
        aria-expanded={open}
        title="Thêm khối vào đây"
        onClick={() => ctx.setAddAt(open ? null : { side, index })}
      >
        <Plus size={14} strokeWidth={2.4} aria-hidden />
      </button>
    </div>
  );
}

function ModulePlaceholder({
  meta,
  failed = false,
}: {
  meta: ModuleMeta;
  failed?: boolean;
}) {
  return (
    <section className="ha-card ha-card--placeholder">
      <div className="ha-card-head">
        <span className="ha-card-title">{meta.label}</span>
      </div>
      <p className="ha-card-empty">
        {failed
          ? "Không tải được nội dung. Thử thêm lại hoặc lưu rồi tải lại trang."
          : meta.description}
      </p>
    </section>
  );
}

function AddModuleOverlay({
  items,
  onPick,
  onClose,
}: {
  items: ModuleMeta[];
  onPick: (id: ModuleId) => void;
  onClose: () => void;
}) {
  const ctx = useLayoutEdit();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q),
    );
  }, [items, query]);

  const itemIds = useMemo(() => filtered.map((m) => m.id), [filtered]);
  useEffect(() => {
    ctx.ensurePreviews(itemIds);
  }, [itemIds, ctx.ensurePreviews]);

  const groups = useMemo(() => {
    const map = new Map<ModuleMeta["group"], ModuleMeta[]>();
    for (const item of filtered) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    const order = moduleGroupOrderForPersona(ctx.persona);
    return order
      .filter((g) => map.has(g))
      .map((g) => [g, map.get(g)!] as const);
  }, [filtered, ctx.persona]);

  if (!mounted) return null;

  return createPortal(
    <div className="ha-edit-add-overlay" role="presentation">
      <div
        className="ha-edit-add-backdrop"
        role="button"
        tabIndex={-1}
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        className="ha-edit-add-panel ha-edit-add-panel--modal"
        role="dialog"
        aria-modal="true"
        aria-label="Thêm khối"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ha-edit-add-head">
          <div className="ha-edit-add-head-copy">
            <span className="ha-edit-add-head-title">Thêm khối vào đây</span>
            <span className="ha-edit-add-head-hint">
              Theo đối tượng · dữ liệu thật · tối đa 3 mục · Bấm Thêm để gắn
            </span>
          </div>
          <button type="button" aria-label="Đóng" onClick={onClose}>
            <X size={14} strokeWidth={2} aria-hidden />
          </button>
        </header>
        {items.length > 6 ? (
          <div className="ha-edit-add-search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm khối…"
              aria-label="Tìm khối"
              autoFocus
            />
          </div>
        ) : null}
        {items.length === 0 ? (
          <p className="ha-edit-add-empty">Đã thêm hết các khối có sẵn.</p>
        ) : filtered.length === 0 ? (
          <p className="ha-edit-add-empty">Không khớp «{query.trim()}».</p>
        ) : (
          <div className="ha-edit-add-scroll">
            {groups.map(([group, list]) => (
              <div key={group} className="ha-edit-add-group">
                <p className="ha-edit-add-group-label">
                  {MODULE_GROUP_LABEL[group]}
                </p>
                <div className="ha-edit-add-grid">
                  {list.map((m) => (
                    <AddModulePickCard
                      key={m.id}
                      meta={m}
                      preview={ctx.previews.get(m.id)}
                      viewerProfileId={ctx.viewerProfileId}
                      onPick={() => onPick(m.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function AddModulePickCard({
  meta,
  preview,
  viewerProfileId,
  onPick,
}: {
  meta: ModuleMeta;
  preview: PreviewEntry | undefined;
  viewerProfileId: string;
  onPick: () => void;
}) {
  return (
    <div className="ha-edit-add-pick">
      <div className="ha-edit-add-pick-preview world-journey-home">
        {preview?.status === "ok" && !preview.payload.empty ? (
          <HomeModuleLivePreview
            payload={preview.payload}
            viewerProfileId={viewerProfileId}
          />
        ) : preview?.status === "error" ||
          (preview?.status === "ok" && preview.payload.empty) ? (
          <HomeModuleMockCard id={meta.id} />
        ) : (
          <HomeModulePreviewSkeleton id={meta.id} />
        )}
      </div>
      <div className="ha-edit-add-pick-foot">
        <div className="ha-edit-add-pick-meta">
          <span className="ha-edit-add-pick-desc">{meta.description}</span>
        </div>
        <button
          type="button"
          className="ha-edit-add-pick-cta"
          aria-label={`Thêm ${meta.label}`}
          onClick={onPick}
        >
          Thêm
        </button>
      </div>
    </div>
  );
}
