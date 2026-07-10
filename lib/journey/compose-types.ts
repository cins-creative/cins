export type ComposeCreateKind = "article" | "photo" | "video" | "milestone" | "embed";

/** Luồng mở trình soạn — create luôn qua EditorView (một sheet). */
export type ComposeIntent = "minimal" | "photo" | "video" | "full" | "embed";

export type JourneyComposeState =
  | { kind: "article"; intent?: ComposeIntent }
  | { kind: "photo"; pendingFiles?: File[] }
  | { kind: "video"; pendingFile?: File }
  | {
      kind: "embed";
      platform: import("@/lib/editor/embed-providers").Tier1EmbedPlatformId;
      riveSource?: "url" | "file";
      pendingRiveFile?: File;
    }
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
    compose === "embed" ||
    compose === "milestone"
  ) {
    if (compose === "embed") {
      const platform = params.get("platform")?.trim();
      if (
        platform === "youtube" ||
        platform === "vimeo" ||
        platform === "figma" ||
        platform === "sketchfab" ||
        platform === "rive"
      ) {
        return { kind: "embed", platform };
      }
      return null;
    }
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
  } else if (state.kind === "embed") {
    next.set("compose", "embed");
    next.set("platform", state.platform);
  } else {
    next.set("compose", state.kind);
  }
  return next;
}
