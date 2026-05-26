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
  noi_dung: string;
};

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

const items: Item[] = [
  // 01. Audio Optimization
  {
    id: "a048d1b9-6601-4e61-911b-bcde7d951ecc",
    tieu_de: "Audio Optimization",
    tieu_de_viet: "Tối ưu âm thanh",
    tom_tat:
      "Audio Optimization là quá trình cân bằng giữa chất lượng âm thanh và hiệu suất hệ thống — quan trọng cho game, phim streaming, app và ứng dụng tương tác trên thiết bị giới hạn tài nguyên.",
    meta_title: "Audio Optimization là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Audio Optimization tối ưu chất lượng âm thanh và hiệu suất hệ thống. Tìm hiểu kỹ thuật nén, sample rate, memory cho game, phim, app và streaming.",
    noi_dung: `
<section class="arc-intro">
  <p>Một game mobile có 5GB asset, trong đó audio chiếm 2GB. Người dùng không tải nổi, uninstall ngay sau khi mở. Hoặc một podcast 1h dày 200MB, nghe trên 3G lag nửa giây mỗi 5 phút. Đây là lúc Audio Optimization quyết định trải nghiệm — không phải chất lượng âm thanh thuần.</p>
  <p>Audio Optimization là kỹ năng then chốt cho sound designer, audio engineer và developer làm việc trên platform giới hạn (mobile, web, VR). Hiểu cách cân bằng chất lượng và performance giúp sản phẩm đến được nhiều người dùng hơn mà vẫn nghe tốt.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Audio Optimization là gì?</h2>
  <p>Audio Optimization là quá trình điều chỉnh các tham số kỹ thuật của audio (sample rate, bit depth, codec, channel count) để đạt được cân bằng tốt nhất giữa chất lượng nghe và hiệu suất hệ thống — bao gồm dung lượng file, RAM khi load, CPU khi decode và bandwidth khi streaming.</p>
  <p>Khác với mixing/mastering (lo về chất lượng nghe), optimization tập trung vào aspect kỹ thuật. Hai khâu bổ sung — mix xong rồi mới optimize cho từng platform target.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">3 trục cân bằng của Audio Optimization</span>
    <p><strong>Quality</strong> (sample rate, bit depth, codec quality) — <strong>Size</strong> (file size, memory footprint) — <strong>Performance</strong> (CPU usage khi decode, latency). Tăng một thường giảm hai cái còn lại. Audio optimizer tìm sweet spot cho từng platform và use case.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Sample Rate</strong> — 44.1kHz cho music, 48kHz cho phim, 22kHz cho voice game mobile</li>
    <li><strong>Bit Depth</strong> — 16-bit cho output cuối, 24-bit cho làm việc</li>
    <li><strong>Codec</strong> — MP3, AAC, Ogg Vorbis, Opus (compressed) vs WAV (uncompressed)</li>
    <li><strong>Channel</strong> — mono (1ch) cho voice, stereo (2ch) cho music</li>
    <li><strong>Streaming vs In-Memory</strong> — file ngắn load vào RAM, dài phải streaming</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"audio optimization codec comparison file size quality"</span>
    </div>
    <p class="arc-image-caption">So sánh codec — WAV uncompressed (lớn), MP3/AAC nén (vừa), Opus (nhỏ + chất lượng cao)</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Kỹ thuật optimization phổ biến</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Chọn codec phù hợp</summary>
      <div class="arc-card-body">
        <p>WAV/PCM: chất lượng tốt nhất nhưng lớn (~10MB/phút stereo 48kHz). MP3/AAC: nén lossy, ~1MB/phút, đủ tốt cho hầu hết use case. Opus: codec hiện đại, chất lượng cao hơn MP3 cùng bitrate, phù hợp voice và music streaming.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tối ưu sample rate</summary>
      <div class="arc-card-body">
        <p>Music: 44.1kHz hoặc 48kHz. Voice: 22kHz đủ (giảm 50% size). SFX nhanh: 32kHz có thể chấp nhận. Đừng over-sample — chất lượng tăng không tương xứng với cost.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mono vs Stereo</summary>
      <div class="arc-card-body">
        <p>Voice/dialogue: mono (giảm 50% size). Music/ambience: stereo. SFX 3D positional: mono (engine sẽ tự pan theo position 3D, stereo không có ý nghĩa).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Streaming vs Load to RAM</summary>
      <div class="arc-card-body">
        <p>Sound &lt;5 giây: load vào RAM, play instant. Music dài, dialogue cutscene: streaming từ disk. Cân bằng RAM (game console giới hạn 4-8GB) và disk I/O.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Channel packing &amp; SoundBank chiến lược</summary>
      <div class="arc-card-body">
        <p>Group sounds cùng level/scene vào một SoundBank, load/unload theo gameplay context. Tránh load toàn bộ audio game lúc start.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Audio Optimization trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Mobile</h3>
    <ul class="arc-list">
      <li>Mobile game thường có hạn 200MB-1GB total package — audio chiếm 30-40% là phổ biến</li>
      <li>Voice 22kHz mono Opus, SFX 32kHz mono AAC, music 44.1kHz stereo Opus</li>
      <li>Test trên thiết bị low-end (RAM 2GB) để đảm bảo không crash</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Console / PC</h3>
    <ul class="arc-list">
      <li>Tài nguyên dồi dào hơn — 44.1/48kHz, 16-bit là chuẩn</li>
      <li>Vẫn cần tối ưu — game AAA có 50-100GB asset, audio quan trọng</li>
      <li>Streaming voice line dài để giảm memory footprint</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Streaming &amp; Podcast</h3>
    <ul class="arc-list">
      <li>Spotify, Apple Podcast preference 128-256 kbps AAC/MP3</li>
      <li>Master loudness -16 LUFS cho streaming consumer</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Web &amp; HTML5</h3>
    <ul class="arc-list">
      <li>Web Audio API hỗ trợ MP3, AAC, Opus tốt nhất hiện nay</li>
      <li>Lazy load — chỉ tải audio khi user tương tác để giảm initial page load</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Quá nén — audio artifact rõ rệt</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> bitrate quá thấp (vd 64 kbps cho music) gây swirling, metallic sound.</p>
        <p><strong>Cách fix:</strong> minimum 128 kbps cho music stereo, 96 kbps cho podcast/voice. Dùng Opus thay MP3 cho cùng quality ở bitrate thấp.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Game crash do RAM overflow</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> load toàn bộ audio vào RAM, không streaming dialogue dài.</p>
        <p><strong>Cách fix:</strong> phân SoundBank theo zone, dialogue dài streaming, music background streaming.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mobile build tải chậm — audio quá lớn</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> dùng WAV uncompressed, sample rate quá cao cho voice mobile.</p>
        <p><strong>Cách fix:</strong> convert sang Opus/AAC, downsample voice 22kHz, dùng mono cho dialogue.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 02. Audio Sync
  {
    id: "68711f3d-a233-489a-af00-ab8be4499f45",
    tieu_de: "Audio Sync",
    tieu_de_viet: "Đồng bộ âm thanh - hình ảnh",
    tom_tat:
      "Audio Sync là kỹ thuật đảm bảo âm thanh khớp chính xác với hình ảnh — từ lip sync diễn viên đến SFX khớp action. Lệch chỉ vài frame đủ phá vỡ trải nghiệm xem.",
    meta_title: "Audio Sync là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Audio Sync đồng bộ âm thanh với hình ảnh trong video. Tìm hiểu kỹ thuật sync, timecode, lip sync và lỗi thường gặp trong sản xuất phim, video.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem một video trên YouTube và nhận thấy môi nhân vật đóng nhưng âm thanh vẫn vang ra — chỉ lệch 100 milisecond thôi nhưng não bộ bạn cảm nhận ngay. Phản ứng đầu tiên: tắt video. Đó là sức mạnh của audio sync — đúng thì vô hình, sai thì phá vỡ trải nghiệm.</p>
  <p>Audio Sync là kỹ năng nền tảng của mọi video editor, sound designer và sản xuất phim. Hiểu kỹ thuật sync giúp tránh được nhiều lỗi phổ biến và xử lý nhanh khi audio và video bị lệch — vấn đề rất thường gặp trong workflow đa device.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Audio Sync là gì?</h2>
  <p>Audio Sync (đồng bộ âm thanh) là quá trình đảm bảo âm thanh khớp chính xác với hình ảnh ở mức frame-accurate. Bao gồm lip sync (môi diễn viên với thoại), action sync (đấm với punch SFX, chân tiếp đất với footstep), music sync (chuyển cảnh với beat), và global sync (audio track tổng không drift theo thời gian).</p>
  <p>Mắt người rất nhạy với lệch sync — chỉ 40ms âm thanh đến sớm hoặc 80ms muộn là cảm nhận được. Đây là lý do mọi pipeline production chuyên nghiệp đều có quy trình rõ ràng để đảm bảo sync từ ngày quay đến khâu master cuối.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Tại sao audio và video dễ bị lệch?</span>
    <p>Camera và recorder chạy clock độc lập — sau vài phút có thể drift vài frame. Mỗi codec/container có cách handle timing khác nhau. Re-encoding qua nhiều format có thể đẩy/lùi audio vài frame. Pipeline càng dài, nguy cơ lệch càng cao.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Timecode (TC)</strong> — đánh dấu thời gian chuẩn cho audio &amp; video, mã SMPTE</li>
    <li><strong>Slate / Clapboard</strong> — &quot;cộp&quot; đầu take, tạo điểm sync rõ trên cả picture và sound</li>
    <li><strong>Lip Sync</strong> — đồng bộ thoại với chuyển động môi</li>
    <li><strong>Drift</strong> — sai số tích lũy theo thời gian giữa audio và video</li>
    <li><strong>Frame rate</strong> — phải nhất quán (24, 25, 29.97, 30 fps) trong toàn pipeline</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"film slate clapboard timecode sync production"</span>
    </div>
    <p class="arc-image-caption">Slate (clapboard) — &quot;cộp&quot; tạo điểm sync trực quan trên cả waveform và frame video</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các phương pháp Sync</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Timecode Sync — chuẩn chuyên nghiệp</summary>
      <div class="arc-card-body">
        <p>Camera và audio recorder đều ghi SMPTE timecode đồng bộ. Trong post, NLE/DAW match TC để align tự động. Đòi hỏi gear hỗ trợ TC (Tentacle Sync, Deity TC-1, ARRI, RED).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Slate / Clapboard Sync — truyền thống</summary>
      <div class="arc-card-body">
        <p>&quot;Cộp&quot; slate ở đầu take — frame đóng slate và peak âm cộp là điểm sync. Phổ biến vẫn dùng hôm nay vì backup khi TC fail.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Waveform Sync — automated</summary>
      <div class="arc-card-body">
        <p>NLE (Premiere, Resolve) so sánh waveform của scratch audio camera với audio bên ngoài, tự động align. PluralEyes là tool phổ biến trước khi NLE built-in tính năng này.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Manual Frame-by-Frame</summary>
      <div class="arc-card-body">
        <p>Sound designer scrub timeline, align từng cue thủ công — phổ biến cho ADR, SFX sync với action, footstep Foley.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Audio Sync trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Phim &amp; TV</h3>
    <ul class="arc-list">
      <li>On-set: timecode sync giữa camera (ARRI/RED) và audio (Sound Devices)</li>
      <li>ADR: dialogue editor sync replacement lines với môi diễn viên</li>
      <li>SFX/Foley: align từng cue với action trên timeline</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">YouTube / Vlog</h3>
    <ul class="arc-list">
      <li>Multi-camera + external mic — dùng Premiere/Resolve Sync Audio</li>
      <li>Một số creator vẫn dùng clap thủ công đầu mỗi take cho backup</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Music Video &amp; Live Performance</h3>
    <ul class="arc-list">
      <li>Playback audio sẵn trên trường, diễn viên lip sync; post sync với master audio</li>
      <li>Live concert multi-camera: tất cả camera sync với mixer FOH qua timecode</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation</h3>
    <ul class="arc-list">
      <li>Voice ghi trước, animator dựng môi theo audio (ngược với live action)</li>
      <li>Phải sync exact — phonem (âm tiết) khớp với mouth shape</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Audio drift sau vài phút — đầu sync, cuối lệch</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> camera và recorder có clock drift khác nhau (29.97 thực ra ~29.97002...).</p>
        <p><strong>Cách fix:</strong> dùng timecode generator chung (Tentacle Sync) để đồng bộ clock cứng. Trong post, NLE có option time-stretch để fix drift.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Frame rate mismatch — audio đúng nhưng video lệch</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> camera quay 29.97 nhưng project timeline 30 fps, hoặc conversion 24 ↔ 25.</p>
        <p><strong>Cách fix:</strong> set timeline khớp đúng frame rate của footage. Tránh pulldown/conversion không cần thiết.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lip sync sai sau khi export</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> codec output có khác latency, hoặc audio sample rate mismatch (44.1 vs 48 kHz).</p>
        <p><strong>Cách fix:</strong> consistent 48kHz cho video pipeline. Test export trên target platform (YouTube, broadcast) — một số platform thêm độ trễ.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 03. Augmented Reality AR
  {
    id: "ead813ca-854c-4ef4-908f-0fd7c072fd19",
    tieu_de: "Augmented Reality (AR)",
    tieu_de_viet: "Thực tế tăng cường",
    tom_tat:
      "AR (Augmented Reality) là công nghệ chồng các yếu tố kỹ thuật số lên môi trường thực qua camera điện thoại hoặc kính thông minh. Ứng dụng đa dạng từ filter Instagram, IKEA Place đến phẫu thuật hỗ trợ AR.",
    meta_title: "Augmented Reality (AR) là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "AR (Augmented Reality) chồng yếu tố số lên thế giới thực. Tìm hiểu các nền tảng ARKit, ARCore, ứng dụng trong design, marketing, game và VFX.",
    noi_dung: `
<section class="arc-intro">
  <p>Đưa điện thoại trước mặt — IKEA Place hiển thị sofa thật trong phòng khách của bạn, đúng kích thước. Snapchat đeo &quot;tai mèo&quot; lên đầu, Pokemon GO thấy Pikachu đứng trên vỉa hè. Đây không phải VR (thực tế ảo, đeo headset đóng mắt) — đây là AR, thế giới thực vẫn còn nhưng có thêm lớp số chồng lên.</p>
  <p>AR đã chuyển từ &quot;novelty&quot; thành công cụ thực sự cho design, marketing, education và sản xuất chuyên nghiệp. Hiểu AR và nền tảng phổ biến giúp designer, developer biết khi nào nên dùng AR thay vì web/app truyền thống.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Augmented Reality là gì?</h2>
  <p>Augmented Reality (AR — Thực tế tăng cường) là công nghệ chồng các yếu tố kỹ thuật số (3D model, text, video, hiệu ứng) lên môi trường thực thông qua camera điện thoại, tablet, kính thông minh hoặc HUD trên kính chắn gió. Khác VR (đóng mắt vào thế giới ảo hoàn toàn), AR giữ thế giới thực làm nền và thêm lớp số tương tác.</p>
  <p>AR dựa trên 3 công nghệ nền: <strong>computer vision</strong> (nhận diện môi trường), <strong>tracking</strong> (theo dõi điện thoại di chuyển trong không gian), và <strong>rendering</strong> (vẽ object 3D bám vào thế giới thật chính xác).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">AR vs VR vs MR — khác nhau ở đâu</span>
    <p><strong>AR</strong>: thực tế + lớp số (Pokemon GO, IKEA Place, Snapchat filter). <strong>VR</strong>: hoàn toàn ảo, đeo headset đóng mắt (Meta Quest, PSVR). <strong>MR (Mixed Reality)</strong>: AR cao cấp, object số tương tác với thế giới thật (Apple Vision Pro, HoloLens). Khái niệm dần overlap nhưng AR vẫn phổ biến nhất vì chạy được trên điện thoại thường.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Marker-based AR</strong> — nhận diện QR/image cụ thể để hiển thị nội dung</li>
    <li><strong>Markerless AR</strong> — nhận diện mặt phẳng (sàn, bàn) tự động</li>
    <li><strong>SLAM</strong> — Simultaneous Localization and Mapping, công nghệ tracking nền</li>
    <li><strong>WebAR</strong> — AR chạy qua trình duyệt, không cần app riêng</li>
    <li><strong>Spatial Computing</strong> — khái niệm rộng hơn AR, bao gồm Vision Pro / Quest 3</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"augmented reality phone furniture IKEA Place example"</span>
    </div>
    <p class="arc-image-caption">AR điển hình — placement object 3D vào không gian thật qua camera điện thoại</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các nền tảng AR phổ biến</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>ARKit (Apple) &amp; ARCore (Google)</summary>
      <div class="arc-card-body">
        <p>Framework gốc cho iOS và Android — tracking, plane detection, occlusion với LiDAR. Chuẩn cho mọi AR app native nghiêm túc. Cần dev Swift/Kotlin/Unity/Unreal để build.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Snap Lens Studio &amp; Meta Spark</summary>
      <div class="arc-card-body">
        <p>Tool no-code/low-code cho creator làm AR filter cho Snapchat/Instagram. Phù hợp designer không code — kéo thả 3D object, animation, hiệu ứng face/body tracking.</p>
        <p>Meta Spark (cho Instagram) đã được Meta announce sẽ ngừng support 2025 — chuyển sang AR cho Quest. Snap Lens vẫn mạnh và growing.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>WebAR — 8th Wall, AR.js, Three.js</summary>
      <div class="arc-card-body">
        <p>AR qua browser không cần app — chỉ cần scan QR. 8th Wall là platform nhiều brand dùng cho campaign (chỉ link share, không cần download).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Adobe Aero &amp; Reality Composer</summary>
      <div class="arc-card-body">
        <p>Tool low-code cho designer làm AR experience đơn giản — drag &amp; drop 3D asset, animation. Aero cross-platform; Reality Composer chỉ iOS/macOS.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Vision Pro &amp; Spatial Computing</summary>
      <div class="arc-card-body">
        <p>Headset MR cao cấp — AR/MR chạy ở dạng spatial app. Apple Vision Pro 2024, Meta Quest 3 đẩy mạnh spatial computing. Dev với visionOS / Unity / Unreal.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>AR trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Marketing &amp; Brand</h3>
    <ul class="arc-list">
      <li>Snapchat lens, Instagram filter cho brand campaign — Coca-Cola, Nike, Gucci tận dụng nhiều</li>
      <li>WebAR cho packaging — scan QR trên hộp, hiện 3D model sản phẩm</li>
      <li>Try-on virtual — kính, mỹ phẩm, áo (Sephora, Warby Parker, IKEA)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game</h3>
    <ul class="arc-list">
      <li>Pokemon GO, Ingress là pioneer; nhiều game AR mới qua Vision Pro/Quest</li>
      <li>Indie dev dùng ARKit/ARCore để prototype game AR đơn giản</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Design &amp; Architecture</h3>
    <ul class="arc-list">
      <li>Visualize nội thất, kiến trúc trong context thật trước khi xây/mua</li>
      <li>3D model exported sang USDZ (iOS) hoặc glTF (universal) cho AR preview</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Education &amp; Training</h3>
    <ul class="arc-list">
      <li>Anatomy app — hiện cơ thể người 3D trong context lớp học</li>
      <li>Training y tế, kỹ thuật — assistant AR overlay info trên thiết bị thật</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX &amp; Pre-production</h3>
    <ul class="arc-list">
      <li>Director dùng AR để &quot;preview&quot; cảnh CG trong location thật</li>
      <li>Virtual scout — đặt asset CG vào set trước khi quay</li>
    </ul>
  </div>
</section>
`,
  },

  // 04. Baking
  {
    id: "4e0950d5-a5a4-40b8-b5af-743743751fa1",
    tieu_de: "Baking",
    tieu_de_viet: "Bake (nướng) trong 3D",
    tom_tat:
      "Baking trong 3D là quá trình tính toán trước thông tin (lighting, shadow, normal, AO) và lưu vào texture — giúp realtime engine giảm tải tính toán mỗi frame. Kỹ thuật then chốt trong game và VFX optimization.",
    meta_title: "Baking là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Baking trong 3D là tính toán trước lighting, shadow, normal vào texture. Tìm hiểu các loại bake và ứng dụng trong game, VFX và workflow PBR.",
    noi_dung: `
<section class="arc-intro">
  <p>Một game open-world có hàng triệu polygon cần hiển thị mượt ở 60fps trên console. Tính toán lighting realtime cho từng pixel của từng polygon thì máy nào cũng &quot;sụp&quot;. Giải pháp: tính trước (bake) thông tin lighting và shadow vào texture — engine chỉ cần đọc texture thay vì tính lại mỗi frame. Đây là kỹ thuật baking.</p>
  <p>Baking là kỹ năng thiết yếu cho 3D artist, đặc biệt trong game và realtime VFX. Hiểu khi nào bake và bake cái gì giúp tạo ra asset đẹp, performant — cân bằng giữa chất lượng visual và tốc độ render.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Baking trong 3D là gì?</h2>
  <p>Baking là quá trình tính toán trước thông tin phức tạp (lighting, shadow, normal map, AO, curvature) và lưu kết quả vào texture map. Sau khi bake, engine chỉ cần đọc texture thay vì tính lại từng frame — giảm tải GPU đáng kể, đặc biệt cho realtime application.</p>
  <p>Trade-off của baking: kết quả không thay đổi theo lighting động hoặc chuyển động object. Vì vậy chỉ bake những thứ tĩnh — static lighting, surface details, contact shadow. Lighting động vẫn phải tính realtime.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Khi nào bake, khi nào không bake?</span>
    <p><strong>Nên bake</strong>: lighting tĩnh (sun, ambient), AO trên asset không biến dạng, normal map từ high-poly sang low-poly. <strong>Không bake</strong>: lighting động (đèn pin, đêm/ngày cycle), object biến dạng hoặc move thường xuyên, reflection trên surface gương.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Normal Bake</strong> — bake chi tiết từ high-poly model xuống low-poly normal map</li>
    <li><strong>AO Bake</strong> — bake ambient occlusion thành texture</li>
    <li><strong>Light Bake / Lightmap</strong> — bake static lighting vào lightmap texture</li>
    <li><strong>Curvature Bake</strong> — bake convex/concave info, dùng làm mask cho dirt/edge wear</li>
    <li><strong>Position Bake</strong> — bake vị trí vertex thành texture cho compositing</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"3D texture baking normal map high poly low poly comparison"</span>
    </div>
    <p class="arc-image-caption">Bake normal từ high-poly (chi tiết) sang low-poly (game-ready) — low-poly nhìn vẫn detail nhờ normal map</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Bake phổ biến</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Normal Map Bake — chuyển detail high-poly sang low-poly</summary>
      <div class="arc-card-body">
        <p>Modeler tạo high-poly với chi tiết đầy đủ (sculpt trong ZBrush, hàng triệu polygon), sau đó retopo thành low-poly để game dùng. Bake normal map từ high-poly để low-poly &quot;trông giống&quot; high-poly khi render.</p>
        <ul class="arc-list">
          <li>Tool: xNormal, Substance Painter, Marmoset Toolbag, Blender</li>
          <li>UV cần unwrap cẩn thận để bake không bị seam</li>
        </ul>
      </div>
    </details>
    <details class="arc-card">
      <summary>AO Bake — ambient occlusion</summary>
      <div class="arc-card-body">
        <p>Tính AO trong renderer offline, bake vào texture riêng. Game engine multiply AO texture với lighting result. Có sẵn AO bake trong Substance, Maya, Blender.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lightmap Bake — static lighting</summary>
      <div class="arc-card-body">
        <p>Bake toàn bộ static lighting (sun + ambient + bounce) vào lightmap texture cho mỗi object. Unreal có Lightmass; Unity có Progressive Lightmapper. Lightmap UV phải có (UV2) tránh chồng lấn.</p>
        <ul class="arc-list">
          <li>Phổ biến cho indoor scene, level static</li>
          <li>Phù hợp mobile/VR — giảm GPU load đáng kể</li>
        </ul>
      </div>
    </details>
    <details class="arc-card">
      <summary>Curvature &amp; Position Bake — input cho texturing</summary>
      <div class="arc-card-body">
        <p>Curvature map highlight edge convex/concave — dùng làm mask cho edge wear, dirt accumulation trong Substance Painter. Position map cho gradient theo height.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Baking trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game</h3>
    <ul class="arc-list">
      <li>Mọi asset có normal bake từ high-poly — chuẩn industry</li>
      <li>Mobile game thường bake lightmap toàn level — không có realtime light bounce</li>
      <li>Console/PC AAA dùng mix bake + realtime (Lumen Unreal 5)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VR</h3>
    <ul class="arc-list">
      <li>Performance critical (90fps+ trên 2 mắt) — bake lighting gần như bắt buộc</li>
      <li>Quest 2/3 mobile GPU rất hạn chế — phụ thuộc bake nặng</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Architectural Visualization</h3>
    <ul class="arc-list">
      <li>Indoor render trong Unreal/Twinmotion — bake lighting cho realtime walkthrough mượt</li>
      <li>VR tour bất động sản — không bake là không chạy nổi</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation/VFX offline</h3>
    <ul class="arc-list">
      <li>Ít cần bake hơn — render offline có time tính toán</li>
      <li>Vẫn bake normal cho asset (workflow PBR Substance)</li>
      <li>Position/Vector pass dùng cho compositing trong Nuke</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Bake xong có seam ở UV edge</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> padding/dilation không đủ, hoặc UV islands chạm nhau.</p>
        <p><strong>Cách fix:</strong> tăng padding (16-32 pixel), separate UV islands có khoảng cách. Trong Substance Painter, bật &quot;Average Normal Per Fragment&quot;.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Normal map bake có dải đen / dải lạ</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> high-poly và low-poly không match scale/position, hoặc UV bị flip.</p>
        <p><strong>Cách fix:</strong> dùng cage hoặc explicit max distance khi bake. Match scale exact giữa high và low. Check UV không có overlap.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lightmap có vệt loang lổ</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> lightmap resolution quá thấp, hoặc UV2 (lightmap UV) chưa unwrap tốt.</p>
        <p><strong>Cách fix:</strong> tăng lightmap resolution (256-1024 tùy object), tạo UV2 dành riêng cho lightmap với no overlap, padding rộng.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 05. batch processing
  {
    id: "d2f72acc-b934-4727-97d0-73c001701d01",
    tieu_de: "Batch Processing",
    tieu_de_viet: "Xử lý hàng loạt",
    tom_tat:
      "Batch processing là kỹ thuật xử lý nhiều file hoặc thao tác cùng lúc thay vì từng cái một — tiết kiệm thời gian đáng kể cho photographer, designer, editor làm việc với hàng trăm file mỗi dự án.",
    meta_title: "Batch Processing là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Batch processing xử lý hàng loạt file tự động. Tìm hiểu Photoshop Batch, Lightroom Sync, Premiere export queue và ứng dụng cho workflow chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn vừa chụp 500 ảnh wedding và cần resize, watermark, export JPEG 80% chất lượng — toàn bộ trước 12 giờ sáng mai. Mở từng ảnh xử lý thủ công thì mất 10 tiếng. Bật batch processing — đi ngủ một giấc, sáng dậy xong hết. Đây là sức mạnh của tự động hóa hàng loạt.</p>
  <p>Batch processing là kỹ năng then chốt cho mọi creative chuyên nghiệp — nhiếp ảnh gia, video editor, designer, retoucher. Hiểu công cụ batch sẵn có trong từng phần mềm giúp tiết kiệm hàng giờ làm việc lặp lại mỗi tuần.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Batch Processing là gì?</h2>
  <p>Batch processing là kỹ thuật áp dụng cùng một chuỗi thao tác cho nhiều file hoặc nhiều unit dữ liệu cùng lúc, thay vì xử lý từng file riêng lẻ. Thuật ngữ bắt nguồn từ thời computing cũ — &quot;batch&quot; là &quot;mẻ&quot; công việc được queue lại chạy đồng thời.</p>
  <p>Trong sáng tạo, batch processing rất phổ biến: resize hàng loạt ảnh, áp preset cho cả album, export video nhiều format cùng lúc, encode audio sang multiple bitrate, rename file theo pattern. Hầu hết phần mềm chuyên nghiệp có tính năng batch tích hợp.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Batch khác Macro/Action như thế nào</span>
    <p><strong>Action/Macro</strong>: chuỗi lệnh được ghi lại để phát lại. <strong>Batch</strong>: cách chạy Action cho nhiều file. Hai khái niệm phụ thuộc nhau — bạn ghi Action trước rồi dùng Batch để áp Action lên cả folder. Một số phần mềm gom cả hai thành tính năng đơn.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Source folder</strong> — folder chứa file gốc</li>
    <li><strong>Destination folder</strong> — folder chứa output</li>
    <li><strong>Naming pattern</strong> — quy tắc đặt tên file output (vd: <code>{original}_web.jpg</code>)</li>
    <li><strong>Queue</strong> — danh sách job đang chờ xử lý</li>
    <li><strong>Override</strong> — option ghi đè cài đặt trong action với cài đặt batch (vd save location)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"photoshop batch processing dialog file automation"</span>
    </div>
    <p class="arc-image-caption">Photoshop Batch dialog — chọn Action, source folder, destination, naming pattern</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Batch Processing trong từng phần mềm</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Photoshop — File → Automate → Batch</summary>
      <div class="arc-card-body">
        <p>Chọn Action đã ghi, source folder, destination. Tick &quot;Override Action Open/Save&quot; để file save đúng đường dẫn batch. Image Processor (File → Scripts) là wrapper đơn giản hơn cho resize/format conversion.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lightroom — Sync Settings &amp; Export</summary>
      <div class="arc-card-body">
        <p>Chọn nhiều ảnh, sync develop settings — áp preset/edit cho tất cả. Export với template cho path/naming/format/size custom. Auto Import cho workflow shoot-tether.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Premiere Pro — Adobe Media Encoder Queue</summary>
      <div class="arc-card-body">
        <p>Send to Queue thay vì Export trực tiếp — Premiere không bị lock, encode chạy nền. Queue nhiều sequence với preset khác nhau (H.264 cho web, ProRes cho master, vertical 9:16 cho TikTok).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Affinity Photo / Capture One — Batch Process</summary>
      <div class="arc-card-body">
        <p>Affinity Photo có Batch Job tương đương Photoshop. Capture One cho phép Process Recipe — output nhiều variant (web, print, archive) cùng lúc cho mỗi ảnh.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>FFmpeg &amp; ImageMagick — command line</summary>
      <div class="arc-card-body">
        <p>Cho power user — bash/PowerShell script batch process hàng nghìn file. <code>ffmpeg</code> cho video/audio, <code>magick</code> cho ảnh. Flexible nhất nhưng cần biết command line.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Batch Processing trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Nhiếp ảnh</h3>
    <ul class="arc-list">
      <li>Sync develop settings trong Lightroom cho ảnh cùng setup</li>
      <li>Export batch ra nhiều size: full-res cho client, web-optimized cho upload</li>
      <li>Add watermark, metadata copyright tự động khi export</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Design &amp; Web</h3>
    <ul class="arc-list">
      <li>Export multi-resolution icon (@1x, @2x, @3x) cho iOS/Android</li>
      <li>Optimize ảnh web — TinyPNG bulk, Squoosh CLI</li>
      <li>Generate thumbnail cho video gallery</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Video</h3>
    <ul class="arc-list">
      <li>Encode batch nhiều format cho deliverable: master ProRes, web H.264, vertical TikTok</li>
      <li>Transcode footage RAW sang proxy cho editing nhanh</li>
      <li>Watermark batch cho deliverable client (logo bottom corner)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX/3D</h3>
    <ul class="arc-list">
      <li>Batch render frame range — render farm queue</li>
      <li>Convert EXR sang PNG/JPEG cho preview/comp</li>
      <li>Bake AO/normal batch cho asset library</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Batch ghi đè file gốc</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> source và destination cùng folder, hoặc naming pattern trùng file gốc.</p>
        <p><strong>Cách fix:</strong> luôn dùng destination folder riêng. Naming pattern có suffix (<code>_web</code>, <code>_export</code>) để không trùng. Backup source folder trước khi batch lần đầu.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Action fail giữa chừng — chỉ một số file được xử lý</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> action phụ thuộc layer/path cụ thể không tồn tại trên một số file.</p>
        <p><strong>Cách fix:</strong> trong Batch dialog, bật &quot;Suppress File Open Options Dialogs&quot; và &quot;Suppress Color Profile Warnings&quot;. Test action trên 2-3 file đại diện trước khi batch hàng trăm.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Batch quá chậm — không tận dụng CPU</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> Photoshop batch single-threaded; thiếu RAM.</p>
        <p><strong>Cách fix:</strong> dùng tool parallel (ffmpeg với -threads, ImageMagick parallel). Hoặc split batch thành chunks, chạy nhiều instance song song.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 06. Behavior Trees
  {
    id: "22099e1a-6b4d-4a99-827a-79feef94b4c8",
    tieu_de: "Behavior Trees",
    tieu_de_viet: "Cây hành vi (Behavior Tree)",
    tom_tat:
      "Behavior Tree là cấu trúc dạng cây mô hình hóa hành vi AI cho nhân vật game — cho phép thiết kế logic phức tạp dễ đọc, dễ debug và tái sử dụng. Chuẩn de facto cho game AI hiện đại.",
    meta_title: "Behavior Trees là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Behavior Trees là cấu trúc cây cho AI game — thay state machine cũ. Tìm hiểu node types, ứng dụng trong Unreal, Unity và game AAA hiện đại.",
    noi_dung: `
<section class="arc-intro">
  <p>NPC trong game đang tuần tra — thấy player xuất hiện trong tầm nhìn → chạy tới tấn công → khi máu thấp → tìm chỗ trốn → khi safe → bắn từ xa → mất dấu player → quay về tuần tra. Logic phức tạp như vậy mà phải code trong if-else thì rất khó maintain. Behavior Tree giải quyết bài toán đó.</p>
  <p>Behavior Tree là cấu trúc tổ chức AI logic phổ biến nhất trong game industry hiện nay — thay thế phần lớn state machine cũ. Hiểu Behavior Tree là kỹ năng quan trọng cho game designer và AI programmer làm việc với NPC behavior phức tạp.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Behavior Tree là gì?</h2>
  <p>Behavior Tree (BT) là cấu trúc dữ liệu dạng cây mô hình hóa quy trình ra quyết định và hành động của AI. Cây bắt đầu từ node Root, đi xuống các node con theo thứ tự — mỗi node trả về Success, Failure hoặc Running. Logic flow của AI là kết quả của việc traverse cây này mỗi tick.</p>
  <p>Behavior Tree khác State Machine (FSM cũ) ở chỗ: thay vì transition giữa các state cố định, BT cho phép composable behavior — có thể reuse subtree, dễ thêm/bớt logic mà không phải sửa toàn bộ. Đặc biệt mạnh khi AI có nhiều behavior modular.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Behavior Tree vs Finite State Machine</span>
    <p><strong>FSM</strong>: phù hợp khi AI có ít state rõ ràng (Idle, Patrol, Attack, Die). <strong>BT</strong>: phù hợp khi behavior phức tạp, có nhiều sub-task có thể tổ hợp. BT trở thành chuẩn cho game AAA vì khả năng scale tốt hơn với complexity tăng.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Root</strong> — node gốc của cây, bắt đầu mỗi tick</li>
    <li><strong>Composite</strong> — node có nhiều con: Sequence (chạy tuần tự đến khi fail), Selector (chạy đến khi success)</li>
    <li><strong>Decorator</strong> — modify hành vi node con (condition, repeat, invert result)</li>
    <li><strong>Leaf</strong> — node thực thi action (move to, attack) hoặc check condition</li>
    <li><strong>Blackboard</strong> — shared memory giữa các node trong cây</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"behavior tree game AI diagram node example"</span>
    </div>
    <p class="arc-image-caption">Behavior Tree điển hình — root → selector → sequence → action, với decorator điều kiện</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại node trong Behavior Tree</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Composite — quyết định traversal</summary>
      <div class="arc-card-body">
        <p><strong>Sequence</strong>: chạy con từ trái sang phải, fail ngay khi có node con fail. <strong>Selector (Fallback)</strong>: chạy con từ trái sang phải, success ngay khi có node con success. <strong>Parallel</strong>: chạy nhiều con đồng thời.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Decorator — modify node con</summary>
      <div class="arc-card-body">
        <p>Inverter (đảo success/fail), Repeater (lặp N lần), Condition (chỉ chạy con khi điều kiện đúng), Cooldown (delay giữa các lần chạy). Decorator giúp viết logic dễ hơn nhiều so với nested if.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Action Leaf — thực thi hành động</summary>
      <div class="arc-card-body">
        <p>Đầu cuối của cây — MoveTo, Attack, PlayAnimation, SetBlackboardValue. Trả về Success khi hoàn thành, Running khi đang chạy, Failure khi không làm được.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Condition Leaf — kiểm tra điều kiện</summary>
      <div class="arc-card-body">
        <p>IsPlayerInRange, HasAmmo, IsHealthLow — trả về Success/Failure không có side effect. Thường kết hợp với Sequence để gate logic.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Behavior Trees trong từng nền tảng</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Unreal Engine</h3>
    <ul class="arc-list">
      <li>Behavior Tree là built-in chuẩn — kết hợp với Blackboard và AIController</li>
      <li>Visual editor trực quan, dễ debug từng node với State Tree alternative mới (UE5)</li>
      <li>Hầu hết game shipped với Unreal (Fortnite, Gears) dùng BT</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Unity</h3>
    <ul class="arc-list">
      <li>Unity không built-in BT — dùng plugin Behavior Designer hoặc NodeCanvas</li>
      <li>Hoặc tự code lightweight BT trong C#</li>
      <li>ML-Agents kết hợp với BT cho hybrid AI</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game AAA Industry</h3>
    <ul class="arc-list">
      <li>Halo 2 (Bungie) — game đầu tiên dùng BT công khai, paper được publish</li>
      <li>The Last of Us, Bioshock, Spore — đều dùng BT cho NPC behavior</li>
      <li>Studio lớn thường có custom BT framework — built around game-specific needs</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Robotics &amp; Simulation</h3>
    <ul class="arc-list">
      <li>BT phổ biến trong ROS (Robot Operating System) — BehaviorTree.CPP library</li>
      <li>Quân sự, drone autonomous dùng BT cho decision making</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Cây quá phức tạp, không debug được</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> đặt mọi logic vào một cây khổng lồ, không có hierarchy hợp lý.</p>
        <p><strong>Cách fix:</strong> chia thành subtrees theo high-level behavior (Combat, Patrol, Idle). Mỗi subtree không quá 20-30 node. Reuse subtree common (Move To Target).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>NPC &quot;không chịu thay đổi behavior&quot; khi điều kiện thay đổi</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> action đang Running không bị interrupt khi điều kiện khác đến.</p>
        <p><strong>Cách fix:</strong> dùng decorator &quot;Abort Lower Priority&quot; (Unreal) cho condition node. Khi condition fail, cây tự stop running action.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Performance — tick BT mỗi frame quá nặng</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> hàng trăm NPC mỗi frame chạy BT phức tạp.</p>
        <p><strong>Cách fix:</strong> tick rate thấp (10-30 lần/giây thay vì 60), LOD cho AI xa player, đơn giản BT cho NPC ít quan trọng.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 07. Bevel
  {
    id: "223712e7-57f9-4fca-bdaf-ed797d55edda",
    tieu_de: "Bevel",
    tieu_de_viet: "Vát cạnh (Bevel)",
    tom_tat:
      "Bevel là kỹ thuật vát/làm tròn các cạnh sắc của mô hình 3D — bước nhỏ nhưng quyết định để 3D nhìn chân thực thay vì &quot;CG&quot;. Một trong những thao tác modeling cơ bản nhất nhưng quan trọng nhất.",
    meta_title: "Bevel là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Bevel làm tròn cạnh sắc cho mô hình 3D — bước critical để render chân thực. Tìm hiểu các loại bevel và ứng dụng trong modeling, hardsurface design.",
    noi_dung: `
<section class="arc-intro">
  <p>Hai render cùng cảnh — render A có cạnh sắc tinh khôi, trông &quot;CG&quot;; render B có viền cạnh hơi vát nhẹ, ánh sáng bắt cạnh tự nhiên hơn, trông như product photography thật. Khác biệt một bước duy nhất: bevel. Đây là kỹ thuật nhỏ nhưng tạo ra khác biệt lớn giữa &quot;3D student work&quot; và &quot;3D chuyên nghiệp&quot;.</p>
  <p>Trong tự nhiên, không có cạnh nào hoàn toàn sắc — ngay cả lưỡi dao bén vẫn có micro-bevel mà mắt thường không thấy nhưng ánh sáng vẫn bắt được. Hiểu và áp dụng bevel đúng là kỹ năng cơ bản cho mọi 3D artist, đặc biệt làm hard-surface và product visualization.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Bevel là gì?</h2>
  <p>Bevel là thao tác làm tròn hoặc vát các cạnh sắc của mô hình 3D — thay vì edge chuyển góc 90° gay gắt, bạn tạo các edge phụ tạo chuyển đổi mềm. Kỹ thuật cũng được gọi là Chamfer trong một số phần mềm (3ds Max).</p>
  <p>Có hai mục đích chính: (1) tạo realism — render bắt highlight ở cạnh tròn tự nhiên hơn; (2) tránh shading artifact — cạnh hoàn toàn sắc dễ tạo ra dark line, hard shadow không tự nhiên khi render PBR.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Tại sao cạnh sắc trông &quot;CG&quot;?</span>
    <p>Trong thực tế, sản xuất bất kỳ vật gì đều tạo ra micro-bevel ở cạnh — máy gia công không thể tạo cạnh 0mm radius. Ánh sáng môi trường luôn bắt được vào những bevel siêu nhỏ này. Khi 3D model có cạnh hoàn toàn sắc (radius = 0), brain bạn nhận ra &quot;không tự nhiên&quot; — đây là một trong những visual cues tách 3D giả với 3D photo-real.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Width / Offset</strong> — kích thước bevel (mm hoặc unit relative)</li>
    <li><strong>Segments</strong> — số loop edge tạo trong bevel (1 = chamfer, nhiều = round)</li>
    <li><strong>Profile</strong> — shape của bevel: linear, concave, convex, custom curve</li>
    <li><strong>Hard / Soft Edge</strong> — kết hợp bevel với shading group để control normal smooth</li>
    <li><strong>Procedural Bevel</strong> — bevel via shader/render (V-Ray BevelMaterial, Arnold Round Corners) không thay đổi topology</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"3D bevel chamfer edge before after render comparison"</span>
    </div>
    <p class="arc-image-caption">So sánh edge sắc vs edge đã bevel — bevel bắt sáng tự nhiên, làm vật trông &quot;thật&quot;</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các phương pháp Bevel</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Geometric Bevel — thay đổi topology</summary>
      <div class="arc-card-body">
        <p>Cách truyền thống — chia cạnh thành nhiều loop edge tạo round geometry. Bevel tool trong Maya (Ctrl+B), Blender (Ctrl+B), 3ds Max (Chamfer). Thêm polycount nhưng kết quả chính xác và work với mọi renderer.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Subdivision Surface Bevel</summary>
      <div class="arc-card-body">
        <p>Để hard edge giữ qua subdivision, thêm 2 edge loop sát cạnh — subdivision tự nội suy thành bevel mềm. Phổ biến trong workflow box modeling.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bevel Shader / Round Corners</summary>
      <div class="arc-card-body">
        <p>Modifier shader giả lập bevel khi render mà không thay đổi geometry. Arnold Round Corners, V-Ray Edges Tex. Cực rẻ, không tăng polycount nhưng chỉ hiển thị qua renderer cụ thể, không export ra game engine.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bevel via Normal Map</summary>
      <div class="arc-card-body">
        <p>Bake high-poly có bevel xuống low-poly với normal map giữ illusion. Phổ biến cho game asset — low-poly chạy nhanh nhưng nhìn vẫn có bevel.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Bevel trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Hard-surface Modeling</h3>
    <ul class="arc-list">
      <li>Bevel trên mọi cạnh chính của xe, robot, vũ khí — bắt buộc cho photorealism</li>
      <li>Standard workflow: model low-poly clean → add edge loops cho bevel → subdivision render</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Product Visualization</h3>
    <ul class="arc-list">
      <li>Bevel tinh tế (0.5-2mm) trên product nhỏ — sản phẩm trông tăng chất lượng đáng kể</li>
      <li>Phone, watch, đồ gia dụng: bevel là step quyết định khác biệt giữa render đẹp và render &quot;CG&quot;</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Architectural Viz</h3>
    <ul class="arc-list">
      <li>Wall corner, picture frame, furniture edge cần bevel cho realism</li>
      <li>Trong Twinmotion/Lumion, dùng round corner shader để không tăng polycount</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Asset</h3>
    <ul class="arc-list">
      <li>Bevel bake vào normal map — low-poly game ready nhưng vẫn có bevel illusion</li>
      <li>Hard surface game asset (vũ khí, vehicle, prop) cần normal map quality cao</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Motion Graphics &amp; Text 3D</h3>
    <ul class="arc-list">
      <li>3D text trong Cinema 4D/After Effects: bevel quyết định &quot;weight&quot; và &quot;quality&quot; cảm thụ</li>
      <li>Bevel quá to làm text trông &quot;cheesy&quot;; bevel quá nhỏ thì trông phẳng</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Bevel quá to — làm vật trông &quot;cheesy&quot; / &quot;cartoony&quot;</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> bevel width không phù hợp scale model. Cùng width, vật nhỏ nhìn cartoony.</p>
        <p><strong>Cách fix:</strong> bevel width tỷ lệ với scale (0.5-2mm cho product nhỏ, 5-10mm cho kiến trúc). Reference vật thật cùng loại.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Bevel tạo n-gon hoặc topology lỗi</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> bevel ở góc 3-4 cạnh giao nhau — phần mềm tự gen n-gon.</p>
        <p><strong>Cách fix:</strong> dùng &quot;Bevel by Vertex&quot; cho corner phức tạp, hoặc manually fix topology sau bevel. Modeler chuyên nghiệp luôn có pattern xử lý corner.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Subdivision không tạo bevel như mong muốn</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> thiếu edge support loop, hoặc edge crease setting sai.</p>
        <p><strong>Cách fix:</strong> thêm edge loop sát cạnh muốn giữ. Càng gần edge càng &quot;sharp&quot; sau subdivision. Có thể dùng creasing weight thay vì support loop trong một số workflow.</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 08. Bifrost
  {
    id: "5d2f230c-dfa3-4c64-81ca-1cfff6922d71",
    tieu_de: "Bifrost",
    tieu_de_viet: "Bifrost (Maya)",
    tom_tat:
      "Bifrost là hệ thống simulation visual programming trong Maya — dùng cho chất lỏng, khói, particle, cloth và procedural effects. Tích hợp sâu Maya, là alternative cho Houdini ở quy mô smaller pipeline.",
    meta_title: "Bifrost là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Bifrost là engine simulation và visual programming trong Maya — cho chất lỏng, khói, particle, cloth. Tìm hiểu workflow và ứng dụng VFX so với Houdini.",
    noi_dung: `
<section class="arc-intro">
  <p>Một cảnh VFX có nước biển vỗ bờ, kết hợp khói bụi và mây mù — trong Maya truyền thống đó là task khó. Trước Bifrost, artist phải xuất sang Houdini hoặc plugin third-party. Từ Maya 2018, Bifrost mang khả năng simulation và visual programming kiểu Houdini vào Maya — pipeline gọn hơn, hợp với studio đã đầu tư vào Maya.</p>
  <p>Bifrost là một trong những công cụ FX mạnh nhất trong hệ sinh thái Autodesk hiện nay. Hiểu Bifrost giúp Maya artist mở rộng capability sang FX/simulation mà không cần học Houdini từ đầu — đặc biệt hữu ích cho studio character animation muốn handle FX in-house.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Bifrost là gì?</h2>
  <p>Bifrost (Bifröst Visual Programming) là hệ thống simulation và procedural workflow trong Maya. Nó cung cấp node-based graph editor (tương tự Houdini) cho artist xây dựng simulation: chất lỏng (FLIP), khói (Aero), particle, cloth, instancing — và bất kỳ logic procedural nào dựa trên node graph.</p>
  <p>Bifrost ra mắt 2014 (chỉ liquid), version visual programming năm 2019 mở rộng cho mọi thể loại FX. Tích hợp sâu Maya — material, lighting, rigging vẫn dùng workflow Maya quen thuộc, chỉ FX simulation chuyển sang Bifrost graph.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Bifrost vs Houdini — chọn cái nào?</span>
    <p><strong>Houdini</strong>: industry standard cho FX cao cấp (phim bom tấn), node-based từ đầu, ecosystem rộng, learning curve cao. <strong>Bifrost</strong>: tích hợp Maya, gentle learning cho Maya artist, đủ cho 80% case, nhưng VFX phức tạp nhất vẫn dùng Houdini. Studio character/animation thường có Bifrost; FX studio chuyên dụng có Houdini.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Compound</strong> — node tổ hợp tái sử dụng được trong Bifrost graph</li>
    <li><strong>Graph Editor</strong> — workspace node-based chính của Bifrost</li>
    <li><strong>Particle System</strong> — point cloud với attribute như velocity, density</li>
    <li><strong>FLIP Solver</strong> — solver cho liquid simulation</li>
    <li><strong>Aero Solver</strong> — solver cho khói, lửa</li>
    <li><strong>USD Integration</strong> — Bifrost native support USD pipeline</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"maya bifrost visual programming graph fluid simulation"</span>
    </div>
    <p class="arc-image-caption">Bifrost Graph Editor trong Maya — node-based workflow tương tự Houdini, tích hợp Maya scene</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các module chính của Bifrost</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Liquid (FLIP) — chất lỏng</summary>
      <div class="arc-card-body">
        <p>FLIP simulation cho nước, oil, lava. Setup emitter, collider, force, surface meshing. Output là mesh cho rendering hoặc point cloud cho instancing.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Aero — khói, lửa</summary>
      <div class="arc-card-body">
        <p>Volumetric simulation cho khói, sương mù, lửa. Voxel-based với pyroclastic noise. Output VDB cho rendering trong Arnold/V-Ray/Redshift.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Particles &amp; Instancing</summary>
      <div class="arc-card-body">
        <p>Particle system với physics. Instance geometry lên particle position cho scenes phức tạp (lá rụng, đám đông object). Tích hợp MASH workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cloth &amp; Soft Body</summary>
      <div class="arc-card-body">
        <p>Cloth simulation cho áo, cờ, vật mềm. Self-collision và interaction với character animation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Procedural Modeling</summary>
      <div class="arc-card-body">
        <p>Beyond simulation — Bifrost graph cho procedural modeling: scatter, deform, geometry generation theo node logic. Tương tự Houdini SOP.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Bifrost trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX phim</h3>
    <ul class="arc-list">
      <li>Studio Maya-centric (Sony Imageworks, Method) dùng Bifrost cho FX nhanh</li>
      <li>Liquid splash, smoke trail, particle effect cho cảnh không quá phức tạp</li>
      <li>FX cực phức tạp vẫn outsource Houdini</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation Studio</h3>
    <ul class="arc-list">
      <li>Character pipeline Maya → FX trong Bifrost cùng scene</li>
      <li>Magic effect, particle cho cartoon FX trong cùng Maya scene</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Motion Graphics &amp; Quảng cáo</h3>
    <ul class="arc-list">
      <li>Liquid logo reveal, smoke title, particle dispersion</li>
      <li>Pipeline gọn — không qua Houdini, render Arnold ngay trong Maya</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Cinematic (pre-rendered)</h3>
    <ul class="arc-list">
      <li>Cutscene FX không cần realtime — Bifrost render qua Arnold cho quality cao</li>
    </ul>
  </div>
</section>
`,
  },

  // 09. Bit Depth
  {
    id: "4285ef85-6b0e-45c1-8884-40f1f2f9c82b",
    tieu_de: "Bit Depth",
    tieu_de_viet: "Độ sâu bit",
    tom_tat:
      "Bit Depth là số mức giá trị mỗi kênh màu (hoặc sample audio) có thể biểu diễn — quyết định độ mịn chuyển sắc, dải dynamic và chất lượng tổng thể của hình ảnh, video, âm thanh.",
    meta_title: "Bit Depth là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Bit Depth quyết định số mức màu/âm — ảnh hưởng độ mịn và chất lượng. Tìm hiểu 8-bit, 10-bit, 16-bit, 32-bit float và ứng dụng trong photo, video, audio.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn render một cảnh gradient trời chiều — màu chuyển từ cam sang xanh tím. Xuất 8-bit JPEG: gradient có dải banding rõ rệt. Xuất 16-bit TIFF: gradient mượt mà. Cả hai đều &quot;cùng màu&quot; nhưng số mức màu khác nhau quyết định visual quality cuối. Đây là sức mạnh của bit depth.</p>
  <p>Bit Depth là kiến thức nền tảng cho mọi designer, photographer, video editor, sound designer. Hiểu khi nào cần bit depth cao và khi nào 8-bit đủ giúp bạn tiết kiệm dung lượng mà không hy sinh quality không cần thiết.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Bit Depth là gì?</h2>
  <p>Bit Depth là số bit dùng để biểu diễn thông tin của mỗi pixel (cho ảnh/video) hoặc mỗi sample (cho audio). Với n-bit, số mức giá trị có thể có là 2^n. Ví dụ 8-bit = 256 mức, 10-bit = 1024 mức, 16-bit = 65,536 mức.</p>
  <p>Bit depth ảnh hưởng trực tiếp đến độ mịn chuyển sắc (gradient banding), dải dynamic và precision khi xử lý hậu kỳ. Càng nhiều bit, càng có nhiều &quot;room&quot; cho edit mà không gây artifact — đặc biệt quan trọng với color grading, retouch nặng.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">8-bit đủ cho output, 16-bit cho làm việc</span>
    <p>Mắt người không phân biệt được nhiều hơn ~10 triệu màu trong điều kiện thường — 8-bit (16.7 triệu màu) gần đủ cho display. Tuy nhiên khi <em>edit</em>, mỗi adjustment có thể &quot;tròn số&quot; và mất precision. Làm việc trong 16-bit, xuất 8-bit là workflow chuẩn để tránh banding xuất hiện sau adjustments.</p>
  </div>

  <ul class="arc-list">
    <li><strong>8-bit / channel (24-bit total cho RGB)</strong> — 256 mức/kênh, chuẩn web, JPEG, social</li>
    <li><strong>10-bit</strong> — 1024 mức/kênh, chuẩn HDR video, ProRes 422 HQ</li>
    <li><strong>12-bit</strong> — RAW camera cao cấp, BMPCC, Blackmagic RAW</li>
    <li><strong>16-bit integer</strong> — chuẩn làm việc Photoshop, TIFF</li>
    <li><strong>32-bit float</strong> — HDR, VFX, EXR; có thể biểu diễn giá trị &gt;1 và &lt;0</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"bit depth comparison 8 bit 16 bit gradient banding example"</span>
    </div>
    <p class="arc-image-caption">So sánh 8-bit và 16-bit gradient — 8-bit có banding rõ, 16-bit mượt mà</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Bit Depth cho từng loại media</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Photo &amp; Image</summary>
      <div class="arc-card-body">
        <p><strong>JPEG</strong>: 8-bit/channel. <strong>PNG</strong>: 8 hoặc 16-bit/channel. <strong>TIFF/PSD</strong>: 8, 16, 32-bit/channel. <strong>RAW camera</strong>: 12-14-bit (compressed) giữ thông tin highlight/shadow tối đa cho hậu kỳ.</p>
        <p>Workflow chuẩn: chụp RAW (14-bit), edit Lightroom/Photoshop (16-bit), export JPEG 8-bit cho web.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Video</summary>
      <div class="arc-card-body">
        <p><strong>H.264 web/SDR</strong>: 8-bit (4:2:0 chroma). <strong>HDR streaming</strong>: 10-bit (4:2:0). <strong>ProRes 422 HQ</strong>: 10-bit (4:2:2). <strong>ProRes 4444 / RAW</strong>: 12-bit. Higher bit depth cho headroom color grading.</p>
        <p>YouTube/Netflix HDR yêu cầu 10-bit output. SDR phổ thông vẫn 8-bit.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>VFX / 3D Render</title>
      <div class="arc-card-body">
        <p><strong>EXR 16-bit half float hoặc 32-bit float</strong> chuẩn — chứa HDR data (highlight &gt;1). Cho phép tweak exposure ở post mà không lose highlight.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Audio</summary>
      <div class="arc-card-body">
        <p><strong>16-bit (CD quality)</strong>: 96 dB dynamic range, đủ cho output cuối. <strong>24-bit</strong>: 144 dB dynamic range, chuẩn cho recording và editing. <strong>32-bit float</strong>: dynamic range gần như vô hạn, không bao giờ clip — phổ biến trên field recorder hiện đại.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Bit Depth trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photo Edit</h3>
    <ul class="arc-list">
      <li>Mở file RAW trong Lightroom/Camera Raw — 14-bit data preserved</li>
      <li>Photoshop work trong 16-bit (Image → Mode → 16 Bits/Channel)</li>
      <li>Export final JPEG 8-bit cho web; TIFF 16-bit cho in cao cấp</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Video Color Grading</h3>
    <ul class="arc-list">
      <li>Quay Log 10-bit (S-Log, Log-C) để có headroom grading</li>
      <li>Edit ProRes 422 HQ hoặc cao hơn — không H.264 cho grading</li>
      <li>HDR project: 10-bit pipeline end-to-end</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX &amp; Animation</h3>
    <ul class="arc-list">
      <li>Render EXR 16-bit half float cho comp — đủ precision và không lose HDR</li>
      <li>Texture: 8-bit cho color, 16-bit cho height/displacement</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Audio Production</h3>
    <ul class="arc-list">
      <li>Recording 24-bit, output 16-bit cho CD/streaming</li>
      <li>Field recording 32-bit float — không bao giờ lo gain quá lớn/nhỏ</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Gradient bị banding sau edit</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> làm việc 8-bit, mỗi adjustment làm mất precision tích lũy.</p>
        <p><strong>Cách fix:</strong> chuyển sang 16-bit ngay đầu workflow. Hoặc add dither (1% noise) lên gradient để &quot;break&quot; banding.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Video bị posterize khi grading H.264 source</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> H.264 8-bit không có data cho color grading mạnh.</p>
        <p><strong>Cách fix:</strong> grade ít hơn, hoặc chuyển sang quay 10-bit (ProRes/BRAW) cho project có grading.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>File 16-bit quá lớn, ổ cứng đầy</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> mỗi pixel 16-bit gấp 2x dung lượng 8-bit.</p>
        <p><strong>Cách fix:</strong> chỉ giữ 16-bit cho master file. Output cho client/web giảm xuống 8-bit. Archive với compression (TIFF LZW, PNG).</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 10. Bitrate
  {
    id: "784a6dcd-b9cd-42aa-adf3-c1bb684e6050",
    tieu_de: "Bitrate",
    tieu_de_viet: "Tốc độ bit (Bitrate)",
    tom_tat:
      "Bitrate là lượng dữ liệu được truyền hoặc xử lý mỗi giây — quyết định chất lượng và dung lượng video/audio. Càng cao thì càng đẹp/nét nhưng càng tốn dung lượng.",
    meta_title: "Bitrate là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Bitrate quyết định chất lượng video, audio. Tìm hiểu CBR vs VBR, bitrate chuẩn cho YouTube, Netflix, streaming và cách chọn cho từng platform.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn quay video 4K 60fps đẹp lung linh, upload YouTube — chất lượng bị nén &quot;mờ&quot; đi không còn như file gốc. Bạn xuất video webinar 1Gbps cho đối tác — file 50GB họ không tải nổi. Hai vấn đề trái ngược nhưng cùng gốc: bitrate. Đây là tham số quyết định trade-off giữa chất lượng và dung lượng.</p>
  <p>Bitrate là một trong những kiến thức kỹ thuật quan trọng nhất cho video editor, streamer, audio engineer. Hiểu đúng bitrate giúp tối ưu export cho từng platform mà không hy sinh quality cần thiết.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Bitrate là gì?</h2>
  <p>Bitrate là lượng dữ liệu được truyền hoặc lưu trữ trong mỗi đơn vị thời gian — thường tính bằng kilobit/second (kbps) hoặc megabit/second (Mbps). Cho video và audio, bitrate quyết định &quot;ngân sách&quot; data dùng cho mỗi giây nội dung — càng nhiều bit, càng nhiều thông tin được lưu, chất lượng càng cao.</p>
  <p>Bitrate khác với resolution (4K, 1080p) và frame rate (24, 30, 60 fps). Có thể có 4K bitrate thấp (mờ nhòe) hoặc 1080p bitrate cao (rất nét). Bitrate là yếu tố cuối cùng quyết định visual/audio quality sau khi đã chọn resolution và fps.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Bitrate cao không đảm bảo chất lượng tốt</span>
    <p>Codec quan trọng không kém. H.265/HEVC nén tốt hơn H.264 ~50% — H.265 8 Mbps chất lượng tương đương H.264 16 Mbps. AV1 còn nén tốt hơn nữa. Khi so bitrate, phải so cùng codec mới có ý nghĩa.</p>
  </div>

  <ul class="arc-list">
    <li><strong>CBR (Constant Bitrate)</strong> — bitrate cố định mỗi giây</li>
    <li><strong>VBR (Variable Bitrate)</strong> — bitrate biến thiên theo độ phức tạp scene</li>
    <li><strong>2-pass encoding</strong> — pass 1 phân tích, pass 2 encode VBR tối ưu</li>
    <li><strong>Target bitrate</strong> — bitrate mục tiêu trung bình</li>
    <li><strong>Maximum bitrate</strong> — giới hạn cao cho VBR, tránh spike</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"bitrate comparison video quality low high example"</span>
    </div>
    <p class="arc-image-caption">So sánh video bitrate thấp (artifact, mờ) vs cao (nét, mượt)</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Bitrate chuẩn cho từng platform</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>YouTube — recommended bitrate</summary>
      <div class="arc-card-body">
        <ul class="arc-list">
          <li>1080p 30fps SDR: 8 Mbps</li>
          <li>1080p 60fps SDR: 12 Mbps</li>
          <li>4K 30fps SDR: 35-45 Mbps</li>
          <li>4K 60fps SDR: 53-68 Mbps</li>
          <li>4K HDR 60fps: 66-85 Mbps</li>
        </ul>
        <p>YouTube re-encode tất cả video — upload bitrate cao để giữ chất lượng sau encode lại.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Netflix / Disney+ / Apple TV+</summary>
      <div class="arc-card-body">
        <p>Streaming bitrate: 5-25 Mbps tùy quality tier và bandwidth user. Deliverable yêu cầu master 50+ Mbps ProRes 422 HQ hoặc tương đương.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Instagram / TikTok</summary>
      <div class="arc-card-body">
        <p>Upload bitrate cao (~10-15 Mbps cho 1080p) — platform re-encode mạnh. Bitrate quá thấp sẽ thấy artifact rõ.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Twitch &amp; Live Streaming</summary>
      <div class="arc-card-body">
        <p>1080p 60fps Twitch: 6000 kbps (Affiliate); 8000 kbps (Partner). Live streaming dùng CBR cho stable bandwidth.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Audio bitrate</summary>
      <div class="arc-card-body">
        <ul class="arc-list">
          <li>Podcast/voice: 96-128 kbps AAC/MP3</li>
          <li>Music streaming Spotify: 96 kbps (Free), 160-320 kbps (Premium)</li>
          <li>Tidal Master: lossless ~1411 kbps FLAC</li>
        </ul>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Bitrate trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Video Editor / YouTuber</h3>
    <ul class="arc-list">
      <li>Master export: ProRes 422 HQ (~150 Mbps cho 1080p) — không nén lossy</li>
      <li>Web export: H.264 với target bitrate phù hợp platform</li>
      <li>VBR 2-pass cho chất lượng cao nhất ở dung lượng nhất định</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Streaming &amp; Live</h3>
    <ul class="arc-list">
      <li>CBR — bitrate cố định để bandwidth ổn định</li>
      <li>OBS Studio: set CBR, target bitrate theo platform</li>
      <li>Test trước stream để đảm bảo upload speed đủ</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Podcast &amp; Audio</h3>
    <ul class="arc-list">
      <li>Final export 128 kbps AAC stereo (hoặc 96 kbps mono cho voice-only)</li>
      <li>Loudness normalization về -16 LUFS cho streaming</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Broadcast &amp; Delivery</h3>
    <ul class="arc-list">
      <li>Network TV deliverable: ProRes 422 HQ hoặc DNxHR HQX</li>
      <li>Master loudness -23 LUFS (EBU R128 broadcast standard)</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp và cách tránh</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Video upload YouTube bị mờ nhòe</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> upload bitrate thấp → sau khi YouTube re-encode, chất lượng tụt thêm.</p>
        <p><strong>Cách fix:</strong> upload với bitrate cao gấp 1.5-2x recommended của YouTube. Vd 4K 60fps: 80-100 Mbps thay vì 53.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>File export quá nặng, đối tác không tải</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> bitrate quá cao cho use case review.</p>
        <p><strong>Cách fix:</strong> export review version với bitrate thấp (H.264 5-10 Mbps cho 1080p). Master file giữ riêng cho archive.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Stream bị buffering / drop frames</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> bitrate cao hơn upload speed.</p>
        <p><strong>Cách fix:</strong> test upload speed (speedtest.net), set CBR bitrate &lt; 80% upload speed. Giảm fps hoặc resolution nếu cần.</p>
      </div>
    </details>
  </div>
</section>
`,
  },
];

console.log(`\n── Bắt đầu chạy ${items.length} bài keyword đợt 1.3 ──\n`);

const results: { tieu_de: string; do_dai?: number; error?: string }[] = [];

for (const it of items) {
  const sql = `UPDATE article_bai_viet SET
  tieu_de             = '${esc(it.tieu_de)}',
  tieu_de_viet        = '${esc(it.tieu_de_viet)}',
  tom_tat             = '${esc(it.tom_tat)}',
  meta_title          = '${esc(it.meta_title)}',
  meta_description    = '${esc(it.meta_description)}',
  trang_thai_noi_dung = 'published',
  noi_dung            = $noidung$${it.noi_dung}$noidung$
WHERE id = '${it.id}'
  AND loai_bai_viet = 'keyword'
RETURNING id, slug, tieu_de, LENGTH(noi_dung) AS do_dai;
`;

  try {
    const res = await runAdminSql(sql, "full");
    const row = res.rows?.find(
      (r) => r && typeof r === "object" && "do_dai" in r,
    ) as { do_dai?: string | number; tieu_de?: string } | undefined;
    const doDai =
      typeof row?.do_dai === "string" ? Number(row.do_dai) : row?.do_dai;
    if (typeof doDai === "number" && doDai > 800) {
      console.log(`✓ ${it.tieu_de} — ${doDai} ký tự`);
      results.push({ tieu_de: it.tieu_de, do_dai: doDai });
    } else {
      console.log(`⚠ ${it.tieu_de} — do_dai = ${doDai} (cần > 800)`);
      results.push({ tieu_de: it.tieu_de, do_dai: doDai, error: "too_short" });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`✗ ${it.tieu_de} — ${msg}`);
    results.push({ tieu_de: it.tieu_de, error: msg });
  }
}

const remain = await runAdminSql(
  `SELECT COUNT(*) AS con_lai_dot1
FROM article_bai_viet
WHERE loai_bai_viet = 'keyword'
  AND (noi_dung IS NULL OR noi_dung = '')
  AND tieu_de < 'I'`,
  "read",
);
const conLai = remain.rows?.[0]?.con_lai_dot1;

console.log(`\nCòn lại đợt 1: ${conLai} bài.`);
