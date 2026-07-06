"use client";

import { ChevronRight, Mail } from "lucide-react";

import { TtdaIcon } from "@/app/thong-tin-du-an/ttda-deck-shared";
import {
  TtdaModeKicker,
  type TtdaHubMode,
} from "@/app/thong-tin-du-an/TtdaModeKicker";

type Props = {
  mode: TtdaHubMode;
  onModeChange: (mode: TtdaHubMode) => void;
};

export function TtdaClosingSlide({ mode, onModeChange }: Props) {
  return (
    <section className="slide dark close-slide" id="closing">
      <div className="wrap">
        <TtdaModeKicker
          mode={mode}
          onModeChange={onModeChange}
          className="kicker--center"
        />
        <h2>Đồng hành cùng CINs từ giai đoạn nền móng</h2>
        <p>
          Mỗi giai đoạn là điều kiện cần của giai đoạn sau — không có bước nhảy
          niềm tin nào.
        </p>
        <div className="chain">
          <span className="cstep">Nội dung</span>
          <TtdaIcon>
            <ChevronRight size={13} strokeWidth={1.6} />
          </TtdaIcon>
          <span className="cstep">Sản phẩm</span>
          <TtdaIcon>
            <ChevronRight size={13} strokeWidth={1.6} />
          </TtdaIcon>
          <span className="cstep">Mật độ</span>
          <TtdaIcon>
            <ChevronRight size={13} strokeWidth={1.6} />
          </TtdaIcon>
          <span className="cstep">Doanh thu</span>
          <TtdaIcon>
            <ChevronRight size={13} strokeWidth={1.6} />
          </TtdaIcon>
          <span className="cstep">Quy mô</span>
          <TtdaIcon>
            <ChevronRight size={13} strokeWidth={1.6} />
          </TtdaIcon>
          <span className="cstep">Global</span>
        </div>
        <a className="cta" href="mailto:hello@cins.vn">
          <TtdaIcon>
            <Mail size={14} strokeWidth={1.6} />
          </TtdaIcon>
          Kết nối với chúng tôi
        </a>
        <p className="sub">CINS COMPANY LIMITED · TP. Hồ Chí Minh</p>
      </div>
    </section>
  );
}
