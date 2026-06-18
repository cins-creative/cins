export type ComposeCreateKind = "article" | "photo" | "video" | "milestone";

export type JourneyComposeState =
  | { kind: "article" }
  | { kind: "photo"; pendingFiles?: File[] }
  | { kind: "video"; pendingFile?: File }
  | { kind: "milestone" }
  | { kind: "milestone-edit"; cotMocId: string }
  | { kind: "edit"; postSlug: string };

export function parseComposeSearchParams(
  params: URLSearchParams,
): JourneyComposeState | null {
  const editSlug = params.get("edit")?.trim();
  if (editSlug) return { kind: "edit", postSlug: editSlug };

  const compose = params.get("compose")?.trim();
  const cotMoc = params.get("cotMoc")?.trim();
  if (compose === "milestone-edit" && cotMoc) {
    return { kind: "milestone-edit", cotMocId: cotMoc };
  }
  if (
    compose === "article" ||
    compose === "photo" ||
    compose === "video" ||
    compose === "milestone"
  ) {
    return { kind: compose };
  }
  return null;
}

export function composeStateToSearchParams(
  state: JourneyComposeState | null,
): URLSearchParams {
  const next = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  next.delete("compose");
  next.delete("edit");
  next.delete("cotMoc");
  if (!state) return next;
  if (state.kind === "edit") {
    next.set("edit", state.postSlug);
  } else if (state.kind === "milestone-edit") {
    next.set("compose", "milestone-edit");
    next.set("cotMoc", state.cotMocId);
  } else {
    next.set("compose", state.kind);
  }
  return next;
}
