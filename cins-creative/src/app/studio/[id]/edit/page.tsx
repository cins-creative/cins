"use client";

import { createClient } from "@/lib/supabase/client";
import { cfImageUrl } from "@/lib/cloudflare";
import { uploadImageToCloudflare } from "@/lib/upload";
import type { Block } from "@/lib/blocks";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

type LinhVuc = { id: string; ten: string; slug: string };

type MediaRow = {
  id: string;
  cloudflare_id: string;
  thu_tu: number;
  loai_media: string;
  width: number | null;
  height: number | null;
};

type WorkData = {
  id: string;
  tieu_de: string;
  mo_ta: string | null;
  slug: string | null;
  che_do_hien_thi: "public" | "chi_minh" | "feature";
  meta_title: string | null;
  meta_description: string | null;
  cover_id: string | null;
  id_nguoi_dung: string;
  noi_dung_blocks: Block[];
};

const CHE_DO_LABELS: Record<string, string> = {
  public: "Công khai",
  chi_minh: "Chỉ mình tôi",
  feature: "Nổi bật",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/* ------------------------------------------------------------------ Block editor */
const BLOCK_TYPES = [
  { loai: "body", label: "Đoạn văn" },
  { loai: "h3", label: "Tiêu đề phụ" },
  { loai: "spacer", label: "Khoảng trống" },
  { loai: "embed", label: "Video nhúng" },
] as const;

function defaultBlock(loai: string): Block {
  switch (loai) {
    case "h3":
      return { loai: "h3", noi_dung: "" };
    case "spacer":
      return { loai: "spacer", cao: 24 };
    case "embed":
      return { loai: "embed", url: "" };
    default:
      return { loai: "body", noi_dung: "" };
  }
}

function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: Block[];
  onChange: (b: Block[]) => void;
}) {
  function update(i: number, patch: Partial<Block>) {
    const next = [...blocks];
    next[i] = { ...next[i], ...patch } as Block;
    onChange(next);
  }
  function remove(i: number) {
    onChange(blocks.filter((_, j) => j !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const next = [...blocks];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function add(loai: string) {
    onChange([...blocks, defaultBlock(loai)]);
  }

  return (
    <div className="stack">
      {blocks.map((b, i) => (
        <div
          key={i}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "var(--space-3)",
            background: "var(--bg-surface)",
          }}
        >
          <div
            className="row"
            style={{ justifyContent: "space-between", marginBottom: 8 }}
          >
            <span className="badge">{b.loai}</span>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn" onClick={() => move(i, -1)} disabled={i === 0}>
                ↑
              </button>
              <button
                className="btn"
                onClick={() => move(i, 1)}
                disabled={i === blocks.length - 1}
              >
                ↓
              </button>
              <button
                className="btn"
                style={{ color: "#e5484d" }}
                onClick={() => remove(i)}
              >
                Xóa
              </button>
            </div>
          </div>

          {(b.loai === "body" || b.loai === "h3") && (
            <textarea
              rows={b.loai === "h3" ? 1 : 3}
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                fontFamily: "inherit",
                resize: "vertical",
              }}
              value={b.noi_dung}
              placeholder={b.loai === "h3" ? "Tiêu đề phụ…" : "Nội dung đoạn văn…"}
              onChange={(e) => update(i, { noi_dung: e.target.value } as Partial<Block>)}
            />
          )}
          {b.loai === "spacer" && (
            <label style={{ fontSize: 13 }}>
              Cao (px)
              <input
                type="number"
                min={8}
                max={200}
                value={b.cao ?? 24}
                style={{ marginLeft: 8, width: 80, padding: "4px 8px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}
                onChange={(e) =>
                  update(i, { cao: parseInt(e.target.value) || 24 } as Partial<Block>)
                }
              />
            </label>
          )}
          {b.loai === "embed" && (
            <input
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
              }}
              placeholder="URL YouTube hoặc Vimeo…"
              value={b.url}
              onChange={(e) => update(i, { url: e.target.value } as Partial<Block>)}
            />
          )}
        </div>
      ))}

      <div className="row">
        {BLOCK_TYPES.map(({ loai, label }) => (
          <button key={loai} className="btn" onClick={() => add(loai)}>
            + {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Main page */
export default function EditWorkPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const workId = params.id;

  const [loading, setLoading] = useState(true);
  const [work, setWork] = useState<WorkData | null>(null);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [tieu_de, setTieuDe] = useState("");
  const [mo_ta, setMoTa] = useState("");
  const [slug, setSlugField] = useState("");
  const [che_do, setCheDo] = useState<"public" | "chi_minh" | "feature">("public");
  const [meta_title, setMetaTitle] = useState("");
  const [meta_description, setMetaDesc] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);

  // Lĩnh vực
  const [catalog, setCatalog] = useState<LinhVuc[]>([]);
  const [picked, setPicked] = useState<string[]>([]);

  // Media
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [coverId, setCoverId] = useState<string | null>(null);
  const [addingImages, setAddingImages] = useState(false);
  const [addImageError, setAddImageError] = useState<string | null>(null);

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("user_nguoi_dung")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!profile) {
      router.replace("/onboarding");
      return;
    }
    setMyProfileId(profile.id);

    const { data: w, error: wErr } = await supabase
      .from("content_tac_pham")
      .select("id, tieu_de, mo_ta, slug, che_do_hien_thi, meta_title, meta_description, cover_id, id_nguoi_dung, noi_dung_blocks")
      .eq("id", workId)
      .eq("id_nguoi_dung", profile.id)
      .maybeSingle();

    if (wErr || !w) {
      setError("Không tìm thấy tác phẩm hoặc bạn không có quyền sửa.");
      setLoading(false);
      return;
    }

    const blocks = Array.isArray(w.noi_dung_blocks) ? (w.noi_dung_blocks as Block[]) : [];
    setWork({ ...w, noi_dung_blocks: blocks, che_do_hien_thi: w.che_do_hien_thi as "public" | "chi_minh" | "feature" });
    setTieuDe(w.tieu_de);
    setMoTa(w.mo_ta ?? "");
    setSlugField(w.slug ?? "");
    setCheDo(w.che_do_hien_thi as "public" | "chi_minh" | "feature");
    setMetaTitle(w.meta_title ?? "");
    setMetaDesc(w.meta_description ?? "");
    setBlocks(blocks);
    setCoverId(w.cover_id);

    // Load lĩnh vực catalog
    const { data: lvCat } = await supabase
      .from("linh_vuc")
      .select("id, ten, slug")
      .eq("trang_thai", "active")
      .order("thu_tu");
    setCatalog(lvCat ?? []);

    // Load current lĩnh vực
    const { data: lvGan } = await supabase
      .from("content_tac_pham_linh_vuc")
      .select("id_linh_vuc, la_chinh")
      .eq("id_tac_pham", workId)
      .order("la_chinh", { ascending: false });
    if (lvGan) {
      // first = la_chinh
      const sorted = [...lvGan].sort((a, b) => (b.la_chinh ? 1 : 0) - (a.la_chinh ? 1 : 0));
      setPicked(sorted.map((r) => r.id_linh_vuc));
    }

    // Load media
    const { data: med } = await supabase
      .from("content_media")
      .select("id, cloudflare_id, thu_tu, loai_media, width, height")
      .eq("id_tac_pham", workId)
      .order("thu_tu");
    setMedia(med ?? []);

    setLoading(false);
  }, [workId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  function toggleLv(id: string) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }

  async function saveBasic() {
    const supabase = createClient();
    setBusy(true);
    setSaved(false);
    setError(null);
    const finalSlug = slug.trim() || slugify(tieu_de) || `work-${workId.slice(0, 8)}`;
    const { error: e } = await supabase
      .from("content_tac_pham")
      .update({
        tieu_de: tieu_de.trim(),
        mo_ta: mo_ta.trim() || null,
        slug: finalSlug,
        che_do_hien_thi: che_do,
        meta_title: meta_title.trim() || null,
        meta_description: meta_description.trim() || null,
        noi_dung_blocks: blocks as unknown as import("@/types/db").Json,
        cover_id: coverId,
      })
      .eq("id", workId);
    if (e) {
      setError(e.message);
      setBusy(false);
      return;
    }

    // Replace lĩnh vực
    await supabase.from("content_tac_pham_linh_vuc").delete().eq("id_tac_pham", workId);
    if (picked.length) {
      const rows = picked.map((id_linh_vuc, i) => ({
        id_tac_pham: workId,
        id_linh_vuc,
        la_chinh: i === 0,
      }));
      const { error: lvErr } = await supabase.from("content_tac_pham_linh_vuc").insert(rows);
      if (lvErr) setError(`Gắn lĩnh vực lỗi: ${lvErr.message}`);
    }

    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function addImages(files: FileList) {
    const supabase = createClient();
    setAddingImages(true);
    setAddImageError(null);
    const maxThu = media.length ? Math.max(...media.map((m) => m.thu_tu)) : -1;
    let cur = maxThu + 1;
    for (const file of Array.from(files)) {
      try {
        const up = await uploadImageToCloudflare(file);
        const { data: inserted } = await supabase
          .from("content_media")
          .insert({
            id_tac_pham: workId,
            cloudflare_id: up.cloudflareId,
            thu_tu: cur++,
            loai_media: "image",
            width: up.width,
            height: up.height,
          })
          .select("id, cloudflare_id, thu_tu, loai_media, width, height")
          .single();
        if (inserted) setMedia((prev) => [...prev, inserted]);
        if (!coverId && inserted) {
          setCoverId(inserted.cloudflare_id);
          await supabase
            .from("content_tac_pham")
            .update({ cover_id: inserted.cloudflare_id })
            .eq("id", workId);
        }
      } catch (err) {
        setAddImageError(err instanceof Error ? err.message : "Upload lỗi");
      }
    }
    setAddingImages(false);
  }

  async function deleteMedia(id: string, cfId: string) {
    const supabase = createClient();
    await supabase.from("content_media").delete().eq("id", id);
    setMedia((prev) => prev.filter((m) => m.id !== id));
    if (coverId === cfId) {
      const remaining = media.filter((m) => m.id !== id);
      const newCover = remaining[0]?.cloudflare_id ?? null;
      setCoverId(newCover);
      await supabase
        .from("content_tac_pham")
        .update({ cover_id: newCover })
        .eq("id", workId);
    }
  }

  async function setCover(cfId: string) {
    const supabase = createClient();
    setCoverId(cfId);
    await supabase
      .from("content_tac_pham")
      .update({ cover_id: cfId })
      .eq("id", workId);
  }

  async function moveMedia(id: string, dir: -1 | 1) {
    const supabase = createClient();
    const idx = media.findIndex((m) => m.id === id);
    const j = idx + dir;
    if (j < 0 || j >= media.length) return;
    const next = [...media];
    [next[idx], next[j]] = [next[j], next[idx]];
    next[idx].thu_tu = idx;
    next[j].thu_tu = j;
    setMedia(next);
    await supabase.from("content_media").update({ thu_tu: idx }).eq("id", next[idx].id);
    await supabase.from("content_media").update({ thu_tu: j }).eq("id", next[j].id);
  }

  async function deleteWork() {
    const supabase = createClient();
    setBusy(true);
    await supabase.from("content_tac_pham").delete().eq("id", workId);
    router.replace("/studio");
    router.refresh();
  }

  if (loading)
    return (
      <div className="stack">
        <p className="muted">Đang tải…</p>
      </div>
    );
  if (error && !work)
    return (
      <div className="stack">
        <p className="error">{error}</p>
      </div>
    );
  if (!work) return null;

  return (
    <div className="stack" style={{ maxWidth: 680 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: "1.3rem" }}>Sửa tác phẩm</h1>
        {myProfileId && work.slug && (
          <a
            href={`/@${catalog.find((x) => x.id)?.slug ?? ""}/${work.slug}`}
            className="btn"
            target="_blank"
            rel="noopener noreferrer"
          >
            Xem công khai
          </a>
        )}
      </div>

      {/* ── Thông tin cơ bản ── */}
      <section className="stack">
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Thông tin cơ bản</h2>
        <div className="form" style={{ maxWidth: "100%" }}>
          <label>
            Tiêu đề
            <input required value={tieu_de} onChange={(e) => setTieuDe(e.target.value)} />
          </label>
          <label>
            Mô tả
            <textarea rows={3} value={mo_ta} onChange={(e) => setMoTa(e.target.value)} />
          </label>
          <label>
            Slug (URL)
            <input
              value={slug}
              placeholder={slugify(tieu_de) || "tu-dong-tu-tieu-de"}
              onChange={(e) => setSlugField(e.target.value)}
            />
          </label>
          <label>
            Chế độ hiển thị
            <select
              value={che_do}
              onChange={(e) => setCheDo(e.target.value as typeof che_do)}
            >
              {Object.entries(CHE_DO_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Meta title (SEO)
            <input value={meta_title} onChange={(e) => setMetaTitle(e.target.value)} />
          </label>
          <label>
            Meta description (SEO)
            <textarea
              rows={2}
              value={meta_description}
              onChange={(e) => setMetaDesc(e.target.value)}
            />
          </label>
        </div>
      </section>

      {/* ── Lĩnh vực ── */}
      <section className="stack">
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
          Lĩnh vực{" "}
          <span className="muted">(tối đa 3, mục đầu = chính)</span>
        </h2>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {catalog.map((lv) => (
            <label
              key={lv.id}
              style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={picked.includes(lv.id)}
                onChange={() => toggleLv(lv.id)}
                disabled={!picked.includes(lv.id) && picked.length >= 3}
              />
              {lv.ten}
              {picked[0] === lv.id ? " ★" : ""}
            </label>
          ))}
        </div>
      </section>

      {/* ── Media ── */}
      <section className="stack">
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Ảnh / media</h2>
        {media.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            {media.map((m, i) => {
              const src = cfImageUrl(m.cloudflare_id, "thumbnail");
              const isCover = m.cloudflare_id === coverId;
              return (
                <div
                  key={m.id}
                  style={{
                    border: isCover ? "2px solid var(--cins-blue)" : "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                    background: "var(--neutral-100)",
                  }}
                >
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt=""
                      style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{ aspectRatio: "4/3", background: "var(--neutral-200)" }} />
                  )}
                  <div style={{ padding: "6px 8px", display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {isCover && <span className="badge">Bìa</span>}
                    {!isCover && (
                      <button className="btn" style={{ fontSize: 11, padding: "2px 6px" }} onClick={() => setCover(m.cloudflare_id)}>
                        Đặt bìa
                      </button>
                    )}
                    <button className="btn" onClick={() => moveMedia(m.id, -1)} disabled={i === 0} style={{ padding: "2px 6px", fontSize: 11 }}>↑</button>
                    <button className="btn" onClick={() => moveMedia(m.id, 1)} disabled={i === media.length - 1} style={{ padding: "2px 6px", fontSize: 11 }}>↓</button>
                    <button
                      className="btn"
                      style={{ fontSize: 11, padding: "2px 6px", color: "#e5484d" }}
                      onClick={() => deleteMedia(m.id, m.cloudflare_id)}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <label className="btn" style={{ cursor: "pointer", display: "inline-flex", alignSelf: "flex-start" }}>
          {addingImages ? "Đang tải ảnh…" : "+ Thêm ảnh"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            hidden
            disabled={addingImages}
            onChange={(e) => e.target.files && addImages(e.target.files)}
          />
        </label>
        {addImageError && <p className="error">{addImageError}</p>}
      </section>

      {/* ── Blocks ── */}
      <section className="stack">
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Nội dung / blocks</h2>
        <BlockEditor blocks={blocks} onChange={setBlocks} />
      </section>

      {/* ── Actions ── */}
      {error && <p className="error">{error}</p>}
      {saved && <p style={{ color: "var(--cins-mint)", fontWeight: 600 }}>Đã lưu!</p>}
      <div className="row">
        <button className="btn btn-primary" disabled={busy} onClick={saveBasic}>
          {busy ? "Đang lưu…" : "Lưu tác phẩm"}
        </button>
        <button className="btn" onClick={() => router.push("/studio")}>
          Quay lại studio
        </button>
      </div>

      {/* ── Xóa ── */}
      <section
        style={{
          marginTop: "var(--space-8)",
          padding: "var(--space-4)",
          border: "1px solid #fca5a5",
          borderRadius: "var(--radius-sm)",
          background: "#fff5f5",
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: "0.95rem", color: "#e5484d" }}>
          Xóa tác phẩm
        </h3>
        <p className="muted">Hành động này không thể hoàn tác.</p>
        {!confirmDelete ? (
          <button
            className="btn"
            style={{ borderColor: "#e5484d", color: "#e5484d" }}
            onClick={() => setConfirmDelete(true)}
          >
            Xóa tác phẩm này
          </button>
        ) : (
          <div className="row">
            <button className="btn" style={{ background: "#e5484d", borderColor: "#e5484d", color: "#fff" }} disabled={busy} onClick={deleteWork}>
              {busy ? "Đang xóa…" : "Xác nhận xóa"}
            </button>
            <button className="btn" onClick={() => setConfirmDelete(false)}>
              Hủy
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
