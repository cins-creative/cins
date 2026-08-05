/**
 * Primitive cache phía client — TTL + inflight dedup + registry xoá khi logout.
 * Dùng cho dữ liệu chuyển trang (RAM). Persist chỉ khi cần sống qua F5 và đã validate.
 *
 * @see docs/PLAN_client_cache.md · CINS_DEV_RULES.md §10
 */

export type ClientCachePersist = "none" | "session" | "local";

export type CreateCachedResourceOptions<T, A extends unknown[] = []> = {
  /** Tiền tố cố định; key đầy đủ = prefix + ":" + keyFromArgs(...). */
  keyPrefix: string;
  ttlMs: number;
  fetcher: (...args: A) => Promise<T>;
  /** Mặc định "none" — chỉ RAM. */
  persist?: ClientCachePersist;
  /** Bắt buộc khi persist ≠ none. */
  validate?: (raw: unknown) => T | null;
  /** Tạo phần hậu tố key từ args. Mặc định JSON.stringify(args). */
  keyFromArgs?: (...args: A) => string;
};

export type CachedResource<T, A extends unknown[] = []> = {
  fetch: (...args: [...A, opts?: { force?: boolean }]) => Promise<T>;
  peek: (...args: A) => T | null;
  prefetch: (...args: A) => void;
  write: (data: T, ...args: A) => void;
  invalidate: (...args: A) => void;
  invalidateAll: () => void;
};

type Entry<T> = { at: number; data: T };

type RegistryHandle = {
  keyPrefix: string;
  clearAll: () => void;
};

const registry: RegistryHandle[] = [];

function storageFor(mode: ClientCachePersist): Storage | null {
  if (typeof window === "undefined") return null;
  if (mode === "none") return null;
  try {
    return mode === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function storageKey(prefix: string, suffix: string): string {
  return `cins.client-cache.v1:${prefix}:${suffix}`;
}

function defaultKeyFromArgs(...args: unknown[]): string {
  if (args.length === 0) return "_";
  try {
    return JSON.stringify(args);
  } catch {
    return String(args);
  }
}

function isForceOpts(value: unknown): value is { force?: boolean } {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value as object);
  return keys.length === 0 || keys.every((k) => k === "force");
}

/**
 * Tạo resource cache. Mỗi resource tự đăng ký vào registry — gọi
 * `clearAllClientCaches()` khi logout.
 */
export function createCachedResource<T, A extends unknown[] = []>(
  opts: CreateCachedResourceOptions<T, A>,
): CachedResource<T, A> {
  const persist = opts.persist ?? "none";
  const keyFromArgs =
    opts.keyFromArgs ?? ((...a: A) => defaultKeyFromArgs(...a));
  const ram = new Map<string, Entry<T>>();
  const inflight = new Map<string, Promise<T>>();

  if (persist !== "none" && !opts.validate) {
    throw new Error(
      `createCachedResource("${opts.keyPrefix}"): validate bắt buộc khi persist=${persist}`,
    );
  }

  function readPersist(suffix: string): Entry<T> | null {
    const store = storageFor(persist);
    if (!store || !opts.validate) return null;
    try {
      const raw = store.getItem(storageKey(opts.keyPrefix, suffix));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { at?: unknown; data?: unknown };
      if (typeof parsed.at !== "number") {
        store.removeItem(storageKey(opts.keyPrefix, suffix));
        return null;
      }
      if (Date.now() - parsed.at > opts.ttlMs) {
        store.removeItem(storageKey(opts.keyPrefix, suffix));
        return null;
      }
      const data = opts.validate(parsed.data);
      if (data == null) {
        store.removeItem(storageKey(opts.keyPrefix, suffix));
        return null;
      }
      return { at: parsed.at, data };
    } catch {
      return null;
    }
  }

  function writePersist(suffix: string, entry: Entry<T>) {
    const store = storageFor(persist);
    if (!store) return;
    try {
      store.setItem(
        storageKey(opts.keyPrefix, suffix),
        JSON.stringify({ at: entry.at, data: entry.data }),
      );
    } catch {
      /* quota / private mode */
    }
  }

  function removePersist(suffix?: string) {
    const store = storageFor(persist);
    if (!store) return;
    try {
      if (suffix != null) {
        store.removeItem(storageKey(opts.keyPrefix, suffix));
        return;
      }
      const needle = `cins.client-cache.v1:${opts.keyPrefix}:`;
      const toRemove: string[] = [];
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (k?.startsWith(needle)) toRemove.push(k);
      }
      for (const k of toRemove) store.removeItem(k);
    } catch {
      /* ignore */
    }
  }

  function read(...args: A): T | null {
    const suffix = keyFromArgs(...args);
    const hit = ram.get(suffix);
    if (hit && Date.now() - hit.at <= opts.ttlMs) return hit.data;
    if (hit) ram.delete(suffix);
    const fromStore = readPersist(suffix);
    if (!fromStore) return null;
    ram.set(suffix, fromStore);
    return fromStore.data;
  }

  function write(data: T, ...args: A) {
    const suffix = keyFromArgs(...args);
    const entry: Entry<T> = { at: Date.now(), data };
    ram.set(suffix, entry);
    writePersist(suffix, entry);
  }

  function invalidate(...args: A) {
    const suffix = keyFromArgs(...args);
    ram.delete(suffix);
    inflight.delete(suffix);
    removePersist(suffix);
  }

  function invalidateAll() {
    ram.clear();
    inflight.clear();
    removePersist();
  }

  async function fetchImpl(...allArgs: unknown[]): Promise<T> {
    let argsList = allArgs;
    while (
      argsList.length > 0 &&
      argsList[argsList.length - 1] === undefined
    ) {
      argsList = argsList.slice(0, -1);
    }
    const last = argsList[argsList.length - 1];
    const force = isForceOpts(last) ? Boolean(last.force) : false;
    const args = (
      isForceOpts(last) ? argsList.slice(0, -1) : argsList
    ) as A;

    const suffix = keyFromArgs(...args);
    if (!force) {
      const hit = read(...args);
      if (hit != null) return hit;
      const pending = inflight.get(suffix);
      if (pending) return pending;
    }

    const run = (async () => {
      const data = await opts.fetcher(...args);
      write(data, ...args);
      return data;
    })();

    inflight.set(suffix, run);
    try {
      return await run;
    } finally {
      if (inflight.get(suffix) === run) inflight.delete(suffix);
    }
  }

  function prefetch(...args: A) {
    void fetchImpl(...args).catch(() => undefined);
  }

  registry.push({
    keyPrefix: opts.keyPrefix,
    clearAll: invalidateAll,
  });

  return {
    fetch: fetchImpl as CachedResource<T, A>["fetch"],
    peek: (...args: A) => read(...args),
    prefetch,
    write,
    invalidate,
    invalidateAll,
  };
}

/** Xoá mọi resource đã đăng ký — gọi khi đăng xuất (máy dùng chung). */
export function clearAllClientCaches() {
  for (const h of registry) h.clearAll();
}

/** Đăng ký hàm clear bổ sung (module cache cũ chưa dùng createCachedResource). */
export function registerClientCacheClear(
  clear: () => void,
  keyPrefix = "legacy",
) {
  registry.push({ keyPrefix, clearAll: clear });
}
