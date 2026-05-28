import "server-only";

import type {
  GalleryGridItem,
  GalleryPinnedBanner,
} from "@/components/journey/JourneyGalleryAside";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/* ╔══════════════════════════════════════════════════════════════════╗
   ║ Fetch Gallery cho 1 user (cột phải Journey).                     ║
   ║                                                                  ║
   ║ Quy tắc (matchspec với user request):                            ║
   ║                                                                  ║
   ║   • CHỈ lấy tác phẩm thuộc cột mốc có visibility = `feature` /   ║
   ║     `public`. Bỏ `theo_nhom` (sau mới wire), bỏ `chi_minh`.      ║
   ║   • CHỈ lấy tác phẩm có `cover_id` (cover image present) — vì     ║
   ║     gallery thumb dùng cover làm đại diện.                       ║
   ║   • `feature` → pinned banner 16:9 (ghim đầu gallery).           ║
   ║   • `public`  → grid item 1:1.                                   ║
   ║   • Sort: pinned theo `thoi_diem` desc, grid theo `thoi_diem`    ║
   ║     desc. Mỗi loại cap 12 item (đủ cho aside; user xem full ở    ║
   ║     /{slug}/gallery — wire sau).                                 ║
   ║                                                                  ║
   ║ Output href: `/{ownerSlug}/p/{postSlug}` để click vào thumb mở   ║
   ║ trang bài viết riêng.                                            ║
   ╚══════════════════════════════════════════════════════════════════╝ */

type GalleryRow = {
  id_cot_moc: string;
  content_cot_moc: {
    id: string;
    thoi_diem: string;
    che_do_hien_thi: "public" | "theo_nhom" | "chi_minh" | "feature";
  } | null;
  content_tac_pham: {
    id: string;
    slug: string | null;
    tieu_de: string;
    cover_id: string | null;
    id_nguoi_dung: string;
  } | null;
};

type TaggedTacGiaRow = {
  id_tac_pham: string;
};

const GALLERY_LIMIT_PER_TYPE = 12;

export async function fetchGalleryForUser(params: {
  userId: string;
  ownerSlug: string;
}): Promise<{
  pinned: GalleryPinnedBanner[];
  items: GalleryGridItem[];
  totalTacPham: number;
}> {
  const { userId, ownerSlug } = params;
  const admin = createServiceRoleClient();

  /* Join content_tac_pham_thuoc_moc → cả 2 bảng cha. RLS bypass bằng
     service-role; visibility filter ở layer này (cần check `che_do_hien_thi`
     của cot_moc, không phải tac_pham). */
  const { data: rows } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(
      "id_cot_moc, content_cot_moc:content_cot_moc!inner(id, thoi_diem, che_do_hien_thi, id_nguoi_dung), content_tac_pham:content_tac_pham!inner(id, slug, tieu_de, cover_id, id_nguoi_dung)",
    )
    .eq("content_cot_moc.id_nguoi_dung", userId)
    .in("content_cot_moc.che_do_hien_thi", ["feature", "public"])
    .not("content_tac_pham.cover_id", "is", null)
    .order("thu_tu", { ascending: true })
    .returns<GalleryRow[]>();

  const taggedRows = await fetchTaggedGalleryRows(admin, userId);
  const allRows = [...(rows ?? []), ...taggedRows];

  if (allRows.length === 0) {
    return { pinned: [], items: [], totalTacPham: 0 };
  }

  /* Dedupe theo `tac_pham.id` (1 tac_pham có thể được link vào nhiều cot_moc;
     gallery chỉ hiện 1 entry, lấy cot_moc visibility cao nhất: feature >
     public). Sau đó sort theo thoi_diem desc. */
  const byTacPham = new Map<
    string,
    {
      cotMocId: string;
      thoiDiem: string;
      visibility: "feature" | "public";
      tacPhamSlug: string | null;
      tieuDe: string;
      coverId: string;
      postOwnerId: string;
    }
  >();

  for (const r of allRows) {
    const cm = r.content_cot_moc;
    const tp = r.content_tac_pham;
    if (!cm || !tp || !tp.cover_id) continue;
    if (cm.che_do_hien_thi !== "feature" && cm.che_do_hien_thi !== "public") {
      continue;
    }
    const existing = byTacPham.get(tp.id);
    /* Upgrade từ public → feature nếu có 2 link với chế độ khác nhau. */
    if (existing && existing.visibility === "feature") continue;
    byTacPham.set(tp.id, {
      cotMocId: cm.id,
      thoiDiem: cm.thoi_diem,
      visibility: cm.che_do_hien_thi as "feature" | "public",
      tacPhamSlug: tp.slug,
      tieuDe: tp.tieu_de,
      coverId: tp.cover_id,
      postOwnerId: tp.id_nguoi_dung,
    });
  }

  const ownerIds = [...new Set(Array.from(byTacPham.values()).map((x) => x.postOwnerId))];
  const ownerSlugById = new Map<string, string>();
  if (ownerIds.length > 0) {
    const { data: owners } = await admin
      .from("user_nguoi_dung")
      .select("id, slug")
      .in("id", ownerIds)
      .returns<Array<{ id: string; slug: string }>>();
    for (const owner of owners ?? []) {
      ownerSlugById.set(owner.id, owner.slug);
    }
  }

  const all = Array.from(byTacPham.values()).sort(
    (a, b) => (a.thoiDiem > b.thoiDiem ? -1 : a.thoiDiem < b.thoiDiem ? 1 : 0),
  );

  const featureEntries = all
    .filter((x) => x.visibility === "feature")
    .slice(0, GALLERY_LIMIT_PER_TYPE);
  const publicEntries = all
    .filter((x) => x.visibility === "public")
    .slice(0, GALLERY_LIMIT_PER_TYPE);

  const pinned: GalleryPinnedBanner[] = featureEntries.map((entry, i) => ({
    id: `pin-${entry.cotMocId}-${i}`,
    src: galleryThumb(entry.coverId, "pinned"),
    pin: "Nổi bật",
    title: entry.tieuDe || "Tác phẩm",
    meta: formatVnDate(entry.thoiDiem),
    href: postHref(ownerSlugById.get(entry.postOwnerId) ?? ownerSlug, entry.tacPhamSlug),
  }));

  const items: GalleryGridItem[] = publicEntries.map((entry, i) => ({
    id: `grid-${entry.cotMocId}-${i}`,
    src: galleryThumb(entry.coverId, "grid"),
    label: entry.tieuDe || "Tác phẩm",
    href: postHref(ownerSlugById.get(entry.postOwnerId) ?? ownerSlug, entry.tacPhamSlug),
  }));

  return {
    pinned,
    items,
    totalTacPham: byTacPham.size,
  };
}

async function fetchTaggedGalleryRows(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
): Promise<GalleryRow[]> {
  const { data: tags } = await admin
    .from("content_tac_pham_tac_gia")
    .select("id_tac_pham")
    .eq("id_nguoi_dung", userId)
    .eq("trang_thai", "accepted")
    .eq("la_chu_so_huu", false)
    .returns<TaggedTacGiaRow[]>();

  const tacPhamIds = [...new Set((tags ?? []).map((row) => row.id_tac_pham))];
  if (tacPhamIds.length === 0) return [];

  const { data } = await admin
    .from("content_tac_pham_thuoc_moc")
    .select(
      "id_cot_moc, content_cot_moc:content_cot_moc!inner(id, thoi_diem, che_do_hien_thi, id_nguoi_dung), content_tac_pham:content_tac_pham!inner(id, slug, tieu_de, cover_id, id_nguoi_dung)",
    )
    .in("id_tac_pham", tacPhamIds)
    .in("content_cot_moc.che_do_hien_thi", ["feature", "public"])
    .not("content_tac_pham.cover_id", "is", null)
    .order("thu_tu", { ascending: true })
    .returns<GalleryRow[]>();

  return data ?? [];
}

function postHref(ownerSlug: string, postSlug: string | null): string {
  if (!postSlug) return `/${ownerSlug}`;
  return `/${ownerSlug}/p/${postSlug}`;
}

function galleryThumb(
  coverId: string,
  shape: "pinned" | "grid",
): string {
  /* Picsum placeholder pattern dùng cho editor v1. Khi sang Cloudflare
     Images chỉ cần đổi base URL ở 1 chỗ này.

     Pinned 16:9 — 1200×675 (banner aside ~280 wide @2x).
     Grid 1:1   — 600×600  (item aside ~140 wide @2x). */
  const dims = shape === "pinned" ? "1200/675" : "600/600";
  return `https://picsum.photos/seed/${encodeURIComponent(coverId)}/${dims}`;
}

function formatVnDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}
