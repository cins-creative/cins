import { config } from "dotenv";

config({ path: ".env.local" });

const { runAdminSql } = await import("../lib/admin/sql-runner");

type Item = {
  id: string;
  tieu_de: string;
  tieu_de_viet: string;
  tom_tat: string;
  meta_title: string;
  meta_description: string;
  meta: Record<string, unknown>;
  noi_dung: string;
};

function imgSingle(kw: string, caption: string) {
  return `<motion class="arc-image-block arc-image-single"><motion class="arc-image-placeholder"><span class="arc-img-hint-label">Gợi ý tìm ảnh</span><span class="arc-img-hint-kw">"${kw}"</span></motion><p class="arc-image-caption">${caption}</p></motion>`;
}

function imgGrid2(kw1: string, c1: string, kw2: string, c2: string) {
  return `<motion class="arc-image-block arc-image-grid-2"><motion><motion class="arc-image-placeholder"><span class="arc-img-hint-label">Gợi ý tìm ảnh</span><span class="arc-img-hint-kw">"${kw1}"</span></motion><p class="arc-image-caption">${c1}</p></motion><motion><motion class="arc-image-placeholder"><span class="arc-img-hint-label">Gợi ý tìm ảnh</span><span class="arc-img-hint-kw">"${kw2}"</span></motion><p class="arc-image-caption">${c2}</p></motion></motion>`;
}

function pathSteps(steps: { title: string; body: string }[]) {
  return `<motion class="arc-path">${steps
    .map(
      (s, i) =>
        `<motion class="arc-path-step"><motion class="arc-step-num">${i + 1}</motion><motion class="arc-step-body"><strong>${s.title}</strong><p>${s.body}</p></motion></motion>`,
    )
    .join("")}</motion>`;
}

const ITEMS: Item[] = [
  {
    id: "838dc72d-d4a5-46a9-b2ea-e95dcfd8d98d",
    tieu_de: "3DEqualizer",
    tieu_de_viet: "3DEqualizer — Camera tracking &amp; matchmove VFX",
    tom_tat:
      "Phần mềm matchmove và camera tracking 3D chuyên nghiệp, dùng gắn CG vào footage thật trong pipeline VFX điện ảnh.",
    meta_title: "3DEqualizer là gì? Matchmove, giá và hướng dẫn học | CINS",
    meta_description:
      "3DEqualizer: camera tracking VFX — matchmove, lens distortion, xuất sang Maya/Nuke. So sánh SynthEyes và lộ trình học cho người mới.",
    meta: {
      nha_phat_hanh: "Science-D-Visions",
      version: "2024",
      platform: ["Windows", "Linux"],
      website: "https://www.3dequalizer.com",
      goi_mien_phi: "Bản demo giới hạn",
      gia_thanh: "Liên hệ bản quyền studio",
      hinh_thuc_mua: "Mua một lần · bản quyền studio",
      link_tai: "https://www.3dequalizer.com",
    },
    noi_dung: `<section class="arc-intro"><p>Khi con rồng CG bay qua đại lộ thật trong phim, phía sau thường có bước <strong>matchmove</strong>. 3DEqualizer là công cụ tiêu chuẩn ngành cho camera tracking — gắn CG khớp từng khung hình với cảnh quay thực.</p><p>Studio chọn 3DEqualizer khi cần độ chính xác cao: lens distortion, nhiều marker, xuất camera sang Maya, Nuke, Houdini.</p></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">01</span>3DEqualizer là gì?</h2><p>Do Science-D-Visions phát triển — <strong>camera tracking 3D</strong> và object tracking cho VFX. Chạy Windows/Linux, dùng trong studio phim và quảng cáo cao cấp.</p><ul class="arc-list"><li><strong>Automatic tracking</strong> — nhận feature point và giải camera</li><li><strong>Lens distortion</strong> — hiệu chỉnh méo ống kính</li><li><strong>Object tracking</strong> — track vật thể riêng trong scene</li><li><strong>Export pipeline</strong> — xuất sang DCC/VFX host</li></ul>${imgSingle("3DEqualizer interface tracking workspace screenshot", "Giao diện 3DEqualizer — viewport 3D và track point trên footage.")}<motion class="arc-infobox"><span class="arc-infobox-label">Vị trí trong quy trình sản xuất</span><p>Giai đoạn <strong>VFX prep</strong>: nhận plate từ set, xuất camera sang Maya/Houdini/Nuke để layout và compositing.</p></motion></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">02</span>Tính năng cốt lõi</h2><motion class="arc-job-item"><h3 class="arc-h3">1. Camera solve</h3><p>Import footage → track → solve camera → kiểm tra reprojection error. Độ chính xác quyết định CG có dính cảnh thật.</p>${imgSingle("3DEqualizer camera solve reprojection viewport", "Kiểm tra solve — track point khớp footage.")}</motion><motion class="arc-job-item"><h3 class="arc-h3">2. Lens distortion &amp; export</h3><p>Model méo ống kính trước solve; xuất .3de hoặc script sang pipeline studio.</p>${imgSingle("3DEqualizer lens distortion undistort grid", "Lưới distortion — hiệu chỉnh méo trước tracking.")}</motion></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">03</span>So sánh với phần mềm tương tự</h2><p>3DEqualizer cạnh tranh với SynthEyes và PFTrack trong matchmove.</p><motion class="arc-job-item"><h3 class="arc-h3">3DEqualizer vs SynthEyes</h3>${imgGrid2("3DEqualizer VFX tracking interface", "3DEqualizer — shot phức tạp, lens model chi tiết.", "SynthEyes matchmove interface", "SynthEyes — setup nhanh, phổ biến indie.")}<motion class="arc-infobox"><span class="arc-infobox-label">Điểm mạnh và yếu so sánh</span><p><strong>3DEqualizer mạnh hơn:</strong> lens distortion nâng cao, pipeline AAA<br><strong>SynthEyes mạnh hơn:</strong> tốc độ, chi phí thấp<br><strong>Chọn 3DEqualizer khi:</strong> vào studio VFX làm matchmove chuyên sâu<br><strong>Chọn SynthEyes khi:</strong> freelance cần tracking nhanh</p></motion></motion></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">04</span>Học 3DEqualizer như thế nào?</h2>${pathSteps([
      {
        title: "Làm quen footage và marker",
        body: "Import clip ngắn, auto-track và manual point — 1–2 tuần.",
      },
      {
        title: "Camera solve cơ bản",
        body: "Focal length, sensor size, đọc reprojection error.",
      },
      {
        title: "Lens distortion &amp; object track",
        body: "Undistort GoPro/lens rộng; track vật thể trong cảnh.",
      },
      {
        title: "Export sang Maya / Nuke",
        body: "Xuất camera, import DCC — nắm luồng studio thực tế.",
      },
      {
        title: "Xây dựng portfolio thực tế",
        body: "1–2 shot matchmove + breakdown. Đăng ArtStation/Vimeo — vai trò Matchmove Artist.",
      },
    ])}</section>`,
  },
  {
    id: "aae48218-824b-42c5-b1e9-2ce1a8cae6fc",
    tieu_de: "3ds max",
    tieu_de_viet: "3ds Max — Mô hình 3D &amp; dựng hình kiến trúc",
    tom_tat:
      "Phần mềm 3D của Autodesk cho modeling, hoạt hình, dựng hình và visualization — phổ biến trong kiến trúc, nội thất và game.",
    meta_title: "3ds Max là gì? Tính năng, giá và hướng dẫn học | CINS",
    meta_description:
      "3ds Max (Autodesk): modeling 3D, V-Ray/Corona render, kiến trúc và game. So sánh Blender, Maya và lộ trình học cho người mới.",
    meta: {
      nha_phat_hanh: "Autodesk",
      version: "2025",
      platform: ["Windows"],
      website: "https://www.autodesk.com/products/3ds-max",
      goi_mien_phi: "Dùng thử 30 ngày",
      gia_thanh: "Thuê bao Autodesk (~280 USD/tháng hoặc gói năm)",
      hinh_thuc_mua: "Thuê bao tháng · Autodesk",
      link_tai: "https://www.autodesk.com/products/3ds-max/free-trial",
    },
    noi_dung: `<section class="arc-intro"><p>Walkthrough căn hộ mẫu xoay 360°, cảnh game low-poly, hay visualization tòa nhà trước khi khởi công — nhiều studio Việt Nam vẫn dùng <strong>3ds Max</strong> làm công cụ chính.</p><p>Max mạnh ở modeling modifier stack, render kiến trúc (V-Ray, Corona) và plugin ecosystem lâu đời — khác Blender miễn phí hay Maya thiên phim/game AAA.</p></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">01</span>3ds Max là gì?</h2><p>Autodesk 3ds Max — DCC 3D trên Windows, ra đời từ thập niên 1990, dùng rộng rãi cho <strong>archviz</strong>, nội thất, game asset và motion đơn giản.</p><ul class="arc-list"><li><strong>Editable Poly / modifiers</strong> — modeling không phá hủy linh hoạt</li><li><strong>Animation &amp; rigging cơ bản</strong> — keyframe, character rig entry-level</li><li><strong>Rendering</strong> — Arnold built-in; V-Ray, Corona phổ biến</li><li><strong>Script MAXScript</strong> — tự động hóa quy trình studio</li></ul>${imgSingle("3ds Max interface viewport modeling 2024 screenshot", "Giao diện 3ds Max — viewport và modifier stack.")}<motion class="arc-infobox"><span class="arc-infobox-label">Vị trí trong quy trình sản xuất</span><p><strong>Tiền kỳ / sản xuất 3D</strong>: nhận concept/CAD → model &amp; texture → render still/animation → bàn giao client hoặc export sang Unreal/Unity.</p></motion></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">02</span>Tính năng cốt lõi</h2><motion class="arc-job-item"><h3 class="arc-h3">1. Modeling với modifier stack</h3><p>Stack modifier là điểm mạnh — chỉnh sửa lịch sử không phá mesh. Phù hợp kiến trúc và hard-surface.</p>${imgSingle("3ds Max editable poly modifier stack modeling", "Modifier stack — chỉnh model không phá hủy.")}</motion><motion class="arc-job-item"><h3 class="arc-h3">2. Render kiến trúc</h3><p>V-Ray/Corona tích hợp sâu — ánh sáng interior, material PBR, render batch cho dự án bất động sản.</p>${imgSingle("3ds Max V-Ray interior archviz render", "Render nội thất — ánh sáng và material chân thực.")}</motion></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">03</span>So sánh với phần mềm tương tự</h2><motion class="arc-job-item"><h3 class="arc-h3">3ds Max vs Blender</h3>${imgGrid2("3ds Max archviz interior render", "3ds Max — plugin render kiến trúc mature.", "Blender 3D viewport modeling", "Blender — miễn phí, cộng đồng lớn, đa năng.")}<motion class="arc-infobox"><span class="arc-infobox-label">Điểm mạnh và yếu so sánh</span><p><strong>Max mạnh hơn:</strong> archviz studio VN, MAXScript, plugin V-Ray/Corona legacy<br><strong>Blender mạnh hơn:</strong> miễn phí, sculpt, simulation tích hợp<br><strong>Chọn Max khi:</strong> làm visualization / nội thất thương mại<br><strong>Chọn Blender khi:</strong> học 3D tổng quát, ngân sách zero</p></motion></motion></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">04</span>Học 3ds Max như thế nào?</h2>${pathSteps([
      {
        title: "Giao diện và primitive cơ bản",
        body: "Box, move, rotate, scale — tạo cảnh đơn giản trong 1 tuần.",
      },
      {
        title: "Editable Poly &amp; modifier",
        body: "Extrude, chamfer, turbosmooth — model bàn ghế, phòng đơn giản.",
      },
      {
        title: "Material &amp; ánh sáng",
        body: "Physical material, HDRI, render still nội thất.",
      },
      {
        title: "Animation / export game",
        body: "Keyframe cơ bản hoặc export FBX sang engine.",
      },
      {
        title: "Portfolio archviz",
        body: "2–3 still interior/exterior chất lượng — Behance, ArtStation.",
      },
    ])}</section>`,
  },
  {
    id: "76bf32d2-b6bd-4733-87e1-944699ece7fe",
    tieu_de: "Ableton Live",
    tieu_de_viet: "Ableton Live — Sản xuất &amp; biểu diễn nhạc điện tử",
    tom_tat:
      "Phần mềm sáng tác, ghi âm và biểu diễn trực tiếp — nổi tiếng với Session View và workflow sản xuất nhạc điện tử.",
    meta_title: "Ableton Live là gì? Tính năng, giá và hướng dẫn học | CINS",
    meta_description:
      "Ableton Live: sản xuất nhạc điện tử, Session View, biểu diễn live. So sánh FL Studio và lộ trình học cho người mới.",
    meta: {
      nha_phat_hanh: "Ableton",
      version: "12",
      platform: ["Windows", "macOS"],
      website: "https://www.ableton.com",
      goi_mien_phi: "Dùng thử 90 ngày",
      gia_thanh: "Từ 99 EUR (Intro) · 279 EUR (Suite)",
      hinh_thuc_mua: "Mua một lần · bản Intro/Standard/Suite",
      link_tai: "https://www.ableton.com/trial",
    },
    noi_dung: `<section class="arc-intro"><p>Set DJ live chuyển tempo mượt, producer lặp loop để thử ý tưởng beat — <strong>Ableton Live</strong> được thiết kế cho cả hai: sản xuất trong studio và biểu diễn trên sân khấu.</p><p>Session View (lưới clip) là điểm khác biệt lớn so với FL Studio hay Logic — bạn trigger loop như nhạc cụ thật.</p></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">01</span>Ableton Live là gì?</h2><p>Ableton Live (Ableton, Đức) — DAW tập trung <strong>nhạc điện tử</strong>, hip-hop, ambient và live performance. Có bản Intro, Standard, Suite.</p><ul class="arc-list"><li><strong>Session View</strong> — grid clip loop, jam và arrangement linh hoạt</li><li><strong>Arrangement View</strong> — timeline truyền thống xuất bài hoàn chỉnh</li><li><strong>Built-in instruments &amp; effects</strong> — Wavetable, Operator, EQ, compressor</li><li><strong>Link / Max for Live</strong> — đồng bộ tempo, mở rộng plugin (Suite)</li></ul>${imgSingle("Ableton Live Session View interface screenshot 2024", "Session View — lưới clip và mixer.")}<motion class="arc-infobox"><span class="arc-infobox-label">Vị trí trong quy trình sản xuất</span><p><strong>Sản xuất âm nhạc</strong>: sáng tác → mix → master → xuất WAV/MP3. Live performance: laptop + controller → sân khấu/club.</p></motion></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">02</span>Tính năng cốt lõi</h2><motion class="arc-job-item"><h3 class="arc-h3">1. Session View &amp; clip launching</h3><p>Mỗi ô là loop MIDI/audio — bấm launch để thử cấu trúc bài mà không cắt timeline. Producer EDM/DJ dùng hàng ngày.</p>${imgSingle("Ableton Live clip launching session grid", "Launch clip — thử arrangement theo thời gian thực.")}</motion><motion class="arc-job-item"><h3 class="arc-h3">2. Instruments &amp; audio effects</h3><p>Wavetable synth, Drum Rack, sampler — kết hợp EQ Eight, Glue Compressor cho mix nhanh.</p>${imgSingle("Ableton Live Wavetable synth device", "Wavetable — synth built-in phổ biến.")}</motion></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">03</span>So sánh với phần mềm tương tự</h2><motion class="arc-job-item"><h3 class="arc-h3">Ableton Live vs FL Studio</h3>${imgGrid2("Ableton Live Session View performance", "Live — biểu diễn clip, workflow live mạnh.", "FL Studio playlist piano roll", "FL Studio — piano roll và pattern nhanh cho beat.")}<motion class="arc-infobox"><span class="arc-infobox-label">Điểm mạnh và yếu so sánh</span><p><strong>Live mạnh hơn:</strong> live performance, Session View, tích hợp controller<br><strong>FL Studio mạnh hơn:</strong> giá thấp hơn, piano roll trực quan cho beat maker<br><strong>Chọn Live khi:</strong> DJ/producer biểu diễn live, nhạc điện tử<br><strong>Chọn FL khi:</strong> làm beat hip-hop/trap, ngân sách học sinh</p></motion></motion></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">04</span>Học Ableton Live như thế nào?</h2>${pathSteps([
      {
        title: "Session View &amp; drum loop đầu tiên",
        body: "Tạo Drum Rack, loop 4 ô — làm beat 8 bar trong vài ngày.",
      },
      {
        title: "MIDI &amp; synth cơ bản",
        body: "Vẽ note, dùng Wavetable/Operator — melody đơn giản.",
      },
      {
        title: "Arrangement &amp; mix",
        body: "Record từ Session sang Arrangement; EQ, compression cơ bản.",
      },
      {
        title: "Controller &amp; live set",
        body: "Map Launchpad/APC — trigger clip như mini performance.",
      },
      {
        title: "Portfolio âm nhạc",
        body: "2–3 track trên SoundCloud/Spotify; ghi rõ «produced in Ableton Live».",
      },
    ])}</section>`,
  },
  {
    id: "03a18e77-12c7-4487-84c5-b62ee1068071",
    tieu_de: "Adobe Animate",
    tieu_de_viet: "Adobe Animate — Hoạt hình 2D &amp; nội dung tương tác",
    tom_tat:
      "Phần mềm hoạt hình 2D và nội dung tương tác của Adobe — banner web, game 2D nhẹ, hoạt hình vector cho video.",
    meta_title: "Adobe Animate là gì? Tính năng, giá và hướng dẫn học | CINS",
    meta_description:
      "Adobe Animate: hoạt hình 2D vector, HTML5 Canvas, bone rig. So sánh Toon Boom Harmony và lộ trình học cho người mới.",
    meta: {
      nha_phat_hanh: "Adobe",
      version: "2024",
      platform: ["Windows", "macOS"],
      website: "https://www.adobe.com/products/animate.html",
      goi_mien_phi: "Dùng thử 7 ngày",
      gia_thanh: "Từ ~22 USD/tháng (Creative Cloud)",
      hinh_thuc_mua: "Thuê bao tháng · Creative Cloud",
      link_tai: "https://www.adobe.com/products/animate.html",
    },
    noi_dung: `<section class="arc-intro"><p>Banner web có nhân vật nhún nhảy, hoạt hình vector trên YouTube, game 2D chạy trình duyệt — nhiều dự án đó được làm bằng <strong>Adobe Animate</strong> (kế thừa Flash Professional).</p><p>Animate mạnh vector timeline và xuất HTML5 Canvas/WebGL — khác After Effects (compositing) hay Toon Boom (hoạt hình TV dài).</p></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">01</span>Adobe Animate là gì?</h2><p>Adobe Animate — hoạt hình <strong>2D vector</strong>, banner quảng cáo, e-learning và game 2D nhẹ. Thuộc Creative Cloud, chạy Windows/macOS.</p><ul class="arc-list"><li><strong>Timeline &amp; tween</strong> — classic, motion, shape tween</li><li><strong>Asset warp / bone tool</strong> — rig nhân vật 2D đơn giản</li><li><strong>Export đa nền tảng</strong> — HTML5 Canvas, WebGL, video</li><li><strong>Integration CC</strong> — Illustrator, After Effects</li></ul>${imgSingle("Adobe Animate timeline interface vector character 2024", "Timeline Animate — layer và keyframe vector.")}<motion class="arc-infobox"><span class="arc-infobox-label">Vị trí trong quy trình sản xuất</span><p><strong>Sản xuất 2D</strong>: thiết kế vector (Illustrator) → animate → xuất video cho social hoặc HTML5 cho web/game nhẹ.</p></motion></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">02</span>Tính năng cốt lõi</h2><motion class="arc-job-item"><h3 class="arc-h3">1. Vector animation &amp; tween</h3><p>Vẽ hoặc import SVG — tween chuyển động mà không vẽ từng frame. Phù hợp motion ngắn, UI animation.</p>${imgSingle("Adobe Animate motion tween character walk cycle", "Motion tween — nhân vật di chuyển trên timeline.")}</motion><motion class="arc-job-item"><h3 class="arc-h3">2. Bone rig &amp; interactive</h3><p>Armature cho nhân vật; ActionScript/JavaScript cho banner tương tác và game simple.</p>${imgSingle("Adobe Animate bone rig armature character", "Bone tool — rig tay chân nhân vật 2D.")}</motion></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">03</span>So sánh với phần mềm tương tự</h2><motion class="arc-job-item"><h3 class="arc-h3">Adobe Animate vs Toon Boom Harmony</h3>${imgGrid2("Adobe Animate HTML5 banner animation", "Animate — web banner, vector nhanh.", "Toon Boom Harmony TV animation interface", "Harmony — hoạt hình TV/series, pipeline studio.")}<motion class="arc-infobox"><span class="arc-infobox-label">Điểm mạnh và yếu so sánh</span><p><strong>Animate mạnh hơn:</strong> web/HTML5, CC ecosystem, banner/game nhẹ<br><strong>Harmony mạnh hơn:</strong> hoạt hình series, cut-out TV chuyên nghiệp<br><strong>Chọn Animate khi:</strong> motion 2D web, social, học sinh có CC<br><strong>Chọn Harmony khi:</strong> hướng animator phim hoạt hình TV</p></motion></motion></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">04</span>Học Adobe Animate như thế nào?</h2>${pathSteps([
      {
        title: "Timeline &amp; shape cơ bản",
        body: "Vẽ hình, keyframe position — bouncing ball trong 3–5 ngày.",
      },
      {
        title: "Symbol &amp; motion tween",
        body: "Graphic symbol, walk cycle đơn giản.",
      },
      {
        title: "Bone rig nhân vật",
        body: "Armature 4 chi — dialogue loop ngắn.",
      },
      {
        title: "Xuất video &amp; HTML5",
        body: "MP4 cho Reels; Canvas cho landing page.",
      },
      {
        title: "Portfolio 2D motion",
        body: "3 clip 10–30s — Behance, showreel YouTube.",
      },
    ])}</section>`,
  },
  {
    id: "d916aa15-69aa-45d3-a543-315002c09839",
    tieu_de: "Adobe Audition",
    tieu_de_viet: "Adobe Audition — Chỉnh sửa &amp; mix âm thanh",
    tom_tat:
      "Phần mềm chỉnh sửa và mix âm thanh chuyên nghiệp của Adobe — podcast, lồng tiếng video, làm sạch noise cho sản xuất đa phương tiện.",
    meta_title: "Adobe Audition là gì? Tính năng, giá và hướng dẫn học | CINS",
    meta_description:
      "Adobe Audition: chỉnh sửa audio, multitrack, podcast, noise reduction. So sánh Reaper và lộ trình học cho người mới.",
    meta: {
      nha_phat_hanh: "Adobe",
      version: "2024",
      platform: ["Windows", "macOS"],
      website: "https://www.adobe.com/products/audition.html",
      goi_mien_phi: "Dùng thử 7 ngày",
      gia_thanh: "Từ ~22 USD/tháng (Creative Cloud)",
      hinh_thuc_mua: "Thuê bao tháng · Creative Cloud",
      link_tai: "https://www.adobe.com/products/audition.html",
    },
    noi_dung: `<section class="arc-intro"><p>Podcast không còn tiếng ồn quạt, dialogue phim rõ từng câu, voice-over quảng cáo sạch sẽ — thường qua bước xử lý trong <strong>Adobe Audition</strong> trước khi đưa vào Premiere Pro.</p><p>Audition là DAW thiên về <strong>chỉnh sửa và repair</strong> hơn là sáng tác nhạc — bổ sung hoàn hảo cho video editor và podcaster.</p></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">01</span>Adobe Audition là gì?</h2><p>Adobe Audition — editor audio đa track, spectral display, noise reduction. Nằm trong Creative Cloud; tích hợp Dynamic Link với Premiere.</p><ul class="arc-list"><li><strong>Waveform &amp; Multitrack</strong> — sửa chi tiết hoặc mix nhiều track</li><li><strong>Noise reduction</strong> — DeNoise, DeReverb, Adaptive Noise</li><li><strong>Essential Sound panel</strong> — preset dialogue, music, SFX</li><li><strong>Batch processing</strong> — xử lý hàng loạt file</li></ul>${imgSingle("Adobe Audition waveform multitrack interface 2024", "Audition — waveform editor và multitrack.")}<motion class="arc-infobox"><span class="arc-infobox-label">Vị trí trong quy trình sản xuất</span><p><strong>Hậu kỳ âm thanh</strong>: thu/ import audio → clean &amp; mix → trả về Premiere hoặc xuất WAV master.</p></motion></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">02</span>Tính năng cốt lõi</h2><motion class="arc-job-item"><h3 class="arc-h3">1. Dialogue cleanup</h3><p>DeNoise, EQ parametric, compress nhẹ — pipeline podcast và interview 90% dùng các bước này.</p>${imgSingle("Adobe Audition spectral frequency display noise reduction", "Spectral view — xóa tiếng click và noise.")}</motion><motion class="arc-job-item"><h3 class="arc-h3">2. Multitrack mix</h3><p>Layer voice, music, SFX — auto-duck music khi có thoại qua Essential Sound.</p>${imgSingle("Adobe Audition multitrack mix podcast", "Multitrack — mix podcast voice và nhạc nền.")}</motion></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">03</span>So sánh với phần mềm tương tự</h2><motion class="arc-job-item"><h3 class="arc-h3">Adobe Audition vs Reaper</h3>${imgGrid2("Adobe Audition Essential Sound panel", "Audition — preset dialogue, tích hợp Premiere.", "Reaper DAW multitrack interface", "Reaper — giá rẻ, tùy biến sâu, đa năng.")}<motion class="arc-infobox"><span class="arc-infobox-label">Điểm mạnh và yếu so sánh</span><p><strong>Audition mạnh hơn:</strong> repair nhanh, CC + Premiere, Essential Sound<br><strong>Reaper mạnh hơn:</strong> giá một lần thấp, DAW đầy đủ cho nhạc<br><strong>Chọn Audition khi:</strong> video editor, podcaster trong hệ Adobe<br><strong>Chọn Reaper khi:</strong> ngân sách thấp, cần DAW tổng quát</p></motion></motion></section><section class="arc-section"><h2 class="arc-h2"><span class="arc-num">04</span>Học Adobe Audition như thế nào?</h2>${pathSteps([
      {
        title: "Waveform &amp; cắt clip cơ bản",
        body: "Import WAV, cắt silence, normalize — 2–3 ngày.",
      },
      {
        title: "Noise reduction",
        body: "Capture noise print, DeNoise — làm sạch ghi âm phòng.",
      },
      {
        title: "Multitrack &amp; Essential Sound",
        body: "Mix voice + nhạc; tag Dialogue/Music.",
      },
      {
        title: "Tích hợp Premiere",
        body: "Roundtrip Edit in Audition — luồng video thực tế.",
      },
      {
        title: "Portfolio audio",
        body: "1 podcast episode hoặc short film mix — credit «sound edit».",
      },
    ])}</section>`,
  },
];

function fixHtml(html: string) {
  return html.replace(/<\/?motion\b/g, (m) => m.replace("motion", "div"));
}

const results: { tieu_de: string; ok: boolean; len?: number; msg?: string }[] =
  [];

for (const item of ITEMS) {
  const html = fixHtml(item.noi_dung);
  const metaJson = JSON.stringify(item.meta);
  const sql = `
UPDATE article_bai_viet SET
  tieu_de_viet = '${item.tieu_de_viet.replace(/'/g, "''")}',
  tom_tat = '${item.tom_tat.replace(/'/g, "''")}',
  meta = $meta$${metaJson}$meta$::jsonb,
  meta_title = '${item.meta_title.replace(/'/g, "''")}',
  meta_description = '${item.meta_description.replace(/'/g, "''")}',
  trang_thai_noi_dung = 'published',
  cap_nhat_luc = now(),
  noi_dung = $noidung$${html}$noidung$
WHERE id = '${item.id}'
  AND loai_bai_viet = 'phan_mem'
  AND (noi_dung IS NULL OR noi_dung = '');

SELECT slug, tieu_de, trang_thai_noi_dung, LENGTH(noi_dung) AS do_dai
FROM article_bai_viet WHERE id = '${item.id}';
`;

  try {
    const res = await runAdminSql(sql, "full");
    const row = res.rows?.find(
      (r) => r && typeof r === "object" && "do_dai" in r,
    ) as { do_dai?: string; tieu_de?: string } | undefined;
    const parsed =
      row ??
      (res.rows?.[1] as Record<string, string> | undefined);
    const len = parsed?.do_dai
      ? Number(parsed.do_dai)
      : html.length;
    const ok = len > 500;
    results.push({
      tieu_de: item.tieu_de,
      ok,
      len,
      msg: ok ? undefined : "UPDATE không áp dụng hoặc nội dung quá ngắn",
    });
    console.log(ok ? `✓ ${item.tieu_de} — ${len} ký tự` : `✗ ${item.tieu_de}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    results.push({ tieu_de: item.tieu_de, ok: false, msg });
    console.error(`✗ ${item.tieu_de}:`, msg);
  }
}

const remain = await runAdminSql(
  `SELECT COUNT(*) AS con_lai FROM article_bai_viet
   WHERE loai_bai_viet = 'phan_mem' AND (noi_dung IS NULL OR noi_dung = '')`,
  "read",
);
const conLai = remain.rows?.[0]?.con_lai ?? "?";

console.log("\n── Kết quả lần chạy này ──");
for (const r of results) {
  console.log(
    r.ok ? `✓ ${r.tieu_de} — ${r.len} ký tự` : `✗ ${r.tieu_de} — ${r.msg}`,
  );
}
console.log(`\nCòn lại: ${conLai} bài chưa có nội dung.`);
