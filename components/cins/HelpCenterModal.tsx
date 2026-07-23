"use client";

import {
  BookOpen,
  CircleHelp,
  Clock3,
  Compass,
  Eye,
  FileText,
  Heart,
  KeyRound,
  Layers,
  LayoutTemplate,
  LifeBuoy,
  Mail,
  MessageCircleQuestion,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  Waypoints,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import { HelpCenterGuidePanel } from "@/components/cins/HelpCenterGuidePanel";
import {
  FEED_SCORE_FORMULA,
  FEED_SCORE_SCOPE,
} from "@/lib/cins/feed-scoring-catalog";
import { DEFAULT_FEED_SCORE_CONFIG } from "@/lib/cins/feed-scoring-config";
import { huongDanHref } from "@/lib/huong-dan/slug";
import type { HuongDanCatalogPublic } from "@/lib/huong-dan/types";

import "./user-account-settings-modal.css";
import "./help-center-modal.css";

type HelpMode = "help" | "guide";

type HelpSection =
  | "faq"
  | "diff"
  | "ranking"
  | "account"
  | "terms"
  | "contact";

const MODE_TABS: ReadonlyArray<{
  id: HelpMode;
  label: string;
  icon: typeof CircleHelp;
}> = [
  { id: "help", label: "Trợ giúp", icon: CircleHelp },
  { id: "guide", label: "Hướng dẫn", icon: BookOpen },
];

const NAV: ReadonlyArray<{ id: HelpSection; label: string }> = [
  { id: "faq", label: "Câu hỏi thường gặp" },
  { id: "diff", label: "Sự khác biệt của CINs" },
  { id: "ranking", label: "Đưa bài lên top" },
  { id: "account", label: "Hỗ trợ tài khoản" },
  { id: "terms", label: "Terms & Service" },
  { id: "contact", label: "Liên hệ" },
];

/** URL công khai nộp Google OAuth / đối tác — tránh `&` trên path. */
const TERMS_PATH = "/termandservice";
const TERMS_PUBLIC_URL = "https://cins.vn/termandservice";

const DIFF_LAYERS: ReadonlyArray<{
  title: string;
  desc: string;
  icon: typeof Layers;
}> = [
  {
    title: "Journey — nơi bạn sống & sáng tạo",
    desc: "Portfolio đa định dạng (ảnh, video, 3D, Rive, Figma…) + dòng thời gian cột mốc nghề. Đây là nơi tích lũy năng lực và kết nối.",
    icon: Waypoints,
  },
  {
    title: "Entity lens — khám phá theo chuyên môn",
    desc: "Trang nghề, phần mềm, trường, tag… gom người và tác phẩm theo chủ đề. Không phải kho copy — nội dung vẫn sống trên Journey.",
    icon: Compass,
  },
  {
    title: "Canonical — tri thức được chốt",
    desc: "Bài chính đã duyệt do cộng đồng đóng góp bản thảo riêng; curator promote. Giá trị dài hạn, không edit-war kiểu Wikipedia.",
    icon: BookOpen,
  },
];

const DIFF_VS: ReadonlyArray<{
  title: string;
  vs: string;
  cins: string;
  icon: typeof ShieldCheck;
}> = [
  {
    title: "Không phải Facebook / MXH generic",
    vs: "Feed thuật toán toàn cục, đua số follower, chat tự do với người lạ.",
    cins: "MXH chuyên môn: follow-feed + entity có ngữ cảnh. Số follower ẩn. Chat gắn context (bạn bè / org / nhóm), không inbox mở.",
    icon: MessageSquare,
  },
  {
    title: "Không phải Behance thuần tham khảo",
    vs: "Xem portfolio một chiều, ít quan hệ nghề đã xác thực.",
    cins: "Có tương tác xã hội đầy đủ trong khung sáng tạo — và cột mốc có thể được tổ chức / đối tác verify.",
    icon: LayoutTemplate,
  },
  {
    title: "Không phải LinkedIn “tự khai”",
    vs: "Ai cũng ghi vị trí / thành tích tùy ý, khó kiểm chứng.",
    cins: "Verify là moat: bên thứ hai phải đồng ý. Badge danh tính chỉ hiện khi đã xác nhận — tự khai không được khoác như fact.",
    icon: ShieldCheck,
  },
  {
    title: "Không phải job board hay LMS",
    vs: "Chỉ đăng tin tuyển dụng, hoặc chỉ khóa học / điểm danh.",
    cins: "CINs quy hoạch hạ tầng nghề + kết nối. Tuyển dụng và học xảy ra trong / quanh quan hệ thật; kết quả nghề được lưu trên Journey.",
    icon: Layers,
  },
];

const DIFF_STRATEGY: ReadonlyArray<{
  title: string;
  desc: string;
  icon: typeof TrendingUp;
}> = [
  {
    title: "Phân bổ nội dung là động cơ tăng trưởng",
    desc: "Gallery đưa tác phẩm public của người & tổ chức bạn theo dõi. World Timeline xếp theo điểm bài công khai — không theo vanity.",
    icon: TrendingUp,
  },
  {
    title: "Kết nối đi qua chuyên môn và quan hệ thật",
    desc: "Tag, nghề, trường, kết bạn, theo dõi — không thay bằng bảng xếp hạng người theo dõi.",
    icon: Waypoints,
  },
  {
    title: "Mở rộng theo lĩnh vực sáng tạo",
    desc: "Bắt đầu từ ngành sáng tạo Việt Nam; khung domain mở rộng theo thời gian (Game, Phim…).",
    icon: Compass,
  },
  {
    title: "Cộng đồng xây trong khung CINs giữ",
    desc: "CINs là đơn vị quy hoạch (schema, curator, embed). Nội dung và quan hệ do cộng đồng tạo — moat không hy sinh để “dễ hơn”.",
    icon: ShieldCheck,
  },
];

const SCORE = DEFAULT_FEED_SCORE_CONFIG;
const DECAY_DAYS = SCORE.DECAY_HOURS / 24;

const FAQ_ITEMS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "CINs là gì?",
    a: "CINs là mạng xã hội chuyên môn cho ngành sáng tạo Việt Nam — nơi bạn xây Journey, khám phá nghề và kết nối với trường, studio cùng cộng đồng nghề.",
  },
  {
    q: "Journey và Gallery khác nhau thế nào?",
    a: "Journey là dòng thời gian các cột mốc chuyên môn của bạn. Gallery là lưới tác phẩm / bài đăng công khai — dễ xem nhanh theo hình ảnh.",
  },
  {
    q: "Làm sao đổi chế độ hiển thị trang cá nhân?",
    a: "Mở Cài đặt → Cài đặt bố cục → Trang cá nhân, rồi chọn Journey, Gallery hoặc lưới. Bạn có thể đổi lại bất cứ lúc nào.",
  },
  {
    q: "Tôi có thể theo dõi người khác không?",
    a: "Có. Bạn có thể theo dõi người dùng, tag hoặc tổ chức để nội dung công khai của họ xuất hiện trên Gallery trang chủ của bạn.",
  },
  {
    q: "Xác minh quan hệ dùng để làm gì?",
    a: "Verify giúp xác nhận mối quan hệ chuyên môn (ví dụ đồng nghiệp, học viên–trường). Đây là lớp tin cậy của CINs, khác với số follower.",
  },
];

const RANKING_PARTS: ReadonlyArray<{
  title: string;
  points: string;
  desc: string;
  tip: string;
  icon: typeof TrendingUp;
}> = [
  {
    title: "Điểm cơ bản",
    points: `${SCORE.BASE} điểm`,
    desc: "Mỗi bài đủ điều kiện vào World Timeline nhận điểm này khi đăng.",
    tip: "Đăng bài công khai trên trang chủ — không phụ thuộc số người theo dõi.",
    icon: Sparkles,
  },
  {
    title: "Chất lượng nội dung",
    points: `0–${SCORE.MAX_CONTENT} (+${SCORE.CONTENT_PART} mỗi mục)`,
    desc: `Cộng điểm khi có ảnh/video bìa, có chữ, gắn tag, hoặc embed sống (Sketchfab, Rive, Figma, video…).`,
    tip: "Bài đầy đủ hình + mô tả + tag thường cao điểm hơn bài trống chữ.",
    icon: LayoutTemplate,
  },
  {
    title: "Đã xác thực (verify)",
    points: `0 hoặc ${SCORE.VERIFIED}`,
    desc: "Cột mốc cá nhân được xác nhận quan hệ Loại 2 nhận thêm điểm tin cậy.",
    tip: "Verify đúng mối quan hệ chuyên môn — CINs ưu tiên bài đã được đối tác xác nhận.",
    icon: ShieldCheck,
  },
  {
    title: "Tương tác",
    points: `0–${SCORE.MAX_ENGAGEMENT}`,
    desc: `Đếm theo đơn vị: reaction ×${SCORE.ENGAGEMENT_REACTION}, bình luận ×${SCORE.ENGAGEMENT_COMMENT}, lưu ×${SCORE.ENGAGEMENT_LUU}. Điểm = min(${SCORE.MAX_ENGAGEMENT}, làm tròn(8 × log₁₀(n+1))).`,
    tip: "Bình luận và lưu mạnh hơn nút thích; càng nhiều thì càng chậm tăng (log) — không spam phản hồi ảo.",
    icon: Heart,
  },
  {
    title: "Giảm theo thời gian",
    points: `× (1 − giờ / ${SCORE.DECAY_HOURS})`,
    desc: `Điểm hiện tại = tổng các phần trên × hệ số giảm tuyến tính trong khoảng ${DECAY_DAYS} ngày.`,
    tip: "Bài mới hơn giữ ưu thế; chỉnh sửa nội dung không reset đồng hồ giảm điểm.",
    icon: Clock3,
  },
];

const RANKING_ACTIONS: ReadonlyArray<{
  title: string;
  desc: string;
  icon: typeof Eye;
}> = [
  {
    title: "Làm bài “đủ chỗ” trên Timeline",
    desc: "Thêm ảnh/video, viết mô tả rõ, gắn tag nghề hoặc công cụ, gắn embed khi hợp lệ.",
    icon: LayoutTemplate,
  },
  {
    title: "Xin verify khi có quan hệ thật",
    desc: "Cột mốc đã xác thực nhận thêm điểm — và cũng là tín hiệu tin cậy cho người xem.",
    icon: ShieldCheck,
  },
  {
    title: "Tạo nội dung đáng phản hồi",
    desc: "Bình luận và lưu giúp điểm tương tác nhiều hơn reaction đơn lẻ. Không mua tương tác giả.",
    icon: Heart,
  },
  {
    title: "Hiểu giới hạn công bằng",
    desc: "Một người không chiếm cả top: feed còn giới hạn mềm khoảng 2 bài/người mỗi lần xếp. Điểm theo bài, không theo thâm niên tài khoản.",
    icon: Eye,
  },
];

const ACCOUNT_TIPS: ReadonlyArray<{
  title: string;
  desc: string;
  icon: typeof UserRound;
}> = [
  {
    title: "Cập nhật hồ sơ",
    desc: "Vào trang cá nhân của bạn để chỉnh bio, ảnh đại diện, giai đoạn nghề và thông tin công khai.",
    icon: UserRound,
  },
  {
    title: "Bảo mật tài khoản",
    desc: "Trong Cài đặt → Bảo mật 2 lớp, bạn có thể thêm lớp bảo vệ bằng số điện thoại khi tính năng sẵn sàng.",
    icon: ShieldCheck,
  },
  {
    title: "Đăng nhập & mật khẩu",
    desc: "Dùng email/Google đã đăng ký. Nếu quên mật khẩu, dùng luồng khôi phục trên trang đăng nhập hoặc liên hệ đội ngũ CINs.",
    icon: KeyRound,
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  /** Tab mặc định khi mở — deep-link `/ho-tro/huong-dan…`. */
  initialMode?: HelpMode;
  initialNhomSlug?: string | null;
  initialPhienSlug?: string | null;
  guideCatalog?: HuongDanCatalogPublic;
  /** Đồng bộ URL khi đổi tab / nhóm / phiên (trang `/ho-tro`). */
  syncUrl?: boolean;
  /** Admin / super_admin — cho phép tạo·sửa hướng dẫn trong modal. */
  isCinsAdmin?: boolean;
};

export function HelpCenterModal({
  open,
  onClose,
  initialMode = "help",
  initialNhomSlug = null,
  initialPhienSlug = null,
  guideCatalog = { nhom: [] },
  syncUrl = false,
  isCinsAdmin = false,
}: Props) {
  const titleId = useId();
  const router = useRouter();
  const [mode, setMode] = useState<HelpMode>(initialMode);
  const [section, setSection] = useState<HelpSection>("faq");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [guideNhom, setGuideNhom] = useState<string | null>(initialNhomSlug);
  const [guidePhien, setGuidePhien] = useState<string | null>(initialPhienSlug);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setSection("faq");
    setOpenFaq(0);
    setGuideNhom(initialNhomSlug);
    setGuidePhien(initialPhienSlug);
  }, [open, initialMode, initialNhomSlug, initialPhienSlug]);

  function replaceUrl(nextMode: HelpMode, nhom: string | null, phien: string | null) {
    if (!syncUrl) return;
    if (nextMode === "help") {
      router.replace("/ho-tro");
      return;
    }
    router.replace(huongDanHref(nhom, phien));
  }

  function changeMode(next: HelpMode) {
    setMode(next);
    if (next === "help") {
      replaceUrl("help", null, null);
      return;
    }
    const firstNhom = guideCatalog.nhom[0] ?? null;
    const nhom = guideNhom || firstNhom?.slug || null;
    const matched = guideCatalog.nhom.find((n) => n.slug === nhom) ?? firstNhom;
    const phien =
      (matched && guideNhom === matched.slug ? guidePhien : null) ||
      matched?.phien[0]?.slug ||
      null;
    setGuideNhom(nhom);
    setGuidePhien(phien);
    replaceUrl("guide", nhom, phien);
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="uas-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="uas-modal help-center-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="uas-head">
          <div
            className="help-center-tabs"
            role="tablist"
            aria-label="Trung tâm trợ giúp"
          >
            <h2 id={titleId} className="sr-only">
              {mode === "help" ? "Trợ giúp" : "Hướng dẫn"}
            </h2>
            {MODE_TABS.map(({ id, label, icon: Icon }) => {
              const selected = mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`${titleId}-mode-${id}`}
                  aria-selected={selected}
                  aria-controls={`${titleId}-panel-${id}`}
                  tabIndex={selected ? 0 : -1}
                  className={`uas-tab help-center-tab${selected ? " on" : ""}`}
                  onClick={() => changeMode(id)}
                >
                  <Icon size={15} strokeWidth={2} aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="uas-close"
            aria-label="Đóng"
            onClick={onClose}
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </header>

        {mode === "guide" ? (
          <div
            role="tabpanel"
            id={`${titleId}-panel-guide`}
            aria-labelledby={`${titleId}-mode-guide`}
            className="help-center-guide-shell"
          >
            <HelpCenterGuidePanel
              titleId={titleId}
              catalog={guideCatalog}
              initialNhomSlug={guideNhom}
              initialPhienSlug={guidePhien}
              isCinsAdmin={isCinsAdmin}
              onNavigate={(nhom, phien) => {
                setGuideNhom(nhom);
                setGuidePhien(phien);
                replaceUrl("guide", nhom, phien);
              }}
            />
          </div>
        ) : (
        <div
          className="uas-layout"
          role="tabpanel"
          id={`${titleId}-panel-help`}
          aria-labelledby={`${titleId}-mode-help`}
        >
          <nav className="uas-nav" aria-label="Mục trợ giúp">
            {NAV.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={`uas-nav-btn${section === id ? " on" : ""}`}
                aria-current={section === id ? "true" : undefined}
                onClick={() => setSection(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="uas-body">
            {section === "faq" ? (
              <section className="uas-section" aria-labelledby={`${titleId}-faq`}>
                <div className="uas-section-head">
                  <h3 id={`${titleId}-faq`} className="uas-section-title">
                    Câu hỏi thường gặp
                  </h3>
                  <p className="uas-section-hint">
                    Những câu hỏi phổ biến khi mới dùng CINs. Chọn một mục để
                    xem trả lời ngắn.
                  </p>
                </div>

                <div className="help-faq" role="list">
                  {FAQ_ITEMS.map((item, i) => {
                    const expanded = openFaq === i;
                    const panelId = `${titleId}-faq-panel-${i}`;
                    const btnId = `${titleId}-faq-btn-${i}`;
                    return (
                      <div key={item.q} className="help-faq-item" role="listitem">
                        <button
                          type="button"
                          id={btnId}
                          className={`help-faq-q${expanded ? " on" : ""}`}
                          aria-expanded={expanded}
                          aria-controls={panelId}
                          onClick={() => setOpenFaq(expanded ? null : i)}
                        >
                          <MessageCircleQuestion
                            size={16}
                            strokeWidth={2}
                            aria-hidden
                          />
                          <span>{item.q}</span>
                        </button>
                        {expanded ? (
                          <p
                            id={panelId}
                            className="help-faq-a"
                            role="region"
                            aria-labelledby={btnId}
                          >
                            {item.a}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {section === "diff" ? (
              <section
                className="uas-section"
                aria-labelledby={`${titleId}-diff`}
              >
                <div className="uas-section-head">
                  <h3 id={`${titleId}-diff`} className="uas-section-title">
                    Sự khác biệt của CINs
                  </h3>
                  <p className="uas-section-hint">
                    CINs là mạng xã hội chuyên môn cho ngành sáng tạo Việt Nam —
                    không phải job board, Behance thuần tham khảo, feed thuật
                    toán toàn cục, hay LMS.
                  </p>
                </div>

                <div className="help-formula-box" role="note">
                  <Compass size={18} strokeWidth={2} aria-hidden />
                  <p>
                    <strong>Journey</strong> tích lũy & kết nối ·{" "}
                    <strong>Entity</strong> khám phá theo chủ đề ·{" "}
                    <strong>Canonical</strong> chốt tri thức. Verify quan hệ là
                    moat — mọi quyết định sản phẩm phải bảo vệ tính xác thực của
                    timeline.
                  </p>
                </div>

                <h4 className="help-subhead">Ba tầng chiến lược</h4>
                <div className="uas-options help-diff-gap" role="list">
                  {DIFF_LAYERS.map((layer) => {
                    const Icon = layer.icon;
                    return (
                      <div
                        key={layer.title}
                        className="uas-option help-tip-card"
                        role="listitem"
                      >
                        <span className="uas-option-ico" aria-hidden>
                          <Icon size={20} strokeWidth={1.8} />
                        </span>
                        <span className="uas-option-text">
                          <span className="uas-option-label">{layer.title}</span>
                          <span className="uas-option-desc">{layer.desc}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                <h4 className="help-subhead">Khác nền tảng khác thế nào</h4>
                <div className="help-score-list" role="list">
                  {DIFF_VS.map((row) => {
                    const Icon = row.icon;
                    return (
                      <div
                        key={row.title}
                        className="uas-option help-tip-card help-score-card"
                        role="listitem"
                      >
                        <span className="uas-option-ico" aria-hidden>
                          <Icon size={20} strokeWidth={1.8} />
                        </span>
                        <span className="uas-option-text">
                          <span className="uas-option-label">{row.title}</span>
                          <span className="help-vs-line">
                            <span className="help-vs-label">Họ</span>
                            <span className="uas-option-desc">{row.vs}</span>
                          </span>
                          <span className="help-vs-line">
                            <span className="help-vs-label cins">CINs</span>
                            <span className="help-score-tip">{row.cins}</span>
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                <h4 className="help-subhead">Định hướng chiến lược</h4>
                <div className="uas-options" role="list">
                  {DIFF_STRATEGY.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="uas-option help-tip-card"
                        role="listitem"
                      >
                        <span className="uas-option-ico" aria-hidden>
                          <Icon size={20} strokeWidth={1.8} />
                        </span>
                        <span className="uas-option-text">
                          <span className="uas-option-label">{item.title}</span>
                          <span className="uas-option-desc">{item.desc}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                <p className="help-footnote">
                  Muốn xem dài hơn về tầm nhìn sản phẩm: mở mục Thông tin dự án
                  ở thanh bên.
                </p>
              </section>
            ) : null}

            {section === "ranking" ? (
              <section
                className="uas-section"
                aria-labelledby={`${titleId}-rank`}
              >
                <div className="uas-section-head">
                  <h3 id={`${titleId}-rank`} className="uas-section-title">
                    Làm thế nào để đưa bài lên top
                  </h3>
                  <p className="uas-section-hint">
                    {FEED_SCORE_SCOPE} Công thức công khai:{" "}
                    <strong className="help-formula">{FEED_SCORE_FORMULA}</strong>
                    . Số dưới đây là mức mặc định hiện tại.
                  </p>
                </div>

                <div className="help-formula-box" role="note">
                  <TrendingUp size={18} strokeWidth={2} aria-hidden />
                  <p>
                    Điểm xếp theo <strong>từng bài</strong> trên World Timeline
                    trang chủ — không theo số người theo dõi hay tuổi tài khoản.
                    Gallery và Journey cá nhân không dùng công thức này.
                  </p>
                </div>

                <h4 className="help-subhead">Các thành phần điểm</h4>
                <div className="help-score-list" role="list">
                  {RANKING_PARTS.map((part) => {
                    const Icon = part.icon;
                    return (
                      <div
                        key={part.title}
                        className="uas-option help-tip-card help-score-card"
                        role="listitem"
                      >
                        <span className="uas-option-ico" aria-hidden>
                          <Icon size={20} strokeWidth={1.8} />
                        </span>
                        <span className="uas-option-text">
                          <span className="help-score-title-row">
                            <span className="uas-option-label">{part.title}</span>
                            <span className="help-score-points">{part.points}</span>
                          </span>
                          <span className="uas-option-desc">{part.desc}</span>
                          <span className="help-score-tip">{part.tip}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                <h4 className="help-subhead">Bạn có thể làm gì</h4>
                <div className="uas-options" role="list">
                  {RANKING_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <div
                        key={action.title}
                        className="uas-option help-tip-card"
                        role="listitem"
                      >
                        <span className="uas-option-ico" aria-hidden>
                          <Icon size={20} strokeWidth={1.8} />
                        </span>
                        <span className="uas-option-text">
                          <span className="uas-option-label">{action.title}</span>
                          <span className="uas-option-desc">{action.desc}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                <p className="help-footnote">
                  Đôi khi đội ngũ CINs có thể đẩy một bài sáng tạo lên ưu tiên
                  (editorial). Đây không phải gói trả phí — viewer không thấy
                  nhãn riêng; thứ tự feed chỉ đổi theo điểm và chính sách công
                  bằng của trang chủ.
                </p>
              </section>
            ) : null}

            {section === "account" ? (
              <section
                className="uas-section"
                aria-labelledby={`${titleId}-acc`}
              >
                <div className="uas-section-head">
                  <h3 id={`${titleId}-acc`} className="uas-section-title">
                    Hỗ trợ tài khoản
                  </h3>
                  <p className="uas-section-hint">
                    Hướng dẫn nhanh để tự chỉnh hồ sơ, bảo mật và đăng nhập.
                    Nếu vẫn kẹt, chuyển sang mục Liên hệ.
                  </p>
                </div>

                <div className="uas-options" role="list">
                  {ACCOUNT_TIPS.map((tip) => {
                    const Icon = tip.icon;
                    return (
                      <div
                        key={tip.title}
                        className="uas-option help-tip-card"
                        role="listitem"
                      >
                        <span className="uas-option-ico" aria-hidden>
                          <Icon size={20} strokeWidth={1.8} />
                        </span>
                        <span className="uas-option-text">
                          <span className="uas-option-label">{tip.title}</span>
                          <span className="uas-option-desc">{tip.desc}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {section === "terms" ? (
              <section
                className="uas-section"
                aria-labelledby={`${titleId}-terms`}
              >
                <div className="uas-section-head">
                  <h3 id={`${titleId}-terms`} className="uas-section-title">
                    Terms &amp; Service
                  </h3>
                  <p className="uas-section-hint">
                    Điều khoản dịch vụ công khai của CINs — dùng khi đăng ký,
                    đăng nhập Google, và nộp xác minh với Google / đối tác.
                  </p>
                </div>

                <div className="help-formula-box" role="note">
                  <FileText size={18} strokeWidth={2} aria-hidden />
                  <p>
                    URL chính thức:{" "}
                    <a
                      className="help-mailto"
                      href={TERMS_PUBLIC_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {TERMS_PUBLIC_URL}
                    </a>
                    . Alias <code className="help-code">/dieu-khoan</code> và{" "}
                    <code className="help-code">/terms</code> tự chuyển về đây.
                  </p>
                </div>

                <div className="uas-options" role="list">
                  <div className="uas-option help-tip-card" role="listitem">
                    <span className="uas-option-ico" aria-hidden>
                      <ShieldCheck size={20} strokeWidth={1.8} />
                    </span>
                    <span className="uas-option-text">
                      <span className="uas-option-label">Nội dung trang gồm</span>
                      <span className="uas-option-desc">
                        Chấp nhận điều khoản, mô tả dịch vụ MXH chuyên môn, tài
                        khoản &amp; OAuth, nội dung user, verify, chat/theo dõi,
                        xếp hạng Timeline, hành vi cấm, tổ chức, trách nhiệm và
                        luật Việt Nam.
                      </span>
                    </span>
                  </div>
                  <div className="uas-option help-tip-card" role="listitem">
                    <span className="uas-option-ico" aria-hidden>
                      <Eye size={20} strokeWidth={1.8} />
                    </span>
                    <span className="uas-option-text">
                      <span className="uas-option-label">Cách nộp cho Google</span>
                      <span className="uas-option-desc">
                        Dán {TERMS_PUBLIC_URL} vào trường Terms of Service URL
                        trên Google Cloud Console / OAuth consent screen sau khi
                        trang đã deploy production.
                      </span>
                    </span>
                  </div>
                </div>
              </section>
            ) : null}

            {section === "contact" ? (
              <section
                className="uas-section"
                aria-labelledby={`${titleId}-ct`}
              >
                <div className="uas-section-head">
                  <h3 id={`${titleId}-ct`} className="uas-section-title">
                    Liên hệ
                  </h3>
                  <p className="uas-section-hint">
                    Đội ngũ CINs sẵn sàng hỗ trợ tài khoản, báo lỗi và góp ý
                    sản phẩm. Gửi mail — chúng tôi sẽ phản hồi sớm nhất có thể.
                  </p>
                </div>

                <div className="help-contact">
                  <div className="uas-option help-tip-card">
                    <span className="uas-option-ico" aria-hidden>
                      <Mail size={20} strokeWidth={1.8} />
                    </span>
                    <span className="uas-option-text">
                      <span className="uas-option-label">Email hỗ trợ</span>
                      <span className="uas-option-desc">
                        <a
                          className="help-mailto"
                          href="mailto:info.cins.vn@gmail.com"
                        >
                          info.cins.vn@gmail.com
                        </a>
                      </span>
                    </span>
                  </div>

                  <div className="uas-option help-tip-card">
                    <span className="uas-option-ico" aria-hidden>
                      <LifeBuoy size={20} strokeWidth={1.8} />
                    </span>
                    <span className="uas-option-text">
                      <span className="uas-option-label">Khi gửi mail</span>
                      <span className="uas-option-desc">
                        Ghi rõ vấn đề, slug tài khoản (nếu có) và ảnh chụp màn
                        hình lỗi để chúng tôi xử lý nhanh hơn.
                      </span>
                    </span>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </div>
        )}

        <footer className="uas-foot">
          <span />
          <div className="uas-foot-actions">
            <button type="button" className="uas-btn ghost" onClick={onClose}>
              Đóng
            </button>
            {mode === "help" && section === "terms" ? (
              <Link
                className="uas-btn primary"
                href={TERMS_PATH}
                onClick={onClose}
              >
                Xem trang
              </Link>
            ) : null}
            {mode === "help" && section === "contact" ? (
              <a
                className="uas-btn primary"
                href="mailto:info.cins.vn@gmail.com"
              >
                Gửi email
              </a>
            ) : null}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
