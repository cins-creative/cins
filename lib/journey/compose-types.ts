import { isTier1EmbedPlatformId } from "@/lib/editor/embed-providers";
import type { ComposeEditorDraft } from "@/lib/journey/compose-editor-draft";
import type { ShopPostHangItem } from "@/lib/shop/types";

export type ComposeCreateKind = "article" | "photo" | "video" | "milestone" | "embed";

/** Luồng mở trình soạn — create luôn qua EditorView (một sheet). */
export type ComposeIntent = "minimal" | "photo" | "video" | "full" | "embed";

/** Nháp compose chưa có `v`/`savedAt` — dùng prefill (vd. Giới thiệu sản phẩm). */
export type ComposePrefillDraft = Omit<ComposeEditorDraft, "v" | "savedAt">;

/** Mock ticker kiosk trên ComposePreviewPanel (Giới thiệu sản phẩm). */
export type ComposeShopKioskAttachItem = {
  idBienThe: string;
  idBangGia: string;
  thuTu: number;
};

export type ComposeShopKioskPreview = {
  items: ShopPostHangItem[];
  /** Payload gắn `shop_post_hang` lúc publish (không chỉ mock UI). */
  attach?: ComposeShopKioskAttachItem[];
  /** Gợi ý thiếu hàng / hết hàng / cắt trần — hiện dưới ticker. */
  hint?: string | null;
};

export type JourneyComposeState =
  | { kind: "article"; intent?: ComposeIntent }
  | {
      kind: "photo";
      pendingFiles?: File[];
      /** Prefill album/blocks khi không có nháp localStorage. Không sync URL. */
      prefillDraft?: ComposePrefillDraft;
      /** Hậu tố draft key (vd. `shop-nhom:{id}`) — tránh đè nháp album thường. */
      draftScope?: string;
      /** Preview hàng bán sẽ gắn sau publish. */
      shopKioskPreview?: ComposeShopKioskPreview | null;
    }
  | { kind: "video"; pendingFile?: File }
  | {
      kind: "embed";
      platform: import("@/lib/editor/embed-providers").Tier1EmbedPlatformId;
      /** url = dán link; file = upload .riv / .lottie */
      fileSource?: "url" | "file";
      pendingEmbedFile?: File;
      /** @deprecated dùng fileSource */
      riveSource?: "url" | "file";
      /** @deprecated dùng pendingEmbedFile */
      pendingRiveFile?: File;
    }
  | { kind: "milestone" }
  | { kind: "milestone-edit"; cotMocId: string }
  | { kind: "edit"; postSlug: string; cotMocId?: string };

export function parseComposeSearchParams(
  params: URLSearchParams,
): JourneyComposeState | null {
  const editSlug = params.get("edit")?.trim();
  if (editSlug) {
    const cotMocId = params.get("editMoc")?.trim();
    return cotMocId
      ? { kind: "edit", postSlug: editSlug, cotMocId }
      : { kind: "edit", postSlug: editSlug };
  }

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
      if (isTier1EmbedPlatformId(platform)) {
        const sourceRaw = params.get("source")?.trim();
        const fileSource =
          sourceRaw === "file" || sourceRaw === "url" ? sourceRaw : undefined;
        return {
          kind: "embed",
          platform,
          ...(fileSource ? { fileSource } : {}),
        };
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
  next.delete("editMoc");
  next.delete("cotMoc");
  next.delete("platform");
  next.delete("source");
  if (!state) return next;
  if (state.kind === "edit") {
    next.set("edit", state.postSlug);
    if (state.cotMocId) next.set("editMoc", state.cotMocId);
  } else if (state.kind === "milestone-edit") {
    next.set("compose", "milestone-edit");
    next.set("cotMoc", state.cotMocId);
  } else if (state.kind === "embed") {
    next.set("compose", "embed");
    next.set("platform", state.platform);
    const fileSource = state.fileSource ?? state.riveSource;
    if (fileSource === "file" || fileSource === "url") {
      next.set("source", fileSource);
    }
  } else {
    next.set("compose", state.kind);
  }
  return next;
}
