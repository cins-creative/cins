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
  // 01. Diffuse
  {
    id: "29a3a9d8-6f00-48dc-9dbc-4b55b336a56f",
    tieu_de: "Diffuse",
    tieu_de_viet: "Diffuse Map (texture màu cơ bản)",
    tom_tat:
      "Diffuse Map (còn gọi Albedo Map trong PBR) là texture map định nghĩa màu sắc cơ bản của bề mặt 3D — không có thông tin ánh sáng/bóng đổ. Texture nền tảng nhất trong texturing.",
    meta_title: "Diffuse là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Diffuse Map là texture màu cơ bản trong 3D. Tìm hiểu khác biệt với Albedo, Specular và workflow PBR texturing chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn tô màu cho một mô hình 3D — đặt mỗi pixel của bề mặt một màu cụ thể. Đó là diffuse map (hoặc albedo trong PBR). Đây là texture nền tảng nhất — nhìn vào file PNG là biết mặt nào màu gì. Hiểu diffuse là bước đầu của mọi 3D artist khi học texturing.</p>
  <p>Diffuse Map là kiến thức cơ bản nhất nhưng quan trọng nhất cho 3D artist. Hiểu diffuse vs albedo, cách bake và workflow PBR giúp tạo material chuyên nghiệp — base cho mọi map khác (specular, roughness, normal).</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Diffuse là gì?</h2>
  <p>Diffuse Map là texture 2D mô tả màu sắc cơ bản của một bề mặt 3D — màu mà bạn thấy khi ánh sáng trắng &quot;khuếch tán&quot; (diffuse) đều trên surface. Là kênh thông tin cơ bản nhất trong texturing, đầu tiên được tạo trước các map khác (normal, specular, roughness).</p>
  <p>Trong workflow PBR (Physically-Based Rendering) hiện đại, diffuse map được thay bằng <strong>Albedo Map</strong> — về cơ bản tương tự nhưng không chứa lighting baked in (không có shadow, AO, highlight). Albedo là &quot;color thuần&quot; — phản ánh hệ số phản xạ diffuse tinh khiết của bề mặt.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Diffuse vs Albedo — khác nhau ra sao?</span>
    <p><strong>Diffuse</strong> (old workflow): có thể chứa lighting baked (shadow, AO), thường dùng với specular workflow cũ. <strong>Albedo</strong> (PBR workflow): pure color, không lighting, dùng với metallic/roughness workflow. PBR hiện đại = Albedo. Nhiều người vẫn dùng &quot;diffuse&quot; như đồng nghĩa albedo trong conversation casual.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Color value</strong> — RGB color cho mỗi pixel</li>
    <li><strong>No lighting info</strong> — albedo không có shadow/highlight</li>
    <li><strong>UV-mapped</strong> — phải có UV unwrap để apply lên mesh</li>
    <li><strong>Resolution</strong> — 512, 1024, 2048, 4096 px tùy quality target</li>
    <li><strong>Color Space</strong> — sRGB cho color map (khác linear cho normal)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"diffuse albedo map 3D texture PBR substance"</span>
    </div>
    <p class="arc-image-caption">Diffuse/Albedo map — color thuần của surface, không có lighting baked</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Workflow Texturing với Diffuse</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. UV Unwrap</summary>
      <div class="arc-card-body">
        <p>Trước khi paint diffuse, mesh phải có UV unwrap clean — non-overlapping, efficient layout. UV quality quyết định texture quality.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Base color block-in</summary>
      <div class="arc-card-body">
        <p>Apply base color cho mỗi material zone — wood brown, metal gray, leather black. Quick block-in trước detail.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Detail painting</summary>
      <div class="arc-card-body">
        <p>Add color variation, dirt, wear, branding. Substance Painter smart materials làm step này efficient.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Other maps generation</summary>
      <div class="arc-card-body">
        <p>Sau khi có albedo solid, generate các map khác: roughness, metallic, normal, height. Tất cả align cùng UV.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Test trong renderer / engine</summary>
      <div class="arc-card-body">
        <p>Import vào engine target (Unreal, Unity) hoặc renderer (V-Ray, Arnold). Test với multiple lighting setup.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Diffuse trong từng pipeline</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">PBR Metallic/Roughness (hiện đại)</h3>
    <ul class="arc-list">
      <li>Albedo + Metallic + Roughness + Normal + AO</li>
      <li>Chuẩn cho game (Unreal, Unity), modern render (Arnold, V-Ray)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">PBR Specular/Glossiness</h3>
    <ul class="arc-list">
      <li>Albedo (or diffuse) + Specular + Glossiness + Normal</li>
      <li>Alternative workflow, popular ở một số studio film</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Legacy Diffuse + Specular</h3>
    <ul class="arc-list">
      <li>Old workflow trước PBR: Diffuse có thể có lighting baked</li>
      <li>Vẫn dùng cho mobile game tối ưu, stylized art</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Stylized / Hand-painted</h3>
    <ul class="arc-list">
      <li>Diffuse với lighting painted thủ công (rim light, AO baked)</li>
      <li>WoW, Overwatch, Hearthstone style</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Lỗi thường gặp với Diffuse Map</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Albedo quá sáng hoặc quá tối</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> không follow PBR value range — albedo phải nằm trong 30-240 sRGB.</p>
        <p><strong>Cách fix:</strong> kiểm tra trong Substance Painter PBR validation. Pure black/white không bao giờ tồn tại trong vật liệu thực.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lighting baked into albedo</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> AO, shadow paint vào diffuse — old workflow.</p>
        <p><strong>Cách fix:</strong> trong PBR, albedo phải lighting-free. AO làm map riêng. Engine sẽ combine.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Color space sai</summary>
      <div class="arc-card-body">
        <p><strong>Nguyên nhân:</strong> albedo import sRGB → linear conversion lỗi.</p>
        <p><strong>Cách fix:</strong> set texture import settings: albedo = sRGB, normal/roughness = linear (raw).</p>
      </div>
    </details>
  </div>
</section>
`,
  },

  // 02. DSP
  {
    id: "472c56f9-c8f2-493f-9d79-f7b34fae9627",
    tieu_de: "Digital Signal Processing (DSP)",
    tieu_de_viet: "Xử lý tín hiệu số (DSP)",
    tom_tat:
      "DSP (Digital Signal Processing) là xử lý tín hiệu âm thanh/hình ảnh bằng thuật toán số — cơ sở của mọi hiệu ứng audio (EQ, compression, reverb) và image processing hiện đại.",
    meta_title: "DSP là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "DSP (Digital Signal Processing) xử lý tín hiệu audio/video số. Tìm hiểu EQ, compression, reverb và ứng dụng trong music production, post-production.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn nghe một bài hát có vocal sạch hơn nhờ noise reduction, có không gian rộng nhờ reverb, có dynamics cân nhờ compression. Hoặc bạn thấy ảnh được denoise smooth, sharpened nét chi tiết. Tất cả đều là DSP — Digital Signal Processing — toán học và thuật toán xử lý signal số.</p>
  <p>DSP là kiến thức nền tảng cho audio engineer, sound designer, video editor. Hiểu cơ chế DSP giúp dùng tool hiệu quả hơn — không chỉ &quot;turn knob until sounds good&quot;, mà hiểu vì sao knob đó tồn tại.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>DSP là gì?</h2>
  <p>Digital Signal Processing (DSP) là lĩnh vực toán học và kỹ thuật xử lý các tín hiệu (signal) ở dạng số — audio, video, image, dữ liệu sensor. DSP chuyển signal analog (continuous) thành digital (discrete samples), áp thuật toán toán học (FFT, convolution, filtering), rồi có thể convert ngược về analog.</p>
  <p>Mọi audio plugin trong DAW (EQ, compression, reverb, autotune), mọi image filter trong Photoshop (blur, sharpen, denoise), mọi video effect đều dựa trên DSP. Hiện đại còn được AI accelerate (denoising AI, voice cleanup AI).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Analog vs Digital</span>
    <p><strong>Analog</strong>: continuous signal, vô hạn precision (theory). Hardware preamp, tube compressor classic. <strong>Digital</strong>: sampled discrete points, quantized — finite precision. Nhưng modern sampling (192kHz, 32-bit float) đã vượt audible limit của ear. DSP cho phép manipulation impossibly precise so với analog.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Sample Rate</strong> — số sample/giây (44.1, 48, 96, 192 kHz)</li>
    <li><strong>Bit Depth</strong> — precision của mỗi sample (16, 24, 32-bit float)</li>
    <li><strong>FFT (Fast Fourier Transform)</strong> — convert signal sang frequency domain</li>
    <li><strong>Convolution</strong> — combine 2 signals (cơ sở của convolution reverb)</li>
    <li><strong>Filter</strong> — chọn lọc tần số (low-pass, high-pass, band-pass)</li>
    <li><strong>Latency</strong> — delay khi process</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"digital signal processing audio waveform spectrum"</span>
    </div>
    <p class="arc-image-caption">DSP — signal trong time domain (waveform) và frequency domain (spectrum)</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các ứng dụng DSP phổ biến</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>EQ (Equalization)</summary>
      <div class="arc-card-body">
        <p>Tăng/giảm tần số cụ thể. Parametric EQ control frequency, gain, Q. Cơ sở: filter design — Butterworth, Chebyshev, Bessel.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Compression / Limiting</summary>
      <div class="arc-card-body">
        <p>Nén dynamics — giảm signal mạnh, giữ signal yếu. Threshold, ratio, attack, release control behavior. Cốt lõi cho mixing, mastering.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Reverb &amp; Delay</summary>
      <div class="arc-card-body">
        <p>Algorithmic reverb (Schroeder, Moorer algorithms). Convolution reverb dùng impulse response của không gian thật. Tạo cảm giác không gian.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pitch Shift / Time Stretch</summary>
      <div class="arc-card-body">
        <p>Đổi pitch không đổi tempo (vice versa). Autotune, Melodyne dùng phase vocoder. Time-stretching dùng PSOLA hoặc spectral methods.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Noise Reduction</summary>
      <div class="arc-card-body">
        <p>Spectral subtraction — phân tích noise profile, subtract khỏi signal. iZotope RX là gold standard. AI-based denoising mới (Adobe Podcast Enhance, NVIDIA Voice).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Saturation &amp; Distortion</summary>
      <div class="arc-card-body">
        <p>Add harmonic distortion — tube emulation, tape emulation. Soft clipping cho warmth, hard clipping cho aggression.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>DSP trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Music Production</h3>
    <ul class="arc-list">
      <li>DAW (Pro Tools, Logic, Ableton) — DSP heavy trong mixing/mastering</li>
      <li>Plugin: FabFilter, Waves, iZotope — top DSP plugin makers</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Post-Production Audio</h3>
    <ul class="arc-list">
      <li>iZotope RX cho restoration — dialogue cleanup, denoising</li>
      <li>Convolution reverb với IR của các không gian famous (Abbey Road, Capitol)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Video Editing</h3>
    <ul class="arc-list">
      <li>Audio DSP trong Premiere, Resolve — EQ, compression cho dialogue</li>
      <li>Image DSP — blur, sharpen, color grading</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Live Sound</h3>
    <ul class="arc-list">
      <li>Digital mixer (Yamaha, Behringer X32) DSP-based</li>
      <li>System processor (BSS, DBX) cho FOH speaker tuning</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">AI Audio Processing</h3>
    <ul class="arc-list">
      <li>Voice cleanup AI (Adobe Podcast, Krisp)</li>
      <li>Stem separation (Spleeter, iZotope RX Music Rebalance)</li>
    </ul>
  </div>
</section>
`,
  },

  // 03. Direct X
  {
    id: "51344128-916c-4ec3-af1f-0bcfaa429c42",
    tieu_de: "DirectX",
    tieu_de_viet: "DirectX (Microsoft Graphics API)",
    tom_tat:
      "DirectX là tập hợp API của Microsoft xử lý đa phương tiện — đặc biệt graphics và game. DirectX 12 và 12 Ultimate là chuẩn cho game PC và Xbox hiện nay.",
    meta_title: "DirectX là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "DirectX là API graphics của Microsoft cho game và đồ họa Windows. Tìm hiểu DirectX 12, ray tracing và khác biệt với Vulkan, Metal.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn install một game PC mới — system requirement yêu cầu &quot;DirectX 12 Ultimate&quot;. Game console Xbox Series X cũng dùng DirectX. Đây là API graphics quan trọng nhất trên Windows, nền tảng cho mọi game AAA Windows từ những năm 1990 đến hôm nay.</p>
  <p>DirectX là kiến thức kỹ thuật cho game developer làm việc trên Windows/Xbox. Hiểu DirectX (vs Vulkan, OpenGL, Metal) giúp graphics programmer chọn pipeline đúng và artist hiểu performance constraint trên Windows.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>DirectX là gì?</h2>
  <p>DirectX là tập hợp các API (Application Programming Interface) do Microsoft phát triển cho phép phần mềm tương tác trực tiếp với hardware đa phương tiện trên Windows và Xbox. Bao gồm nhiều thành phần: Direct3D (3D graphics — quan trọng nhất), DirectSound (audio), DirectInput (controller/keyboard/mouse), Direct2D (2D graphics).</p>
  <p>Direct3D (phần quan trọng nhất của DirectX) chuyển command từ game engine xuống GPU driver, GPU driver gửi xuống GPU. Modern DirectX 12 là &quot;low-level&quot; — game engine có control sâu hơn, kết quả performance tốt hơn nhưng phức tạp hơn để code.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">DirectX vs Vulkan vs Metal</span>
    <p><strong>DirectX</strong>: Microsoft, Windows + Xbox. <strong>Vulkan</strong>: Khronos Group (open standard), cross-platform (Windows, Linux, Android). <strong>Metal</strong>: Apple, macOS + iOS. <strong>OpenGL</strong>: legacy cross-platform, đang dần bị thay thế. Mỗi platform có API riêng — game multi-platform phải implement cho từng API hoặc dùng game engine abstract over chúng (Unreal, Unity).</p>
  </div>

  <ul class="arc-list">
    <li><strong>Direct3D 12</strong> — graphics API hiện đại của DirectX</li>
    <li><strong>DirectX 12 Ultimate</strong> — bao gồm DXR (ray tracing), Mesh Shaders, VRS</li>
    <li><strong>DXR (DirectX Raytracing)</strong> — hardware ray tracing API</li>
    <li><strong>HLSL</strong> — High-Level Shader Language cho DirectX</li>
    <li><strong>Feature Level</strong> — hardware capability tier</li>
    <li><strong>WARP</strong> — software renderer fallback</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"directx 12 ultimate graphics API game windows xbox"</span>
    </div>
    <p class="arc-image-caption">DirectX 12 Ultimate logo — chuẩn cho game graphics modern trên Windows/Xbox</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các thành phần của DirectX</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Direct3D — 3D Graphics</summary>
      <div class="arc-card-body">
        <p>Quan trọng nhất. Vẽ 3D scene — vertex processing, rasterization, pixel shading. Từ Direct3D 1 (1995) đến Direct3D 12 (2015), DirectX 12 Ultimate (2020).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>DirectX Raytracing (DXR)</summary>
      <div class="arc-card-body">
        <p>API cho hardware-accelerated ray tracing. Nâng cấp với RTX GPU. Microsoft đẩy mạnh cho game realistic lighting, reflection.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>HLSL — Shader Language</summary>
      <div class="arc-card-body">
        <p>High-Level Shader Language — viết shader cho DirectX. Tương tự GLSL (Vulkan/OpenGL). Compile sang DXIL bytecode.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>DirectStorage</summary>
      <div class="arc-card-body">
        <p>API load asset từ SSD trực tiếp xuống GPU memory — bypass CPU. Quan trọng cho game open-world với asset khổng lồ.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>DirectSound / XAudio2</summary>
      <div class="arc-card-body">
        <p>Audio APIs. DirectSound legacy, XAudio2 modern thay thế. Phổ biến cho audio game.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>DirectInput / XInput</summary>
      <div class="arc-card-body">
        <p>Input handling. XInput cho gamepad Xbox controller. DirectInput cho legacy controller.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>DirectX trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Development Windows/Xbox</h3>
    <ul class="arc-list">
      <li>Game AAA PC dùng DirectX 12 — Cyberpunk, Call of Duty</li>
      <li>Xbox Series X|S native DirectX 12 Ultimate</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game Engines</h3>
    <ul class="arc-list">
      <li>Unreal, Unity support cả DirectX và Vulkan trên Windows</li>
      <li>Game artist không touch DirectX directly — engine abstract</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Graphics Programming</h3>
    <ul class="arc-list">
      <li>Engine programmer, graphics programmer work với DirectX directly</li>
      <li>Custom engine pipeline, optimization low-level</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3D Software</h3>
    <ul class="arc-list">
      <li>Maya, 3ds Max, Blender viewport dùng DirectX hoặc OpenGL</li>
      <li>Substance Painter, Marmoset viewport — modern DirectX/Vulkan</li>
    </ul>
  </div>
</section>
`,
  },

  // 04. Dolby Atmos
  {
    id: "fbbcb009-b87e-4b04-be23-3f238a4fc0e5",
    tieu_de: "Dolby Atmos",
    tieu_de_viet: "Dolby Atmos (âm thanh không gian)",
    tom_tat:
      "Dolby Atmos là công nghệ âm thanh object-based — thêm chiều cao (height channels) cho surround sound 3D. Chuẩn cho rạp phim cao cấp, home theater, streaming và music immersive.",
    meta_title: "Dolby Atmos là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Dolby Atmos là âm thanh 3D object-based với height channels. Tìm hiểu pipeline mix Atmos, ứng dụng phim, music streaming, gaming.",
    noi_dung: `
<section class="arc-intro">
  <p>Trong rạp phim cao cấp xem Marvel — bạn không chỉ nghe âm thanh xung quanh mà còn từ trên trần, tiếng mưa rơi trên đỉnh đầu, máy bay bay qua. Hoặc nghe Apple Music Spatial Audio với tai nghe — instrument có vị trí 3D rõ ràng. Đây là Dolby Atmos — chuẩn âm thanh đỉnh cao của decade 2020s.</p>
  <p>Dolby Atmos là kiến thức quan trọng cho sound designer, music producer, video editor modern. Hiểu pipeline Atmos giúp deliver content cho platform yêu cầu (Netflix, Apple, Tidal) và nâng quality audio production lên tầm cao mới.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Dolby Atmos là gì?</h2>
  <p>Dolby Atmos là công nghệ âm thanh không gian (spatial audio) của Dolby Labs, ra mắt 2012. Thêm các kênh âm thanh ở trên đầu (height channels) cho hệ thống surround truyền thống, và sử dụng <strong>object-based audio</strong> — mỗi sound source có vị trí 3D (X, Y, Z) thay vì gắn cố định vào loa nhất định.</p>
  <p>Khác hẳn 5.1, 7.1 (channel-based — mỗi kênh gắn loa cụ thể), Atmos cho phép mix engineer đặt object ở bất kỳ vị trí 3D nào. Tại playback, system tự render object thành output phù hợp với cấu hình loa thực tế (rạp 64 loa, soundbar 5 loa, tai nghe binaural — đều xử lý từ cùng mix Atmos master).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Object-based vs Channel-based</span>
    <p><strong>Channel-based (5.1)</strong>: mỗi track gắn loa cụ thể — Left, Right, Center, LFE, Surround Left, Surround Right. <strong>Object-based (Atmos)</strong>: mỗi sound là object với metadata vị trí 3D. Renderer assign object → loa available tại playback. Atmos tương thích ngược với 5.1, 7.1 — render xuống được.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Object</strong> — sound source với vị trí 3D dynamic</li>
    <li><strong>Bed</strong> — channel-based foundation layer (7.1.2)</li>
    <li><strong>Height Channels</strong> — loa trên trần</li>
    <li><strong>Renderer</strong> — quyết định output theo speaker layout</li>
    <li><strong>Binaural Render</strong> — Atmos rendered xuống tai nghe</li>
    <li><strong>ADM BWF</strong> — file format Atmos master</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"dolby atmos speaker setup home theater object based"</span>
    </div>
    <p class="arc-image-caption">Atmos setup — speakers xung quanh + speakers trên trần cho âm thanh 3D</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Atmos trong từng lĩnh vực</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Cinema (rạp phim)</summary>
      <div class="arc-card-body">
        <p>Rạp Atmos có 64+ loa (Dolby spec). Đầu tư lớn nhưng experience premium. Phim mix Atmos: Marvel, Disney, A24 — phổ biến cho phim cao cấp.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Home Theater &amp; TV</summary>
      <div class="arc-card-body">
        <p>Atmos cho home: soundbar (Sonos Arc, Samsung HW-Q990), AV receiver + speakers (5.1.2, 7.1.4). TV Atmos-enabled (LG OLED, Samsung). Apple TV 4K, Xbox, PS5 đều support.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Streaming</summary>
      <div class="arc-card-body">
        <p>Netflix, Disney+, Apple TV+ stream Atmos. Phim/series mix Atmos thường có tier streaming cao (premium subscription).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Music Immersive</summary>
      <div class="arc-card-body">
        <p>Apple Music Spatial Audio (Atmos-based), Amazon Music HD, Tidal — stream music Atmos. Artist mix master cho cả stereo và Atmos.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Gaming</summary>
      <div class="arc-card-body">
        <p>Xbox Series X|S Atmos out of box. PC game support Atmos qua Dolby Atmos for Headphones app. Sony PS5 có competing Tempest 3D Audio.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>VR &amp; AR</summary>
      <div class="arc-card-body">
        <p>Meta Quest, Apple Vision Pro support spatial audio (similar concept). Atmos để deliver content cho headset.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Pipeline Mix Atmos</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">DAW Setup</h3>
    <ul class="arc-list">
      <li>Pro Tools Ultimate native — chuẩn industry</li>
      <li>Logic Pro 10.7+ có Atmos workflow</li>
      <li>Nuendo, Cubase support cũng</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Studio Setup</h3>
    <ul class="arc-list">
      <li>7.1.4 monitor configuration tối thiểu — 7 ground speakers + 1 sub + 4 height</li>
      <li>Acoustic treatment quan trọng cho height channel reflection</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Workflow</h3>
    <ul class="arc-list">
      <li>Mix bed channels (7.1.2) trước</li>
      <li>Object route từ track có positional movement</li>
      <li>Pan object trong 3D space (Pro Tools 3D panner)</li>
      <li>Render binaural cho headphone monitoring</li>
      <li>Output ADM BWF cho deliver</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Deliverable</h3>
    <ul class="arc-list">
      <li>ADM BWF master file</li>
      <li>Atmos for Cinema (DCP) hoặc Home (MP4 with Atmos)</li>
      <li>Apple Digital Master cho music streaming</li>
    </ul>
  </div>
</section>
`,
  },

  // 05. Dolby Vision
  {
    id: "96d3d847-c0be-4ea7-9be1-0c98d6d7a7e0",
    tieu_de: "Dolby Vision",
    tieu_de_viet: "Dolby Vision (HDR cao cấp)",
    tom_tat:
      "Dolby Vision là chuẩn HDR cao cấp với metadata động theo từng cảnh — hỗ trợ 10,000 nits, 12-bit màu. Chất lượng hình ảnh tốt hơn HDR10 trên màn hình tương thích.",
    meta_title: "Dolby Vision là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Dolby Vision là HDR cao cấp với dynamic metadata. Tìm hiểu khác biệt với HDR10, workflow grading và ứng dụng trong streaming, cinema.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem cùng phim trên Netflix — trên TV thường thấy hình &quot;ổn&quot;, trên TV Dolby Vision-capable thấy highlight rực sáng, shadow detail rõ, color rất rich. Cùng nguồn nhưng experience khác biệt rõ rệt. Dolby Vision là một trong những bước tiến lớn nhất về chất lượng hình ảnh video trong thập kỷ qua.</p>
  <p>Dolby Vision là kiến thức quan trọng cho colorist, DOP, content creator làm việc cho platform streaming cao cấp. Hiểu Dolby Vision (vs HDR10) giúp pipeline production đúng cho deliverable, và biết khi nào nên invest vào DV vs SDR/HDR10.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Dolby Vision là gì?</h2>
  <p>Dolby Vision là chuẩn HDR (High Dynamic Range) cao cấp của Dolby Labs, ra mắt 2014. Sử dụng <strong>dynamic metadata</strong> — instruction cho TV về cách hiển thị mỗi cảnh hoặc thậm chí mỗi frame, thay vì static metadata cho cả phim. Hỗ trợ lên tới 10,000 nits độ sáng (HDR10 max 1,000 nits) và 12-bit color depth (HDR10 = 10-bit).</p>
  <p>Khác HDR10 (open standard, miễn phí), Dolby Vision yêu cầu certification và license phí từ Dolby. Vì vậy mặc dù chất lượng tốt hơn, adoption không nhanh bằng HDR10. Tuy nhiên top tier streaming (Netflix, Disney+, Apple TV+) đều support Dolby Vision cho premium content.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Dolby Vision vs HDR10 vs HDR10+</span>
    <p><strong>HDR10</strong>: open standard, static metadata, 10-bit, 1000 nits. <strong>HDR10+</strong>: free alternative với dynamic metadata (Samsung pushed). <strong>Dolby Vision</strong>: license-based, dynamic metadata, 12-bit, 10,000 nits. Quality theory: Dolby Vision &gt; HDR10+ &gt; HDR10.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Dynamic Metadata</strong> — instruction theo từng cảnh hoặc frame</li>
    <li><strong>12-bit Color</strong> — 68 tỷ màu (vs 1 tỷ của 10-bit)</li>
    <li><strong>10,000 nits Peak</strong> — highlight bright tối đa</li>
    <li><strong>Trim Pass</strong> — colorist tune mỗi cảnh cho DV và SDR riêng</li>
    <li><strong>Content Mapping</strong> — TV tự adapt cho capability của nó</li>
    <li><strong>L1 / L2 / L8 Metadata</strong> — different levels of DV metadata</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"dolby vision HDR comparison metadata dynamic scene"</span>
    </div>
    <p class="arc-image-caption">Dolby Vision — dynamic metadata per scene, hỗ trợ 10,000 nits, 12-bit color</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Workflow Dolby Vision Grading</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Quay với Log + High Dynamic Range</summary>
      <div class="arc-card-body">
        <p>Camera capable: ARRI Alexa, RED, Sony Venice, Blackmagic URSA. Quay raw hoặc log với widest dynamic range. iPhone 12+ quay Dolby Vision native (mobile DV).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Master Grade in HDR (4000-1000 nits)</summary>
      <div class="arc-card-body">
        <p>DaVinci Resolve, Baselight với reference monitor HDR (Sony BVM-HX310, FSI). Master grade ở target 4000 nits (cinema) hoặc 1000 nits (home).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Dolby Vision Analyze</summary>
      <div class="arc-card-body">
        <p>Tool analyze grade và tự gen metadata L1 (min/max/avg per shot). Resolve có built-in DV tool.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Trim Pass</summary>
      <div class="arc-card-body">
        <p>Colorist tune mỗi shot cho display khác: 1000 nits, 600 nits, 100 nits SDR. DV tự interpolate giữa các trim point.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Encode &amp; Deliver</summary>
      <div class="arc-card-body">
        <p>Render với DV metadata embedded. Encode HEVC với DV profile (5, 7, 8.1, 8.4). Test trên DV-capable display.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Dolby Vision trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Streaming Services</h3>
    <ul class="arc-list">
      <li>Netflix Premium tier — DV cho top content (Stranger Things, etc.)</li>
      <li>Disney+ — Marvel, Star Wars in DV</li>
      <li>Apple TV+ — original content all in DV</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cinema</h3>
    <ul class="arc-list">
      <li>Dolby Cinema theatres — projector capable 4000 nits</li>
      <li>Premium tier rạp cao cấp ở Mỹ, EU, Asia</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Mobile Content</h3>
    <ul class="arc-list">
      <li>iPhone 12 Pro+ quay Dolby Vision native</li>
      <li>Workflow DV trên mobile rất accessible — không cần expensive camera</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">UHD Blu-ray</h3>
    <ul class="arc-list">
      <li>Top tier physical media support DV</li>
      <li>Quality cao nhất cho home cinema</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Gaming</h3>
    <ul class="arc-list">
      <li>Xbox Series X|S support DV gaming</li>
      <li>Limited title list nhưng growing</li>
    </ul>
  </div>
</section>
`,
  },

  // 06. Dope Sheet
  {
    id: "ee3f3239-ce3c-4a13-9ec7-1c26cd8bf9a9",
    tieu_de: "Dope Sheet",
    tieu_de_viet: "Bảng dope sheet (X-Sheet)",
    tom_tat:
      "Dope Sheet là bảng hiển thị keyframe theo timeline trong phần mềm animation — cho phép animator dễ dàng adjust timing và spacing. Khác Graph Editor (chỉnh giá trị curve), Dope Sheet focus vào keyframe position.",
    meta_title: "Dope Sheet là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Dope Sheet trong animation hiển thị keyframe theo thời gian. Tìm hiểu cách dùng Dope Sheet trong Maya, Blender và workflow timing animation.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn vừa block xong một cảnh animation 100 frame với 15 keyframe. Bạn muốn dời tất cả keyframe sang phải 5 frame để cảnh chậm hơn — trong Graph Editor phải drag từng curve, mất thời gian. Trong Dope Sheet — select all, drag, xong. Đây là sức mạnh của Dope Sheet — tool chuyên dụng cho timing.</p>
  <p>Dope Sheet là tool cơ bản cho mọi animator. Hiểu khi nào dùng Dope Sheet (vs Graph Editor) giúp workflow nhanh hơn — đặc biệt khi block animation và refine timing macro.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Dope Sheet là gì?</h2>
  <p>Dope Sheet (hoặc X-Sheet, từ truyền thống vẽ tay) là tool trong phần mềm animation hiển thị keyframe theo timeline — mỗi keyframe là một &quot;dot&quot; hoặc &quot;diamond&quot; trên timeline ngang. Animator có thể select, move, copy keyframe ngay trên view này — không cần edit value, chỉ position trong time.</p>
  <p>Khác với <strong>Graph Editor</strong> (hiển thị curve giá trị qua time, dùng để tune curve interpolation), Dope Sheet focus vào <strong>timing macro</strong> — &quot;keyframe ở frame nào&quot;. Hai tool bổ sung nhau — animator dùng cả hai trong workflow.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Dope Sheet vs Graph Editor</span>
    <p><strong>Dope Sheet</strong>: keyframe position trên timeline. Use case: move keyframe theo time, adjust timing macro, copy keyframe giữa clip. <strong>Graph Editor</strong>: curve giá trị qua time. Use case: tune interpolation (ease in/out), fix arc, polish motion. Dope Sheet cho timing; Graph Editor cho spacing/value.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Keyframe Marker</strong> — diamond/dot represent một key</li>
    <li><strong>Timeline</strong> — horizontal axis theo time</li>
    <li><strong>Object/Property List</strong> — vertical axis, mỗi row là một property</li>
    <li><strong>Snap to Frame</strong> — auto align với integer frame</li>
    <li><strong>Time Slider</strong> — current frame indicator</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"dope sheet animation maya blender timeline keyframe"</span>
    </div>
    <p class="arc-image-caption">Dope Sheet — keyframe marker trên timeline cho mỗi property/object</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Dope Sheet trong từng phần mềm</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Maya — Time Editor &amp; Dope Sheet</summary>
      <div class="arc-card-body">
        <p>Window → Animation Editors → Dope Sheet. Hiển thị keyframe của attribute selected. Time Editor newer cho non-destructive editing.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender — Dope Sheet built-in</summary>
      <div class="arc-card-body">
        <p>Default tab trong Animation workspace. Tích hợp sâu với Graph Editor. Multiple modes: All Channels, Action, Mask, Grease Pencil.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>After Effects — Layer Timeline</summary>
      <div class="arc-card-body">
        <p>AE layer timeline hoạt động giống Dope Sheet — keyframe diamond trên timeline mỗi layer. U key shortcut toggle keyframe visible.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3ds Max — Track View Dope Sheet</summary>
      <div class="arc-card-body">
        <p>Track View → Dope Sheet mode. Tương tự Maya, hiển thị keyframe trên timeline.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cinema 4D — Timeline window</summary>
      <div class="arc-card-body">
        <p>Window → Timeline. Hai mode: F-Curve (Graph Editor) và Dope Sheet.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Toon Boom &amp; TVPaint — X-Sheet</summary>
      <div class="arc-card-body">
        <p>2D animation truyền thống — X-Sheet là document gốc của Dope Sheet. Hiển thị frame và mouth shape cho lip sync.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow với Dope Sheet</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Block Animation</h3>
    <ul class="arc-list">
      <li>Set key pose, view trong Dope Sheet</li>
      <li>Adjust spacing giữa keyframe để timing đúng — Dope Sheet faster than Graph</li>
      <li>Stepped tangent active trong blocking</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Time Adjustment</h3>
    <ul class="arc-list">
      <li>Move toàn bộ keyframe sang phải/trái để delay/advance</li>
      <li>Scale time — stretch/compress cả animation</li>
      <li>Offset từng track riêng cho stagger effect</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Copy &amp; Paste Keys</h3>
    <ul class="arc-list">
      <li>Select multiple keys, copy → paste sang object khác cho similar animation</li>
      <li>Loop animation bằng copy-paste cycle</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Sound Sync</h3>
    <ul class="arc-list">
      <li>Hiển thị audio waveform trong Dope Sheet cho lip sync, music animation</li>
      <li>Set keyframe đúng beat của music</li>
    </ul>
  </div>
</section>
`,
  },

  // 07. Double Exposure
  {
    id: "7fe13a04-a8e4-49bd-a706-af3932544323",
    tieu_de: "Double Exposure",
    tieu_de_viet: "Phơi sáng kép (Double Exposure)",
    tom_tat:
      "Double Exposure là kỹ thuật chồng hai hình ảnh lên nhau tạo hiệu ứng nghệ thuật — nguồn gốc từ film photography, nay phổ biến trong design, motion graphics và digital art.",
    meta_title: "Double Exposure là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Double Exposure chồng hai hình tạo hiệu ứng nghệ thuật. Tìm hiểu cách làm trong Photoshop, ứng dụng trong design và music video.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn nhìn một poster phim — chân dung diễn viên với bên trong &quot;chứa&quot; cảnh thành phố hoặc rừng. Hoặc music video Coldplay với silhouette ca sĩ chồng lên landscape mơ mộng. Đây là double exposure — kỹ thuật cổ điển từ thời film photography, được digital design hiện đại làm sống lại với potential nghệ thuật vô tận.</p>
  <p>Double Exposure là một trong những technique design phổ biến cho poster, album cover, music video. Hiểu cơ chế và workflow Photoshop giúp tạo double exposure ấn tượng nhanh — và ứng dụng cho project commercial cũng như cá nhân.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Double Exposure là gì?</h2>
  <p>Double Exposure (phơi sáng kép) là kỹ thuật chồng hai (hoặc nhiều) hình ảnh lên nhau tạo thành một composite duy nhất với hiệu ứng nghệ thuật. Nguồn gốc từ film photography đầu thế kỷ 20 — photographer expose cùng một frame phim hai lần, mỗi lần với subject khác nhau. Kết quả: hai ảnh chồng lên, ảnh ánh sáng sáng hơn &quot;thắng&quot;.</p>
  <p>Trong digital era, double exposure không bị giới hạn 2 hình — có thể chồng nhiều layer, blend mode đa dạng, control opacity precise. Trở thành genre riêng trong digital art, design poster, motion graphics — đặc biệt phù hợp cho theme &quot;identity reveals environment&quot; (chân dung + nature, character + city).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Tại sao double exposure powerful về mặt nghệ thuật?</span>
    <p>Double exposure tạo &quot;visual metaphor&quot; — &quot;người đó được làm bằng gì?&quot;, &quot;memory inside the head&quot;, &quot;dream within&quot;. Một concept khó express bằng single image dễ trở nên thi vị với double exposure. Đây là lý do technique này không lỗi thời — vẫn dùng cho poster phim, album cover, magazine cover.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Base Layer</strong> — ảnh subject chính (thường chân dung silhouette)</li>
    <li><strong>Texture Layer</strong> — ảnh chồng lên (landscape, nature, abstract)</li>
    <li><strong>Blend Mode</strong> — Screen, Lighten phổ biến nhất cho double exposure</li>
    <li><strong>Layer Mask</strong> — control vùng nào texture hiện</li>
    <li><strong>Color Adjustment</strong> — unify tone giữa hai layer</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"double exposure portrait nature photoshop design"</span>
    </div>
    <p class="arc-image-caption">Double exposure điển hình — chân dung silhouette với landscape chồng lên</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Cách tạo Double Exposure trong Photoshop</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>1. Chuẩn bị 2 ảnh tốt</summary>
      <div class="arc-card-body">
        <p>Base: chân dung với background sáng (white background ideal). Texture: landscape, nature, city có contrast cao. Cả hai high resolution.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>2. Mask base chỉ giữ silhouette</summary>
      <div class="arc-card-body">
        <p>Use Select Subject hoặc Pen Tool. Mask background trắng/đơn giản, giữ shape của subject.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3. Add texture layer + Blend Mode</summary>
      <div class="arc-card-body">
        <p>Place texture layer trên base. Set Blend Mode = Screen (sáng overlay) hoặc Lighten. Adjust opacity 60-80%.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>4. Clipping Mask để texture chỉ trong subject</summary>
      <div class="arc-card-body">
        <p>Alt+click giữa texture và base = clip. Texture giờ chỉ visible trong silhouette của subject. Tạo effect &quot;inside the person&quot;.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>5. Unify color &amp; tone</summary>
      <div class="arc-card-body">
        <p>Add Color Balance hoặc Gradient Map adjustment layer để hai ảnh có cùng tone. Often: monochromatic (sepia, blue, teal) — unify mạnh nhất.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>6. Final touches</summary>
      <div class="arc-card-body">
        <p>Add subtle texture overlay (paper, grain), vignette darkening. Type/typography nếu cần cho poster.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Double Exposure trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Poster Phim &amp; TV</h3>
    <ul class="arc-list">
      <li>True Detective Season 1 poster — iconic double exposure</li>
      <li>Identity + environment metaphor mạnh cho psychological drama</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Album Cover</h3>
    <ul class="arc-list">
      <li>Indie album, alternative rock — double exposure phổ biến cho mood thi vị</li>
      <li>Coldplay, Mumford &amp; Sons styled covers</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Editorial / Magazine</h3>
    <ul class="arc-list">
      <li>National Geographic, Time Magazine cover</li>
      <li>Thought-provoking cover cho topic environmental, social</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Motion Graphics</h3>
    <ul class="arc-list">
      <li>Title sequence, intro video — animated double exposure</li>
      <li>True Detective opening title — classic example</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Personal Art &amp; Social Media</h3>
    <ul class="arc-list">
      <li>Instagram art, photography portfolios</li>
      <li>Procreate, Photoshop iPad cho mobile creation</li>
    </ul>
  </div>
</section>
`,
  },

  // 08. Dynamics
  {
    id: "fe105ab5-c048-424c-9714-565e80fdc1aa",
    tieu_de: "Dynamics (3D Simulation)",
    tieu_de_viet: "Mô phỏng vật lý 3D (Dynamics)",
    tom_tat:
      "Dynamics là hệ thống mô phỏng vật lý trong phần mềm 3D — cloth, rigid body, soft body, fluid — cho phép vật chuyển động theo quy luật vật lý thực thay vì animation thủ công.",
    meta_title: "Dynamics 3D là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Dynamics mô phỏng vật lý trong 3D — cloth, rigid body, fluid. Tìm hiểu các loại simulation và ứng dụng trong VFX, animation, game.",
    noi_dung: `
<section class="arc-intro">
  <p>Một cảnh trong phim hành động: nhân vật chạy với áo choàng bay phía sau, vũ khí va vào tường vỡ thành mảnh, nước văng tung tóe. Animator dựng từng frame thủ công thì không khả thi — đặc biệt với chuyển động không deterministic như cloth, broken glass, water splash. Đây là lúc Dynamics simulation vào việc.</p>
  <p>Dynamics là kỹ thuật quan trọng cho VFX artist và 3D generalist. Hiểu các loại simulation (cloth, rigid body, fluid, soft body) giúp chọn tool đúng cho từng task và biết khi nào nên simulate vs animate manually.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Dynamics trong 3D là gì?</h2>
  <p>Dynamics (còn gọi Physics Simulation) là hệ thống trong phần mềm 3D mô phỏng cách các vật thể tương tác theo quy luật vật lý thực — gravity, momentum, collision, friction. Animator setup initial condition (vị trí, vận tốc, mass), engine tính toán mỗi frame để xác định vật ở đâu trong frame tiếp theo.</p>
  <p>Khác với keyframe animation (animator quyết định mỗi pose), dynamics là <strong>procedural</strong> — kết quả phụ thuộc input và physics rules, không hoàn toàn predictable. Cùng setup chạy 2 lần có thể ra slightly different (với randomization on).</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Khi nào dùng Dynamics, khi nào keyframe?</span>
    <p><strong>Dynamics</strong>: chuyển động complex, follow physics — cloth, falling objects, fluid, particle, hair. <strong>Keyframe</strong>: chuyển động có chủ đích — character acting, camera move với composition. Phim hybrid: keyframe character + dynamics cloth của character.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Rigid Body</strong> — vật rắn (đá, gỗ, kim loại) collide không deform</li>
    <li><strong>Soft Body</strong> — vật mềm có thể deform (jelly, rubber)</li>
    <li><strong>Cloth</strong> — vải, mảnh mỏng dễ bend</li>
    <li><strong>Particle</strong> — hệ thống nhiều point nhỏ (smoke, spark)</li>
    <li><strong>Fluid</strong> — chất lỏng/khí (water, smoke, fire)</li>
    <li><strong>Hair / Fur</strong> — sợi tóc, lông động vật</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"3D dynamics simulation cloth rigid body physics maya"</span>
    </div>
    <p class="arc-image-caption">Các loại dynamics — cloth, rigid body, fluid simulation</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Dynamics simulation</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Rigid Body Dynamics</summary>
      <div class="arc-card-body">
        <p>Vật rắn không deform khi collide. Tower toppling, building destruction, ball pit. Maya nDynamics, Blender Rigid Body, Houdini Bullet/RBD solvers.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Cloth Simulation</summary>
      <div class="arc-card-body">
        <p>Vải có thickness, stretch, bend. Cape của superhero, flag in wind, dress flowing. Maya nCloth, Marvelous Designer (chuẩn industry cho cloth), Houdini Vellum.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Soft Body</summary>
      <div class="arc-card-body">
        <p>Object có thể deform (squash, stretch, jiggle). Jello, character fat dynamics, balloons. Houdini có Vellum + FEM cho soft body cao cấp.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Fluid Dynamics (FLIP, SPH)</summary>
      <div class="arc-card-body">
        <p>Chất lỏng — water, lava, oil. FLIP method phổ biến nhất. Houdini FLIP Solver là gold standard. RealFlow, Maya Bifrost.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Volumetric (Pyro, Smoke, Fire)</summary>
      <div class="arc-card-body">
        <p>Khí — smoke, fire, explosion. Voxel-based. Houdini Pyro, EmberGen (realtime), Maya Bifrost Aero.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Particle Systems</summary>
      <div class="arc-card-body">
        <p>Nhiều point nhỏ — sparks, dust, magic effects. Houdini particles, Maya nParticle, Cinema 4D Thinking Particles, Unreal Niagara (realtime).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hair / Fur Dynamics</summary>
      <div class="arc-card-body">
        <p>Tóc, lông animals — bend, sway theo gravity và wind. Maya XGen, Yeti, Houdini Hair, Ornatrix.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Dynamics trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">VFX Phim</h3>
    <ul class="arc-list">
      <li>Houdini dominates — most VFX studio dùng cho heavy simulation</li>
      <li>Cloth (cape, dress), destruction, water, smoke đều simulation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Game (real-time physics)</h3>
    <ul class="arc-list">
      <li>Game engine có physics engine built-in (Unreal Chaos, Unity PhysX, Havok)</li>
      <li>Simplified — chạy 60fps không thể accuracy cao như offline</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation</h3>
    <ul class="arc-list">
      <li>Pixar, Disney có hệ thống cloth/hair custom mạnh</li>
      <li>Frozen character hair, Brave hair animation famous</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Motion Graphics &amp; Quảng cáo</h3>
    <ul class="arc-list">
      <li>Liquid logo reveal, particle effects, abstract shape simulation</li>
      <li>Cinema 4D X-Particles plugin phổ biến cho mograph</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Architectural &amp; Product Viz</h3>
    <ul class="arc-list">
      <li>Cloth simulation cho curtain, fabric trong nội thất</li>
      <li>Cinematic shots với physics realism</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Dynamics Simulation</h2>
  <ul class="arc-list">
    <li><strong>Iterative — bake to cache</strong> — simulate, cache, view; adjust, re-simulate</li>
    <li><strong>Scale matter</strong> — sim assume real-world scale (1 unit = 1 cm/m). Scale wrong = physics wrong</li>
    <li><strong>Substeps</strong> — increase substeps cho accuracy ở fast motion, collision phức tạp</li>
    <li><strong>Collision geometry simplification</strong> — proxy collision mesh thay vì high-poly render mesh</li>
    <li><strong>Procedural noise/turbulence</strong> — add wind, force fields cho variation tự nhiên</li>
    <li><strong>Test scene small trước final</strong> — sim time tăng đáng kể với complexity</li>
  </ul>
</section>
`,
  },

  // 09. Embossing
  {
    id: "f840a03b-fa56-425f-9ed2-b2fcadb99138",
    tieu_de: "Embossing",
    tieu_de_viet: "Dập nổi (Embossing)",
    tom_tat:
      "Embossing là kỹ thuật in tạo họa tiết hoặc chữ nổi 3D trên bề mặt giấy/bìa — tăng thẩm mỹ và cảm giác premium. Phổ biến cho name card cao cấp, packaging luxury, book cover.",
    meta_title: "Embossing là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Embossing tạo họa tiết nổi 3D trên giấy. Tìm hiểu kỹ thuật, máy móc và ứng dụng trong name card, packaging, book cover luxury.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn nhận một tấm name card từ một CEO — không phải in flat thường, mà logo có vùng &quot;nổi lên&quot; có thể chạm ngón tay cảm thấy. Hoặc một quyển sách cao cấp với tiêu đề embossed làm bìa thêm chiều sâu. Đây là embossing — kỹ thuật in &quot;tactile&quot; thêm dimension vật lý cho printed material.</p>
  <p>Embossing là một trong những finishing technique phổ biến cho print design luxury. Hiểu embossing và khi nào nên dùng giúp designer đề xuất finish phù hợp với brand cao cấp — và biết cách design để embossing đẹp.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Embossing là gì?</h2>
  <p>Embossing là kỹ thuật post-press tạo họa tiết hoặc chữ nổi 3D trên bề mặt giấy/bìa bằng cách ép giấy giữa hai khuôn (die) — một dương (raised) và một âm (recessed). Áp lực ép biến vùng giấy thành phần nổi lên (hoặc lõm xuống nếu &quot;debossing&quot;), tạo hiệu ứng tactile.</p>
  <p>Embossing có thể combine với các finishing khác: foil stamping (mạ kim loại), printing (in màu sẵn rồi emboss lên đó), spot UV. Mỗi combination tạo character riêng — &quot;blind emboss&quot; (không có ink/foil) cho effect tinh tế nhất.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Embossing vs Debossing vs Letterpress</span>
    <p><strong>Embossing</strong>: phần nổi lên (raised). <strong>Debossing</strong>: phần lõm xuống (depressed). <strong>Letterpress</strong>: print kèm light debossing — chữ/họa tiết có ink + lõm nhẹ. Cả ba đều tactile nhưng cảm giác khác nhau.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Die</strong> — khuôn ép tạo emboss; thường làm bằng magnesium hoặc copper</li>
    <li><strong>Blind Emboss</strong> — không có ink/foil, chỉ là dimension nổi</li>
    <li><strong>Combination Emboss</strong> — emboss + print color + foil</li>
    <li><strong>Multi-Level Emboss</strong> — emboss nhiều mức độ cao thấp khác nhau</li>
    <li><strong>Sculpted Emboss</strong> — emboss với chi tiết sculptural sâu</li>
    <li><strong>Registration</strong> — alignment giữa emboss và printed element</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"embossing print finish luxury business card brand"</span>
    </div>
    <p class="arc-image-caption">Embossing — logo/text nổi 3D trên giấy, tactile và premium</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Embossing</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Blind Emboss</summary>
      <div class="arc-card-body">
        <p>Không có ink hay foil — chỉ dimension nổi. Tinh tế nhất, dùng cho luxury brand muốn understated elegance. Hermès, Cartier name card thường blind emboss.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Registered Emboss (combined với print)</summary>
      <div class="arc-card-body">
        <p>Emboss align với printed element — vd logo printed thì emboss lên cùng logo cho 3D effect. Yêu cầu registration chính xác — sai 0.5mm là thấy lệch.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Foil + Emboss (Combo Stamp)</summary>
      <div class="arc-card-body">
        <p>Foil mạ vàng/bạc + emboss cùng vùng → text/logo nổi mạ kim loại. Premium nhất, expensive nhất. Thường dùng cho luxury packaging, invitation cao cấp.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Multi-Level Sculpted Emboss</summary>
      <div class="arc-card-body">
        <p>Die có nhiều mức depth — emboss tạo relief sculpture trên giấy. Đắt nhất, dùng cho special edition book, art piece.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Debossing</summary>
      <div class="arc-card-body">
        <p>Ngược lại — phần lõm xuống. Phổ biến cho leather binding, journal cover. Cảm giác &quot;chìm&quot; vs &quot;nổi&quot; — different emotional response.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Embossing trong từng lĩnh vực</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Branding (Business Card, Letterhead)</h3>
    <ul class="arc-list">
      <li>Luxury brand name card blind emboss</li>
      <li>Letterhead với company logo emboss làm formal</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Packaging</h3>
    <ul class="arc-list">
      <li>Cosmetic luxury box — logo emboss</li>
      <li>Wine, champagne label — texture với emboss</li>
      <li>Premium chocolate, perfume packaging</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Book &amp; Publishing</h3>
    <ul class="arc-list">
      <li>Hardcover book title emboss/deboss</li>
      <li>Special edition, leather-bound classics</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Invitation &amp; Event</h3>
    <ul class="arc-list">
      <li>Wedding invitation cao cấp với emboss + foil</li>
      <li>Corporate gala, gallery opening invitation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Real Estate &amp; Luxury Goods</h3>
    <ul class="arc-list">
      <li>Luxury property brochure</li>
      <li>Watch, jewelry catalog</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Thiết kế cho Embossing</h2>
  <ul class="arc-list">
    <li><strong>Simple shapes work best</strong> — fine detail có thể bị mất khi emboss. Bold solid shape, sans-serif font</li>
    <li><strong>Minimum stroke width</strong> — text/line không nên mỏng dưới 0.5mm</li>
    <li><strong>Paper choice critical</strong> — uncoated, heavy weight (250-350gsm) ideal. Coated giấy resist emboss</li>
    <li><strong>Distance between emboss areas</strong> — không quá gần edge giấy hoặc đường gấp (3-5mm)</li>
    <li><strong>Talk to printer early</strong> — die making expensive, mistake costly. Discuss design feasibility trước khi finalize</li>
    <li><strong>Mock-up testing</strong> — print proof với emboss trước run hàng nghìn</li>
  </ul>
</section>
`,
  },

  // 10. Encoding
  {
    id: "688d293f-6402-4c3c-8c33-7260a833c238",
    tieu_de: "Encoding",
    tieu_de_viet: "Mã hóa video (Encoding)",
    tom_tat:
      "Encoding là quá trình chuyển đổi file video sang định dạng và codec cụ thể để phân phối — cân bằng giữa chất lượng và kích thước file cho từng platform target.",
    meta_title: "Encoding là gì? Ý nghĩa và ứng dụng trong ngành sáng tạo | CINS",
    meta_description:
      "Encoding chuyển video sang định dạng phân phối. Tìm hiểu codec, bitrate, container và best practice cho YouTube, streaming, broadcast.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn finish dựng phim trong Premiere — file project hơn 200GB ProRes. Nhưng YouTube không nhận ProRes 200GB; cần encode về H.264 vài GB. Hoặc gửi cho khách 1080p web version để approve trước khi deliver master file. Encoding là khâu cuối quan trọng quyết định content đến với audience thế nào.</p>
  <p>Encoding là kiến thức cơ bản cho mọi video editor, motion designer, livestreamer. Hiểu encoding settings và pipeline giúp deliver content tối ưu cho từng platform — không phải &quot;export with default&quot; mà có lựa chọn intelligent.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Encoding là gì?</h2>
  <p>Encoding là quá trình chuyển đổi file video/audio từ định dạng raw hoặc intermediate (ProRes, DNxHR, RAW) sang định dạng phân phối nén (H.264, H.265, AV1). Mục đích: giảm dung lượng file đáng kể trong khi giữ chất lượng acceptable cho target use case — web, broadcast, streaming, mobile.</p>
  <p>Encoding involve 3 quyết định chính: <strong>codec</strong> (H.264, H.265, AV1, ProRes), <strong>container</strong> (MP4, MOV, MKV, WebM), <strong>settings</strong> (bitrate, frame rate, resolution, profile). Sai một yếu tố = file không play được trên target hoặc quality không acceptable.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Encoding ≠ Transcoding</span>
    <p><strong>Encoding</strong>: convert từ uncompressed/raw → compressed format. <strong>Transcoding</strong>: convert từ một compressed format sang another compressed format (vd H.264 → H.265). Transcoding luôn lossy hơn — đã lose data ở first compression rồi lại lose more.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Codec</strong> — thuật toán nén (H.264, H.265, AV1)</li>
    <li><strong>Container</strong> — file wrapper (MP4, MOV, MKV)</li>
    <li><strong>Bitrate</strong> — data per second (Mbps)</li>
    <li><strong>CBR vs VBR</strong> — Constant or Variable Bitrate</li>
    <li><strong>2-pass encoding</strong> — analyze first, encode second cho quality tốt nhất</li>
    <li><strong>Profile / Level</strong> — feature subset của codec, ảnh hưởng compatibility</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"video encoding workflow premiere media encoder export"</span>
    </div>
    <p class="arc-image-caption">Encoding workflow — settings codec, bitrate, container cho deliverable</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Tools Encoding</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Adobe Media Encoder</summary>
      <div class="arc-card-body">
        <p>Standalone với Premiere Pro. Queue multiple jobs, encode background while edit tiếp. Watch folder cho automation. Preset cho YouTube, Vimeo, broadcast.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>HandBrake — free, mạnh</summary>
      <div class="arc-card-body">
        <p>Open source, cross-platform. Mạnh nhất cho H.265, AV1. Preset cho mọi device target. Phổ biến cho transcode personal collection.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>FFmpeg — command line power tool</summary>
      <div class="arc-card-body">
        <p>Engine đằng sau most encoder. Command line control absolute, scripting automation cho batch processing. Steep learning curve nhưng unbeatable flexibility.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>DaVinci Resolve Deliver</summary>
      <div class="arc-card-body">
        <p>Built-in encoder của Resolve. Free tier mạnh. Preset cho YouTube, Vimeo, broadcast, ProRes archive.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hardware Encoders (NVENC, QuickSync, AMD AMF)</summary>
      <div class="arc-card-body">
        <p>GPU-accelerated encoding — nhanh hơn CPU 5-10x. Quality slightly less than CPU encode (x264 software best). NVENC chuẩn cho streaming/livestreaming.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Encoding settings cho từng platform</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">YouTube</h3>
    <ul class="arc-list">
      <li>H.264 main profile, MP4 container</li>
      <li>1080p: 8-12 Mbps; 4K: 35-68 Mbps</li>
      <li>VBR 2-pass cho chất lượng tốt nhất</li>
      <li>Audio: AAC 192-320 kbps</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Vimeo</h3>
    <ul class="arc-list">
      <li>Tương tự YouTube, nhưng Vimeo accept H.265 cho better quality</li>
      <li>Vimeo Pro hỗ trợ ProRes upload</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Instagram / TikTok</h3>
    <ul class="arc-list">
      <li>H.264, MP4</li>
      <li>9:16 vertical (1080×1920) cho Stories, Reels</li>
      <li>Bitrate 10-15 Mbps — re-encode mạnh nên upload high</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Broadcast (TV)</h3>
    <ul class="arc-list">
      <li>ProRes 422 HQ hoặc DNxHR HQX</li>
      <li>50/29.97/25 fps tùy region</li>
      <li>Audio: 48kHz, 24-bit, loudness -23 LUFS (EBU R128)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Streaming (Live)</h3>
    <ul class="arc-list">
      <li>CBR H.264 cho stable bandwidth</li>
      <li>NVENC hardware encode để CPU rảnh tay xử lý OBS/Streamlabs</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Archive / Master</h3>
    <ul class="arc-list">
      <li>ProRes 422 HQ hoặc 4444 (lossless tương đối)</li>
      <li>EXR sequence cho VFX master</li>
      <li>File lớn nhưng không degrade quality qua time</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Tips Encoding</h2>
  <ul class="arc-list">
    <li><strong>Don&apos;t over-compress</strong> — bitrate quá thấp = visible artifact</li>
    <li><strong>2-pass cho final delivery</strong> — slower nhưng quality consistently better</li>
    <li><strong>Always upload high bitrate cho platform re-encode</strong> — YouTube, IG sẽ encode lại, upload high bù compensate</li>
    <li><strong>Hardware encode cho speed, software cho quality</strong> — choose based on use case</li>
    <li><strong>Test encode short clip trước final long video</strong> — settings might need tweak</li>
    <li><strong>Keep master file</strong> — re-encode từ master nếu cần version khác, đừng re-encode từ encoded file</li>
  </ul>
</section>
`,
  },
];

console.log(`\n── Bắt đầu chạy ${items.length} bài keyword đợt 1.8 ──\n`);

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
