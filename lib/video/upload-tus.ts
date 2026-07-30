import type { Upload } from "tus-js-client";

/** Phản hồi /api/post-video/prepare — provider-aware (client-safe type). */
export type VideoPrepareResponse = {
  provider?: "bunny" | "stream";
  videoId?: string;
  embedUrl?: string;
  /** Stream direct-creator tus URL. */
  uploadURL?: string;
  /** Bunny tus auth. */
  libraryId?: string;
  authorizationSignature?: string;
  authorizationExpire?: number;
  error?: string;
};

export type VideoTusHandlers = {
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
  onError?: (err: unknown) => void;
  onSuccess?: () => void;
};

export function prepareResponseIsStream(prep: VideoPrepareResponse): boolean {
  return prep.provider === "stream" || Boolean(prep.uploadURL);
}

/** true nếu prepare trả về đủ dữ liệu để bắt đầu tus upload. */
export function prepareResponseIsValid(prep: VideoPrepareResponse): boolean {
  if (!prep.videoId || !prep.embedUrl) return false;
  if (prepareResponseIsStream(prep)) return Boolean(prep.uploadURL);
  return Boolean(
    prep.libraryId && prep.authorizationSignature && prep.authorizationExpire,
  );
}

/** Tạo tus Upload theo provider — Stream (uploadURL) hoặc Bunny (endpoint + auth). */
export async function createVideoTusUpload(
  file: File,
  prep: VideoPrepareResponse,
  handlers: VideoTusHandlers,
): Promise<Upload> {
  const { Upload } = await import("tus-js-client");
  const base = {
    retryDelays: [0, 1000, 3000, 5000, 10000],
    metadata: { filetype: file.type, title: file.name },
    onProgress: handlers.onProgress,
    onError: handlers.onError,
    onSuccess: handlers.onSuccess,
  };

  if (prepareResponseIsStream(prep)) {
    return new Upload(file, { ...base, uploadUrl: prep.uploadURL! });
  }

  return new Upload(file, {
    ...base,
    endpoint: "https://video.bunnycdn.com/tusupload",
    headers: {
      AuthorizationSignature: prep.authorizationSignature!,
      AuthorizationExpire: String(prep.authorizationExpire),
      VideoId: prep.videoId!,
      LibraryId: String(prep.libraryId),
    },
  });
}
