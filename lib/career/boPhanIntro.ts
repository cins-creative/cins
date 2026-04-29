import { boPhanPipelineTier } from "@/lib/career/groupCareers";

/**
 * Đoạn mở đầu từng section "Bộ phận" trên hub.
 * 1) Khớp chính xác (sau chuẩn hóa) trong `INTRO_BY_BO_PHAN`
 * 2) Nếu nhãn khớp tầng quy trình (cùng logic với sắp xếp section) → `PIPELINE_TIER_INTRO`
 * 3) Câu mặc định
 */

const DEFAULT_INTRO =
  "Các vị trí nhóm theo bộ phận trong ngành sáng tạo thị giác — môi trường làm việc studio, game, phim hoặc đại học. Chọn một nghề để xem mô tả, kỹ năng và lộ trình gợi ý trên CINs.";

const INTRO_KHAC =
  "Các vị trí chưa được gán nhóm bộ phận đầy đủ trong CSDL; danh sách vẫn hiển thị để bạn khám phá. Mở từng nghề để đọc chi tiết và định hướng phát triển.";

/** Khớp `BO_PHAN_PIPELINE` trong groupCareers.ts — intro tiếng Việt theo từng giai đoạn sản xuất */
const PIPELINE_TIER_INTRO: readonly string[] = [
  "Hoạch định, ngân sách, phân công nguồn lực và chịu trách nhiệm với tiến độ sản phẩm. Các vị trí ở đây tập trung ra quyết định tổng thể, phối hợp bộ phận, đối tác và rủi ro dự án sáng tạo.",
  "Giai đoạn hình thành ý tưởng và tài liệu nền: câu chuyện, thị giác, phong cách. Công việc tạo nền tảng rõ ràng trước khi sản xuất triển khai hàng loạt về nghệ thuật và chuyển động.",
  "Lõi sản xuất: tạo tài sản, chuyển động, ánh sáng và hiệu ứng theo thiết kế đã chốt. Các nghề dưới đây thường làm việc theo pipeline, iteration và phối hợp chặt với nghệ sĩ khác trên cùng shot hoặc cùng level.",
  "Hoàn thiện sau khi có bản thô: dựng, hợp thành, màu, âm thanh — đưa mọi thứ về một nhịp và chất lượng phát hành. Nhấn mạnh chỉnh sửa, thống nhất thị giác và chuẩn kỹ thuật đầu ra.",
  "Nền tảng cho đội sáng tạo: pipeline, công cụ, tự động hóa, shader và hạ tầng nội dung. Giảm ma sát kỹ thuật giữa các bước để dự án lặp nhanh và ổn định khi quy mô tăng.",
  "Kiểm thử, duyệt chất lượng và phản hồi vòng lặp trước khi giao sản phẩm. Kết nối tiêu chí nghiệp vụ với trải nghiệm người dùng thực tế và rủi ro hồi quy.",
  "Đưa sản phẩm sáng tạo đến đúng khán giả: thông điệp, cộng đồng, thương hiệu. Các vai trò ở đây cần hiểu cả nội dung và kênh để tối ưu tiếp cận và giữ giọng điệu nhất quán.",
  "Chia sẻ nghề, giảng dạy và định hướng lộ trình cho người mới. Kết hợp thực hành ngành với phương pháp để người học có nền tảng kỹ năng và tư duy nghề nghiệp bền vững.",
];

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .trim();
}

function lookupKeys(raw: string): string[] {
  const n = normalizeKey(raw);
  const noPrefix = n.replace(/^bo\s+phan\s+/u, "").trim();
  return noPrefix && noPrefix !== n ? [n, noPrefix] : [n];
}

/**
 * Khóa = `normalizeKey(bo_phan)` từ DB. Thêm dòng mới khi có nhãn bộ phận cố định/
 * Tham khảo thêm tầng pipeline để giảm trùng lặp copy.
 */
const INTRO_BY_BO_PHAN: Record<string, string> = {
  // —— Quản lý & điều hành ——
  "quan ly":
    "Hoạch định chiến lược nhóm sáng tạo, phân bổ ngân sách và theo dõi KPI dự án. Thường phối hợp producer, lead và đối tác để đảm bảo sản phẩm đúng phạm vi, thời hạn và chất lượng mong đợi.",
  "dieu hanh":
    "Điều phối vận hành hằng ngày giữa các bộ phận: lịch trình, họp dàn dựng, xử lý nút thắt nguồn lực. Trọng tâm là thông suốt thông tin và giữ nhịp làm việc chung thống nhất.",
  "management":
    "Khung quản trị phù hợp studio / agency: cấu trúc nhóm, quy trình phê duyệt và phân quyền. Các vị trí gắn với trách nhiệm pháp lý nhẹ và đại diện đội ngũ trước ban giám đốc.",
  "executive":
    "Tầng điều hành cấp cao: định hướng danh mục dự án, đầu tư và đối ngoại chiến lược. Ít can thiệp chi tiết nghệ thuật nhưng chịu trách nhiệm cuối với kết quả kinh doanh và uy tín thương hiệu.",
  "leadership":
    "Dẫn dắt văn hóa làm việc, mentoring và quyết định tuyển dụng then chốt. Kết hợp tầm nhìn nghề nghiệp với an toàn tâm lý nhóm trong chu kỳ crunch hoặc đổi hướng sản phẩm.",
  "nhan su":
    "Tuyển dụng, phát triển và giữ chân nhân tài sáng tạo: JD thực tế, lộ trình thăng tiến và chính sách phúc lợi phù hợp ngành thị giác và làm việc linh hoạt.",
  "human resources":
    "Hoạch định nhân sự cho đội nội dung và kỹ thuật: hợp đồng, làm việc từ xa, tuân thủ và xử lý xung đột — giữ khung pháp lý cho studio hoạt động minh bạch.",
  "executive producer":
    "Giữ vision kinh phí và đối tác: gọi vốn hoặc duyệt ngân sách, ký kết hợp đồng lớn và can thiệp khi rủi ro phát hành hoặc trễ tiến độ ảnh hưởng toàn bộ sản xuất.",
  "line producer":
    "Biến kịch bản / game design thành lịch trình chi tiết: shoot days, milestone asset và chi phí thực hiện. Cầu nối giữa đạo diễn sáng tạo và thực tế ngân sách hàng ngày.",
  "studio head":
    "Đứng đầu studio về mặt vận hành và văn hóa: quyết định công cụ, quy mô đội và hướng phát triển dài hạn; đại diện studio với nhà đầu tư và IP chủ sở hữu.",
  "head of production":
    "Giám sát toàn bộ dây chuyền sản xuất nội dung: chuẩn pipeline, phân bổ workload giữa các lead và giải quyết xung đột ưu tiên giữa các dự án song song.",
  "production manager":
    "Theo dõi timeline và deliverable cụ thể: báo cáo trạng thái shot, asset version và dependency giữa các bộ phận — tránh lệch nhịp giữa tiền kỳ và hậu kỳ.",
  "project manager":
    "Quản lý phạm vi, rủi ro và giao tiếp stakeholder cho một dự án cụ thể (game build, mùa phim…). Dùng công cụ Agile / Kanban phù hợp với đặc thù sản xuất sáng tạo.",
  "producer":
    "Chịu trách nhiệm sản phẩm ra đúng thời điểm và trong ngân sách: đồng bộ nghệ sĩ, kỹ thuật và marketing; thường là người ra quyết định đánh đổi khi thời gian, chất lượng và phạm vi xung đột.",
  "product owner":
    "Ưu tiên backlog và chấp nhận deliverable theo giá trị người chơi / người xem: cân bằng yêu cầu thiết kế, kỹ thuật và kinh doanh trong chu kỳ phát triển lặp.",

  // —— Tiền sản xuất / concept / kịch bản ——
  "tien san xuat":
    "Tổng hợp mọi hoạt động trước khi roll máy hoặc khóa pipeline asset: research, styleframe, animatic và bản kế hoạch rủi ro — giảm chỉnh sửa tốn kém ở giai đoạn sau.",
  "tien ky":
    "Synonym tiền kỳ trong tiếng Việt: nhấn mạnh lịch trình nền và thử nghiệm ý tưởng sớm trước khi cam kết số lượng lớn nhân lực sản xuất.",
  "pre-production":
    "Thuật ngữ quốc tế cho giai đoạn chuẩn bị: bible dự án, casting voice, look dev và proof-of-concept kỹ thuật — xác nhận khả thi trước khi scale.",
  "preproduction":
    "Phiên bản gộp chữ; cùng nội dung với pre-production: lock creative direction và technical feasibility trước mass production.",
  "storyboard":
    "Dựng cảnh bằng khung hình tuần tự: thể hiện timing, camera và cảm xúc để đạo diễn và toàn đội thống nhất ngôn ngữ hình trước khi hoạt hình hay quay.",
  "kich ban":
    "Xây dựng cấu trúc câu chuyện, đối thoại và beat — cho phim, series hoặc narrative game. Cân nhắc giới hạn sản xuất và độ dài thể hiện trên màn ảnh.",
  "screenplay":
    "Định dạng kịch bản chuẩn ngành phim: slug line, action line và dialogue ổn định để AD và producer breakdown được đạo cụ, địa điểm và lịch quay.",
  "writer":
    "Sáng tạo nội dung text và world-building: từ lore đến quest text — cần đồng bộ với art direction và gameplay để trải nghiệm nhất quán.",
  "concept art":
    "Thử phương án thị giác nhanh: nhân vật, prop, môi trường và mood — giúp team chọn hướng trước khi đầu tư modeling hoặc matte chi tiết.",
  "character concept":
    "Thiết kế silhouette, palette và sheet biểu cảm cho nhân vật — làm mốc cho model, rig và hoạt hình; thường lặp qua phản hồi đạo diễn và story.",
  "environment concept":
    "Thiết kế không gian, kiến trúc và ánh sáng tổng thể cho thế giới câu chuyện — cân bằng đọc hình, gameplay flow và hiệu năng level.",
  "worldbuilding":
    "Xây dựng luật lệ, lịch sử và văn hóa fiktion — hỗ trợ nhất quán giữa kịch bản, concept và marketing transmedia.",
  "development art":
    "Art phục vụ prototype và pitch: nhanh, linh hoạt, chấp nhận thải bỏ — mục tiêu là thuyết phục nhà sản xuất hoặc nhà phát hành.",
  "visual development":
    "Định hình ngôn ngữ hình liên tục qua các milestone: từ mood đến style guide cuối — là cầu nối giữa đạo diễn nghệ thuật và đội sản xuất.",
  "art direction":
    "Giữ một nhất quán thẩm mỹ xuyên suốt dự án: palette, typography và rules shot — phối hợp các artist để không lệch tone giữa các sequence.",
  "creative direction":
    "Đặt vision sáng tạo tổng thể: thông điệp, đối tượng và differentiation — quyết định khi có xung đột giữa các phương án nghệ thuật song song.",

  // —— Sản xuất ——
  "san xuat":
    "Khối lượng công việc chính tạo ra nội dung nhìn thấy được: từ asset đến render trong khung thời gian sprint hoặc shoot schedule đã phê duyệt.",
  "production":
    "Thuật ngữ tiếng Anh cho giai đoạn thực thi: iteration nhanh, review định kỳ và handoff rõ ràng giữa các discipline trong pipeline.",
  "animation":
    "Tạo illusion chuyển động có chủ đích: pose-to-pose hoặc straight ahead — chú trọng timing, spacing và diễn xuất phù hợp đạo diễn và rig hiện có.",
  "animator":
    "Chuyên sâu diễn xuất nhân vật hoặc creature: làm việc với reference, feedback shot và polish curve để shot đọc rõ trên màn hình đích.",
  "modeling":
    "Dựng hình 3D hoặc high-poly sculpt phục vụ film / game — topology sạch, UV hợp lý và tuân style định hướng để rigging và lighting không phải sửa đường quay.",
  "modelling":
    "Phiên bản chính tả UK; cùng nội dung khối modeling — quan tâm silhouette đọc được và LOD cho realtime.",
  "rigging":
    "Xây khung xương, skin weight và control rig — cân bằng giữa khả năng biểu cảm và hiệu năng runtime hoặc render farm.",
  "lighting artist":
    "Kiểm soát mood và đạo diễn bằng ánh sáng: key/fill/rim, GI và volumetrics — phối hợp compositing để shot không bị flat hoặc burned.",
  "texturing":
    "Tạo bề mặt và chi tiết vi mô: PBR maps, wear và storytelling qua dirt — gắn chặt với concept và shot lighting.",
  "layout":
    "Dựng blocking camera, staging và scale trong scene — giảm chỉnh sửa sau khi animation đã polish.",
  "effects artist":
    "Hiệu ứng pyro, fluid, debris và destruction — cần hiểu pipeline cache và compositing để tích hợp không làm vỡ timing shot.",
  "simulation":
    "Cloth, hair, crowd và rigid body — thường phụ thuộc cache nặng và iteration song song với lighting.",
  "character animation":
    "Hoạt nhân vật có dialogue và performance shot — đồng bộ với audio đạo diễn và continuity giữa các cut.",
  "3d artist":
    "Vai trò tổng hợp asset 3D end-to-end trong nhóm nhỏ: từ blockout đến polish — linh hoạt giữa modeling, UV và look dev.",
  "2d artist":
    "Illustration, matte paint hoặc frame-by-frame 2D — phù hợp style-driven project và pipeline hybrid 2D/3D.",

  // —— Hậu kỳ ——
  "hau ky":
    "Giai đoạn ghép toàn bộ thành phẩm: hình, âm thanh và phụ đề — đảm bảo chuẩn phát sóng hoặc master file giao nhà phát hành.",
  "compositing":
    "Hợp nhất layer render, matte và CG — xử lý edge, grain matching và depth để shot liền mạch với plate thực.",
  "editing":
    "Cắt dựng nhịp và cấu trúc cảm xúc: pacing, sound bridge và continuity — phối hợp đạo diễn trong các phiên bản fine cut.",
  "color grading":
    "Định look cuối trên timeline: LUT, selective grade và HDR — thống nhất giữa các shot và giữ intent đạo diễn nhiếp ảnh.",
  "sound design":
    "Thiết kế âm thanh trường, Foley và spatial mix — hỗ trợ kể chuyện mà không lấn narrative visual.",
  "mastering":
    "Chuẩn hóa loudness, format và metadata cho phát hành đa nền — kiểm tra QC âm thanh cuối.",
  "finishing":
    "Hoàn tất deliverable broadcast / DCP / platform-spec — bao gồm legal bright, subtitle burn và kiểm tra kỹ thuật đầu ra.",
  "online edit":
    "Phiên bản online / conform cuối: đồng bộ độ phân giải, frame rate và layer VFX sau offline edit.",

  // —— Kỹ thuật ——
  "ky thuat":
    "Vai trò kỹ thuật chung: giải quyết bottleneck render, plugin và workflow — giữ đội nghệ thuật không bị chặn bởi hạ tầng.",
  "technical director":
    "Chịu trách nhiệm stack artist-facing: chọn renderer, shader core và quy ước đặt tên — cân bằng chất lượng và thời gian build farm.",
  "pipeline":
    "Tự động hóa ingest, publish và versioning asset — kết nối DCC, version control và review tool.",
  "tools":
    "Phát triển script và plugin nội bộ cho Maya / Houdini / Unreal — giảm thao tác lặp và lỗi con người.",
  "tooling":
    "Đồng nghĩa tools — nhấn mạnh build CI cho plugin và doc nội bộ để artist onboard nhanh.",
  "td":
    "Technical director / technical developer lai — xử lý shot-specific rigging hoặc procedural khi pipeline chung chưa đủ.",
  "r&d":
    "Nghiên cứu shader, simulation hoặc realtime tech demo — đầu tư dài hạn cho khả năng cạnh tranh kỹ thuật của studio.",
  "engineering":
    "Phần mềm gameplay hoặc backend phục vụ live service — gần với production nhưng trọng tâm code và độ ổn định.",
  "shader":
    "Viết shader HLSL / GLSL / node graph — tối ưu cho platform đích và art direction PBR hoặc stylized.",
  "programming":
    "Gameplay, tooling hoặc pipeline scripting — cần hiểu ràng buộc nghệ thuật và performance budget.",
  "developer":
    "Vai trò phát triển phần mềm trong ngữ cảnh studio — có thể engine, web tool hoặc mobile companion app.",

  // —— QA ——
  "qa":
    "Kiểm thử chức năng, regression và soak test — log bug có tái hiện rõ, severity và build version.",
  "quality assurance":
    "Khung QA formal hơn: test plan, coverage matrix và sign-off gate trước milestone gold.",
  "testing":
    "Kiểm tra exploratory và usability — đặc biệt quan trọng với UX/UI và narrative branching.",
  "dam bao chat luong":
    "QA tiếng Việt đầy đủ: đảm bảo tiêu chí nghiệp vụ và kinh nghiệm người dùng trước release.",

  // —— Marketing & cộng đồng ——
  "marketing":
    "Chiến lược go-to-market: trailer beat, USP và calendar — phối hợp creative và paid media.",
  "community":
    "Quản lý fan, moderator và UGC — giữ không gian đối thoại lành mạnh và feedback có cấu trúc cho đội sản xuất.",
  "brand":
    "Identity và guideline đa kênh — đảm bảo mọi touchpoint đồng bộ với positioning dài hạn.",
  "growth":
    "Tối ưu funnel acquisition và retention — đo lường cohort và experiment có kiểm soát.",

  // —— Giáo dục ——
  "education":
    "Thiết kế chương trình và học phần — cân bằng lý thuyết ngành và portfolio outcome.",
  "training":
    "Đào tạo nội bộ hoặc workshop ngắn — skill drill và best practice pipeline cụ thể.",
  "instructor":
    "Giảng viên thực hành: demo, critique và rubric — giúp học viên có khả năng tái tạo quy trình studio.",
  "dao tao":
    "Hoạt động đào tạo tiếng Việt tổng quát: định hướng nghề và kết nối doanh nghiệp cho học viên.",
};

/**
 * Trả về đoạn intro cho section theo nhãn `bo_phan` đồng nhất giữa các nghề trong nhóm.
 */
export function introForBoPhan(boPhan: string): string {
  if (boPhan === "Khác") return INTRO_KHAC;

  for (const key of lookupKeys(boPhan)) {
    const hit = INTRO_BY_BO_PHAN[key];
    if (hit) return hit;
  }

  const tier = boPhanPipelineTier(boPhan);
  if (tier !== null && PIPELINE_TIER_INTRO[tier]) {
    return PIPELINE_TIER_INTRO[tier];
  }

  return DEFAULT_INTRO;
}

export { DEFAULT_INTRO, INTRO_KHAC };
