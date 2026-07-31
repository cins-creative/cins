"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type FilterNhan = {
  id: string;
  ten: string;
  slug: string;
  mau: string | null;
  thu_tu: number;
};

type Work = {
  id: string;
  tieu_de: string;
  slug: string | null;
};

type Tag = FilterNhan & { works: Work[] };

function slugifyTag(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export default function CollectionsPage() {
  const router = useRouter();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [allWorks, setAllWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New tag form
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#e7f0fb");
  const [creating, setCreating] = useState(false);

  // Expanded tag id
  const [expanded, setExpanded] = useState<string | null>(null);
  // Assign work state
  const [assigning, setAssigning] = useState(false);

  async function loadData(pid: string) {
    setLoading(true);
    const supabase = createClient();

    const { data: myWorks } = await supabase
      .from("content_tac_pham")
      .select("id, tieu_de, slug")
      .eq("id_nguoi_dung", pid)
      .order("tao_luc", { ascending: false });
    setAllWorks(myWorks ?? []);

    const { data: myTags } = await supabase
      .from("filter_nhan")
      .select("id, ten, slug, mau, thu_tu")
      .eq("id_nguoi_dung", pid)
      .order("thu_tu");

    if (!myTags) {
      setLoading(false);
      return;
    }

    // Load assignments for each tag
    const tagIds = myTags.map((t) => t.id);
    const { data: gan } = await supabase
      .from("filter_gan")
      .select("id_filter, id_doi_tuong")
      .in("id_filter", tagIds)
      .eq("loai_doi_tuong", "tac_pham");

    const ganMap = new Map<string, Set<string>>();
    for (const g of gan ?? []) {
      if (!ganMap.has(g.id_filter)) ganMap.set(g.id_filter, new Set());
      ganMap.get(g.id_filter)!.add(g.id_doi_tuong);
    }

    const enriched: Tag[] = myTags.map((t) => ({
      ...t,
      works: (myWorks ?? []).filter((w) => ganMap.get(t.id)?.has(w.id)),
    }));
    setTags(enriched);
    setLoading(false);
  }

  useEffect(() => {
    void (async () => {
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
      setProfileId(profile.id);
      await loadData(profile.id);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function createTag() {
    if (!profileId || !newName.trim()) return;
    setCreating(true);
    setError(null);
    const supabase = createClient();
    const slug = slugifyTag(newName) || `tag-${Date.now()}`;
    const maxThu = tags.length ? Math.max(...tags.map((t) => t.thu_tu)) : 0;
    const { data, error: e } = await supabase
      .from("filter_nhan")
      .insert({
        ten: newName.trim(),
        slug,
        mau: newColor || null,
        id_nguoi_dung: profileId,
        thu_tu: maxThu + 1,
      })
      .select("id, ten, slug, mau, thu_tu")
      .single();
    setCreating(false);
    if (e) {
      setError(e.message);
      return;
    }
    if (data) {
      setTags((prev) => [...prev, { ...data, works: [] }]);
      setNewName("");
    }
  }

  async function deleteTag(id: string) {
    const supabase = createClient();
    await supabase.from("filter_gan").delete().eq("id_filter", id);
    await supabase.from("filter_nhan").delete().eq("id", id);
    setTags((prev) => prev.filter((t) => t.id !== id));
  }

  async function toggleWork(tagId: string, work: Work) {
    setAssigning(true);
    const supabase = createClient();
    const tag = tags.find((t) => t.id === tagId);
    const already = tag?.works.some((w) => w.id === work.id) ?? false;
    if (already) {
      await supabase
        .from("filter_gan")
        .delete()
        .eq("id_filter", tagId)
        .eq("id_doi_tuong", work.id)
        .eq("loai_doi_tuong", "tac_pham");
      setTags((prev) =>
        prev.map((t) =>
          t.id === tagId ? { ...t, works: t.works.filter((w) => w.id !== work.id) } : t,
        ),
      );
    } else {
      await supabase.from("filter_gan").insert({
        id_filter: tagId,
        id_doi_tuong: work.id,
        loai_doi_tuong: "tac_pham",
      });
      setTags((prev) =>
        prev.map((t) => (t.id === tagId ? { ...t, works: [...t.works, work] } : t)),
      );
    }
    setAssigning(false);
  }

  if (loading)
    return (
      <div className="stack">
        <p className="muted">Đang tải…</p>
      </div>
    );

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Bộ sưu tập / nhãn</h1>
        <a href="/studio" className="btn">
          ← Studio
        </a>
      </div>
      <p className="muted">Tổ chức tác phẩm theo nhãn cá nhân (chỉ bạn thấy).</p>

      {/* Create tag */}
      <div
        className="form"
        style={{ maxWidth: 420, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "var(--space-4)" }}
      >
        <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>Tạo nhãn mới</h2>
        <label>
          Tên nhãn
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ví dụ: Branding 2025"
          />
        </label>
        <label>
          Màu nhãn
          <div className="row" style={{ gap: 8 }}>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              style={{ width: 40, height: 36, padding: 2, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
            />
            <span style={{ fontSize: 13, color: "var(--fg-2)" }}>{newColor}</span>
          </div>
        </label>
        {error && <p className="error">{error}</p>}
        <button
          className="btn btn-primary"
          disabled={creating || !newName.trim()}
          onClick={createTag}
        >
          {creating ? "Đang tạo…" : "Tạo nhãn"}
        </button>
      </div>

      {/* Tag list */}
      {!tags.length && <p className="muted">Chưa có nhãn nào.</p>}
      {tags.map((tag) => (
        <div
          key={tag.id}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}
        >
          <div
            className="row"
            style={{
              padding: "var(--space-3) var(--space-4)",
              justifyContent: "space-between",
              background: tag.mau ?? "var(--bg-surface)",
              cursor: "pointer",
            }}
            onClick={() => setExpanded(expanded === tag.id ? null : tag.id)}
          >
            <div className="row" style={{ gap: 10 }}>
              {tag.mau && (
                <span
                  style={{ width: 14, height: 14, borderRadius: "50%", background: tag.mau, border: "1px solid rgba(0,0,0,.12)" }}
                />
              )}
              <strong>{tag.ten}</strong>
              <span className="muted" style={{ fontSize: 13 }}>
                {tag.works.length} tác phẩm
              </span>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button
                className="btn"
                style={{ fontSize: 12, padding: "3px 8px", color: "#e5484d" }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Xóa nhãn "${tag.ten}"?`)) deleteTag(tag.id);
                }}
              >
                Xóa
              </button>
              <span>{expanded === tag.id ? "▲" : "▼"}</span>
            </div>
          </div>

          {expanded === tag.id && (
            <div style={{ padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--border)" }}>
              <p className="muted" style={{ marginTop: 0 }}>
                Chọn tác phẩm để thêm vào nhãn này:
              </p>
              <div className="stack" style={{ gap: 6 }}>
                {allWorks.map((w) => {
                  const inTag = tag.works.some((tw) => tw.id === w.id);
                  return (
                    <label
                      key={w.id}
                      style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        checked={inTag}
                        disabled={assigning}
                        onChange={() => toggleWork(tag.id, w)}
                      />
                      {w.tieu_de}
                    </label>
                  );
                })}
              </div>
              {!allWorks.length && <p className="muted">Chưa có tác phẩm.</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
