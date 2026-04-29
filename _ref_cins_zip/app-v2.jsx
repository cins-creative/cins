/* CINs Homepage v2 — Y2K / Gen-Z creative
   Trẻ trung, sticker, hand-drawn, white-dominant
   ────────────────────────────────────────────── */

const { useState, useEffect } = React;

/* =========================================================
   NAV
   ========================================================= */
function Nav() {
  return (
    <nav className="nav">
      <div className="page nav-inner">
        <a href="#" className="nav-brand">
          <img src="assets/logo-cins.png" alt="CINs" />
          <span>CINs</span>
        </a>
        <div className="nav-links">
          <a href="#nghe">Khám phá nghề</a>
          <a href="#truong">Trường ĐH</a>
          <a href="#lotrinh">Lộ trình</a>
          <a href="#sukien">Sự kiện</a>
          <a href="#cauchuyen">Câu chuyện</a>
        </div>
        <a href="#" className="nav-cta">
          Đăng ký miễn phí
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </a>
      </div>
    </nav>
  );
}

/* =========================================================
   HERO — Big typo + collage on the right + stickers
   ========================================================= */
function Hero() {
  return (
    <section className="hero-v2">
      {/* Floating squiggle decorations */}
      <svg className="squiggle" style={{top:'80px', left:'48%', width:'80px'}} viewBox="0 0 80 30" fill="none">
        <path d="M2 15 Q 12 2, 22 15 T 42 15 T 62 15 T 78 15" stroke="#1F74C9" strokeWidth="3" strokeLinecap="round"/>
      </svg>

      <div className="page">
        <div className="hero-v2-grid">
          <div>
            <div className="hero-v2-eyebrow">
              <span className="dot"></span>
              dành cho học sinh THPT · 2026
            </div>
            <h1 className="hero-v2-title">
              Thích vẽ,<br/>
              chơi game,<br/>
              <span className="hl-yellow">hay quay phim</span><br/>
              — chưa biết<br/>
              <span className="underline">làm nghề gì?</span>
            </h1>
            <p className="hero-v2-sub">
              CINs tổng hợp <strong>120+ vị trí nghề</strong> trong ngành sáng tạo thị giác — Game, Phim, Hoạt hình, Thiết kế. Khám phá theo cách của bạn.
            </p>
            <div className="hero-v2-actions">
              <a href="#" className="btn-v2-primary">
                Khám phá ngay
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </a>
              <a href="#" className="btn-v2-secondary">Xem trường ĐH</a>
            </div>
          </div>

          {/* Collage right */}
          <div className="hero-v2-collage">
            <div className="sticker sticker-star" style={{top:'10px', right:'-10px'}}>
              MIỄN<br/>PHÍ!
            </div>
            <div className="sticker" style={{bottom:'40px', right:'-20px', background:'var(--c-blue)', color:'#fff'}}>
              ★ 4.9/5
            </div>

            <div className="item collage-1">
              <img src="https://images.unsplash.com/photo-1616763355603-9755a640a287?w=600&h=600&fit=crop" alt="" />
            </div>
            <div className="item collage-2">
              <div className="num">120+</div>
              <div className="label">vị trí nghề<br/>được map sẵn</div>
            </div>
            <div className="item collage-3">
              <div className="badge-q">Quiz · 30 giây</div>
              <div className="q-text">"Vẽ bằng máy tính có phải là một nghề không?"</div>
            </div>
            <div className="item collage-4">
              <img src="assets/career-illustration-2.png" alt="" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   TRUST MARQUEE
   ========================================================= */
function TrustStrip() {
  const items = [
    "120+ vị trí nghề",
    "38 trường đại học",
    "Hoàn toàn miễn phí",
    "Cập nhật mỗi tuần",
    "Cộng đồng 12K+ học sinh",
    "Talkshow hàng tháng",
  ];
  const all = [...items, ...items];
  return (
    <div className="trust-strip">
      <div className="trust-marquee">
        {all.map((t, i) => (
          <span key={i}><span className="dot"></span>{t}</span>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   QUIZ INTRO — interactive vibe check
   ========================================================= */
function QuizIntro() {
  const [active, setActive] = useState("Vẽ & thiết kế");
  const chips = ["Vẽ & thiết kế", "Chơi game", "Quay/dựng phim", "Kể chuyện", "Code & tech"];
  const map = {
    "Vẽ & thiết kế": [
      {ic:"🎨", nm:"Concept Artist", meta:"Game · Phim"},
      {ic:"🖌️", nm:"Illustrator", meta:"Sách · Thương hiệu"},
      {ic:"✨", nm:"UI/UX Designer", meta:"App · Web"},
    ],
    "Chơi game": [
      {ic:"🎮", nm:"Game Designer", meta:"Studio · Indie"},
      {ic:"🛠️", nm:"3D Artist", meta:"AAA · Mobile"},
      {ic:"📊", nm:"Game Analyst", meta:"Live-ops"},
    ],
    "Quay/dựng phim": [
      {ic:"🎬", nm:"Director / DOP", meta:"Phim · MV"},
      {ic:"🎞️", nm:"Editor / Colorist", meta:"Hậu kỳ"},
      {ic:"🎵", nm:"Sound Designer", meta:"Phim · Game"},
    ],
    "Kể chuyện": [
      {ic:"✍️", nm:"Screenwriter", meta:"Phim · Webtoon"},
      {ic:"📚", nm:"Narrative Designer", meta:"Game · VR"},
      {ic:"📺", nm:"Content Producer", meta:"Branded · Series"},
    ],
    "Code & tech": [
      {ic:"⚙️", nm:"Technical Artist", meta:"Studio Game"},
      {ic:"🤖", nm:"VFX TD", meta:"Phim · Animation"},
      {ic:"🥽", nm:"AR/VR Developer", meta:"Realtime"},
    ],
  };
  return (
    <section className="sec" id="quiz">
      <div className="page">
        <div className="quiz-v2">
          <div className="quiz-v2-left">
            <div className="q-num">CÂU HỎI 1/5</div>
            <h3>Bạn thấy mình hợp với điều gì nhất?</h3>
            <p style={{fontSize:15, color:'var(--c-ink-soft)', marginBottom: 24, lineHeight: 1.5}}>
              Chọn 1 từ khoá — chúng tôi sẽ gợi ý các nghề đang thiếu nhân lực ở VN, lương khởi điểm và trường đào tạo.
            </p>
            <div className="quiz-chips">
              {chips.map(c => (
                <button key={c} className={"quiz-chip " + (active===c?"active":"")} onClick={()=>setActive(c)}>
                  {c}
                </button>
              ))}
            </div>
            <a href="#" className="btn-v2-secondary" style={{display:'inline-flex', alignItems:'center', gap:8}}>
              Làm quiz đầy đủ →
            </a>
          </div>
          <div className="quiz-v2-right">
            <div className="quiz-result">
              <div className="quiz-result-label">Gợi ý cho bạn ✨</div>
              <div className="quiz-suggestions">
                {map[active].map((s, i) => (
                  <div className="quiz-sug" key={i}>
                    <div className="ic">{s.ic}</div>
                    <div className="lbl">
                      <div className="nm">{s.nm}</div>
                      <div className="meta">{s.meta}</div>
                    </div>
                    <span style={{fontWeight:800, color:'var(--c-blue)'}}>→</span>
                  </div>
                ))}
              </div>
              <a href="#" className="btn-v2-primary" style={{width:'100%', justifyContent:'center', fontSize:14, padding:'12px 20px', boxShadow:'3px 3px 0 var(--c-ink)'}}>
                Xem chi tiết các nghề
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   PATHWAY — Lộ trình 4 bước
   ========================================================= */
function Pathway() {
  const steps = [
    {n:1, ic:"🧭", t:"Khám phá", d:"Làm quiz 5 phút → tìm ra nhóm nghề hợp với cá tính + sở thích của bạn."},
    {n:2, ic:"🔍", t:"Tìm hiểu sâu", d:"Đọc mô tả 120+ vị trí: làm gì, cần kỹ năng gì, lương khởi điểm bao nhiêu."},
    {n:3, ic:"🎓", t:"Chọn trường", d:"So sánh 38 trường ĐH có ngành sáng tạo — học phí, đầu ra, project sinh viên."},
    {n:4, ic:"🚀", t:"Hành động", d:"Tham gia talkshow, kết nối mentor, build portfolio sớm từ năm lớp 11."},
  ];
  return (
    <section className="sec sec-color" id="lotrinh">
      <div className="page">
        <div className="sec-head">
          <div className="sec-head-left">
            <div className="eyebrow eyebrow-orange">⚡ LỘ TRÌNH</div>
            <h2 className="sec-title">4 bước để biết mình<br/>muốn làm gì</h2>
            <p className="sec-sub">Không cần phải biết tất cả ngay. Cứ đi từng bước — CINs đồng hành cùng bạn.</p>
          </div>
          <a href="#" className="sec-action">Bắt đầu ngay →</a>
        </div>
        <div className="pathway">
          {steps.map(s => (
            <div className="path-step" key={s.n}>
              <div className="num-circle">{s.n}</div>
              <div className="ic-step">{s.ic}</div>
              <h4>{s.t}</h4>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   JOBS — sticker chunky cards, color rotation
   ========================================================= */
function Jobs() {
  const jobs = [
    {ic:"🎨", t:"Concept Artist", d:"Vẽ ý tưởng nhân vật, môi trường cho game/phim từ giai đoạn đầu.", tags:["Game","Phim","18-35M"]},
    {ic:"🎮", t:"Game Designer", d:"Thiết kế cơ chế gameplay, level, cân bằng độ khó.", tags:["Studio","20-40M"]},
    {ic:"🎬", t:"3D Animator", d:"Làm cho nhân vật chuyển động sống động trong phim/game.", tags:["Pixar VN","15-30M"]},
    {ic:"🖌️", t:"Illustrator", d:"Vẽ minh hoạ sách, branding, social — phong cách riêng.", tags:["Freelance","Studio"]},
    {ic:"📐", t:"UI/UX Designer", d:"Thiết kế giao diện app, web — research user, prototype.", tags:["Tech","20-45M"]},
    {ic:"🎥", t:"Director of Photography", d:"Quay phim, MV, TVC — chỉ đạo hình ảnh tổng thể.", tags:["Phim","25-60M"]},
    {ic:"⚙️", t:"Technical Artist", d:"Cầu nối artist & coder — shader, pipeline, automation.", tags:["AAA","30-60M"]},
    {ic:"🎵", t:"Sound Designer", d:"Tạo âm thanh, hiệu ứng cho game, phim, animation.", tags:["Game","Phim"]},
  ];
  return (
    <section className="sec" id="nghe">
      <div className="page">
        <div className="sec-head">
          <div className="sec-head-left">
            <div className="eyebrow">💼 KHÁM PHÁ NGHỀ</div>
            <h2 className="sec-title">120+ nghề trong ngành<br/>sáng tạo thị giác</h2>
            <p className="sec-sub">Từ những nghề nổi tiếng đến những vị trí "ẩn" — đầy đủ mô tả, kỹ năng, lương.</p>
          </div>
          <a href="#" className="sec-action">Xem tất cả 120+ →</a>
        </div>
        <div className="job-grid">
          {jobs.map((j, i) => (
            <div className="job-card" key={i}>
              <div className="ic-big">{j.ic}</div>
              <h4>{j.t}</h4>
              <p>{j.d}</p>
              <div className="meta">
                {j.tags.map(t => <span key={t}>{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   UNIVERSITIES — flat data cards
   ========================================================= */
function Universities() {
  const unis = [
    {logo:"M", n:"MAAC", loc:"Học viện Kỹ xảo Điện ảnh & Hoạt hình", city:"TP.HCM", t:"t-hcm", majors:6, dur:"2.5 năm"},
    {logo:"H", n:"ĐH Hoa Sen", loc:"Khoa Thiết kế Đồ hoạ, Game", city:"TP.HCM", t:"t-hcm", majors:8, dur:"4 năm"},
    {logo:"P", n:"PTIT", loc:"CN Game · Multimedia", city:"Hà Nội", t:"t-hn", majors:4, dur:"4 năm"},
    {logo:"R", n:"RMIT", loc:"Design · Digital Media", city:"TP.HCM · HN", t:"t-hcm", majors:5, dur:"3 năm"},
    {logo:"V", n:"ĐH Văn Lang", loc:"Thiết kế đồ hoạ · Truyền thông", city:"TP.HCM", t:"t-hcm", majors:7, dur:"4 năm"},
    {logo:"D", n:"ĐH Duy Tân", loc:"Mỹ thuật ứng dụng · Game", city:"Đà Nẵng", t:"t-dn", majors:5, dur:"4 năm"},
  ];
  return (
    <section className="sec sec-color" id="truong">
      <div className="page">
        <div className="sec-head">
          <div className="sec-head-left">
            <div className="eyebrow eyebrow-mint">🎓 TRƯỜNG ĐẠI HỌC</div>
            <h2 className="sec-title">38 trường có ngành<br/>sáng tạo tại Việt Nam</h2>
            <p className="sec-sub">So sánh học phí, chuyên ngành, đầu ra — chọn nơi phù hợp nhất với bạn.</p>
          </div>
          <a href="#" className="sec-action">Xem cả 38 trường →</a>
        </div>
        <div className="data-grid data-grid-3">
          {unis.map((u, i) => (
            <div className="data-card" key={i}>
              <div className="top">
                <div className="logo">{u.logo}</div>
                <span className={"tag " + u.t}>{u.city}</span>
              </div>
              <h4>{u.n}</h4>
              <div className="uni-loc">{u.loc}</div>
              <div className="uni-stats">
                <div className="uni-stat">
                  <div className="num">{u.majors}</div>
                  <div className="lbl">chuyên ngành</div>
                </div>
                <div className="uni-stat">
                  <div className="num">{u.dur}</div>
                  <div className="lbl">thời gian học</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   TESTIMONIALS — washi-tape sticker style
   ========================================================= */
function Testimonials() {
  return (
    <section className="sec" id="cauchuyen">
      <div className="page">
        <div className="sec-head">
          <div className="sec-head-left">
            <div className="eyebrow eyebrow-violet">💬 CÂU CHUYỆN</div>
            <h2 className="sec-title">Các bạn đã chọn<br/>được ngành như thế nào?</h2>
          </div>
          <a href="#" className="sec-action">Xem tất cả →</a>
        </div>
        <div className="testi-grid">
          <div className="testi-card feature">
            <div className="tape"></div>
            <div className="quote-mark">"</div>
            <blockquote>
              Mình từng nghĩ vẽ chỉ là sở thích. Sau khi làm quiz CINs, mình mới biết Concept Artist là một nghề thực sự — và đang vào MAAC.
            </blockquote>
            <div className="who">
              <div className="av">A</div>
              <div>
                <div className="nm">An Nguyễn — 12A2</div>
                <div className="where">THPT Nguyễn Thị Minh Khai · TP.HCM</div>
              </div>
            </div>
          </div>
          <div className="testi-card">
            <div className="tape"></div>
            <div className="quote-mark">"</div>
            <blockquote>
              Đã đăng ký nhầm ngành Kinh tế. CINs giúp mình nhận ra mình hợp Game Design hơn — đang chuyển trường.
            </blockquote>
            <div className="who">
              <div className="av" style={{background:'var(--c-orange)'}}>M</div>
              <div>
                <div className="nm">Minh Trần — sinh viên</div>
                <div className="where">PTIT · Hà Nội</div>
              </div>
            </div>
          </div>
          <div className="testi-card">
            <div className="tape"></div>
            <div className="quote-mark">"</div>
            <blockquote>
              Bố mẹ mình từng phản đối học vẽ. Tài liệu CINs giúp mình giải thích nghề Illustrator có thể nuôi sống bản thân.
            </blockquote>
            <div className="who">
              <div className="av" style={{background:'var(--c-violet)'}}>L</div>
              <div>
                <div className="nm">Lan Phạm — 11A5</div>
                <div className="where">THPT Lê Hồng Phong · Nam Định</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   EVENTS
   ========================================================= */
function Events() {
  const events = [
    {img:"uploads/pasted-1777439168033-0.png", date:"08–09.03.2026", t:"Vietnam GameVerse 2026", w:"SECC · TP.HCM"},
    {img:"uploads/pasted-1777439180662-0.png", date:"23.01.2026", t:"Thời Nhậm 3Q ra mắt", w:"Game · Gamota"},
    {img:"uploads/pasted-1777439197255-0.png", date:"02.04 · Talkshow", t:'"Thuê" & "Dùng" Artist', w:"Monster Lab"},
    {img:"uploads/pasted-1777439223625-0.png", date:"Tuyển sinh 2026", t:"PTIT Games — 200 chỉ tiêu", w:"PTIT · Hà Nội"},
  ];
  return (
    <section className="sec" id="sukien">
      <div className="page">
        <div className="sec-head">
          <div className="sec-head-left">
            <div className="eyebrow eyebrow-orange">🎉 SỰ KIỆN</div>
            <h2 className="sec-title">Đang diễn ra<br/>và sắp tới</h2>
          </div>
          <a href="#" className="sec-action">Xem cả lịch →</a>
        </div>
        <div className="events-grid">
          {events.map((e, i) => (
            <a href="#" className="event-v2" key={i}>
              <div className="thumb">
                <img src={e.img} alt="" />
              </div>
              <div className="body">
                <div className="date">{e.date}</div>
                <h5>{e.t}</h5>
                <div className="where">{e.w}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   BIG CTA
   ========================================================= */
function BigCTA() {
  return (
    <section className="sec">
      <div className="page">
        <div className="cta-v2">
          <h2>Sẵn sàng tìm ra<br/>nghề của bạn chưa?</h2>
          <p>Làm quiz 5 phút — nhận gợi ý 3 nghề phù hợp + lộ trình học cụ thể.</p>
          <a href="#" className="btn-v2-primary">
            Bắt đầu quiz miễn phí
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   FOOTER
   ========================================================= */
function Footer() {
  return (
    <footer className="footer-v2">
      <div className="page">
        <div className="grid">
          <div>
            <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:14}}>
              <img src="assets/logo-cins.png" alt="" style={{height:32, filter:'brightness(0) invert(1)'}} />
              <span style={{fontWeight:800, fontSize:18}}>CINs</span>
            </div>
            <p style={{fontSize:14, color:'rgba(255,255,255,0.65)', maxWidth:300, lineHeight:1.6}}>
              Nền tảng kết nối học sinh THPT với ngành công nghiệp sáng tạo thị giác Việt Nam.
            </p>
          </div>
          <div>
            <h6>Khám phá</h6>
            <ul>
              <li><a href="#">120+ nghề</a></li>
              <li><a href="#">38 trường ĐH</a></li>
              <li><a href="#">Lộ trình 4 bước</a></li>
              <li><a href="#">Quiz cá tính</a></li>
            </ul>
          </div>
          <div>
            <h6>Cộng đồng</h6>
            <ul>
              <li><a href="#">Sự kiện</a></li>
              <li><a href="#">Talkshow</a></li>
              <li><a href="#">Mentor 1-1</a></li>
              <li><a href="#">Câu chuyện</a></li>
            </ul>
          </div>
          <div>
            <h6>Liên hệ</h6>
            <ul>
              <li><a href="#">Facebook</a></li>
              <li><a href="#">Instagram</a></li>
              <li><a href="#">TikTok</a></li>
              <li><a href="mailto:hi@cins.vn">hi@cins.vn</a></li>
            </ul>
          </div>
        </div>
        <div className="bottom">
          <span>© 2026 CINs — Creative Industries Network</span>
          <span>Made with ♥ in Vietnam</span>
        </div>
      </div>
    </footer>
  );
}

/* =========================================================
   APP
   ========================================================= */
function App() {
  return (
    <>
      <Nav />
      <Hero />
      <TrustStrip />
      <QuizIntro />
      <Pathway />
      <Jobs />
      <Universities />
      <Testimonials />
      <Events />
      <BigCTA />
      <Footer />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
