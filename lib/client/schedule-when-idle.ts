/** Chạy task khi browser rảnh — tránh tranh bandwidth với paint đầu. */
export function scheduleWhenIdle(
  task: () => void,
  timeoutMs = 3_000,
): () => void {
  if (typeof window === "undefined") return () => {};

  let cancelled = false;
  const run = () => {
    if (!cancelled) task();
  };

  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: timeoutMs });
    return () => {
      cancelled = true;
      window.cancelIdleCallback(id);
    };
  }

  const id = setTimeout(run, 500);
  return () => {
    cancelled = true;
    clearTimeout(id);
  };
}
