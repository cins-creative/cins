"use client";

import { createWork } from "@/lib/create-work";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type LinhVuc = { id: string; ten: string; slug: string };

export default function NewWorkPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [moTa, setMoTa] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [catalog, setCatalog] = useState<LinhVuc[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("linh_vuc")
      .select("id, ten, slug")
      .eq("trang_thai", "active")
      .order("thu_tu")
      .then(({ data }) => setCatalog(data ?? []));
  }, []);

  function toggleLv(id: string) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!files?.length) {
      setError("Chọn ít nhất 1 ảnh.");
      return;
    }
    setBusy(true);
    try {
      const id = await createWork({
        tieu_de: title,
        mo_ta: moTa,
        files: Array.from(files),
        linhVucIds: picked,
        che_do_hien_thi: "public",
      });
      router.push(`/studio/${id}/edit`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tạo tác phẩm");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <h1>Tác phẩm mới</h1>
      <form className="form" onSubmit={onSubmit}>
        <label>
          Tiêu đề
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Mô tả
          <textarea rows={3} value={moTa} onChange={(e) => setMoTa(e.target.value)} />
        </label>
        <label>
          Ảnh (JPEG/PNG/WebP/GIF, tối đa 8MB)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            required
            onChange={(e) => setFiles(e.target.files)}
          />
        </label>
        <fieldset>
          <legend className="muted">Lĩnh vực (tối đa 3, mục đầu = chính)</legend>
          <div className="row">
            {catalog.map((lv) => (
              <label key={lv.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={picked.includes(lv.id)}
                  onChange={() => toggleLv(lv.id)}
                />
                {lv.ten}
                {picked[0] === lv.id ? " ★" : ""}
              </label>
            ))}
          </div>
        </fieldset>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Đang tải…" : "Tạo tác phẩm"}
        </button>
      </form>
    </div>
  );
}
