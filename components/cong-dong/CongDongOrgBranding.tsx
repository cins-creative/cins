"use client";

import { Loader2, Pencil } from "lucide-react";
import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { getCoverUrl } from "@/lib/articles/cover";
import { getAvatarUrl } from "@/lib/journey/profile";

type Props = {
  orgId: string;
  orgName: string;
  avatarId: string | null;
  coverId: string | null;
  canEdit: boolean;
  onBrandingChange: (next: {
    avatarId?: string | null;
    coverId?: string | null;
  }) => void;
};

async function uploadBrandingImage(
  file: File,
  kind: "avatar" | "cover",
): Promise<{ imageId: string; url: string }> {
  const endpoint = kind === "avatar" ? "/api/avatar/upload" : "/api/cover/upload";
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(endpoint, { method: "POST", body: form });
  const json = (await res.json().catch(() => null)) as {
    imageId?: string;
    url?: string;
    error?: string;
  } | null;
  if (!res.ok || !json?.imageId) {
    throw new Error(json?.error ?? "Upload ảnh thất bại.");
  }
  return { imageId: json.imageId, url: json.url ?? "" };
}

async function patchOrgBranding(
  orgId: string,
  patch: { avatarId?: string; coverId?: string },
): Promise<{ avatarId: string | null; coverId: string | null }> {
  const res = await fetch(`/api/cong-dong/${orgId}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const json = (await res.json().catch(() => null)) as {
    avatarId?: string | null;
    coverId?: string | null;
    error?: string;
  } | null;
  if (!res.ok || !json) {
    throw new Error(json?.error ?? "Không lưu được.");
  }
  return {
    avatarId: json.avatarId ?? null,
    coverId: json.coverId ?? null,
  };
}

export function CongDongOrgBrandingCover({
  orgId,
  coverId,
  canEdit,
  onBrandingChange,
}: Pick<Props, "orgId" | "coverId" | "canEdit" | "onBrandingChange">) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const coverUrl = previewUrl ?? getCoverUrl(coverId);

  const onFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      setErr(null);
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);
      setUploading(true);

      try {
        const uploaded = await uploadBrandingImage(file, "cover");
        const saved = await patchOrgBranding(orgId, { coverId: uploaded.imageId });
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(null);
        onBrandingChange({ coverId: saved.coverId });
      } catch (uploadErr) {
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(null);
        setErr(
          uploadErr instanceof Error ? uploadErr.message : "Upload cover lỗi.",
        );
      } finally {
        setUploading(false);
      }
    },
    [orgId, onBrandingChange],
  );

  return (
    <>
      <div
        className={`cd-v4-id-cover${coverUrl ? " has-img" : ""}${canEdit ? " is-editable" : ""}`}
        aria-hidden={!canEdit}
      >
        {coverUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={coverUrl} alt="" />
        ) : null}
        {canEdit ? (
          <>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="cd-v4-id-branding-file"
              disabled={uploading}
              onChange={onFileChange}
            />
            <button
              type="button"
              className="cd-v4-id-branding-edit cd-v4-id-branding-edit--cover"
              aria-label="Đổi ảnh bìa nhóm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 size={18} strokeWidth={2} className="cd-v4-spin" aria-hidden />
              ) : (
                <Pencil size={16} strokeWidth={2} aria-hidden />
              )}
              <span>{uploading ? "Đang tải…" : "Đổi ảnh bìa"}</span>
            </button>
          </>
        ) : null}
        {err ? (
          <p className="cd-v4-id-branding-err cd-v4-id-branding-err--overlay" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    </>
  );
}

export function CongDongOrgBrandingAvatar({
  orgId,
  orgName,
  avatarId,
  canEdit,
  onBrandingChange,
}: Pick<
  Props,
  "orgId" | "orgName" | "avatarId" | "canEdit" | "onBrandingChange"
>) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const avatarUrl = previewUrl ?? getAvatarUrl(avatarId);

  const onFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      setErr(null);
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);
      setUploading(true);

      try {
        const uploaded = await uploadBrandingImage(file, "avatar");
        const saved = await patchOrgBranding(orgId, {
          avatarId: uploaded.imageId,
        });
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(null);
        onBrandingChange({ avatarId: saved.avatarId });
      } catch (uploadErr) {
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(null);
        setErr(
          uploadErr instanceof Error ? uploadErr.message : "Upload avatar lỗi.",
        );
      } finally {
        setUploading(false);
      }
    },
    [orgId, onBrandingChange],
  );

  return (
    <>
      <div
        className={`cd-v4-avatar${canEdit ? " is-editable" : ""}`}
        aria-hidden={!canEdit}
      >
        {avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={avatarUrl} alt="" />
        ) : (
          <span>{orgName.charAt(0).toUpperCase()}</span>
        )}
        {canEdit ? (
          <>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="cd-v4-id-branding-file"
              disabled={uploading}
              onChange={onFileChange}
            />
            <button
              type="button"
              className="cd-v4-id-branding-edit cd-v4-id-branding-edit--avatar"
              aria-label="Đổi avatar nhóm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 size={16} strokeWidth={2} className="cd-v4-spin" aria-hidden />
              ) : (
                <Pencil size={14} strokeWidth={2} aria-hidden />
              )}
            </button>
          </>
        ) : null}
      </div>
      {err ? (
        <p className="cd-v4-id-branding-err" role="alert">
          {err}
        </p>
      ) : null}
    </>
  );
}
