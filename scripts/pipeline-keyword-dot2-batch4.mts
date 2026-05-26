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
  // 01. Lý thuyết màu sắc
  {
    id: "3bf9ccca-4408-4f27-bfef-ceb48158c3ef",
    tieu_de: "Lý thuyết màu sắc",
    tieu_de_viet: "Color Theory — nền tảng",
    tom_tat:
      "Lý thuyết màu sắc là tập hợp nguyên tắc về cách màu sắc tương tác và ảnh hưởng lẫn nhau — color wheel, harmony, psychology — kiến thức cơ bản cho thiết kế và nghệ thuật.",
    meta_title:
      "Lý thuyết màu sắc là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Lý thuyết màu sắc là nền tảng thiết kế. Tìm hiểu color wheel, harmony scheme, psychology màu và ứng dụng thực tế.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem brand identity Coca-Cola — đỏ. McDonald&apos;s — đỏ + vàng. Tiffany &amp; Co — xanh ngọc đặc trưng. Mỗi brand chọn màu không random — họ apply <strong>lý thuyết màu sắc</strong> để evoke emotion specific. Đỏ = năng lượng, vàng = vui vẻ, xanh ngọc = luxury. Đây là power của color theory — visual communication không cần words.</p>
  <p>Lý thuyết màu sắc là kiến thức fundamental cho mọi visual artist — graphic designer, painter, illustrator, photographer, motion designer. Mastery color theory phân biệt amateur (choose color randomly) và pro (choose color intentionally for emotional impact).</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Lý thuyết màu sắc là gì?</h2>
  <p>Lý thuyết màu sắc (Color Theory) là <strong>tập hợp nguyên tắc</strong> về cách màu sắc <strong>tương tác, phối hợp, và tác động đến con người</strong>. Bao gồm: color wheel (bánh xe màu), primary/secondary/tertiary colors, harmony schemes (complementary, analogous, triadic), warm/cool temperature, psychology (color emotion), và practical application trong design.</p>
  <p>Lịch sử: từ Isaac Newton&apos;s color wheel 1666 (light spectrum), đến Goethe&apos;s color theory psychological, Itten&apos;s Bauhaus systematic study. Modern color theory bao gồm color science (CIE, Lab color space), digital color (RGB additive), printing (CMYK subtractive). Foundation thiết kế modern.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Primary Colors — RGB vs CMYK vs RYB</span>
    <p><strong>RGB</strong> (Red, Green, Blue): additive color, light. Used cho screen, digital. <strong>CMYK</strong> (Cyan, Magenta, Yellow, Black): subtractive, print. <strong>RYB</strong> (Red, Yellow, Blue): traditional artistic, paint. Different primaries because different medium — light vs ink vs pigment.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Color Wheel</strong> — bánh xe màu, foundation visualization</li>
    <li><strong>Primary Colors</strong> — màu chính (3 colors)</li>
    <li><strong>Secondary</strong> — pha từ primary (3 colors)</li>
    <li><strong>Tertiary</strong> — pha từ primary + secondary (6 colors)</li>
    <li><strong>Hue</strong> — màu pure (red, blue, green)</li>
    <li><strong>Saturation</strong> — độ tinh khiết của hue</li>
    <li><strong>Value / Brightness</strong> — độ sáng tối</li>
    <li><strong>Temperature</strong> — warm vs cool</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"color theory wheel primary secondary harmony palette design"</span>
    </div>
    <p class="arc-image-caption">Color Wheel — foundation của color theory, hue distribution</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Color Harmony Schemes</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Complementary</summary>
      <div class="arc-card-body">
        <p>2 màu đối diện color wheel. Red-Green, Blue-Orange, Yellow-Purple. High contrast, vibrant. Used cho focal point, sport branding (Lakers purple-yellow).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Analogous</summary>
      <div class="arc-card-body">
        <p>3 màu adjacent color wheel. Green-Blue-Cyan. Harmonious, soothing. Used cho nature scene, calm branding.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Triadic</summary>
      <div class="arc-card-body">
        <p>3 màu equally spaced. Red-Yellow-Blue, Orange-Green-Purple. Vibrant, balanced. Used cho playful design, children product.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Split Complementary</summary>
      <div class="arc-card-body">
        <p>1 base + 2 adjacent to complement. Less tension than complementary. Good cho beginner — interesting but not jarring.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Tetradic / Square</summary>
      <div class="arc-card-body">
        <p>4 màu in rectangle/square wheel arrangement. Complex but rich. Difficult to balance — one color dominate, others accent.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Monochromatic</summary>
      <div class="arc-card-body">
        <p>Single hue, varying saturation và value. Sophisticated, cohesive. Used cho minimalist design, luxury brand.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Color Psychology</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Red — Năng lượng, đam mê, nguy hiểm</h3>
    <ul class="arc-list">
      <li>Brand: Coca-Cola, YouTube, Netflix, Ferrari</li>
      <li>Food industry — stimulate appetite</li>
      <li>Warning, urgency — stop sign, sale</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Blue — Tin cậy, calm, professional</h3>
    <ul class="arc-list">
      <li>Brand: Facebook, Twitter, LinkedIn, IBM</li>
      <li>Tech, finance, healthcare</li>
      <li>Cool temperature, peaceful</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Green — Tự nhiên, growth, sức khỏe</h3>
    <ul class="arc-list">
      <li>Brand: Spotify, WhatsApp, Starbucks</li>
      <li>Eco-friendly, organic, finance (money)</li>
      <li>Balance, harmony</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Yellow — Vui vẻ, năng lượng, attention</h3>
    <ul class="arc-list">
      <li>Brand: McDonald&apos;s, IKEA, Snapchat, Hertz</li>
      <li>Caution, optimism</li>
      <li>Highest visible color cho eye</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Black — Sang trọng, mạnh mẽ, mystery</h3>
    <ul class="arc-list">
      <li>Brand: Chanel, Apple, Nike, Adidas</li>
      <li>Luxury, premium</li>
      <li>Versatile, pairs với mọi color</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">White — Tinh khiết, đơn giản, modern</h3>
    <ul class="arc-list">
      <li>Brand: Apple (cùng black)</li>
      <li>Minimalist, clean</li>
      <li>Western: purity. East Asian: mourning</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Purple — Royal, creative, luxury</h3>
    <ul class="arc-list">
      <li>Brand: Yahoo, Twitch, Cadbury, Hallmark</li>
      <li>Spirituality, imagination</li>
      <li>Historically expensive dye = royalty</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Ứng dụng Practical</h2>
  <ul class="arc-list">
    <li><strong>Brand Identity</strong> — choose color matching brand personality</li>
    <li><strong>UI/UX Design</strong> — primary action color, error red, success green</li>
    <li><strong>Photography</strong> — color grade evoke mood (warm cinematic, cool thriller)</li>
    <li><strong>Painting/Illustration</strong> — composition guide with color value</li>
    <li><strong>Film Color Script</strong> — overall color palette per scene/sequence (Pixar)</li>
    <li><strong>Accessibility</strong> — color contrast meeting WCAG cho legibility</li>
    <li><strong>Cultural Sensitivity</strong> — color meaning varies by culture (red lucky in China, mourning Africa)</li>
  </ul>
</section>
`,
  },

  // 02. Machine Learning
  {
    id: "a8574450-2cbf-4101-81b0-fa898d1a0717",
    tieu_de: "Machine Learning",
    tieu_de_viet: "Máy học (Machine Learning)",
    tom_tat:
      "Machine Learning là lĩnh vực của AI cho phép máy tính học từ dữ liệu — dự đoán, phân loại, ra quyết định mà không cần lập trình chi tiết. Foundation của AI creative tools modern.",
    meta_title:
      "Machine Learning là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Machine Learning là cốt lõi AI hiện đại. Tìm hiểu cơ bản, neural network và ứng dụng trong creative — Stable Diffusion, AI tools.",
    noi_dung: `
<section class="arc-intro">
  <p>Midjourney tạo ảnh từ text prompt. ChatGPT viết article. Photoshop Generative Fill remove object trong second. Tất cả đều powered by <strong>Machine Learning</strong> (ML) — branch của AI mà máy &quot;học&quot; từ data thay vì được program rule cụ thể. ML từ academic research 1950s đến mainstream tool 2023+ đã transform creative industry forever.</p>
  <p>Machine Learning là kiến thức essential cho creative professional thế hệ mới. Hiểu cơ bản ML — neural network, training, model — giúp leverage AI tools hiệu quả và prepare cho era mới của creative work integrated với AI.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Machine Learning là gì?</h2>
  <p>Machine Learning là lĩnh vực của Artificial Intelligence (AI) — computer system <strong>learn from data</strong> mà không được programmed explicitly cho every case. Traditional programming: code rules → output. ML: feed data + examples → algorithm learns pattern → makes predictions/decisions on new data. Result: system improve performance với more data exposure.</p>
  <p>3 paradigm chính: <strong>Supervised Learning</strong> (labeled data, train predict outcome — classification, regression); <strong>Unsupervised Learning</strong> (find pattern in unlabeled data — clustering); <strong>Reinforcement Learning</strong> (agent learn through reward/punishment — game AI, robotics). Modern AI heavily relies on <strong>Deep Learning</strong> — neural network với nhiều layer, powerful nhưng data-hungry.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">ML vs AI vs Deep Learning</span>
    <p><strong>AI</strong>: broadest term — machine performing &quot;intelligent&quot; tasks. <strong>Machine Learning</strong>: subset of AI — learn from data. <strong>Deep Learning</strong>: subset of ML — using deep neural networks. <strong>Generative AI</strong>: subset using ML to generate content (text, image, audio). Each narrower scope.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Neural Network</strong> — math model inspired by brain</li>
    <li><strong>Training Data</strong> — examples feed to model</li>
    <li><strong>Model</strong> — trained algorithm cho inference</li>
    <li><strong>Inference</strong> — make prediction on new input</li>
    <li><strong>Loss Function</strong> — measure error during training</li>
    <li><strong>Backpropagation</strong> — algorithm update model</li>
    <li><strong>GPU</strong> — hardware accelerate training</li>
    <li><strong>Diffusion Model</strong> — generate image (Stable Diffusion)</li>
    <li><strong>Transformer</strong> — NLP architecture (GPT, BERT)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"machine learning neural network AI creative deep learning"</span>
    </div>
    <p class="arc-image-caption">Machine Learning — neural network learn from data, foundation modern AI</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>ML Trong Creative Industry</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Generative AI Art</summary>
      <div class="arc-card-body">
        <p>Midjourney, Stable Diffusion, DALL-E. Text → image generation. Diffusion model trained on billions of images. Revolutionize concept art, illustration workflow.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Photoshop AI Features</summary>
      <div class="arc-card-body">
        <p>Generative Fill, Generative Expand, Select Subject. Powered by Adobe Firefly model. Remove object, extend image, isolate subject — task that took hours now seconds.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Video AI</summary>
      <div class="arc-card-body">
        <p>Runway, Pika Labs generate video. After Effects Rotobrush use ML. Auto-transcription, auto-captioning. AI upscaling (Topaz Video AI).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Audio AI</summary>
      <div class="arc-card-body">
        <p>Suno, Udio generate music. ElevenLabs voice synthesis. Adobe Podcast Enhance audio. Noise reduction (Krisp).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3D AI</summary>
      <div class="arc-card-body">
        <p>Luma AI Genie text-to-3D. NeRF (Neural Radiance Fields) reconstruct 3D from photos. Auto-rigging, auto-UV.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Text/Writing AI</summary>
      <div class="arc-card-body">
        <p>ChatGPT, Claude assist scriptwriting, brainstorming. Marketing copy. Jasper for content marketers.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Code AI</summary>
      <div class="arc-card-body">
        <p>GitHub Copilot, Cursor — code completion AI. Helpful cho creative coder, motion graphics scripting.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow ML Cơ bản</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Data Collection</h3>
    <ul class="arc-list">
      <li>Gather training data — image, text, audio</li>
      <li>Quality &gt; quantity often</li>
      <li>Diverse, representative</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Data Preprocessing</h3>
    <ul class="arc-list">
      <li>Clean, normalize, label data</li>
      <li>Time-consuming task — 70%+ of project</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Model Architecture</h3>
    <ul class="arc-list">
      <li>Choose model type — CNN cho image, Transformer cho text</li>
      <li>Configure layers, parameters</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Training</h3>
    <ul class="arc-list">
      <li>Feed data to model, optimize weights</li>
      <li>Requires GPU computing power</li>
      <li>Hours to weeks depending on size</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Evaluation</h3>
    <ul class="arc-list">
      <li>Test on held-out data</li>
      <li>Metrics: accuracy, precision, recall, F1</li>
      <li>Compare against baseline</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Deployment / Inference</h3>
    <ul class="arc-list">
      <li>Production environment</li>
      <li>API, mobile app, web</li>
      <li>Monitor performance real-world</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Career &amp; Future Trends</h2>
  <ul class="arc-list">
    <li><strong>AI Augmentation</strong> — most creative role evolve, không bị replace 100%</li>
    <li><strong>Prompt Engineer</strong> — new role specializing in AI prompting</li>
    <li><strong>AI-First Creator</strong> — workflow centered on AI tool (Midjourney + Photoshop)</li>
    <li><strong>Traditional Skill + AI</strong> — combo most valuable</li>
    <li><strong>Ethical Concern</strong> — copyright, training data, job displacement</li>
    <li><strong>Continuous Learning</strong> — AI tool evolve monthly, stay updated</li>
    <li><strong>Hybrid Workflow</strong> — AI generate base, human refine final</li>
  </ul>
</section>
`,
  },

  // 03. Matching (Color/Light Matching)
  {
    id: "fad2e949-0c12-4384-8642-7312650cbecc",
    tieu_de: "Matching (Compositing)",
    tieu_de_viet: "Khớp màu/ánh sáng (Matching)",
    tom_tat:
      "Matching là quá trình đảm bảo màu sắc, ánh sáng, chuyển động khớp nhau giữa các cảnh hoặc phần tử — quan trọng trong compositing khi kết hợp footage từ nhiều nguồn.",
    meta_title:
      "Matching là gì? Ý nghĩa và ứng dụng trong compositing | CINS",
    meta_description:
      "Matching trong VFX compositing. Tìm hiểu color match, light match, grain match và workflow seamless composite.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn xem phim Avengers — Iron Man (CGI) đứng cạnh Hulk (CGI) cạnh Captain America (real actor) — tất cả look like cùng scene, cùng lighting. Đây là magic của <strong>Matching</strong> — discipline trong compositing để integrate disparate element thành seamless image. Match màu, light, grain, blur — every property must align cho viewer believe scene.</p>
  <p>Matching là kỹ năng critical cho compositor, VFX artist. Hiểu các loại matching và workflow giúp tạo composite invisible — tốt nhất là khi viewer không nhận ra đó là composite. Đầu tư học matching là core của VFX professional career.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Matching là gì?</h2>
  <p>Matching là quá trình <strong>điều chỉnh element</strong> (CGI render, live footage, photo) để <strong>seamlessly integrate</strong> vào scene đích. Khi multiple source combined trong composite — mỗi source có characteristics khác (color, lighting, grain, contrast) — compositor must match từng element với background plate để look like part of same scene.</p>
  <p>Multiple aspects to match: <strong>Color</strong> (white balance, color cast), <strong>Lighting</strong> (direction, intensity, shadow color), <strong>Atmosphere</strong> (haze, depth), <strong>Grain/Noise</strong> (film grain, digital noise), <strong>Lens characteristics</strong> (distortion, chromatic aberration, depth of field), <strong>Motion</strong> (motion blur match camera move). Pro compositor address all systematically.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Matching = Invisible Compositing</span>
    <p>Best composite work — viewer don&apos;t notice. Bad composite: CGI characters look &quot;pasted on&quot;, color obviously different, edge harsh. Good compositing requires extensive matching pass. Even master Marvel/DC films sometimes fail at matching — &quot;CGI looks fake&quot; criticism often refers to poor matching, not poor 3D model.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Color Matching</strong> — RGB levels, white balance</li>
    <li><strong>Light Direction Match</strong> — shadow direction align</li>
    <li><strong>Shadow Match</strong> — shadow color, softness</li>
    <li><strong>Atmosphere</strong> — haze, depth integration</li>
    <li><strong>Grain Match</strong> — add film grain to CGI</li>
    <li><strong>Edge Integration</strong> — slight blur, light wrap</li>
    <li><strong>Motion Blur</strong> — match camera/object motion</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"compositing matching color light VFX integration seamless"</span>
    </div>
    <p class="arc-image-caption">Matching — integrate element thành seamless composite, &quot;invisible&quot; result</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Matching</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Color Matching</summary>
      <div class="arc-card-body">
        <p>Match overall color tone, white balance. Tool: ColorMatch node (Nuke), Color Match (Premiere Lumetri). Eyedropper sample reference area, AI auto-match. Manual fine-tune.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lighting Direction</summary>
      <div class="arc-card-body">
        <p>Element light direction must align với scene light. Render CGI với matching light direction at render stage — costly to fix post. Add fake shadow if missing.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Shadow Matching</summary>
      <div class="arc-card-body">
        <p>Shadow color tinted by surrounding (blue-ish in shadow). Shadow density match. Softness match (hard light = sharp shadow). Cast shadow on ground integrate element.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Atmospheric Match</summary>
      <div class="arc-card-body">
        <p>Foggy scene — add atmospheric layer cho CGI. Distance fog. Make far element less saturated, more BG color.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Grain Matching</summary>
      <div class="arc-card-body">
        <p>Live footage có grain/noise — CGI render clean. Add grain to CGI match plate. Nuke ScannedGrain, AE Add Grain.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Lens Match</summary>
      <div class="arc-card-body">
        <p>Plate has lens distortion → undistort plate → composite CGI → redistort. Also chromatic aberration, vignetting match.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Defocus / DOF</summary>
      <div class="arc-card-body">
        <p>If element in foreground/background of focus area — add defocus blur to match plate&apos;s depth of field.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Motion Blur</summary>
      <div class="arc-card-body">
        <p>Moving element must motion blur match camera shutter. CGI render với motion blur, or add post.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Matching</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Analyze BG Plate</h3>
    <ul class="arc-list">
      <li>Identify light direction, color, atmosphere</li>
      <li>Note grain, sharpness, lens characteristics</li>
      <li>HDRI capture from scene cho CGI lighting reference</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Render Element Matching</h3>
    <ul class="arc-list">
      <li>Use scene HDRI cho CGI render</li>
      <li>Match focal length camera</li>
      <li>Output render passes (color, shadow, ambient occlusion, ID)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Initial Composite</h3>
    <ul class="arc-list">
      <li>Place element on plate</li>
      <li>Initial check — see what wrong</li>
      <li>Identify problems</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Color Correction</h3>
    <ul class="arc-list">
      <li>Color match element to plate</li>
      <li>Highlights, shadow tint</li>
      <li>Saturation match</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Atmospheric Integration</h3>
    <ul class="arc-list">
      <li>Add atmospheric layer if depth</li>
      <li>Distance fog</li>
      <li>Light wrap edge</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Grain &amp; Noise</h3>
    <ul class="arc-list">
      <li>Add grain to CGI match plate grain</li>
      <li>Subtle, not heavy</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Final QC</h3>
    <ul class="arc-list">
      <li>Toggle element on/off → check seam</li>
      <li>Zoom in edge detail</li>
      <li>Multiple frame playback</li>
      <li>Director review</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Common Mistakes &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>Black point mismatch</strong> — CGI shadow too crushed vs plate. Lift CGI black to plate level</li>
    <li><strong>Color cast missing</strong> — plate warm sunset, CGI neutral. Add color overall</li>
    <li><strong>Edge too sharp</strong> — &quot;cutout&quot; look. Slight edge blur, light wrap</li>
    <li><strong>Grain missing</strong> — CGI too clean. Add grain to subtle</li>
    <li><strong>Wrong light direction</strong> — re-render expensive but necessary</li>
    <li><strong>Spec highlight too clean</strong> — plate has lens flare/dirt, CGI clean. Add subtle imperfection</li>
    <li><strong>Always reference plate</strong> — toggle plate-only frequently</li>
  </ul>
</section>
`,
  },

  // 04. Matchmoving
  {
    id: "8f7b56ab-fdf2-4fd5-94d0-d2a6197ed352",
    tieu_de: "Matchmoving",
    tieu_de_viet: "Theo dõi camera (Matchmoving)",
    tom_tat:
      "Matchmoving là kỹ thuật theo dõi chuyển động camera trong cảnh quay thực để tái tạo trong không gian 3D — giúp tích hợp vật thể ảo (CGI) vào cảnh quay thật seamlessly.",
    meta_title:
      "Matchmoving là gì? Ý nghĩa và ứng dụng trong VFX | CINS",
    meta_description:
      "Matchmoving theo dõi camera trong VFX. Tìm hiểu PFTrack, SynthEyes, 3DEqualizer và workflow camera tracking pro.",
    noi_dung: `
<section class="arc-intro">
  <p>Trong Marvel film — camera nhảy quanh Iron Man bay qua city. Camera tracking trong CGI world phải match exactly camera tracking trong real footage để Iron Man &quot;stick&quot; vào scene. Đây là <strong>Matchmoving</strong> (camera tracking) — kỹ thuật fundamental của modern VFX. Mỗi VFX shot có CGI element bắt buộc cần matchmoving precise.</p>
  <p>Matchmoving là specialization cao cấp trong VFX pipeline. Matchmover artist là core role trong major studio. Hiểu workflow tracking, software dedicated (PFTrack, SynthEyes, 3DEqualizer), và problem solving help integrate seamlessly CGI vào live action.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Matchmoving là gì?</h2>
  <p>Matchmoving (hoặc Camera Tracking) là kỹ thuật <strong>tái tạo motion của camera thực</strong> trong cảnh quay <strong>như là camera ảo trong không gian 3D</strong>. Goal: 3D scene có camera move identical với real-world footage camera. Khi CGI render với camera ảo này, perspective + motion exactly match plate → CGI &quot;sticks&quot; vào real footage.</p>
  <p>How it works: software analyze multiple frames footage, identify <strong>track points</strong> (pixel patches stationary in 3D world — corners, edges, marker). Triangulate from track point motion → solve camera position, rotation per frame. Output: 3D camera path matching real camera. Plus 3D point cloud của scene.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Tracker vs Matchmover</span>
    <p>&quot;Tracker&quot; software tự động analyze. &quot;Matchmover&quot; artist verify, fix, optimize tracking. Software automate 80% nhưng difficult shot (motion blur, low light, parallax shift) need manual touch. Matchmover combine technical knowledge với artistic eye.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Track Points</strong> — pixel patches stable</li>
    <li><strong>2D Tracking</strong> — track in image plane</li>
    <li><strong>3D Solving</strong> — derive 3D camera position</li>
    <li><strong>Survey Data</strong> — measured distance/marker on set</li>
    <li><strong>Lens Distortion</strong> — undistort plate cho clean track</li>
    <li><strong>Tracking Markers</strong> — physical X marker on set</li>
    <li><strong>Object Tracking</strong> — track moving object vs camera</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"matchmoving camera tracking VFX 3D tracker pftrack syntheyes"</span>
    </div>
    <p class="arc-image-caption">Matchmoving — tái tạo motion camera thực vào 3D space cho CGI integration</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Software Matchmoving</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>PFTrack</summary>
      <div class="arc-card-body">
        <p>Industry standard cho film VFX. Used by Marvel, DC, Star Wars studios. Robust auto-tracking + manual control. Lens distortion handle. Object tracking. Expensive ($1500+).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>SynthEyes</summary>
      <div class="arc-card-body">
        <p>Andersson Technologies. Affordable ($600), capable. Indie filmmaker, mid-tier studio. Good geometric solve, lens distortion. Active development.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3DEqualizer</summary>
      <div class="arc-card-body">
        <p>Science-D-Visions. Top film VFX tool. Premium price. Used Pixar, ILM. Advanced workflow, scientific approach. Steep learning curve.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Boujou</summary>
      <div class="arc-card-body">
        <p>Vicon. Legacy industry standard. Less popular now (others overtook), still used some studio. Auto-tracking strong.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Blender</summary>
      <div class="arc-card-body">
        <p>Free, built-in tracker. Good cho beginner, indie. Capable cho simple shot. Limited cho complex.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>After Effects 3D Camera Tracker</summary>
      <div class="arc-card-body">
        <p>Built-in AE. Limited but quick — small CGI element comp. Not for serious VFX pipeline.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Mocha Pro</summary>
      <div class="arc-card-body">
        <p>Planar tracker focused. Different approach — track 2D planes. Best cho roto, screen replacement. Limited camera solve.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Matchmoving</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Plate Preparation</h3>
    <ul class="arc-list">
      <li>Import footage vào tracking software</li>
      <li>Undistort lens (need lens profile or grid shot)</li>
      <li>Stabilize jitter nếu cần</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Auto-Track</h3>
    <ul class="arc-list">
      <li>Software analyze, identify track points</li>
      <li>Hundreds of points generated</li>
      <li>Initial tracking pass</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Manual Cleanup</h3>
    <ul class="arc-list">
      <li>Remove bad track (jumping, drifting)</li>
      <li>Add manual track for missed area</li>
      <li>Lock keyframe at critical pose</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. 3D Solve</h3>
    <ul class="arc-list">
      <li>Software calculate camera 3D position từ track</li>
      <li>Error metric — sub-pixel accuracy goal</li>
      <li>Multiple solve iteration cho refinement</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Survey / Scale</h3>
    <ul class="arc-list">
      <li>Set scale cho scene (real-world meter)</li>
      <li>Reference point — known distance</li>
      <li>Align orientation (gravity, floor plane)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Export to 3D Software</h3>
    <ul class="arc-list">
      <li>Export camera data — FBX, ABC, Maya scene</li>
      <li>Plus 3D point cloud</li>
      <li>Import vào Maya/Blender for CGI work</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Verify in 3D</h3>
    <ul class="arc-list">
      <li>Place test cube on 3D scene</li>
      <li>Render → composite onto plate</li>
      <li>Check cube &quot;stays&quot; on real object</li>
      <li>Sub-pixel slide = bad track, rework</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Common Challenges</h2>
  <ul class="arc-list">
    <li><strong>Motion blur</strong> — fast camera move blurs track points. Manual track keyframe</li>
    <li><strong>Low contrast</strong> — track points unclear. Boost contrast pre-track</li>
    <li><strong>Repetitive pattern</strong> — software confused by similar pattern. Mask exclude</li>
    <li><strong>Parallax error</strong> — points too close to camera shift incorrectly. Survey marker far</li>
    <li><strong>Handheld shaky</strong> — extreme motion = noisy track. Smooth/stabilize first</li>
    <li><strong>Reflective surface</strong> — water, glass tracking unreliable. Mask out</li>
    <li><strong>Zoom shot</strong> — lens distortion changes frame-by-frame. Complex solve</li>
  </ul>
</section>
`,
  },

  // 05. Material
  {
    id: "20b27327-8249-499f-9934-79baee97c719",
    tieu_de: "Material (3D)",
    tieu_de_viet: "Vật liệu 3D (Material)",
    tom_tat:
      "Material là tập hợp các thuộc tính bề mặt của vật thể 3D — màu sắc, độ bóng, độ trong suốt, cách phản chiếu ánh sáng — quyết định vật thể look như kim loại, nhựa, da, hay gỗ.",
    meta_title:
      "Material 3D là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Material trong 3D định nghĩa surface. Tìm hiểu PBR workflow, shader, texture maps và material library chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Cùng một sphere model trong Blender — apply material &quot;Gold&quot; → kim loại bóng vàng. Apply &quot;Brushed Steel&quot; → kim loại brushed. Apply &quot;Polished Wood&quot; → gỗ bóng. Cùng geometry, khác material → 3 vật thể hoàn toàn khác. <strong>Material</strong> là half của visual identity trong 3D — geometry + material = appearance.</p>
  <p>Material là kiến thức cơ bản cho mọi 3D artist. Hiểu PBR workflow, material maps, shader concept giúp tạo render realistic — phân biệt amateur (flat color) và pro (proper material). Modern PBR standard universally adopted across Blender, Maya, Unreal, Unity.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Material là gì?</h2>
  <p>Material trong 3D là tập hợp các <strong>thuộc tính bề mặt</strong> (surface properties) của object — định nghĩa cách bề mặt tương tác với light. Properties bao gồm: <strong>Base Color</strong> (albedo), <strong>Roughness</strong> (mịn vs nhám), <strong>Metallic</strong> (kim loại hay không), <strong>Normal</strong> (chi tiết surface), <strong>Displacement</strong> (volume), <strong>Emission</strong> (phát sáng), <strong>Opacity</strong> (trong suốt), <strong>Subsurface</strong> (light penetrate skin/wax).</p>
  <p>Modern standard: <strong>PBR (Physically Based Rendering)</strong> — mathematical model based on real-world physics. Material defined với consistent set of properties across software. Same material assets work in Blender, Unreal, Unity, Substance, Marmoset.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Material vs Texture vs Shader</span>
    <p><strong>Texture</strong>: image file (color map, normal map). <strong>Shader</strong>: code/node graph define how lighting interact. <strong>Material</strong>: combination of textures + shader applied to object. Material is high-level concept; texture và shader are components.</p>
  </div>

  <ul class="arc-list">
    <li><strong>PBR (Physically Based Rendering)</strong> — modern standard</li>
    <li><strong>Albedo / Base Color</strong> — surface color</li>
    <li><strong>Roughness</strong> — micro-surface (mịn = bóng, nhám = matte)</li>
    <li><strong>Metallic</strong> — kim loại hay dielectric</li>
    <li><strong>Normal Map</strong> — fake surface detail</li>
    <li><strong>Displacement</strong> — actual geometry detail</li>
    <li><strong>AO (Ambient Occlusion)</strong> — contact shadow</li>
    <li><strong>Subsurface Scattering</strong> — skin, wax, marble</li>
    <li><strong>Emission</strong> — light-emitting surface</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"material 3D PBR shader rough metallic blender substance"</span>
    </div>
    <p class="arc-image-caption">Material — surface properties define look: metal, wood, skin, plastic</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>PBR Workflow</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Metallic / Roughness Workflow</summary>
      <div class="arc-card-body">
        <p>Most popular PBR standard. Metallic map binary 0/1 (dielectric vs metal). Roughness 0-1 (mirror vs matte). Used by Unreal, Unity, Substance Painter. Industry standard.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Specular / Glossiness Workflow</summary>
      <div class="arc-card-body">
        <p>Alternative PBR. Specular map (reflection intensity), Glossiness (inverse of roughness). Used by some older pipeline. Compatible nhưng less popular than metallic/roughness.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Maps trong PBR Material</summary>
      <div class="arc-card-body">
        <p>Base Color (color), Metallic (kim loại), Roughness (surface), Normal (detail fake), Height/Displacement (real bump), AO (contact shadow), Emissive (glow).</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>BRDF Models</summary>
      <div class="arc-card-body">
        <p>Bidirectional Reflectance Distribution Function — math model how surface reflects light. GGX, Beckmann common. Built into shader, không user-configurable usually.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Material Types Common</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Metal</h3>
    <ul class="arc-list">
      <li>Metallic = 1, low roughness</li>
      <li>Base color = metal tint (gold yellow, steel gray)</li>
      <li>Distinct reflection</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Plastic / Polished</h3>
    <ul class="arc-list">
      <li>Metallic = 0, low roughness</li>
      <li>Strong specular highlight</li>
      <li>Color visible through highlight</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Wood</h3>
    <ul class="arc-list">
      <li>Metallic = 0, mid roughness</li>
      <li>Wood grain texture (color + normal)</li>
      <li>Subtle highlight</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Skin</h3>
    <ul class="arc-list">
      <li>Subsurface scattering critical</li>
      <li>Low roughness highlight</li>
      <li>Complex multi-layer shader</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Fabric / Cloth</h3>
    <ul class="arc-list">
      <li>Specific fabric shader (sheen)</li>
      <li>Anisotropic for silk/velvet</li>
      <li>Detailed normal map cho weave</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Glass / Transparent</h3>
    <ul class="arc-list">
      <li>Transmission (refraction)</li>
      <li>IOR (Index of Refraction): glass 1.5</li>
      <li>Caustics rendering expensive</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Emissive (Light)</h3>
    <ul class="arc-list">
      <li>Emission color, strength</li>
      <li>TV screen, neon sign</li>
      <li>Mesh act as light source</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Material Resources &amp; Tools</h2>
  <ul class="arc-list">
    <li><strong>Substance Painter</strong> — chuẩn industry cho texture material</li>
    <li><strong>Substance Designer</strong> — node-based procedural material</li>
    <li><strong>Quixel Megascans</strong> — free PBR material library (Unreal)</li>
    <li><strong>Poliigon, Textures.com</strong> — paid material libraries</li>
    <li><strong>Material Maker</strong> — free open-source Substance Designer alternative</li>
    <li><strong>Blender Asset Library</strong> — built-in material</li>
    <li><strong>BlenderKit, ArtStation Marketplace</strong> — community materials</li>
    <li><strong>Render Engine</strong>: Cycles, Eevee, Arnold, V-Ray, RenderMan — all PBR compatible</li>
  </ul>
</section>
`,
  },

  // 06. Matte Painting
  {
    id: "095b9d9f-8cc6-4a07-b0d1-fff077c8c7ca",
    tieu_de: "Matte Painting",
    tieu_de_viet: "Tranh vẽ kỹ thuật (Matte Painting)",
    tom_tat:
      "Matte Painting là kỹ thuật sử dụng tranh vẽ, ảnh chụp hoặc digital painting kết hợp với 3D, VFX để thay thế các yếu tố thực tế trong cảnh quay thật — tạo environment không thể quay được.",
    meta_title:
      "Matte Painting là gì? Ý nghĩa và ứng dụng trong VFX | CINS",
    meta_description:
      "Matte Painting kỹ thuật cổ điển VFX. Tìm hiểu workflow digital matte painting, projection và career VFX environment artist.",
    noi_dung: `
<section class="arc-intro">
  <p>Star Wars 1977 — Death Star approach scene. Không phải model, không phải CGI (chưa có) — đó là <strong>matte painting</strong> trên kính. Artist vẽ tay trên large glass panel, camera shoot through, blend với live action. Modern day Marvel — alien city in distance? Còn là matte painting, nhưng giờ là digital, painted in Photoshop, projected onto 3D geometry.</p>
  <p>Matte Painting là discipline cổ điển vẫn relevant trong modern VFX. Digital matte painter là role specialized trong studio top — combine 2D painting skill với 3D knowledge. Career path attractive cho artist với strong illustration background want enter VFX.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Matte Painting là gì?</h2>
  <p>Matte Painting là <strong>kỹ thuật tạo background hoặc environment</strong> bằng cách <strong>vẽ/composite</strong> — không phải quay thực tế. Originally (1900s-1990s): painted on glass panel, blocked area của camera frame. Live action shot through transparent area; painted area replace background. &quot;Matte&quot; = mask area.</p>
  <p>Modern era: <strong>Digital Matte Painting (DMP)</strong> — painted in Photoshop, combine với 3D geometry projection. Artist paint vast vista (mountain, city, sky), project onto 3D plane → 2.5D scene allowing camera move. Used cho creating impossible environment — alien planet, ancient city, future utopia.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Matte Painting Famous Examples</span>
    <p><strong>Star Wars</strong>: Death Star, Mos Eisley — all matte paintings 1977. <strong>Lord of the Rings</strong>: Helm&apos;s Deep distant view, Edoras kingdom. <strong>Avatar</strong>: Pandora alien landscapes. <strong>Game of Thrones</strong>: King&apos;s Landing skyline. Most epic film vista — matte painting.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Glass Matte Painting</strong> — traditional, painted on glass</li>
    <li><strong>Digital Matte Painting (DMP)</strong> — modern Photoshop-based</li>
    <li><strong>Projection Mapping</strong> — project painting onto 3D geometry</li>
    <li><strong>2.5D Scene</strong> — flat painting projected → fake 3D depth</li>
    <li><strong>Photobashing</strong> — combine photos to build painting</li>
    <li><strong>Concept Art Crossover</strong> — DMP often based concept art</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"matte painting VFX environment digital cinematic Star Wars"</span>
    </div>
    <p class="arc-image-caption">Matte Painting — tranh background tạo environment impossible to film</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Loại Matte Painting</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Traditional Glass Matte</summary>
      <div class="arc-card-body">
        <p>Pre-1990s. Painted on large glass panel. Live action camera shoot through clear part. Painted part blocks real BG, replace with painting. Iconic Star Wars, Indiana Jones.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Digital Matte Painting (DMP)</summary>
      <div class="arc-card-body">
        <p>Modern standard. Photoshop creation. High-resolution detail. Composite into shot via Nuke/AE. 2D image static — limit camera move.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Projection Matte Painting</summary>
      <div class="arc-card-body">
        <p>DMP projected onto 3D geometry (terrain, simple geometry). Camera move possible — parallax shift. Standard cho modern film VFX.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Multi-Plane Matte</summary>
      <div class="arc-card-body">
        <p>Multiple flat planes at different depth — parallax effect khi camera move. Cheaper than full 3D, more flexible than single plane.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Hybrid CGI + Matte Painting</summary>
      <div class="arc-card-body">
        <p>Foreground CGI (interactive elements), midground 3D geometry với projection matte, background flat matte. Production efficient.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Digital Matte Painting</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Concept &amp; Reference</h3>
    <ul class="arc-list">
      <li>Concept art, director brief</li>
      <li>Gather reference photo — landscape, architecture</li>
      <li>Mood reference, color palette</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Photobash Base</h3>
    <ul class="arc-list">
      <li>Combine photo elements as base</li>
      <li>Quickly establish composition</li>
      <li>Blend, mask, color match</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Paint Detail</h3>
    <ul class="arc-list">
      <li>Photoshop painting over photo base</li>
      <li>Add original detail — fantasy element, fix anatomy</li>
      <li>Match style, lighting</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Atmospheric Depth</h3>
    <ul class="arc-list">
      <li>Distance fog, color shift</li>
      <li>Aerial perspective — far thing cooler, less saturated</li>
      <li>Create depth feel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. 3D Projection Setup</h3>
    <ul class="arc-list">
      <li>Build simple 3D geometry — terrain plane, building cubes</li>
      <li>UV-map painting onto geometry</li>
      <li>Project from camera angle</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Composite</h3>
    <ul class="arc-list">
      <li>Render projected matte painting với plate camera move</li>
      <li>Composite into shot via Nuke</li>
      <li>Match lighting, grain, atmosphere</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Final Refinement</h3>
    <ul class="arc-list">
      <li>Director review, iteration</li>
      <li>Animated element (cloud move, birds)</li>
      <li>Final QC</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Skills cho Matte Painter</h2>
  <ul class="arc-list">
    <li><strong>Photoshop expert</strong> — primary tool, advanced level</li>
    <li><strong>Painting fundamental</strong> — perspective, color, light</li>
    <li><strong>Photography literacy</strong> — understanding camera, photo manipulation</li>
    <li><strong>3D basics</strong> — Maya/Blender for projection setup</li>
    <li><strong>Nuke compositing</strong> — for integration shot</li>
    <li><strong>Reference research</strong> — art history, real architecture, nature</li>
    <li><strong>Studio</strong>: ILM, Weta Digital, MPC, DNEG, Pixomondo</li>
    <li><strong>Career path</strong>: Junior DMP artist → Senior DMP → Concept Artist crossover</li>
  </ul>
</section>
`,
  },

  // 07. MEL Scripting
  {
    id: "46f172cf-6811-4676-972a-7b3abf9687f5",
    tieu_de: "MEL Scripting",
    tieu_de_viet: "MEL Scripting trong Maya",
    tom_tat:
      "MEL (Maya Embedded Language) là ngôn ngữ scripting của Autodesk Maya — cho phép user tự động hóa tác vụ lặp lại và tạo công cụ tùy chỉnh, foundation của TD workflow trong Maya.",
    meta_title:
      "MEL Scripting là gì? Ý nghĩa và ứng dụng trong Maya | CINS",
    meta_description:
      "MEL Scripting tự động hóa Maya. Tìm hiểu syntax, common command, MEL vs Python và career Technical Director.",
    noi_dung: `
<section class="arc-intro">
  <p>3D animator phải rename 500 joint cho character rig — manual = 2 giờ. Hoặc viết MEL script — 5 phút setup, 1 giây execute. Đây là power của <strong>MEL scripting</strong> trong Autodesk Maya — turn tedious task into automated workflow. Senior animator và Technical Director (TD) rely heavily on MEL.</p>
  <p>MEL Scripting là kỹ năng phân biệt junior và senior trong Maya workflow. Hiểu MEL basics giúp automation, custom tool, workflow optimization — quan trọng cho career growth từ artist → senior TD. Critical skill cho rigger, pipeline TD.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>MEL là gì?</h2>
  <p>MEL (Maya Embedded Language) là <strong>ngôn ngữ scripting native</strong> của Autodesk Maya. Designed specifically cho Maya — syntax C-like, có direct access vào Maya scene, command, attribute. MEL script có thể: create object, modify attribute, batch process, build custom UI, automate workflow. Every Maya action có MEL command equivalent — manually click button = MEL command execute internally.</p>
  <p>Mỗi action trong Maya — create polygon, set keyframe, render — corresponding MEL command. Maya&apos;s Script Editor show MEL command for every UI click. Learn by examining — click button, see MEL command print, modify/extend.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">MEL vs Python trong Maya</span>
    <p>Maya supports BOTH MEL and Python. <strong>MEL</strong>: older, simpler, Maya-specific. Faster cho simple Maya task. <strong>Python</strong>: modern, general-purpose, vast library ecosystem (numpy, ML). Better cho complex pipeline. Modern Maya TD use Python primarily, MEL for legacy scripts. Both worth learning.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Script Editor</strong> — Maya panel run MEL/Python</li>
    <li><strong>Command</strong> — MEL function executing action</li>
    <li><strong>Procedure (Proc)</strong> — MEL function definition</li>
    <li><strong>Variable</strong> — store value (string, int, float, vector, array)</li>
    <li><strong>Flag</strong> — command parameter</li>
    <li><strong>Shelf Button</strong> — UI element trigger script</li>
    <li><strong>Hotkey</strong> — keyboard shortcut trigger script</li>
    <li><strong>userSetup.mel</strong> — startup script Maya</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"MEL scripting maya script editor command automation"</span>
    </div>
    <p class="arc-image-caption">MEL Scripting — automation Maya workflow, foundation Technical Director</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>MEL Syntax Cơ bản</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Variable Declaration</summary>
      <div class="arc-card-body">
        <p><code>string $name = &quot;polyCube&quot;;</code> — string variable. <code>int $count = 10;</code> — integer. <code>float $value = 2.5;</code> — float. <code>vector $pos = &lt;&lt;1,2,3&gt;&gt;;</code> — 3D vector. <code>string $list[] = {&quot;a&quot;,&quot;b&quot;};</code> — array.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Maya Command</summary>
      <div class="arc-card-body">
        <p><code>polyCube -name &quot;myBox&quot; -width 2;</code> — create cube. <code>move 5 0 0 myBox;</code> — move. <code>setAttr myBox.translateY 10;</code> — set attribute. <code>ls -selection;</code> — list selected.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Loop</summary>
      <div class="arc-card-body">
        <p><code>for($i = 0; $i &lt; 10; $i++) {<br/>&nbsp;&nbsp;polyCube -name (&quot;box_&quot; + $i);<br/>}</code> — create 10 cubes named box_0 to box_9.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Conditional</summary>
      <div class="arc-card-body">
        <p><code>if ($value &gt; 5) {<br/>&nbsp;&nbsp;print &quot;big&quot;;<br/>} else {<br/>&nbsp;&nbsp;print &quot;small&quot;;<br/>}</code></p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Procedure (Function)</summary>
      <div class="arc-card-body">
        <p><code>global proc createCubes(int $count) {<br/>&nbsp;&nbsp;for($i=0; $i&lt;$count; $i++)<br/>&nbsp;&nbsp;&nbsp;&nbsp;polyCube;<br/>}</code> — reusable. Call: <code>createCubes(5);</code></p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Comments</summary>
      <div class="arc-card-body">
        <p><code>// single line comment</code><br/><code>/* multi<br/>line<br/>comment */</code></p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Use Cases MEL</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Batch Rename</h3>
    <ul class="arc-list">
      <li>Rename 100 joints với naming convention</li>
      <li>Add prefix/suffix to selection</li>
      <li>Mirror name _L → _R</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Auto Rig</h3>
    <ul class="arc-list">
      <li>Create joint chain procedurally</li>
      <li>Setup IK handle, pole vector</li>
      <li>Save weeks per character</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Animation Tools</h3>
    <ul class="arc-list">
      <li>Pose library — save/load pose</li>
      <li>Mirror keyframes</li>
      <li>Bake animation onto controller</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Pipeline Integration</h3>
    <ul class="arc-list">
      <li>Auto-publish asset to library</li>
      <li>Version control hook</li>
      <li>Render submission wrapper</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Custom UI</h3>
    <ul class="arc-list">
      <li>Custom window với button</li>
      <li>Marking menu (radial menu)</li>
      <li>Shelf button cho common operation</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Cleanup Scripts</h3>
    <ul class="arc-list">
      <li>Find unused nodes, delete</li>
      <li>Remove namespace prefix</li>
      <li>Optimize scene</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Learning &amp; Career</h2>
  <ul class="arc-list">
    <li><strong>Maya Script Editor</strong> — watch MEL command print khi click button. Best learning</li>
    <li><strong>Maya Help → MEL Command Reference</strong> — list complete commands</li>
    <li><strong>Online courses</strong>: Pluralsight, CG Cookie, Maya documentation</li>
    <li><strong>Build small tool first</strong> — solve own workflow problem</li>
    <li><strong>Transition to Python</strong> — modern industry expects Python</li>
    <li><strong>Career path</strong>: Artist → Senior Artist/TD → Technical Director → Pipeline TD</li>
    <li><strong>Salary boost</strong>: MEL/Python scripting Maya artists earn 30-50% more</li>
    <li><strong>Studio hire</strong>: Industrial Light &amp; Magic, Pixar, DreamWorks need TD</li>
  </ul>
</section>
`,
  },

  // 08. Mesh
  {
    id: "ef705d38-c928-4f92-9b0b-16067080f70b",
    tieu_de: "Mesh (3D)",
    tieu_de_viet: "Lưới 3D (Mesh)",
    tom_tat:
      "Mesh là tập hợp các đỉnh (vertex), cạnh (edge) và mặt phẳng (polygon) tạo nên hình dạng của một mô hình 3D — building block cơ bản của mọi vật thể trong 3D space.",
    meta_title: "Mesh 3D là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Mesh 3D là building block của model. Tìm hiểu vertex, edge, polygon, topology, quad vs tri và best practice mesh modeling.",
    noi_dung: `
<section class="arc-intro">
  <p>Mỗi character trong game Witcher 3, mỗi spaceship trong Star Wars, mỗi building trong Cyberpunk — đều là <strong>mesh</strong>. Tập hợp của thousand đến million của vertex, edge, polygon — assembled tạo shape. Mesh là foundation của 3D graphics — không có mesh = không có 3D. Hiểu mesh structure là kiến thức cơ bản nhất cho mọi 3D artist.</p>
  <p>Mesh là khái niệm fundamental cho 3D modeler, character artist, environment artist. Hiểu topology, quad vs tri, mesh density giúp model hiệu quả, deform tốt khi animate, và optimize cho engine real-time hoặc render quality cho film.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Mesh là gì?</h2>
  <p>Mesh là <strong>cấu trúc dữ liệu 3D</strong> bao gồm: <strong>Vertex</strong> (điểm trong không gian 3D với x,y,z); <strong>Edge</strong> (đường nối giữa hai vertex); <strong>Face / Polygon</strong> (mặt phẳng tạo bởi nhiều vertex/edge, thường 3 hoặc 4 vertex). Mesh thể hiện shape của 3D object — combining nhiều polygon tạo surface complex.</p>
  <p>Different mesh types: <strong>Polygonal Mesh</strong> (most common, made of polygons), <strong>NURBS</strong> (mathematical curves, smooth surface), <strong>Subdivision Surface</strong> (smoothed polygonal). Modern workflow chủ yếu polygonal — flexible, compatible với mọi software, easier animate.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Quad vs Triangle (Tri)</span>
    <p><strong>Quad</strong>: 4-sided polygon. Standard cho modeling — easy edit, animate, subdivide. <strong>Triangle</strong>: 3-sided polygon. Renderer/game engine convert quads to tri internally. Modeling artist work in quads; export tri for engine. Mixed quad/tri called &quot;n-gon&quot; (5+) — avoid in modeling, problematic.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Vertex</strong> — điểm 3D (singular: vertex, plural: vertices)</li>
    <li><strong>Edge</strong> — đường nối 2 vertex</li>
    <li><strong>Face / Polygon</strong> — mặt phẳng 3+ vertex</li>
    <li><strong>Quad</strong> — 4-sided face (preferred)</li>
    <li><strong>Triangle</strong> — 3-sided face (engine standard)</li>
    <li><strong>N-gon</strong> — 5+ sided face (avoid)</li>
    <li><strong>Topology</strong> — flow của edge/polygon</li>
    <li><strong>UV Map</strong> — 2D representation cho texture</li>
    <li><strong>Normal</strong> — direction face pointing</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"mesh 3D polygon wireframe vertex edge topology"</span>
    </div>
    <p class="arc-image-caption">Mesh — vertex + edge + polygon = 3D shape, building block 3D graphics</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Topology — Mesh Quality</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Edge Flow</summary>
      <div class="arc-card-body">
        <p>Edges flow natural — follow muscle, form. Good topology bend correctly khi animate. Bad topology creates kink, stretch issue.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Quads Predominate</summary>
      <div class="arc-card-body">
        <p>Aim 100% quad cho character. Tri OK in non-deforming area. N-gon avoid entirely — subdivision misbehave.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Loop Cuts</summary>
      <div class="arc-card-body">
        <p>Edge loop around deform area — knee, elbow, jaw. Provide extra geometry cho clean deform.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Pole Management</summary>
      <div class="arc-card-body">
        <p>Pole = vertex với 5+ edges connecting. Necessary but place carefully — hide trong non-visible area (top of head, sole of foot). Visible pole creates pinch.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Edge Density Distribution</summary>
      <div class="arc-card-body">
        <p>More polygon in detail area (face, hands). Less polygon in simple area (back, neck). Avoid uniform density wasteful.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Symmetry</summary>
      <div class="arc-card-body">
        <p>Character usually symmetric. Model half, mirror to other side. Save time, ensure consistency.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Mesh Operations</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Extrude</h3>
    <ul class="arc-list">
      <li>Push face/edge/vertex out from surface</li>
      <li>Most fundamental modeling operation</li>
      <li>Create extrusion (push button on box face = column)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Bevel</h3>
    <ul class="arc-list">
      <li>Round edge or vertex</li>
      <li>Critical cho realistic hard-surface modeling</li>
      <li>Sharp edge unrealistic — real object có bevel</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Loop Cut</h3>
    <ul class="arc-list">
      <li>Add edge loop around mesh</li>
      <li>Increase detail in area</li>
      <li>Control subdivision (more loop = sharper edge)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Boolean</h3>
    <ul class="arc-list">
      <li>Add/subtract/intersect meshes</li>
      <li>Quick rough block — but ugly topology</li>
      <li>Need retopo after Boolean</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Subdivision Surface</h3>
    <ul class="arc-list">
      <li>Smooth low-poly mesh to high-poly</li>
      <li>Catmull-Clark algorithm common</li>
      <li>Real-time preview in viewport</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Retopology</h3>
    <ul class="arc-list">
      <li>Re-build mesh với clean topology over high-poly</li>
      <li>Convert sculpt to animatable model</li>
      <li>Tool: TopoGun, Blender RetopoFlow, Maya Quad Draw</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Mesh cho Different Use Cases</h2>
  <ul class="arc-list">
    <li><strong>Game Real-time</strong>: 10K-100K poly per character (depending on platform)</li>
    <li><strong>Mobile Game</strong>: 1K-10K poly tight budget</li>
    <li><strong>VR Game</strong>: similar to mobile, performance critical</li>
    <li><strong>Film Animation</strong>: 100K-1M+ poly per character (Pixar, Disney)</li>
    <li><strong>Hero VFX Asset</strong>: millions of poly + displacement</li>
    <li><strong>Background Asset</strong>: lower poly + LOD</li>
    <li><strong>UE5 Nanite</strong>: unlimited geometry (virtualized) — new paradigm</li>
    <li><strong>Tool</strong>: Maya, 3ds Max, Blender, ZBrush, Modo, Houdini all mesh-based</li>
  </ul>
</section>
`,
  },

  // 09. MIDI
  {
    id: "7cbbbf6b-3592-4096-bdd7-33fd73af5a1f",
    tieu_de: "MIDI",
    tieu_de_viet: "Giao thức MIDI",
    tom_tat:
      "MIDI là giao thức kết nối nhạc cụ điện tử và phần mềm âm nhạc — truyền thông tin về nốt nhạc, velocity, controller (không truyền âm thanh thực) — nền tảng của sản xuất âm nhạc hiện đại.",
    meta_title: "MIDI là gì? Ý nghĩa và ứng dụng trong sản xuất nhạc | CINS",
    meta_description:
      "MIDI giao thức nhạc kỹ thuật số. Tìm hiểu cách hoạt động, MIDI controller, workflow trong Ableton, FL Studio, Logic.",
    noi_dung: `
<section class="arc-intro">
  <p>Bạn cắm keyboard MIDI vào laptop → mở Ableton → play key → nghe piano. Nhưng &quot;piano&quot; không phải từ keyboard — keyboard chỉ truyền MIDI message (note, velocity), software render audio piano. Đây là <strong>MIDI</strong> — giao thức cho phép nhạc cụ và software giao tiếp, foundation của music production từ 1983 đến nay.</p>
  <p>MIDI là kiến thức cơ bản cho music producer, sound designer, composer. Hiểu MIDI concept và workflow giúp leverage virtual instrument vô tận, automate parameter, integrate hardware với DAW. Critical cho modern music production career.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>MIDI là gì?</h2>
  <p>MIDI (Musical Instrument Digital Interface) là <strong>giao thức truyền thông</strong> giữa nhạc cụ điện tử (synthesizer, drum machine, keyboard) và computer/software. Introduced 1983, vẫn là standard hiện nay. Critical concept: MIDI không truyền <strong>âm thanh</strong> — truyền <strong>data về performance</strong> (nốt nào, mạnh hay nhẹ, khi nào, controller value).</p>
  <p>Vd: bạn play C4 key on MIDI keyboard. Keyboard gửi message: &quot;Note On, C4, velocity 80&quot;. Computer/DAW nhận message → trigger virtual piano sound. Different virtual instrument (Pianoteq vs Kontakt piano) → different sound từ same MIDI message. Tách biệt performance data và audio rendering = MIDI&apos;s power.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">MIDI vs Audio File</span>
    <p><strong>MIDI</strong>: data only (note, velocity, time). File size tiny (KB). Editable note-by-note. Change instrument any time. <strong>Audio (WAV, MP3)</strong>: actual sound waveform. File size large (MB+). Not editable note-level. Fixed instrument sound. Different purpose.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Note On / Note Off</strong> — start/stop note</li>
    <li><strong>Velocity</strong> — 0-127 strength of key press</li>
    <li><strong>Pitch Bend</strong> — slide note up/down</li>
    <li><strong>Control Change (CC)</strong> — parameter like volume, mod wheel</li>
    <li><strong>Program Change</strong> — switch instrument preset</li>
    <li><strong>MIDI Channel</strong> — 16 channels for routing</li>
    <li><strong>MIDI Clock</strong> — sync tempo</li>
    <li><strong>SysEx</strong> — system exclusive (advanced data)</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"MIDI controller keyboard DAW music production"</span>
    </div>
    <p class="arc-image-caption">MIDI — giao thức data nhạc cụ ↔ software, foundation music production</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Hardware MIDI</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>MIDI Keyboard</summary>
      <div class="arc-card-body">
        <p>Most common MIDI controller. 25, 49, 61, 88 keys. Velocity-sensitive, sometimes aftertouch. Brand: Akai MPK, Arturia KeyLab, Native Instruments Komplete Kontrol. $100-1000+.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>MIDI Pad Controller</summary>
      <div class="arc-card-body">
        <p>Grid of velocity-sensitive pad. Drum/beat programming. Akai MPC, Ableton Push, Maschine. Finger drumming, sample triggering.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>MIDI Wind Controller</summary>
      <div class="arc-card-body">
        <p>Saxophone/flute-style controller. Akai EWI. Wind player feel.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>MIDI Guitar</summary>
      <div class="arc-card-body">
        <p>Guitar với MIDI pickup converts pitch to MIDI. Trigger virtual instrument from guitar play. Limited adoption.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>MIDI Drum</summary>
      <div class="arc-card-body">
        <p>Electronic drum kit. Roland, Yamaha. Trigger drum sample software. Practice without volume.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>MIDI Control Surface</summary>
      <div class="arc-card-body">
        <p>Mixing console with MIDI control. Fader, knob, button. Control DAW parameter. Behringer X-Touch, Mackie Control.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>MIDI trong DAW Workflow</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">1. Connect Hardware</h3>
    <ul class="arc-list">
      <li>USB plug-and-play (modern)</li>
      <li>Old-school: MIDI DIN cable + interface</li>
      <li>DAW recognize MIDI device automatically</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">2. Setup MIDI Track</h3>
    <ul class="arc-list">
      <li>New MIDI track in DAW</li>
      <li>Set input — MIDI keyboard</li>
      <li>Load virtual instrument (Kontakt, Serum, Massive)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3. Record MIDI</h3>
    <ul class="arc-list">
      <li>Click record, play keyboard</li>
      <li>MIDI note captured as data, not audio</li>
      <li>Multiple takes overlay possible</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">4. Edit MIDI</h3>
    <ul class="arc-list">
      <li>Piano roll view — note as bar trên grid</li>
      <li>Move, lengthen, change velocity per note</li>
      <li>Quantize cho timing fix</li>
      <li>Add note manually (mouse)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">5. Change Instrument</h3>
    <ul class="arc-list">
      <li>Same MIDI → different virtual instrument</li>
      <li>Re-render audio với new sound</li>
      <li>Test multiple instrument quickly</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">6. Automation</h3>
    <ul class="arc-list">
      <li>Automate parameter (filter cutoff, volume) over time</li>
      <li>Record from MIDI controller knob/fader</li>
      <li>Draw curve manually</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">7. Export</h3>
    <ul class="arc-list">
      <li>Export MIDI file (.mid) cho sharing</li>
      <li>Bounce to audio (WAV) cho final mix</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Ứng dụng &amp; Tips</h2>
  <ul class="arc-list">
    <li><strong>Composing</strong> — write song với virtual instrument trước hire musician</li>
    <li><strong>Beat Making</strong> — drum programming với MIDI pad</li>
    <li><strong>Sound Design</strong> — control synthesizer parameter via MIDI</li>
    <li><strong>Live Performance</strong> — trigger sample, control lighting via MIDI</li>
    <li><strong>Film Scoring</strong> — orchestral mock-up trước hire orchestra</li>
    <li><strong>Game Audio</strong> — interactive music via MIDI trigger</li>
    <li><strong>MIDI 2.0</strong> — new standard 2020+, higher resolution, bi-directional</li>
    <li><strong>Tip</strong>: invest in good MIDI keyboard early, weighted keys preferred cho pianist</li>
  </ul>
</section>
`,
  },

  // 10. Mockup
  {
    id: "8b5cd870-b872-41a3-811b-8407553d2bac",
    tieu_de: "Mockup",
    tieu_de_viet: "Mô hình minh họa (Mockup)",
    tom_tat:
      "Mockup là mô hình 3D hoặc hình ảnh minh họa của bao bì, sản phẩm, ấn phẩm — giúp hình dung sản phẩm cuối cùng trước khi sản xuất, tool quan trọng cho designer present client.",
    meta_title: "Mockup là gì? Ý nghĩa và ứng dụng trong sáng tạo | CINS",
    meta_description:
      "Mockup minh họa sản phẩm cuối. Tìm hiểu các loại mockup, free vs premium template và workflow tạo mockup chuyên nghiệp.",
    noi_dung: `
<section class="arc-intro">
  <p>Designer làm logo cho coffee shop — client xem flat logo không impressed. Designer place logo lên <strong>mockup</strong>: coffee cup, paper bag, t-shirt, sign — instantly client say &quot;wow, looks great!&quot;. Cùng logo, khác presentation. Mockup là tool critical cho designer — turn flat design into compelling visual presentation.</p>
  <p>Mockup là kỹ năng essential cho graphic designer, branding designer, product designer. Hiểu các loại mockup, sources free vs paid, và cách use mockup hiệu quả giúp present design professional, increase client approval rate, và create polished portfolio.</p>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">01</span>Mockup là gì?</h2>
  <p>Mockup là <strong>visual representation</strong> của design (logo, packaging, layout, app, website) trong <strong>realistic context</strong> — show how design will look on final product. Mockup không phải production-ready file — purely cho presentation và visualization. Types: physical mockup (real prototype), digital mockup (Photoshop template với smart objects), 3D mockup (Cinema 4D, Blender render).</p>
  <p>Workflow phổ biến: designer create flat design (logo, label) → place vào pre-made mockup template (smart object Photoshop) → instantly see realistic product image. Mockup template provide context: lighting, shadow, perspective, environment. Designer chỉ swap design content.</p>

  <div class="arc-infobox">
    <span class="arc-infobox-label">Mockup vs Prototype vs Wireframe</span>
    <p><strong>Wireframe</strong>: low-fidelity layout, blueprint. Black/white box. <strong>Mockup</strong>: high-fidelity visual, look like final but không functional. <strong>Prototype</strong>: functional interactive (click works). Different stage of design process — wireframe → mockup → prototype → production.</p>
  </div>

  <ul class="arc-list">
    <li><strong>Smart Object Mockup</strong> — Photoshop template editable</li>
    <li><strong>3D Mockup</strong> — rendered in Cinema 4D, Blender</li>
    <li><strong>Photographic Mockup</strong> — composite into photo</li>
    <li><strong>Packaging Mockup</strong> — box, bottle, bag</li>
    <li><strong>Apparel Mockup</strong> — t-shirt, cap, hoodie</li>
    <li><strong>Print Mockup</strong> — book, poster, business card</li>
    <li><strong>Digital Mockup</strong> — phone, laptop, browser</li>
    <li><strong>Mockup World</strong> — popular free mockup marketplace</li>
  </ul>

  <div class="arc-image-block arc-image-single">
    <div class="arc-image-placeholder">
      <span class="arc-img-hint-label">Gợi ý tìm ảnh</span>
      <span class="arc-img-hint-kw">"mockup design packaging branding presentation realistic"</span>
    </div>
    <p class="arc-image-caption">Mockup — realistic context cho flat design, presentation visualization</p>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">02</span>Các loại Mockup</h2>

  <div class="arc-accordion">
    <details class="arc-card" open>
      <summary>Packaging Mockup</summary>
      <div class="arc-card-body">
        <p>Box, bottle, can, bag, pouch. Apply label/design seamlessly. Coffee packaging, cosmetics, food. Most popular mockup category.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Apparel Mockup</summary>
      <div class="arc-card-body">
        <p>T-shirt, hoodie, cap, sock, jacket. Show design as wearable. Print-on-demand business heavily use. Real photo or 3D render mockup.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Print Mockup</summary>
      <div class="arc-card-body">
        <p>Business card, brochure, poster, book cover, magazine. Show layout trong physical print context.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Stationery Mockup</summary>
      <div class="arc-card-body">
        <p>Letterhead, envelope, notepad, pen. Branding package presentation.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Device Mockup (Digital)</summary>
      <div class="arc-card-body">
        <p>iPhone, iPad, MacBook, monitor showing app/website design. Apple device most common. Multiple device hardware (Samsung, Surface) cũng.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Sign/Signage Mockup</summary>
      <div class="arc-card-body">
        <p>Storefront sign, billboard, banner, vehicle wrap. Brand identity outdoor.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>Wall Art Mockup</summary>
      <div class="arc-card-body">
        <p>Picture frame on wall, art print displayed. Etsy seller heavily use cho product listing.</p>
      </div>
    </details>
    <details class="arc-card">
      <summary>3D Render Mockup</summary>
      <div class="arc-card-body">
        <p>Cinema 4D, Blender custom mockup. Unique angle, lighting. Premium quality. Time-consuming but bespoke.</p>
      </div>
    </details>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">03</span>Workflow Apply Mockup</h2>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photoshop Smart Object Mockup</h3>
    <ul class="arc-list">
      <li>Download .psd mockup file</li>
      <li>Open in Photoshop</li>
      <li>Double-click Smart Object layer</li>
      <li>Replace với your design (paste, drag)</li>
      <li>Save Smart Object — updates main file</li>
      <li>Export final mockup as JPG/PNG</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3D Mockup Tools</h3>
    <ul class="arc-list">
      <li>Placeit, Smartmockups — web-based, drag-drop</li>
      <li>Apply design via upload, instant preview</li>
      <li>Subscription-based ($10-15/month)</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">Photographic Composite</h3>
    <ul class="arc-list">
      <li>Take photo của blank product</li>
      <li>Photoshop composite design onto product surface</li>
      <li>Match perspective, lighting, shadow</li>
      <li>Custom, time-consuming</li>
    </ul>
  </div>

  <div class="arc-job-item">
    <h3 class="arc-h3">3D Render Custom</h3>
    <ul class="arc-list">
      <li>Cinema 4D, Blender — model product</li>
      <li>Apply design as texture material</li>
      <li>Setup lighting, render</li>
      <li>Maximum control, unique look</li>
    </ul>
  </div>
</section>

<section class="arc-section">
  <h2 class="arc-h2"><span class="arc-num">04</span>Resources Mockup</h2>
  <ul class="arc-list">
    <li><strong>Mockup World</strong> — free PSD mockup, huge library</li>
    <li><strong>Pixeden, GraphicBurger</strong> — quality free mockup</li>
    <li><strong>Creative Market</strong> — premium, professional grade</li>
    <li><strong>Mockup Cloud, Mr.Mockup</strong> — paid premium</li>
    <li><strong>Placeit</strong> — drag-drop online, subscription</li>
    <li><strong>Smartmockups</strong> — online, easy use</li>
    <li><strong>Envato Elements</strong> — subscription, vast library</li>
    <li><strong>Tip</strong>: free mockup serve well cho most use case, invest paid for branding identity</li>
    <li><strong>Best practice</strong>: present multiple mockup of same design — packaging + apparel + sign — show versatility</li>
  </ul>
</section>
`,
  },
];

console.log(
  `\n── Đợt 2 · Batch 4 — chạy ${items.length} bài keyword (I → P) ──\n`,
);

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
  `SELECT COUNT(*) AS con_lai_dot2
FROM article_bai_viet
WHERE loai_bai_viet = 'keyword'
  AND (noi_dung IS NULL OR noi_dung = '')
  AND tieu_de >= 'I' AND tieu_de < 'Q'`,
  "read",
);
const conLai = remain.rows?.[0]?.con_lai_dot2;

console.log(`\nCòn lại đợt 2: ${conLai} bài.`);
