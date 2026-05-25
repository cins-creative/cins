/**
 * One-off: điền nội dung trang /software/cinema-4d qua admin SQL runner.
 * Chạy: npx tsx scripts/seed-cinema-4d-content.mts
 */
import { config } from "dotenv";

config({ path: ".env.local" });

const { runAdminSql } = await import("../lib/admin/sql-runner");

const NOi_DUNG = `<p>Nếu bạn từng thấy một đoạn motion graphics với hàng trăm khối lập phương nhảy theo nhịp nhạc, một intro truyền hình 3D bóng bẩy, hay phần mô phỏng sản phẩm xoay mượt trên quảng cáo — rất có thể một phần pipeline đã đi qua <strong>Cinema 4D</strong>. Đây là phần mềm 3D chuyên nghiệp của Maxon, nổi tiếng với giao diện thân thiện và bộ công cụ <strong>MoGraph</strong> mạnh cho motion design.</p><p>Khác với Blender (miễn phí, mã nguồn mở) hay Maya (thường gắn với phim hoạt hình và game AAA), Cinema 4D được nhiều studio broadcast và motion designer chọn vì tốc độ làm việc nhanh, renderer tích hợp Redshift, và tích hợp sâu với After Effects.</p><h2 class="arc-h2" data-arc-section="01"><span class="arc-heading-body">Cinema 4D dùng để làm gì?</span></h2><p>Cinema 4D phục vụ bốn nhóm công việc chính:</p><ul><li><strong>Mô hình 3D (Modeling)</strong> — tạo vật thể, nhân vật, sản phẩm, kiến trúc đơn giản.</li><li><strong>Hoạt hình (Animation)</strong> — keyframe, rig cơ bản, camera, timeline linh hoạt.</li><li><strong>MoGraph &amp; Motion Design</strong> — nhân bản đối tượng (Cloner), hiệu ứng (Effector), Fields — thế mạnh của C4D trong quảng cáo và truyền hình.</li><li><strong>Render &amp; mô phỏng</strong> — Redshift, Physical/Standard Renderer; tích hợp mô phỏng qua plugin hoặc module bổ sung.</li></ul><p>Trong ngành sáng tạo thị giác Việt Nam, C4D xuất hiện nhiều ở motion graphics, quảng cáo TV/digital, visualization sản phẩm và một phần pipeline VFX (thường kết hợp với After Effects hoặc Nuke).</p><h2 class="arc-h2" data-arc-section="02"><span class="arc-heading-body">Giao diện và khái niệm cốt lõi</span></h2><p>Giao diện C4D được thiết kế để người mới làm quen nhanh hơn nhiều DCC khác. Các khái niệm cần nắm:</p><ul><li><strong>Viewport</strong> — cửa sổ xem scene 3D; có thể bật nhiều view (Perspective, Top, Front…).</li><li><strong>Object Manager</strong> — cây phân cấp object, group, null, camera, light.</li><li><strong>Attribute Manager</strong> — chỉnh thuộc tính object (vị trí, scale, material, tag).</li><li><strong>Timeline</strong> — keyframe animation; F-Curve để tinh chỉnh chuyển động.</li><li><strong>Material &amp; Tag</strong> — gán chất liệu, tag đặc biệt (MoGraph, dynamics, compositing).</li></ul><p>Workflow cơ bản: tạo object → gán material → animate → render. Với MoGraph, bạn thêm Cloner + Effector thay vì animate từng mảnh riêng lẻ.</p><h2 class="arc-h2" data-arc-section="03"><span class="arc-heading-body">MoGraph và các module nổi bật</span></h2><p><strong>MoGraph</strong> là lý do nhiều motion designer chọn C4D. Cloner nhân bản geometry; Effector (Plain, Random, Shader, Sound…) điều khiển vị trí, scale, rotation hàng loạt; <strong>Fields</strong> (phiên bản mới) thay thế dần Falloff cũ, cho phép vùng ảnh hưởng phức tạp hơn.</p><p>Các module / tính năng đáng chú ý khác:</p><ul><li><strong>Redshift</strong> — GPU renderer (Maxon sở hữu), tích hợp sâu, phổ biến trong production.</li><li><strong>Volume Builder &amp; Mesher</strong> — mô hình hóa dạng thể tích, hữu ích cho abstract motion.</li><li><strong>Scene Nodes / Nodes</strong> — hướng procedural mới, gần với tư duy node-based.</li><li><strong>Cineware</strong> — đưa scene C4D trực tiếp vào After Effects mà không cần render trung gian (tùy use case).</li></ul><h2 class="arc-h2" data-arc-section="04"><span class="arc-heading-body">Workflow và tích hợp pipeline</span></h2><p>C4D hiếm khi đứng một mình — thường nằm giữa pipeline sáng tạo:</p><ul><li><strong>After Effects</strong> — compositing, text, final polish qua Cineware hoặc export sequence.</li><li><strong>Octane, Arnold, V-Ray</strong> — renderer bên thứ ba khi studio có license riêng.</li><li><strong>Substance Painter / Designer</strong> — texture PBR cho asset 3D.</li><li><strong>Unity / Unreal Engine</strong> — export FBX/Alembic/USD cho realtime hoặc cinematics game.</li><li><strong>Houdini / Blender</strong> — trao đổi cache simulation qua Alembic, OpenVDB.</li></ul><p>Định dạng trao đổi phổ biến: FBX, Alembic, OBJ, USD. Khi làm việc nhóm, naming convention và version file rõ ràng quan trọng không kém kỹ năng modeling.</p><h2 class="arc-h2" data-arc-section="05"><span class="arc-heading-body">Renderer và plugin quan trọng</span></h2><p>Ngoài Redshift (đi kèm nhiều gói Maxon One), cộng đồng C4D dùng:</p><ul><li><strong>Octane Render</strong> — GPU, look cinematic, phổ biến motion/VFX indie.</li><li><strong>Arnold, V-Ray</strong> — studio lớn, pipeline phim/quảng cáo cao cấp.</li><li><strong>X-Particles</strong> — simulation hạt, fluid, abstract FX.</li><li><strong>Forester, TurbulenceFD</strong> — cây cối, khói/lửa (tùy license).</li></ul><p>Plugin mua thêm có thể đẩy chi phí tổng — khi học, nên thành thạo MoGraph + Redshift trước khi đầu tư hàng loạt addon.</p><h2 class="arc-h2" data-arc-section="06"><span class="arc-heading-body">Ai dùng Cinema 4D?</span></h2><p>C4D phù hợp nếu bạn hướng tới:</p><ul><li><strong>Motion Designer</strong> — quảng cáo, branding motion, social content 3D.</li><li><strong>Broadcast / TV Graphics</strong> — intro, lower third 3D, nhận diện kênh.</li><li><strong>Product Visualization</strong> — mockup sản phẩm, packshot xoay 360°.</li><li><strong>VFX Generalist (entry–mid)</strong> — mô hình/hoạt hình đơn giản, giao After Effects.</li><li><strong>Học sinh THPT khám phá 3D</strong> — UI dễ hơn Maya/Houdini để bắt đầu, trước khi chuyên sâu DCC khác.</li></ul><p>Nếu mục tiêu là rig nhân vật phim dài hoặc game AAA thuần, Maya/Blender có thể phù hợp hơn; nếu mục tiêu là FX procedural nặng, Houdini mạnh hơn — nhưng C4D vẫn là cầu nối thực tế cho motion và broadcast.</p>`;

const META = {
  nha_phat_hanh: "Maxon",
  version: "2025",
  platform: ["Windows", "macOS"],
  website: "https://www.maxon.net/en/cinema-4d",
  goi_mien_phi: "Dùng thử 14 ngày",
  gia_thanh: "Từ 81 EUR/tháng (Cinema 4D)",
  hinh_thuc_mua: "Thuê bao tháng · gói Maxon One",
  link_tai: "https://www.maxon.net/en/try",
  tac_pham_tren_cins: null,
  nguoi_dung_cins: null,
};

const SQL = `
UPDATE article_bai_viet
SET
  tieu_de = 'Cinema 4D',
  tieu_de_viet = 'Phần mềm 3D & MoGraph',
  tom_tat = 'Phần mềm mô hình 3D, hoạt hình, MoGraph và render mạnh mẽ của Maxon — phổ biến trong motion design, broadcast và VFX.',
  noi_dung = $body$${NOi_DUNG}$body$,
  main_video = 'https://youtu.be/wW7Tz5V5-Vs',
  meta = $meta$${JSON.stringify(META)}$meta$::jsonb,
  meta_title = 'Cinema 4D là gì? MoGraph, giá & workflow cho người mới | CINs',
  meta_description = 'Cinema 4D (Maxon): phần mềm 3D, MoGraph và Redshift cho motion design, broadcast và VFX. Nền tảng, giá thuê bao, tích hợp After Effects và ai nên học.',
  trang_thai_noi_dung = 'published',
  cap_nhat_luc = now()
WHERE slug = 'cinema-4d'
  AND loai_bai_viet = 'phan_mem';

SELECT
  slug,
  tieu_de,
  length(noi_dung) AS noi_dung_len,
  main_video,
  meta->>'nha_phat_hanh' AS nha_phat_hanh,
  meta->>'version' AS version,
  meta->>'gia_thanh' AS gia_thanh,
  cap_nhat_luc
FROM article_bai_viet
WHERE slug = 'cinema-4d';
`;

console.log("Running Cinema 4D content SQL (mode: full)…\n");

const result = await runAdminSql(SQL, "full");
console.log(JSON.stringify(result, null, 2));
