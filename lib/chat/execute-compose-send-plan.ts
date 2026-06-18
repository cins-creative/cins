import type { ChatSendPayload, ChatSendPlan } from "@/lib/chat/compose-send-plan";
import type { PendingImageDraft } from "@/lib/chat/compose-draft";
import {
  resolvePendingImagesForSend,
  type ResolvedComposeImage,
} from "@/lib/chat/resolve-compose-images";
import type { ComposeImageUploadResult } from "@/lib/chat/compose-image-upload";

export function buildAlbumPayloadsFromResolved(
  resolved: ResolvedComposeImage[],
  options: { hasText: boolean; replyToId?: string | null },
): ChatSendPayload[] {
  return resolved.map((image, index) => ({
    cloudflare_image_id: image.imageId,
    ...(index === 0 && !options.hasText && options.replyToId
      ? { id_tin_tra_loi: options.replyToId }
      : {}),
  }));
}

export type ExecuteComposeSendPlanParams = {
  plan: ChatSendPlan;
  imageSnapshots: PendingImageDraft[];
  filesByLocalId: Map<string, File>;
  inFlightUploads: Map<string, Promise<ComposeImageUploadResult>>;
  hasText: boolean;
  replyToId?: string | null;
  sendText?: () => Promise<boolean>;
  sendAlbum?: (payloads: ChatSendPayload[]) => Promise<boolean>;
  onFailure?: (error: unknown) => void;
  onFinally?: () => void;
};

/** Upload + POST chạy nền sau khi optimistic đã hiện trên UI. */
export async function executeComposeSendPlanInBackground(
  params: ExecuteComposeSendPlanParams,
): Promise<boolean> {
  try {
    if (params.plan.text && params.sendText) {
      const textOk = await params.sendText();
      if (!textOk) {
        throw new Error("Không gửi được tin nhắn.");
      }
    }

    if (params.plan.album && params.sendAlbum) {
      const resolved = await resolvePendingImagesForSend({
        snapshots: params.imageSnapshots,
        filesByLocalId: params.filesByLocalId,
        inFlightUploads: params.inFlightUploads,
      });
      const payloads = buildAlbumPayloadsFromResolved(resolved, {
        hasText: params.hasText,
        replyToId: params.replyToId,
      });
      const albumOk = await params.sendAlbum(payloads);
      if (!albumOk) {
        throw new Error("Không gửi được ảnh.");
      }
    }

    return true;
  } catch (error) {
    params.onFailure?.(error);
    return false;
  } finally {
    params.onFinally?.();
  }
}
