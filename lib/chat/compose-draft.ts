export type PendingImageDraft = {
  localId: string;
  previewUrl: string;
  imageId: string | null;
  uploading: boolean;
  fingerprint?: string;
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
    fingerprint: input.fingerprint,
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

export function imageFileFingerprint(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
}
