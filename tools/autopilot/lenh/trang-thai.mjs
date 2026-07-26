/** In số liệu 7 bảng auto_* + cấu hình env (không lộ secret). */
export async function chayTrangThai(db) {
  const bang = [
    "auto_tai_khoan",
    "auto_nguon",
    "auto_muc",
    "auto_ban_thao",
    "auto_da_dang",
    "auto_han_muc",
    "auto_viec",
  ];

  console.log("=== Autopilot — trạng thái ===");
  for (const ten of bang) {
    const { count, error } = await db
      .from(ten)
      .select("id", { count: "exact", head: true });
    if (error) {
      console.log(`  ${ten}: LỖI — ${error.message}`);
    } else {
      console.log(`  ${ten}: ${count ?? 0}`);
    }
  }

  const { data: nickBat } = await db
    .from("auto_tai_khoan")
    .select("slug, dang_bat, han_muc_ngay, niche")
    .order("slug");
  if (nickBat?.length) {
    console.log("\nNick seeding:");
    for (const n of nickBat) {
      const flag = n.dang_bat ? "ON" : "OFF";
      console.log(
        `  [${flag}] ${n.slug}  hạn=${n.han_muc_ngay}/ngày  niche=${(n.niche || []).join(",")}`,
      );
    }
  }

  const hasSecret = Boolean(process.env.CINS_NOI_BO_DANG_BAI_SECRET?.trim());
  console.log("\nEnv:");
  console.log(
    `  CINS_NOI_BO_DANG_BAI_SECRET: ${hasSecret ? "SET" : "MISSING"}`,
  );
  console.log(
    `  NEXT_PUBLIC_SITE_URL: ${process.env.NEXT_PUBLIC_SITE_URL ? "SET" : "MISSING"}`,
  );
}
