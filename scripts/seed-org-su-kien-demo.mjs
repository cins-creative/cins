/**
 * Seed vài sự kiện demo vào org_su_kien.
 * Usage: node scripts/seed-org-su-kien-demo.mjs
 * Optional: node scripts/seed-org-su-kien-demo.mjs --org-slug=my-co-so
 */
import postgres from "postgres";
import { loadConfig } from "./cf-migrate/lib.mjs";

const cfg = loadConfig();
if (!cfg.databaseUrl) {
  console.error("Missing DATABASE_URL in .env.local");
  process.exit(1);
}

const orgSlugArg = process.argv.find((a) => a.startsWith("--org-slug="));
const targetSlug = orgSlugArg?.split("=")[1]?.trim() || null;

const sql = postgres(cfg.databaseUrl, { max: 1 });

function daysFromNow(days, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function hoursAfter(iso, hours) {
  const d = new Date(iso);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

const DEMO_EVENTS = [
  {
    ten: "Workshop vẽ minh hoạ số cho người mới",
    loai_su_kien: "workshop",
    mo_ta: "Buổi thực hành Procreate + Photoshop — mang theo iPad hoặc laptop.",
    noi_dung:
      "<p><strong>Chương trình</strong></p><ul><li>Giới thiệu workflow sketch → lineart → màu</li><li>Demo brush và layer organization</li><li>Thực hành 45 phút có mentor hỗ trợ</li></ul><p><strong>Đối tượng:</strong> Học sinh THPT, sinh viên năm 1–2 ngành Mỹ thuật / Thiết kế.</p>",
    loai_offset: 14,
    duration_h: 3,
    tinh_thanh: "hcm",
    dia_diem: "Quận 3, TP.HCM",
    mien_phi: true,
    gia_ve: null,
    slot_toi_da: 24,
  },
  {
    ten: "Open day — tham quan xưởng và portfolio review",
    loai_su_kien: "open_day",
    mo_ta: "Tour studio, gặp giảng viên và nhận góp ý portfolio miễn phí.",
    noi_dung:
      "<p>Bạn sẽ được tham quan không gian học, xem demo dự án học viên và đặt lịch review portfolio 15 phút với mentor.</p><p><em>Mang theo 5–8 tác phẩm (in hoặc digital).</em></p>",
    loai_offset: 28,
    duration_h: 4,
    tinh_thanh: "hcm",
    dia_diem: null,
    mien_phi: true,
    gia_ve: null,
    slot_toi_da: 40,
  },
  {
    ten: "Talkshow: Lộ trình vào ngành Game Art tại Việt Nam",
    loai_su_kien: "talkshow",
    mo_ta: "Chia sẻ từ artist studio mobile & PC — Q&A cuối buổi.",
    noi_dung:
      "<p>Chủ đề: portfolio cần gì để apply junior, kỹ năng technical art cơ bản, và cách build dự án cá nhân trong 6 tháng.</p>",
    loai_offset: 42,
    duration_h: 2,
    tinh_thanh: "ha_noi",
    dia_diem: "Online — link gửi sau khi đăng ký",
    mien_phi: true,
    gia_ve: null,
    slot_toi_da: 120,
  },
  {
    ten: "Khóa portrait nhanh (2 buổi cuối tuần)",
    loai_su_kien: "khoa_dao_tao_ngan",
    mo_ta: "Học cấu trúc khuôn mặt và ánh sáng cơ bản — có bài tập về nhà.",
    noi_dung:
      "<p><strong>Buổi 1:</strong> Proportion &amp; construction.<br><strong>Buổi 2:</strong> Value study và render hoàn thiện 1 portrait.</p>",
    loai_offset: 56,
    duration_h: 6,
    tinh_thanh: "da_nang",
    dia_diem: "Hai Châu, Đà Nẵng",
    mien_phi: false,
    gia_ve: 850000,
    slot_toi_da: 16,
  },
  {
    ten: "Meetup học viên — chia sẻ dự án cuối khoá",
    loai_su_kien: "meetup",
    mo_ta: "Gặp gỡ informal, networking nhẹ giữa các khoá.",
    noi_dung: "<p>Mang 1–2 piece mới nhất để show &amp; tell. Có mini critique circle theo nhóm 4–5 người.</p>",
    loai_offset: 70,
    duration_h: 2,
    tinh_thanh: "hcm",
    dia_diem: null,
    mien_phi: true,
    gia_ve: null,
    slot_toi_da: null,
  },
];

try {
  const orgs = await sql`
    SELECT o.id, o.slug, o.ten, o.cover_id, o.tinh_thanh
    FROM org_to_chuc o
    WHERE o.loai_to_chuc = 'co_so_dao_tao'
      AND (${targetSlug}::text IS NULL OR o.slug = ${targetSlug})
    ORDER BY o.ten
    LIMIT 5
  `;

  if (orgs.length === 0) {
    console.error(
      targetSlug
        ? `Không tìm thấy cơ sở slug="${targetSlug}".`
        : "Không có org co_so_dao_tao nào.",
    );
    process.exit(1);
  }

  const org = orgs[0];
  const coverFallback =
    org.cover_id?.trim() ||
    (
      await sql`
        SELECT cover_id FROM org_khoa_hoc
        WHERE id_to_chuc = ${org.id} AND cover_id IS NOT NULL
        LIMIT 1
      `
    )[0]?.cover_id ||
    null;

  if (!coverFallback) {
    console.warn(
      "Cảnh báo: org không có cover_id — sự kiện sẽ thiếu ảnh bìa (form UI yêu cầu cover).",
    );
  }

  const existing = await sql`
    SELECT ten FROM org_su_kien WHERE id_to_chuc = ${org.id}
  `;
  const existingTitles = new Set(
    existing.map((r) => r.ten?.trim().toLowerCase()).filter(Boolean),
  );

  let inserted = 0;
  for (const ev of DEMO_EVENTS) {
    if (existingTitles.has(ev.ten.trim().toLowerCase())) {
      console.log(`Skip (đã có): ${ev.ten}`);
      continue;
    }

    const batDau = daysFromNow(ev.loai_offset, 9, 0);
    const ketThuc = hoursAfter(batDau, ev.duration_h);
    const tinhThanh = ev.tinh_thanh || org.tinh_thanh || "hcm";

    await sql`
      INSERT INTO org_su_kien (
        id_to_chuc,
        ten,
        loai_su_kien,
        mo_ta,
        noi_dung,
        cover_id,
        bat_dau,
        ket_thuc,
        tinh_thanh,
        dia_diem,
        mien_phi,
        gia_ve,
        slot_toi_da
      ) VALUES (
        ${org.id},
        ${ev.ten},
        ${ev.loai_su_kien},
        ${ev.mo_ta},
        ${ev.noi_dung},
        ${coverFallback},
        ${batDau},
        ${ketThuc},
        ${tinhThanh}::tinh_thanh_vn_enum,
        ${ev.dia_diem},
        ${ev.mien_phi},
        ${ev.gia_ve},
        ${ev.slot_toi_da}
      )
    `;
    inserted += 1;
    console.log(`+ ${ev.ten}`);
  }

  console.log(
    `\nDone: ${inserted} sự kiện cho "${org.ten}" (/co-so/${org.slug}, tab su-kien).`,
  );
  if (orgs.length > 1 && !targetSlug) {
    console.log(
      `Gợi ý: seed org khác với --org-slug=${orgs[1].slug}`,
    );
  }
} catch (err) {
  console.error("Seed failed:", err?.message ?? err);
  process.exit(1);
} finally {
  await sql.end();
}
