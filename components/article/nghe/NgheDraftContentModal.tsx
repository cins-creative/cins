"use client";

import { useEffect } from "react";

import { useNgheArticleDraftOptional } from "@/components/article/nghe/NgheArticleDraftContext";
import { NgheLeadContentEditorModal } from "@/components/article/nghe/NgheLeadContentEditorModal";

const NGHE_HERO_TITLE_FALLBACK = "3D Modeller";

/** Modal soạn `noi_dung` — một instance cho cả hero & lead. */
export function NgheDraftContentModal() {
  const d = useNgheArticleDraftOptional();
  const open = d?.contentEditorOpen ?? false;

  useEffect(() => {
    if (d && !d.open) d.closeContentEditor();
  }, [d, d?.open, d?.closeContentEditor]);

  if (!d) return null;

  const displayTitle = (d.tieu_de ?? "").trim() || NGHE_HERO_TITLE_FALLBACK;

  return (
    <NgheLeadContentEditorModal
      open={open}
      onClose={d.closeContentEditor}
      value={d.noi_dung}
      onChange={d.setNoiDung}
      articleTitle={displayTitle}
    />
  );
}
