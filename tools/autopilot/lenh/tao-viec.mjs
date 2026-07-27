/** Enqueue một việc vào auto_viec (skeleton Giai đoạn 1). */
export async function chayTaoViec(db, args) {
  const loai = String(args.loai || "").trim();
  const hopLe = new Set([
    "quet_nguon",
    "thu_thap_muc",
    "soan_bai",
    "dang_bai",
    "dong_bo_nick",
    "khac",
  ]);
  if (!hopLe.has(loai)) {
    throw new Error(
      `--loai phải là một trong: ${[...hopLe].join(", ")}`,
    );
  }

  let payload = {};
  if (args.payload) {
    try {
      payload = JSON.parse(args.payload);
    } catch {
      throw new Error("--payload phải là JSON hợp lệ");
    }
  }

  const { data, error } = await db
    .from("auto_viec")
    .insert({
      loai,
      payload,
      trang_thai: "cho",
      hen_luc: args.henLuc || null,
    })
    .select("id, loai, trang_thai, payload, tao_luc")
    .single();

  if (error) throw new Error(error.message);
  console.log("Đã tạo việc:");
  console.log(JSON.stringify(data, null, 2));
}
