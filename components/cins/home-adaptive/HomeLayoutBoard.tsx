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
  HomeModuleMockCard,
  HomeModulePreviewSkeleton,
} from "@/components/cins/home-adaptive/HomeModulePreviewLazy";
import {
  HomeTutorialCtaCard,
  HomeMuaBanTutorialController,
  HomeOpenShopFeedBanner,
  HomeOpenShopNotice,
} from "@/components/cins/home-adaptive/HomeMuaBanTutorial";
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
  isModuleId,
  type HomeLayoutItemLimits,
} from "@/lib/cins/home-adaptive/layout-prefs";
import {
  MODULE_GROUP_LABEL,
  MODULE_META,
  moduleGroupOrderForPersona,
  type ModuleMeta,
} from "@/lib/cins/home-adaptive/module-meta";
import type { ModulePreviewPayload } from "@/lib/cins/home-adaptive/module-preview-types";
import type { GiaiDoan, ModuleId, Persona } from "@/lib/cins/home-adaptive/persona";
import {
  PRESET_LAYOUT_MAX,
  applyPreset,
  buildAppliedTutorialHomeLayout,
  filterPresetModules,
  getPreset,
  mergePresetDaAp,
  presetModuleIds,
  presetsForUser,
  removeModulesFromLayout,
  suggestRemoveForOverflow,
  tutorialPresetIdFromIntents,
  type ApplyPresetMode,
  type HomeLayoutTutorial,
  type HomePreset,
  type OnboardingIntent,
  type PresetId,
} from "@/lib/cins/home-adaptive/presets";
import { requestHomeLayoutEdit } from "@/lib/home/home-layout-edit";

type Side = "left" | "right";

type Draft = {
  left: ModuleId[];
  right: ModuleId[];
  hidden: ModuleId[];
  limits: HomeLayoutItemLimits;
  presetDaAp: PresetId[];
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
  /** Áp bộ khối — trả overflow nếu cần chọn khối bỏ. */
  applyHomePreset: (
    presetId: PresetId,
    mode?: ApplyPresetMode,
    removeIds?: ModuleId[],
  ) => { overflow: boolean; needRemove: number; added: ModuleId[] };
  available: ModuleMeta[];
  presets: HomePreset[];
  giaiDoan: GiaiDoan | null;
  capabilities: readonly HomeCapability[];
  /** Vị trí đang mở panel thêm (giữa các khối). */
  addAt: { side: Side; index: number } | null;
  setAddAt: (v: { side: Side; index: number } | null) => void;
  /** Vào edit (nếu cần) rồi mở bảng thêm khối tại vị trí. */
  openAddAt: (side: Side, index: number) => void;
  tutorial: HomeLayoutTutorial | undefined;
  intentHint: readonly OnboardingIntent[];
  completeTutorial: (
    presetId: PresetId,
    status: "done" | "skipped",
  ) => Promise<void>;
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
  "lop_hoc_cua_ban",
]);

function collectChildMap(children: ReactNode): Map<string, ReactElement> {
  const map = new Map<string, ReactElement>();
  const walk = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const props = child.props as {
        "data-ha-module"?: string;
        children?: ReactNode;
      };
      const fromData = props["data-ha-module"];
      if (fromData) {
        map.set(fromData, child);
        return;
      }
      const fromKey =
        child.key != null
          ? String(child.key).replace(/^\.\$/, "").replace(/^\./, "")
          : null;
      if (fromKey && isModuleId(fromKey)) {
        map.set(fromKey, child);
        return;
      }
      /* Fragment / Suspense / wrapper — ExtraModules stream nằm trong đây. */
      if (props.children != null) walk(props.children);
    });
  };
  walk(children);
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
    a.hidden.join(",") === b.hidden.join(",") &&
    a.presetDaAp.join(",") === b.presetDaAp.join(",")
  );
}

type ProviderProps = {
  editing: boolean;
  persona: Persona;
  giaiDoan?: GiaiDoan | null;
  viewerProfileId: string;
  initialLeft: ModuleId[];
  initialRight: ModuleId[];
  initialHidden: ModuleId[];
  initialLimits?: HomeLayoutItemLimits;
  initialPresetDaAp?: PresetId[];
  newlyInjected?: ModuleId[];
  children: ReactNode;
  /** Nội dung module server — keyed by ModuleId. */
  moduleNodes: ReactNode;
  exitEditing: (opts?: { refresh?: boolean }) => void;
  capabilities?: readonly HomeCapability[];
  initialTutorial?: HomeLayoutTutorial;
  initialIntentHint?: readonly OnboardingIntent[];
};

export function HomeLayoutEditProvider({
  editing,
  persona,
  giaiDoan = null,
  viewerProfileId,
  initialLeft,
  initialRight,
  initialHidden,
  initialLimits = {},
  initialPresetDaAp = [],
  newlyInjected = [],
  children,
  moduleNodes,
  exitEditing,
  capabilities = [],
  initialTutorial,
  initialIntentHint = [],
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
    presetDaAp: [...initialPresetDaAp],
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
  /** Giữ vị trí chèn khi vừa request vào edit (tránh mất addAt giữa 2 render). */
  const pendingAddAtRef = useRef<{ side: Side; index: number } | null>(null);
  /**
   * Sau Lưu: khóa layout vừa ghi. Soft-refresh SWR có thể trả SSR cũ — bỏ qua
   * sync đó để không xóa khối vừa thêm; chờ key khớp rồi mới hydrate.
   */
  const pendingSavedKeyRef = useRef<string | null>(null);
  const [menuId, setMenuId] = useState<ModuleId | null>(null);
  const [tutorial, setTutorial] = useState<HomeLayoutTutorial | undefined>(
    initialTutorial,
  );
  const intentHint = initialIntentHint;
  const completingTutorialRef = useRef(false);

  useEffect(() => {
    if (completingTutorialRef.current) return;
    setTutorial(initialTutorial);
  }, [initialTutorial]);
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
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const newSet = useMemo(() => new Set(newlyInjected), [newlyInjected]);

  const serverIdsKey = `${initialLeft.join(",")}|${initialRight.join(",")}|${initialHidden.join(",")}|${JSON.stringify(initialLimits)}|${initialPresetDaAp.join(",")}`;
  useEffect(() => {
    const pending = pendingSavedKeyRef.current;
    if (pending && serverIdsKey !== pending) {
      // SSR vẫn stale (SWR) — giữ draft/preview client.
      return;
    }
    if (pending && serverIdsKey === pending) {
      pendingSavedKeyRef.current = null;
    }
    // Đang chỉnh sửa dở — không ghi đè bằng props SSR.
    if (dirtyRef.current) return;

    const next: Draft = {
      left: [...initialLeft],
      right: [...initialRight],
      hidden: [...initialHidden],
      limits: { ...initialLimits },
      presetDaAp: [...initialPresetDaAp],
    };
    setBaseline(next);
    setDraft(next);
    /* Giữ live preview cho khối chưa có SSR node — tránh trống sau Lưu. */
    setPreviews((prev) => {
      const keep = new Set<ModuleId>([...next.left, ...next.right]);
      const pruned = new Map<ModuleId, PreviewEntry>();
      for (const [id, entry] of prev) {
        if (keep.has(id)) pruned.set(id, entry);
      }
      return pruned;
    });
    setLimitPreviewIds(new Set());
    const keepIds = new Set<ModuleId>([...next.left, ...next.right]);
    for (const key of [...previewInflight.current]) {
      const id = key.split(":")[0] as ModuleId;
      if (!keepIds.has(id)) previewInflight.current.delete(key);
    }
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

  useEffect(() => {
    if (!editing) return;
    const pending = pendingAddAtRef.current;
    if (!pending) return;
    pendingAddAtRef.current = null;
    setAddAt(pending);
  }, [editing]);

  const openAddAt = useCallback(
    (side: Side, index: number) => {
      const target = { side, index };
      if (editing) {
        setAddAt(target);
        return;
      }
      pendingAddAtRef.current = target;
      setAddAt(target);
      requestHomeLayoutEdit();
    },
    [editing],
  );

  /** Đang gắn cột — `hidden` vẫn hiện trong «Thêm khối» để bật lại. */
  const used = useMemo(
    () => new Set<ModuleId>([...draft.left, ...draft.right]),
    [draft],
  );

  const available = useMemo(() => {
    const list = Object.values(MODULE_META).filter((m) => {
      if (m.id === "quay_cua_toi") return false;
      if (m.id === "da_luu" || m.id === "se_tham_gia") return false;
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

  const presets = useMemo(
    () =>
      presetsForUser(persona, giaiDoan, capabilities, {
        tutorial: tutorial === "pending",
      }),
    [persona, giaiDoan, capabilities, tutorial],
  );

  const needsServerHydrate = useMemo(() => {
    for (const id of [...draft.left, ...draft.right]) {
      if (!childMap.has(id)) return true;
    }
    /* Limit đổi → SSR cũ sai số dòng; cần soft-refresh (hoặc giữ live preview). */
    const ids = new Set<ModuleId>([
      ...draft.left,
      ...draft.right,
      ...baseline.left,
      ...baseline.right,
    ]);
    for (const id of ids) {
      const a = draft.limits[id] ?? HOME_LAYOUT_ITEM_LIMIT_DEFAULT;
      const b = baseline.limits[id] ?? HOME_LAYOUT_ITEM_LIMIT_DEFAULT;
      if (a !== b) return true;
    }
    return false;
  }, [draft, baseline, childMap]);

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

  // Khối mới gắn (chưa có SSR node) → luôn có live preview / skeleton.
  useEffect(() => {
    for (const id of [...draft.left, ...draft.right]) {
      if (childMap.has(id)) continue;
      const limit = draft.limits[id] ?? HOME_LAYOUT_ITEM_LIMIT_DEFAULT;
      ensurePreview(id, limit);
    }
  }, [draft.left, draft.right, draft.limits, childMap, ensurePreview, editing]);

  const applyHomePreset = useCallback(
    (
      presetId: PresetId,
      mode: ApplyPresetMode = "merge",
      removeIds: ModuleId[] = [],
    ): { overflow: boolean; needRemove: number; added: ModuleId[] } => {
      const preset = getPreset(presetId);
      if (!preset) return { overflow: false, needRemove: 0, added: [] };

      let result = applyPreset(
        {
          left: draft.left,
          right: draft.right,
          hidden: draft.hidden,
        },
        preset,
        capabilities,
        mode,
      );

      let layout = result.layout;
      if (removeIds.length > 0) {
        layout = removeModulesFromLayout(layout, removeIds);
        const total = layout.left.length + layout.right.length;
        const needRemove = Math.max(0, total - PRESET_LAYOUT_MAX);
        result = {
          ...result,
          layout,
          totalAfter: total,
          overflow: needRemove > 0,
          needRemove,
        };
      }

      if (result.overflow) {
        return {
          overflow: true,
          needRemove: result.needRemove,
          added: result.added,
        };
      }

      setDraft((prev) => ({
        ...prev,
        left: layout.left,
        right: layout.right,
        hidden: layout.hidden,
        presetDaAp: mergePresetDaAp(prev.presetDaAp, presetId),
      }));
      setAddAt(null);
      /* Preview mọi khối mới/thiếu SSR — kể cả replace full layout. */
      for (const id of [...layout.left, ...layout.right]) {
        ensurePreview(id);
      }
      return {
        overflow: false,
        needRemove: 0,
        added: result.added,
      };
    },
    [draft.left, draft.right, draft.hidden, capabilities, ensurePreview],
  );

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
      // Cuộn tới slot mới — cột dài dễ tưởng «chưa thêm».
      queueMicrotask(() => {
        const el = document.querySelector(
          `[data-module-id="${CSS.escape(id)}"]`,
        );
        el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
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
    pendingSavedKeyRef.current = null;
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
    pendingSavedKeyRef.current = `${draft.left.join(",")}|${draft.right.join(",")}|${draft.hidden.join(",")}|${JSON.stringify(draft.limits)}|${draft.presetDaAp.join(",")}`;
    /* Ép preview cho khối chưa có SSR — hiện ngay sau khi thoát edit. */
    for (const id of [...draft.left, ...draft.right]) {
      if (childMap.has(id)) continue;
      ensurePreview(
        id,
        draft.limits[id] ?? HOME_LAYOUT_ITEM_LIMIT_DEFAULT,
      );
    }
  }, [draft, childMap, ensurePreview]);

  const completeTutorial = useCallback(
    async (presetId: PresetId, status: "done" | "skipped") => {
      if (completingTutorialRef.current) return;
      completingTutorialRef.current = true;
      const layout = buildAppliedTutorialHomeLayout(
        presetId,
        status,
        intentHint,
      );
      try {
        const res = await fetch("/api/user/home-layout", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(layout),
        });
        if (!res.ok) {
          completingTutorialRef.current = false;
          return;
        }
        /* DB giữ đủ khối; UI chỉ hiện khối đủ capability — khớp resolve SSR. */
        const visible = (ids: ModuleId[]) =>
          ids.filter((id) => {
            const meta = MODULE_META[id];
            return moduleMatchesCapabilities(capabilities, {
              requires: meta.requires,
              requiresAny: meta.requiresAny,
            });
          });
        const nextDraft: Draft = {
          left: visible(layout.left),
          right: visible(layout.right),
          hidden: layout.hidden,
          limits: {},
          presetDaAp: layout.preset.da_ap,
        };
        setDraft(nextDraft);
        setBaseline(nextDraft);
        setTutorial(status);
        setAddAt(null);
        pendingSavedKeyRef.current = `${nextDraft.left.join(",")}|${nextDraft.right.join(",")}|${nextDraft.hidden.join(",")}|{}|${nextDraft.presetDaAp.join(",")}`;
        for (const id of [...nextDraft.left, ...nextDraft.right]) {
          ensurePreview(id);
        }
        exitEditing({ refresh: true });
      } catch {
        completingTutorialRef.current = false;
      }
    },
    [intentHint, capabilities, ensurePreview, exitEditing],
  );

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
      applyHomePreset,
      available,
      presets,
      giaiDoan,
      capabilities,
      addAt,
      setAddAt,
      openAddAt,
      tutorial,
      intentHint,
      completeTutorial,
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
      applyHomePreset,
      available,
      presets,
      giaiDoan,
      capabilities,
      addAt,
      openAddAt,
      tutorial,
      intentHint,
      completeTutorial,
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
        <HomeMuaBanTutorialController
          tutorial={tutorial}
          intentHint={intentHint}
          addAt={addAt}
          completeTutorial={completeTutorial}
          openAddAt={openAddAt}
        />
        {editing && addAt ? (
          <AddModuleOverlay
            items={available}
            onPick={(id) => addModule(id, addAt.side, addAt.index)}
            onClose={() => {
              setAddAt(null);
              if (
                tutorial === "pending" &&
                !completingTutorialRef.current &&
                draft.left.length === 0 &&
                draft.right.length === 0
              ) {
                void completeTutorial("mua_hang_su_kien", "skipped");
              }
            }}
          />
        ) : null}
      </Ctx.Provider>
    </DraftModuleLimitProvider>
  );
}

/** Bọc fallback để CSS `:has([data-ha-module] > *)` không ẩn slot trống tạm. */
function ModuleSlotFallback({
  id,
  children,
}: {
  id: ModuleId;
  children: ReactNode;
}) {
  return (
    <div data-ha-module={id} style={{ display: "contents" }}>
      {children}
    </div>
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
        <ModuleSlotFallback id={id}>
          <HomeModuleLivePreview
            payload={preview.payload}
            viewerProfileId={ctx.viewerProfileId}
          />
        </ModuleSlotFallback>
      );
    }
    if (preview?.status === "loading" || !preview) {
      return (
        <ModuleSlotFallback id={id}>
          <HomeModulePreviewSkeleton id={id} />
        </ModuleSlotFallback>
      );
    }
    if (preview?.status === "error") {
      return (
        <ModuleSlotFallback id={id}>
          <ModulePlaceholder meta={meta} failed />
        </ModuleSlotFallback>
      );
    }
  }

  if (content) return content;

  const preview = ctx.previews.get(id);
  if (preview?.status === "ok") {
    return (
      <ModuleSlotFallback id={id}>
        <HomeModuleLivePreview
          payload={preview.payload}
          viewerProfileId={ctx.viewerProfileId}
        />
      </ModuleSlotFallback>
    );
  }

  // Khối vừa thêm / chờ soft-refresh — hiện skeleton cả ngoài edit.
  if (preview?.status === "loading") {
    return (
      <ModuleSlotFallback id={id}>
        <HomeModulePreviewSkeleton id={id} />
      </ModuleSlotFallback>
    );
  }
  if (preview?.status === "error") {
    return (
      <ModuleSlotFallback id={id}>
        <ModulePlaceholder meta={meta} failed />
      </ModuleSlotFallback>
    );
  }

  /* Ngoài edit vẫn skeleton — chờ preview API hoặc SSR stream, không để trống. */
  return (
    <ModuleSlotFallback id={id}>
      <HomeModulePreviewSkeleton id={id} />
    </ModuleSlotFallback>
  );
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
      id={`wj-aside-${side}`}
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

      {ctx.tutorial === "pending" && ids.length === 0 ? (
        <HomeTutorialCtaCard onPick={() => ctx.openAddAt(side, 0)} />
      ) : null}

      {side === "left" &&
      ctx.tutorial !== "pending" &&
      !ctx.capabilities.includes("co_shop") &&
      ctx.draft.presetDaAp.includes("chu_shop") ? (
        <HomeOpenShopNotice hasShop={ctx.capabilities.includes("co_shop")} />
      ) : null}

      {ids.map((id, index) => {
        const meta = MODULE_META[id];
        const isNew = ctx.newlyInjected.has(id) || !ctx.childMap.has(id);
        const overHere =
          ctx.dragOver?.side === side &&
          ctx.dragOver.index === index &&
          ctx.dragId !== id;

        /** Ngoài edit: chỉ hiện + giữa 2 khối (không đầu/cuối cột). */
        const showGapAfter = ctx.editing || index < ids.length - 1;

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

            {showGapAfter ? (
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

export function HomeOpenShopFeedBannerBound() {
  const ctx = useLayoutEdit();
  return (
    <HomeOpenShopFeedBanner
      show={
        ctx.tutorial !== "pending" &&
        ctx.draft.presetDaAp.includes("chu_shop")
      }
      hasShop={ctx.capabilities.includes("co_shop")}
    />
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
    const body = {
      left: ctx.draft.left,
      right: ctx.draft.right,
      hidden: ctx.draft.hidden,
      limits: ctx.draft.limits,
      preset: {
        da_ap: ctx.draft.presetDaAp,
        at: new Date().toISOString(),
      },
      ...(ctx.tutorial === "pending" ? { tutorial: "done" as const } : {}),
    };
    /* Snapshot trước markSaved — reorder/ẩn không cần SSR lại. */
    const needRefresh = ctx.needsServerHydrate;
    try {
      const res = await fetch("/api/user/home-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setErr(json?.error ?? "Không lưu được bố cục.");
        return;
      }
      ctx.markSaved();
      /* Thoát ngay; soft-refresh chỉ khi có khối mới / đổi limit. */
      ctx.exitEditing({ refresh: needRefresh });
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
        onClick={() => {
          if (open) {
            ctx.setAddAt(null);
            return;
          }
          ctx.openAddAt(side, index);
        }}
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

/** Timeline giả ở giữa mockup bộ khối — chỉ trang trí. */
function PresetTimelineMock() {
  return (
    <div className="ha-edit-preset-feed">
      <div className="ha-edit-preset-feed-composer" aria-hidden>
        <span className="ha-edit-preset-feed-composer-dot" />
        <span className="ha-edit-preset-feed-composer-bar" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="ha-edit-preset-feed-card" aria-hidden>
          <span className="ha-edit-preset-feed-avatar" />
          <div className="ha-edit-preset-feed-body">
            <span className="ha-edit-preset-feed-line ha-edit-preset-feed-line--sm" />
            <span className="ha-edit-preset-feed-line" />
            <span className="ha-edit-preset-feed-line ha-edit-preset-feed-line--mid" />
            <span className="ha-edit-preset-feed-media" />
          </div>
        </div>
      ))}
      <p className="ha-edit-preset-feed-caption">Dòng thời gian</p>
    </div>
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
  /** Tab đang chọn: preset id hoặc catalog thủ công. */
  const [activeTab, setActiveTab] = useState<PresetId | "catalog" | null>(
    null,
  );
  const [presetDdOpen, setPresetDdOpen] = useState(false);
  const presetDdRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState<{
    preset: HomePreset;
    mode: ApplyPresetMode;
    needRemove: number;
    candidates: ModuleId[];
    suggested: ModuleId[];
    selected: Set<ModuleId>;
  } | null>(null);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!presetDdOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!presetDdRef.current?.contains(e.target as Node)) {
        setPresetDdOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [presetDdOpen]);

  useEffect(() => {
    if (ctx.presets.length === 0) {
      setActiveTab("catalog");
      return;
    }
    setActiveTab((cur) => {
      if (cur === "catalog") return cur;
      if (cur && ctx.presets.some((p) => p.id === cur)) return cur;
      if (ctx.tutorial === "pending") {
        const hintId = tutorialPresetIdFromIntents(ctx.intentHint);
        if (ctx.presets.some((p) => p.id === hintId)) return hintId;
      }
      return ctx.presets[0]!.id;
    });
  }, [ctx.presets, ctx.tutorial, ctx.intentHint]);

  const catalogOpen = activeTab === "catalog";

  const activePreset = useMemo(
    () =>
      activeTab && activeTab !== "catalog"
        ? (ctx.presets.find((p) => p.id === activeTab) ?? null)
        : null,
    [ctx.presets, activeTab],
  );

  const activePresetCols = useMemo(() => {
    if (!activePreset) return { left: [] as ModuleId[], right: [] as ModuleId[] };
    const ignoreCap = ctx.tutorial === "pending";
    const allowed = new Set(
      ignoreCap
        ? presetModuleIds(activePreset)
        : filterPresetModules(activePreset, ctx.capabilities),
    );
    return {
      left: activePreset.left.filter((id) => allowed.has(id)),
      right: activePreset.right.filter((id) => allowed.has(id)),
    };
  }, [activePreset, ctx.capabilities, ctx.tutorial]);

  const activePresetModuleIds = useMemo(
    () => [...activePresetCols.left, ...activePresetCols.right],
    [activePresetCols],
  );

  useEffect(() => {
    if (activePresetModuleIds.length === 0) return;
    ctx.ensurePreviews(activePresetModuleIds);
  }, [activePresetModuleIds, ctx.ensurePreviews]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (overflow) {
          setOverflow(null);
          return;
        }
        if (presetDdOpen) {
          setPresetDdOpen(false);
          return;
        }
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, overflow, presetDdOpen]);

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
    if (!catalogOpen) return;
    ctx.ensurePreviews(itemIds);
  }, [itemIds, ctx.ensurePreviews, catalogOpen]);

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

  const tryApplyPreset = (preset: HomePreset, mode: ApplyPresetMode = "merge") => {
    if (ctx.tutorial === "pending") {
      void ctx.completeTutorial(preset.id, "done");
      return;
    }

    const caps = ctx.capabilities;
    const tentative = applyPreset(
      {
        left: ctx.draft.left,
        right: ctx.draft.right,
        hidden: ctx.draft.hidden,
      },
      preset,
      caps,
      mode,
    );

    if (tentative.overflow) {
      const protect = new Set(tentative.added);
      const suggested = suggestRemoveForOverflow(
        tentative.layout,
        tentative.needRemove,
        protect,
      );
      const candidates = [
        ...tentative.layout.left,
        ...tentative.layout.right,
      ].filter((id) => !protect.has(id));
      setOverflow({
        preset,
        mode,
        needRemove: tentative.needRemove,
        candidates,
        suggested,
        selected: new Set(suggested),
      });
      return;
    }

    ctx.applyHomePreset(preset.id, mode);
  };

  const confirmOverflow = () => {
    if (!overflow) return;
    if (overflow.selected.size < overflow.needRemove) return;
    const removeIds = [...overflow.selected];
    const result = ctx.applyHomePreset(
      overflow.preset.id,
      overflow.mode,
      removeIds,
    );
    if (!result.overflow) setOverflow(null);
  };

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
              Chọn bộ khối theo nhu cầu · hoặc tự thêm từng khối
            </span>
          </div>
          <button type="button" aria-label="Đóng" onClick={onClose}>
            <X size={14} strokeWidth={2} aria-hidden />
          </button>
        </header>

        {overflow ? (
          <div className="ha-edit-preset-overflow">
            <p className="ha-edit-preset-overflow-title">
              Layout đã đầy — chọn ít nhất {overflow.needRemove} khối để thay
            </p>
            <p className="ha-edit-preset-overflow-hint">
              Tối đa {PRESET_LAYOUT_MAX} khối. Đã gợi ý các khối ít dùng hơn.
            </p>
            <ul className="ha-edit-preset-overflow-list">
              {overflow.candidates.map((id) => {
                const checked = overflow.selected.has(id);
                return (
                  <li key={id}>
                    <label className="ha-edit-preset-overflow-item">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setOverflow((prev) => {
                            if (!prev) return prev;
                            const next = new Set(prev.selected);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return { ...prev, selected: next };
                          });
                        }}
                      />
                      <span>{MODULE_META[id].label}</span>
                      {overflow.suggested.includes(id) ? (
                        <span className="ha-edit-preset-overflow-tag">
                          gợi ý
                        </span>
                      ) : null}
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="ha-edit-preset-overflow-actions">
              <button
                type="button"
                className="ha-edit-add-pick-cta ha-edit-add-pick-cta--ghost"
                onClick={() => setOverflow(null)}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="ha-edit-add-pick-cta"
                disabled={overflow.selected.size < overflow.needRemove}
                onClick={confirmOverflow}
              >
                Áp dụng
              </button>
            </div>
          </div>
        ) : (
          <div
            className={
              "ha-edit-add-scroll" +
              (catalogOpen ? " is-catalog" : " is-preset")
            }
          >
            {ctx.presets.length > 0 ? (
              <section className="ha-edit-preset-section">
                <p className="ha-edit-add-group-label">Chọn cách thêm khối</p>
                <div
                  className="ha-edit-preset-toolbar"
                  role="group"
                  aria-label="Cách thêm khối"
                >
                  <div className="ha-edit-preset-dd" ref={presetDdRef}>
                    <button
                      type="button"
                      id="ha-preset-dd-trigger"
                      className={
                        "ha-edit-preset-dd-trigger" +
                        (!catalogOpen ? " is-selected" : "")
                      }
                      aria-haspopup="listbox"
                      aria-expanded={presetDdOpen}
                      aria-controls="ha-preset-dd-menu"
                      onClick={() => setPresetDdOpen((o) => !o)}
                    >
                      <span className="ha-edit-preset-dd-label">
                        {activePreset?.label ?? "Chọn bộ khối"}
                      </span>
                      {activePreset &&
                      ctx.draft.presetDaAp.includes(activePreset.id) ? (
                        <span className="ha-edit-preset-tab-used">Đang dùng</span>
                      ) : null}
                      <ChevronDown
                        size={14}
                        strokeWidth={2.2}
                        className={
                          "ha-edit-preset-dd-chevron" +
                          (presetDdOpen ? " is-open" : "")
                        }
                        aria-hidden
                      />
                    </button>
                    {presetDdOpen ? (
                      <ul
                        id="ha-preset-dd-menu"
                        className="ha-edit-preset-dd-menu"
                        role="listbox"
                        aria-labelledby="ha-preset-dd-trigger"
                      >
                        {ctx.presets.map((p) => {
                          const selected = !catalogOpen && p.id === activeTab;
                          const used = ctx.draft.presetDaAp.includes(p.id);
                          return (
                            <li key={p.id} role="presentation">
                              <button
                                type="button"
                                role="option"
                                aria-selected={selected}
                                id={`ha-preset-tab-${p.id}`}
                                className={
                                  "ha-edit-preset-dd-option" +
                                  (selected ? " is-selected" : "")
                                }
                                onClick={() => {
                                  setActiveTab(p.id);
                                  setPresetDdOpen(false);
                                }}
                              >
                                <span className="ha-edit-preset-dd-option-label">
                                  {p.label}
                                </span>
                                {used ? (
                                  <span className="ha-edit-preset-tab-used">
                                    Đang dùng
                                  </span>
                                ) : null}
                                {selected ? (
                                  <Check
                                    size={14}
                                    strokeWidth={2.4}
                                    className="ha-edit-preset-dd-check"
                                    aria-hidden
                                  />
                                ) : null}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                  <span className="ha-edit-preset-tab-sep" aria-hidden />
                  <button
                    type="button"
                    aria-pressed={catalogOpen}
                    id="ha-preset-tab-catalog"
                    className={
                      "ha-edit-preset-tab ha-edit-preset-tab--catalog" +
                      (catalogOpen ? " is-selected" : "")
                    }
                    onClick={() => {
                      setActiveTab("catalog");
                      setPresetDdOpen(false);
                    }}
                  >
                    <span className="ha-edit-preset-tab-label">
                      Tự chọn từng khối
                    </span>
                  </button>
                </div>

                {activePreset ? (
                  <div
                    className="ha-edit-preset-panel"
                    role="region"
                    aria-labelledby="ha-preset-dd-trigger"
                  >
                    <div className="ha-edit-preset-panel-meta">
                      <p className="ha-edit-preset-panel-for">
                        {activePreset.forWhom} · thay toàn bộ layout hiện tại
                      </p>
                      <button
                        type="button"
                        className="ha-edit-preset-card-cta"
                        onClick={() => tryApplyPreset(activePreset, "replace")}
                      >
                        Dùng bộ này
                      </button>
                    </div>

                    <div
                      className="ha-edit-preset-shell world-journey-home"
                      aria-hidden
                      onWheel={(e) => {
                        /* Giữ scroll trong mockup — không đẩy panel cha. */
                        e.stopPropagation();
                      }}
                    >
                      <div className="ha-edit-preset-col ha-edit-preset-col--left">
                        {activePresetCols.left.map((id) => (
                          <div key={id} className="ha-edit-preset-mod">
                            <PresetModulePreview
                              id={id}
                              preview={ctx.previews.get(id)}
                              viewerProfileId={ctx.viewerProfileId}
                            />
                          </div>
                        ))}
                        {activePresetCols.left.length === 0 ? (
                          <p className="ha-edit-preset-col-empty">
                            Không có khối trái
                          </p>
                        ) : null}
                      </div>

                      <div className="ha-edit-preset-col ha-edit-preset-col--feed">
                        <PresetTimelineMock />
                      </div>

                      <div className="ha-edit-preset-col ha-edit-preset-col--right">
                        {activePresetCols.right.map((id) => (
                          <div key={id} className="ha-edit-preset-mod">
                            <PresetModulePreview
                              id={id}
                              preview={ctx.previews.get(id)}
                              viewerProfileId={ctx.viewerProfileId}
                            />
                          </div>
                        ))}
                        {activePresetCols.right.length === 0 ? (
                          <p className="ha-edit-preset-col-empty">
                            Không có khối phải
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {catalogOpen ? (
              <section
                className="ha-edit-catalog-section"
                role="region"
                aria-labelledby="ha-preset-tab-catalog"
              >
                {ctx.presets.length === 0 ? (
                  <div className="ha-edit-preset-toolbar ha-edit-preset-toolbar--solo">
                    <button
                      type="button"
                      aria-pressed
                      id="ha-preset-tab-catalog"
                      className="ha-edit-preset-tab ha-edit-preset-tab--catalog is-selected"
                    >
                      <span className="ha-edit-preset-tab-label">
                        Tự chọn từng khối
                      </span>
                    </button>
                  </div>
                ) : null}
                {items.length > 6 ? (
                  <div className="ha-edit-add-search">
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Tìm khối…"
                      aria-label="Tìm khối"
                    />
                  </div>
                ) : null}
                {items.length === 0 ? (
                  <p className="ha-edit-add-empty">
                    Đã thêm hết các khối có sẵn.
                  </p>
                ) : filtered.length === 0 ? (
                  <p className="ha-edit-add-empty">
                    Không khớp «{query.trim()}».
                  </p>
                ) : (
                  groups.map(([group, list]) => (
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
                  ))
                )}
              </section>
            ) : null}
          </div>
        )}

        <p className="ha-edit-add-suggest">
          Bạn có thể đề xuất tính năng phù hợp với nhu cầu của mình ở phần góp
          ý nhé!
        </p>
      </div>
    </div>,
    document.body,
  );
}

function PresetModulePreview({
  id,
  preview,
  viewerProfileId,
}: {
  id: ModuleId;
  preview: PreviewEntry | undefined;
  viewerProfileId: string;
}) {
  if (preview?.status === "ok" && !preview.payload.empty) {
    return (
      <HomeModuleLivePreview
        payload={preview.payload}
        viewerProfileId={viewerProfileId}
      />
    );
  }
  if (
    preview?.status === "error" ||
    (preview?.status === "ok" && preview.payload.empty)
  ) {
    return <HomeModuleMockCard id={id} />;
  }
  return <HomeModulePreviewSkeleton id={id} />;
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
        <PresetModulePreview
          id={meta.id}
          preview={preview}
          viewerProfileId={viewerProfileId}
        />
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
