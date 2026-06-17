export type PendingImageDraft = {
  localId: string;
  previewUrl: string;
  imageId: string | null;
  uploading: boolean;
  error?: string;
};

export type RoomComposeDraft = {
  text: string;
  images: PendingImageDraft[];
};

export function createPendingImageDraft(
  input: Omit<PendingImageDraft, "localId"> & { localId?: string },
): PendingImageDraft {
  return {
    localId: input.localId ?? crypto.randomUUID(),
    previewUrl: input.previewUrl,
    imageId: input.imageId,
    uploading: input.uploading,
    error: input.error,
  };
}

export function revokeDraftImageUrls(images: PendingImageDraft[]): void {
  for (const image of images) {
    if (image.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(image.previewUrl);
    }
  }
}
