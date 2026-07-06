"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Badge,
  BadgeCheck,
  Banknote,
  BarChart3,
  BookOpen,
  Box,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  Coins,
  Compass,
  CornerLeftUp,
  CornerRightDown,
  Database,
  EyeOff,
  FileQuestion,
  Flame,
  GraduationCap,
  HeartHandshake,
  Image as ImageIcon,
  Landmark,
  Layers,
  Lock,
  Map,
  Megaphone,
  MonitorSmartphone,
  Palette,
  PenTool,
  Puzzle,
  Radio,
  RotateCw,
  Route,
  School,
  Search,
  ShieldCheck,
  Shuffle,
  Smartphone,
  Target,
  TrendingDown,
  TrendingUp,
  Unplug,
  Users,
  Zap,
} from "lucide-react";
import type { CSSProperties } from "react";

import { TtdaIcon } from "@/app/thong-tin-du-an/ttda-deck-shared";
import {
  TtdaModeKicker,
  type TtdaHubMode,
} from "@/app/thong-tin-du-an/TtdaModeKicker";

export function ThongTinDuAnSlides({
  mode,
  onModeChange,
}: {
  mode: TtdaHubMode;
  onModeChange: (mode: TtdaHubMode) => void;
}) {
  return (
    <>
        <section className="slide dark hero-slide" id="top">
          <div className="wrap">
            <TtdaModeKicker mode={mode} onModeChange={onModeChange} />
            <h1>
              Hồ sơ sự nghiệp <span className="accent">đã xác thực</span> cho
              ngành sáng tạo Việt Nam
            </h1>
            <p className="lede">
              Mỗi cột mốc học tập, làm việc và tác phẩm đều được tổ chức xác
              nhận — để hành trình nghề trở thành tài sản tích lũy, và để thị
              trường, không phải marketing, trả lời câu hỏi chọn ngành.
            </p>
            <div className="hero-line">
              <div className="h">
                <span
                  className="hic"
                  style={{ background: "var(--cins-blue)", color: "#fff" }}
                >
                  <TtdaIcon>
                    <Palette size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <div>
                  <b>280+</b>
                  <span>nghề nghiệp</span>
                </div>
              </div>
              <div className="h">
                <span
                  className="hic"
                  style={{
                    background: "var(--cins-mint)",
                    color: "var(--neutral-900)",
                  }}
                >
                  <TtdaIcon>
                    <GraduationCap size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <div>
                  <b>21</b>
                  <span>ngành đào tạo</span>
                </div>
              </div>
              <div className="h">
                <span
                  className="hic"
                  style={{
                    background: "var(--cins-yellow)",
                    color: "var(--neutral-900)",
                  }}
                >
                  <TtdaIcon>
                    <Building2 size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <div>
                  <b>31</b>
                  <span>trường &amp; cơ sở</span>
                </div>
              </div>
              <div className="h">
                <span
                  className="hic"
                  style={{ background: "var(--cins-violet)", color: "#fff" }}
                >
                  <TtdaIcon>
                    <Layers size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <div>
                  <b>11</b>
                  <span>lĩnh vực</span>
                </div>
              </div>
            </div>
          </div>
          <div className="scroll-hint">
            Cuộn
            <TtdaIcon>
              <ChevronDown size={15} strokeWidth={1.6} />
            </TtdaIcon>
          </div>
        </section>

        <section className="slide" id="sec-a" data-c="blue">
          <div className="wrap">
            <div className="shead">
              <span className="sic">
                <TtdaIcon>
                  <Building2 size={21} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
              <div className="ht">
                <div className="sidx">01 · DỰ ÁN</div>
                <h2>Thông tin dự án</h2>
              </div>
            </div>
            <div className="duo">
              <div className="txt">
                <div className="facts">
                  <div className="fact">
                    <div className="fl">
                      <TtdaIcon>
                        <Badge size={11} strokeWidth={1.6} />
                      </TtdaIcon>
                      Tên dự án
                    </div>
                    <div className="fv">CINs — Creative Hub Vietnam</div>
                  </div>
                  <div className="fact">
                    <div className="fl">
                      <TtdaIcon>
                        <Landmark size={11} strokeWidth={1.6} />
                      </TtdaIcon>
                      Pháp nhân
                    </div>
                    <div className="fv">
                      CÔNG TY TNHH CINS
                      <small>Hoạt động từ 07/2025 · TP.HCM</small>
                    </div>
                  </div>
                  <div className="fact">
                    <div className="fl">
                      <TtdaIcon>
                        <Box size={11} strokeWidth={1.6} />
                      </TtdaIcon>
                      Sản phẩm
                    </div>
                    <div className="fv">
                      Hồ sơ sự nghiệp đã xác thực
                      <small>Journey · Gallery · Verify</small>
                    </div>
                  </div>
                  <div className="fact">
                    <div className="fl">
                      <TtdaIcon>
                        <MonitorSmartphone size={11} strokeWidth={1.6} />
                      </TtdaIcon>
                      Hiện diện
                    </div>
                    <div className="fv">
                      Website · App iOS &amp; Android
                      <small>Trạng thái: Beta đang chạy</small>
                    </div>
                  </div>
                </div>
                <div className="statline">
                  <div className="stat">
                    <b>280+</b>
                    <span>nghề</span>
                  </div>
                  <div className="stat">
                    <b>21</b>
                    <span>ngành</span>
                  </div>
                  <div className="stat">
                    <b>31</b>
                    <span>cơ sở</span>
                  </div>
                  <div className="stat">
                    <b>11</b>
                    <span>lĩnh vực</span>
                  </div>
                </div>
              </div>
              <div className="media">
                <div className="browser">
                  <div className="bar">
                    <span className="d" style={{ background: "#FF5F57" }} />
                    <span className="d" style={{ background: "#FEBC2E" }} />
                    <span className="d" style={{ background: "#28C840" }} />
                    <span className="url">
                      <TtdaIcon>
                        <Lock size={10} strokeWidth={1.6} />
                      </TtdaIcon>
                      cins.vn
                    </span>
                  </div>
                  <div className="shot">
                    <div className="ph">
                      <TtdaIcon>
                        <ImageIcon size={24} strokeWidth={1.6} />
                      </TtdaIcon>
                      <b>Ảnh chụp trang chủ cins.vn</b>
                      <span>hero + số liệu 280+ nghề, 21 ngành</span>
                    </div>
                  </div>
                </div>
                <p className="cap">
                  <TtdaIcon>
                    <Radio size={12} strokeWidth={1.6} />
                  </TtdaIcon>
                  Trang chủ CINs — đang chạy Beta
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="slide" id="sec-b" data-c="orange">
          <div className="wrap">
            <div className="shead">
              <span className="sic">
                <TtdaIcon>
                  <AlertTriangle size={21} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
              <div className="ht">
                <div className="sidx">02 · VẤN ĐỀ</div>
                <h2>Vấn đề muốn giải quyết</h2>
                <p className="desc">
                  Thông tin định hướng nghề đang bị định hình bởi ngân sách
                  marketing — không phải bởi thị trường việc làm.
                </p>
              </div>
            </div>

            <div className="cycle">
              <div className="cycle-top">
                <div className="cl">
                  <TtdaIcon>
                    <RotateCw size={15} strokeWidth={1.6} />
                  </TtdaIcon>
                  Vòng lặp SEO tuyển sinh
                </div>
                <div className="ex">
                  Ví dụ: ngành <b>Thiết kế Đồ họa</b>
                </div>
              </div>
              <div className="crow">
                <div className="cnode">
                  <span className="cic">
                    <TtdaIcon>
                      <Search size={15} strokeWidth={1.6} />
                    </TtdaIcon>
                  </span>
                  <p>Research SEO cao quanh &quot;Thiết kế Đồ họa&quot;</p>
                </div>
                <span className="carr">
                  <TtdaIcon>
                    <ArrowRight size={18} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <div className="cnode">
                  <span className="cic">
                    <TtdaIcon>
                      <School size={15} strokeWidth={1.6} />
                    </TtdaIcon>
                  </span>
                  <p>Trường mở ngành Thiết kế Đồ họa</p>
                </div>
                <span className="carr">
                  <TtdaIcon>
                    <ArrowRight size={18} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <div className="cnode">
                  <span className="cic">
                    <TtdaIcon>
                      <Megaphone size={15} strokeWidth={1.6} />
                    </TtdaIcon>
                  </span>
                  <p>Trường marketing &amp; push SEO ngành</p>
                </div>
              </div>
              <div className="cmid">
                <span className="turn">
                  <TtdaIcon>
                    <CornerLeftUp size={22} strokeWidth={1.6} />
                  </TtdaIcon>
                  <span className="lbl">
                    Vòng lặp
                    <br />
                    quay lại
                  </span>
                </span>
                <span className="turn">
                  <span className="lbl" style={{ textAlign: "right" }}>
                    Tiếp tục
                    <br />
                    lan rộng
                  </span>
                  <TtdaIcon>
                    <CornerRightDown size={22} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
              </div>
              <div className="crow">
                <div className="cnode hotter">
                  <span className="cic">
                    <TtdaIcon>
                      <Flame size={15} strokeWidth={1.6} />
                    </TtdaIcon>
                  </span>
                  <p>Search &quot;Thiết kế Đồ họa&quot; càng cao hơn nữa</p>
                </div>
                <span className="carr">
                  <TtdaIcon>
                    <ArrowLeft size={18} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <div className="cnode">
                  <span className="cic">
                    <TtdaIcon>
                      <Search size={15} strokeWidth={1.6} />
                    </TtdaIcon>
                  </span>
                  <p>Học sinh chủ động search ngành TKĐH</p>
                </div>
                <span className="carr">
                  <TtdaIcon>
                    <ArrowLeft size={18} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <div className="cnode">
                  <span className="cic">
                    <TtdaIcon>
                      <Users size={15} strokeWidth={1.6} />
                    </TtdaIcon>
                  </span>
                  <p>Học sinh thấy nhiều thông tin ngành TKĐH</p>
                </div>
              </div>
              <div className="csum">
                <TtdaIcon>
                  <AlertCircle size={15} strokeWidth={1.6} />
                </TtdaIcon>
                Không điểm nào trong vòng phản ánh nhu cầu tuyển dụng thật —
                vòng chạy bằng ngân sách marketing.
              </div>
            </div>

            <div className="pcards">
              <div className="pcard">
                <span className="pic2">
                  <TtdaIcon>
                    <EyeOff size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <b>Học sinh THPT mù thông tin</b>
                <span>chọn theo &quot;ngành hot&quot;, theo phụ huynh</span>
              </div>
              <div className="pcard">
                <span className="pic2">
                  <TtdaIcon>
                    <TrendingDown size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <b>Lệch pha cung – cầu nhân lực</b>
                <span>ra trường mới biết thị trường không cần quy mô đó</span>
              </div>
              <div className="pcard">
                <span className="pic2">
                  <TtdaIcon>
                    <FileQuestion size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <b>Hồ sơ tự khai không kiểm chứng</b>
                <span>người giỏi thật lẫn giữa hồ sơ &quot;phông bạt&quot;</span>
              </div>
              <div className="pcard">
                <span className="pic2">
                  <TtdaIcon>
                    <Shuffle size={16} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <b>Thành quả phân mảnh, trôi theo feed</b>
                <span>không tích lũy thành tài sản</span>
              </div>
            </div>
          </div>
        </section>

        <section className="slide" id="sec-c" data-c="mint">
          <div className="wrap">
            <div className="duo phone-side">
              <div className="txt">
                <div className="shead" style={{ marginBottom: 20 }}>
                  <span className="sic">
                    <TtdaIcon>
                      <Target size={21} strokeWidth={1.6} />
                    </TtdaIcon>
                  </span>
                  <div className="ht">
                    <div className="sidx">03 · MỤC ĐÍCH</div>
                    <h2>Mục đích xây dựng</h2>
                    <p className="desc">
                      Nối liền cả chuỗi trên cùng một nền dữ liệu — hiện mỗi
                      khâu đang nằm trên một nền tảng rời rạc.
                    </p>
                  </div>
                </div>
                <div className="chainline">
                  <span className="cstep">
                    <TtdaIcon>
                      <Search size={13} strokeWidth={1.6} />
                    </TtdaIcon>
                    Tìm hiểu nghề
                  </span>
                  <TtdaIcon>
                    <ChevronRight size={13} strokeWidth={1.6} />
                  </TtdaIcon>
                  <span className="cstep">
                    <TtdaIcon>
                      <GraduationCap size={13} strokeWidth={1.6} />
                    </TtdaIcon>
                    Đào tạo
                  </span>
                  <TtdaIcon>
                    <ChevronRight size={13} strokeWidth={1.6} />
                  </TtdaIcon>
                  <span className="cstep">
                    <TtdaIcon>
                      <PenTool size={13} strokeWidth={1.6} />
                    </TtdaIcon>
                    Hành nghề
                  </span>
                  <TtdaIcon>
                    <ChevronRight size={13} strokeWidth={1.6} />
                  </TtdaIcon>
                  <span className="cstep">
                    <TtdaIcon>
                      <Briefcase size={13} strokeWidth={1.6} />
                    </TtdaIcon>
                    Tuyển dụng
                  </span>
                </div>
                <div className="points">
                  <div className="pt">
                    <span className="pic">
                      <TtdaIcon>
                        <ShieldCheck size={15} strokeWidth={1.6} />
                      </TtdaIcon>
                    </span>
                    <div className="tx">
                      <b>Mỗi cột mốc đều được tổ chức xác nhận</b>
                      <span>không thể mua, không thể làm giả</span>
                    </div>
                  </div>
                  <div className="pt">
                    <span className="pic">
                      <TtdaIcon>
                        <BarChart3 size={15} strokeWidth={1.6} />
                      </TtdaIcon>
                    </span>
                    <div className="tx">
                      <b>Thị trường tự trả lời về nhu cầu thị trường</b>
                      <span>thay cho marketing tuyển sinh</span>
                    </div>
                  </div>
                  <div className="pt">
                    <span className="pic">
                      <TtdaIcon>
                        <Layers size={15} strokeWidth={1.6} />
                      </TtdaIcon>
                    </span>
                    <div className="tx">
                      <b>Giá trị tích lũy theo thời gian</b>
                      <span>
                        ngược với mô hình attention trôi đi như các nền tảng
                        MXH hiện tại
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="media">
                <div className="phone">
                  <div className="shot">
                    <div className="ph">
                      <TtdaIcon>
                        <Smartphone size={24} strokeWidth={1.6} />
                      </TtdaIcon>
                      <b>Ảnh Journey trên app</b>
                      <span>dòng thời gian cột mốc có badge verified</span>
                    </div>
                  </div>
                </div>
                <p className="cap">
                  <TtdaIcon>
                    <Route size={12} strokeWidth={1.6} />
                  </TtdaIcon>
                  Journey — hồ sơ tích lũy của mỗi cá nhân
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="slide" id="sec-d" data-c="violet">
          <div className="wrap">
            <div className="shead">
              <span className="sic">
                <TtdaIcon>
                  <Puzzle size={21} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
              <div className="ht">
                <div className="sidx">04 · GIẢI PHÁP</div>
                <h2>Cách giải quyết</h2>
                <p className="desc">
                  Một chuỗi tự nuôi nhau — bắt đầu từ hành trình của mỗi cá
                  nhân.
                </p>
              </div>
            </div>
            <div className="duo media-left">
              <div className="media">
                <div className="browser">
                  <div className="bar">
                    <span className="d" style={{ background: "#FF5F57" }} />
                    <span className="d" style={{ background: "#FEBC2E" }} />
                    <span className="d" style={{ background: "#28C840" }} />
                    <span className="url">
                      <TtdaIcon>
                        <Lock size={10} strokeWidth={1.6} />
                      </TtdaIcon>
                      cins.vn/nghe-nghiep
                    </span>
                  </div>
                  <div className="shot">
                    <div className="ph">
                      <TtdaIcon>
                        <ImageIcon size={24} strokeWidth={1.6} />
                      </TtdaIcon>
                      <b>Ảnh trang Khám phá nghề</b>
                      <span>danh sách 280+ vị trí nghề theo lĩnh vực</span>
                    </div>
                  </div>
                </div>
                <p className="cap">
                  <TtdaIcon>
                    <Compass size={12} strokeWidth={1.6} />
                  </TtdaIcon>
                  Khám phá nghề — cửa vào của học sinh
                </p>
                <div className="mkt">
                  <div className="m">
                    <TtdaIcon>
                      <Briefcase size={15} strokeWidth={1.6} />
                    </TtdaIcon>
                    <b>Số lượng tuyển từng vị trí</b>
                    <p>Record từ tin tuyển dụng, tích lũy theo thời gian.</p>
                  </div>
                  <div className="m">
                    <TtdaIcon>
                      <Banknote size={15} strokeWidth={1.6} />
                    </TtdaIcon>
                    <b>Lương trung bình từng việc</b>
                    <p>Từ dữ liệu tuyển dụng thật — không phải khảo sát.</p>
                  </div>
                </div>
              </div>
              <div className="txt">
                <div className="steps">
                  <div className="step">
                    <span className="n">
                      <TtdaIcon>
                        <Route size={16} strokeWidth={1.6} />
                      </TtdaIcon>
                    </span>
                    <div className="tx">
                      <b>1 · Journey — mỗi người đăng hành trình của mình</b>
                      <span>
                        quá trình học, làm việc và sản phẩm cá nhân — tích lũy
                        thành hồ sơ theo thời gian
                      </span>
                    </div>
                  </div>
                  <div className="step">
                    <span className="n">
                      <TtdaIcon>
                        <BadgeCheck size={16} strokeWidth={1.6} />
                      </TtdaIcon>
                    </span>
                    <div className="tx">
                      <b>2 · Tổ chức xác thực sản phẩm</b>
                      <span>
                        trường, trung tâm, studio xác nhận những sản phẩm thuộc
                        về họ —{" "}
                        <b style={{ display: "inline" }}>
                          cái này không thể làm giả
                        </b>
                      </span>
                    </div>
                  </div>
                  <div className="step">
                    <span className="n">
                      <TtdaIcon>
                        <BookOpen size={16} strokeWidth={1.6} />
                      </TtdaIcon>
                    </span>
                    <div className="tx">
                      <b>3 · Nội dung đổ về thư viện ngành</b>
                      <span>
                        mỗi bài viết thuộc một thư viện ngành hướng nghiệp — nơi
                        phân bổ nội dung, do chính người dùng đóng góp, chuyên
                        gia duyệt phiên bản chính xác nhất
                      </span>
                    </div>
                  </div>
                  <div className="step">
                    <span className="n">
                      <TtdaIcon>
                        <Building2 size={16} strokeWidth={1.6} />
                      </TtdaIcon>
                    </span>
                    <div className="tx">
                      <b>4 · Tổ chức đào tạo &amp; doanh nghiệp bổ trợ</b>
                      <span>
                        khi đã có nhiều người dùng và biết rõ lĩnh vực họ hoạt
                        động — khóa học đúng nhóm cần học, tuyển dụng đúng nhóm
                        có năng lực verified
                      </span>
                    </div>
                  </div>
                </div>
                <div className="break">
                  <TtdaIcon>
                    <Unplug size={18} strokeWidth={1.6} />
                  </TtdaIcon>
                  <p>
                    <b>Điểm phá vòng lặp SEO:</b> học sinh thấy cả{" "}
                    <b>con đường</b> (Journey verified) lẫn{" "}
                    <b>đầu ra thị trường</b> (dữ liệu tuyển dụng thật) trước khi
                    chọn ngành.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="slide" id="sec-e" data-c="yellow">
          <div className="wrap">
            <div className="shead">
              <span className="sic">
                <TtdaIcon>
                  <Coins size={21} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
              <div className="ht">
                <div className="sidx">05 · DOANH THU</div>
                <h2>Mô hình kinh doanh</h2>
              </div>
            </div>

            <div className="asset">
              <span className="aic">
                <TtdaIcon>
                  <Database size={17} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
              <div>
                <b>Một tài sản chung: dữ liệu verified</b>
                <br />
                <span>
                  hồ sơ đã xác thực · tác phẩm thật · dữ liệu tuyển dụng record
                  được
                </span>
              </div>
            </div>
            <div className="feeds">
              <span className="f">
                <TtdaIcon>
                  <ChevronDown size={18} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
              <span className="f">
                <TtdaIcon>
                  <ChevronDown size={18} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
              <span className="f">
                <TtdaIcon>
                  <ChevronDown size={18} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
            </div>
            <div className="rev">
              <div
                className="col"
                style={
                  {
                    "--rc": "var(--cins-blue)",
                    "--rcs": "var(--cins-blue-soft)",
                    "--rcd": "var(--cins-blue-dark)",
                  } as CSSProperties
                }
              >
                <span className="ric">
                  <TtdaIcon>
                    <School size={19} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <h5>Cơ sở đào tạo</h5>
                <div className="role">B2B · Phía cung</div>
                <p>
                  Trang khóa học + analytics chuyển đổi (xem → ghi danh). Tuyển
                  sinh bằng tác phẩm verified của chính học viên.
                </p>
              </div>
              <div
                className="col"
                style={
                  {
                    "--rc": "var(--cins-violet)",
                    "--rcs": "var(--cins-violet-soft)",
                    "--rcd": "#6B3FB0",
                  } as CSSProperties
                }
              >
                <span className="ric">
                  <TtdaIcon>
                    <Briefcase size={19} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <h5>Doanh nghiệp &amp; studio</h5>
                <div className="role">B2B · Phía cầu</div>
                <p>
                  Scouting trên talent pool verified: kỹ năng, phần mềm, nơi
                  đào tạo, tác phẩm thật.
                </p>
              </div>
              <div
                className="col"
                style={
                  {
                    "--rc": "var(--cins-orange)",
                    "--rcs": "var(--cins-orange-soft)",
                    "--rcd": "#B05E0B",
                  } as CSSProperties
                }
              >
                <span className="ric">
                  <TtdaIcon>
                    <Megaphone size={19} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <h5>Quảng cáo</h5>
                <div className="role">Dòng doanh thu bổ sung</div>
                <p>
                  Thương hiệu tiếp cận đúng cộng đồng sáng tạo theo nghề, tag,
                  tổ chức.
                </p>
              </div>
            </div>
            <div className="rev-foot">
              <span className="commit">
                <TtdaIcon>
                  <HeartHandshake size={14} strokeWidth={1.6} />
                </TtdaIcon>
                Người dùng cá nhân: miễn phí vĩnh viễn
              </span>
              <p className="fly">
                <b>Flywheel:</b> dữ liệu tuyển dụng vừa phục vụ học sinh miễn
                phí, vừa làm dày cả ba dòng doanh thu.
              </p>
            </div>
          </div>
        </section>

        <section className="slide" id="sec-f" data-c="blue">
          <div className="wrap">
            <div className="shead">
              <span className="sic">
                <TtdaIcon>
                  <Zap size={21} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
              <div className="ht">
                <div className="sidx">06 · THỜI ĐIỂM</div>
                <h2>Vì sao là lúc này</h2>
              </div>
            </div>
            <div className="tcards">
              <div className="tcard">
                <span className="ghost">01</span>
                <span className="tic">
                  <TtdaIcon>
                    <TrendingUp size={20} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <b>
                  Ngành sáng tạo VN tăng trưởng — nhưng chưa có hạ tầng hồ sơ
                  riêng
                </b>
                <p>
                  Tác phẩm trực quan làm giá trị hồ sơ dễ thấy nhất — thị
                  trường thâm nhập lý tưởng để chứng minh mô hình.
                </p>
              </div>
              <div className="tcard">
                <span className="ghost">02</span>
                <span className="tic">
                  <TtdaIcon>
                    <Landmark size={20} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <b>Verify gắn thể chế bản địa = lợi thế người đi trước</b>
                <p>
                  Đối thủ toàn cầu không mua hay sao chép được; người đến sau
                  phải xây quan hệ với từng trường, từng studio lại từ đầu.
                </p>
              </div>
              <div className="tcard">
                <span className="ghost">03</span>
                <span className="tic">
                  <TtdaIcon>
                    <Database size={20} strokeWidth={1.6} />
                  </TtdaIcon>
                </span>
                <b>Kiến trúc dữ liệu đã sẵn cho các giai đoạn sau</b>
                <p>
                  Engine ngành-agnostic từ ngày đầu — mở lĩnh vực mới và thị
                  trường mới không cần đập xây lại nền.
                </p>
              </div>
            </div>
            <div className="next-strip">
              <span className="nic">
                <TtdaIcon>
                  <Map size={17} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
              <div>
                <b>Tiếp theo: Lộ trình phát triển 6 giai đoạn</b>
                <span>
                  từ thư viện nội dung → 20 triệu user Việt Nam → tiến ra global
                </span>
              </div>
              <span className="go">
                <TtdaIcon>
                  <ArrowRight size={20} strokeWidth={1.6} />
                </TtdaIcon>
              </span>
            </div>
          </div>
        </section>
    </>
  );
}
