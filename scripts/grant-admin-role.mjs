/**
 * Gán quyền quản trị viên (admin) hệ thống cho một tài khoản theo email.
 * Usage: node scripts/grant-admin-role.mjs <email>
 */
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });

const email = (process.argv[2] || "").toLowerCase().trim();
if (!email) {
  console.error("Missing email arg");
  process.exit(1);
}

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const db = postgres(url, { max: 1 });

try {
  const found = await db`
    SELECT nd.id, nd.ten_hien_thi, nd.slug, au.email AS auth_email, nd.email_lien_he
    FROM public.user_nguoi_dung nd
    LEFT JOIN auth.users au ON au.id = nd.auth_user_id
    WHERE lower(au.email) = ${email} OR lower(nd.email_lien_he) = ${email}
    LIMIT 5
  `;

  if (found.length === 0) {
    console.error(`Không tìm thấy người dùng với email: ${email}`);
    process.exit(2);
  }
  if (found.length > 1) {
    console.error("Nhiều hơn 1 người dùng khớp email — dừng để tránh nhầm:");
    console.error(found);
    process.exit(3);
  }

  const user = found[0];
  console.log("Tìm thấy:", {
    id: user.id,
    ten: user.ten_hien_thi,
    slug: user.slug,
    email: user.auth_email ?? user.email_lien_he,
  });

  const result = await db`
    INSERT INTO public.user_quyen_he_thong (id_nguoi_dung, vai_tro)
    VALUES (${user.id}, 'admin')
    ON CONFLICT (id_nguoi_dung)
    DO UPDATE SET vai_tro = 'admin', cap_nhat_luc = now()
    RETURNING id_nguoi_dung, vai_tro, tao_luc, cap_nhat_luc
  `;

  console.log("Đã gán quyền admin:", result[0]);
} catch (err) {
  console.error("Thất bại:", err?.message ?? err);
  process.exit(1);
} finally {
  await db.end({ timeout: 5 });
}
