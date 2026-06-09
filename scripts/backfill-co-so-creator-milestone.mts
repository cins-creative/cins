import { config } from "dotenv";

config({ path: ".env.local" });

const orgSlug = process.argv[2]?.trim();
const userSlug = process.argv[3]?.trim();

if (!orgSlug || !userSlug) {
  console.error(
    "Usage: npx tsx scripts/backfill-co-so-creator-milestone.mts <org-slug> <user-slug>",
  );
  console.error(
    "Example: npx tsx scripts/backfill-co-so-creator-milestone.mts sine-art taikhoanphanmem95",
  );
  process.exit(1);
}

const { createServiceRoleClient } = await import(
  "../lib/supabase/service-role.ts"
);

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const admin = createServiceRoleClient();

const { data: org, error: orgErr } = await admin
  .from("org_to_chuc")
  .select("id, slug, ten, mo_ta, loai_to_chuc, nguoi_tao")
  .eq("slug", orgSlug)
  .maybeSingle<{
    id: string;
    slug: string;
    ten: string;
    mo_ta: string | null;
    loai_to_chuc: string;
    nguoi_tao: string | null;
  }>();

if (orgErr) {
  console.error("Lỗi:", orgErr.message);
  process.exit(1);
}
if (!org) {
  console.error(`Không tìm thấy org slug «${orgSlug}».`);
  process.exit(1);
}
if (org.loai_to_chuc !== "co_so_dao_tao") {
  console.error(`Org «${orgSlug}» không phải cơ sở đào tạo.`);
  process.exit(1);
}

const { data: user, error: userErr } = await admin
  .from("user_nguoi_dung")
  .select("id, slug")
  .eq("slug", userSlug)
  .maybeSingle<{ id: string; slug: string }>();

if (userErr) {
  console.error("Lỗi:", userErr.message);
  process.exit(1);
}
if (!user) {
  console.error(`Không tìm thấy user slug «${userSlug}».`);
  process.exit(1);
}

const { data: membership } = await admin
  .from("user_thanh_vien_to_chuc")
  .select("vai_tro")
  .eq("id_to_chuc", org.id)
  .eq("id_nguoi_dung", user.id)
  .maybeSingle<{ vai_tro: string }>();

const isCreator = org.nguoi_tao === user.id;
const isAdmin =
  membership?.vai_tro === "admin" || membership?.vai_tro === "owner";
if (!isCreator && !isAdmin) {
  console.error(
    `User «${userSlug}» không phải người tạo/admin của cơ sở «${orgSlug}».`,
  );
  process.exit(1);
}

const { data: existing } = await admin
  .from("content_cot_moc")
  .select("id")
  .eq("id_nguoi_dung", user.id)
  .eq("id_to_chuc", org.id)
  .eq("nguon_goc", "sinh_tu_org_assign")
  .maybeSingle<{ id: string }>();

if (existing?.id) {
  console.log(`Cột mốc đã tồn tại: ${existing.id}`);
  process.exit(0);
}

const tieuDe = `Tạo cơ sở đào tạo ${org.ten}`;
const moTa =
  org.mo_ta?.trim() || `Người tạo cơ sở đào tạo · ${org.ten} trên CINs.`;

const { data: cotMoc, error: cotErr } = await admin
  .from("content_cot_moc")
  .insert({
    id_nguoi_dung: user.id,
    loai_moc: "thanh_tuu",
    nguon_goc: "sinh_tu_org_assign",
    tieu_de: tieuDe,
    mo_ta: moTa,
    thoi_diem: todayIsoDate(),
    che_do_hien_thi: "public",
    id_to_chuc: org.id,
  })
  .select("id")
  .single<{ id: string }>();

if (cotErr || !cotMoc) {
  console.error("Lỗi:", cotErr?.message ?? "Không tạo được cột mốc.");
  process.exit(1);
}

const now = new Date().toISOString();
const { error: verifyErr } = await admin.from("verify_xac_nhan").insert({
  id_cot_moc: cotMoc.id,
  loai_nguoi_xac_nhan: "to_chuc",
  id_nguoi_xac_nhan: null,
  trang_thai: "da_xac_nhan",
  url_proof: `/co-so/${org.slug}`,
  xu_ly_luc: now,
});

if (verifyErr) {
  await admin.from("content_cot_moc").delete().eq("id", cotMoc.id);
  console.error("Lỗi verify:", verifyErr.message);
  process.exit(1);
}

console.log(`Đã tạo cột mốc mới: ${cotMoc.id}`);
