"use client";

import { useState } from "react";

import { TruongAdmissionCalc } from "@/components/truong/TruongAdmissionCalc";
import { useYearFilter } from "@/components/truong/YearFilterProvider";
import { diemChuanForYear } from "@/lib/truong/diem-chuan";
import type { TruongDetail } from "@/lib/truong/types";

const FAQ_ITEMS = [
  {
    q: "Trường xét tuyển bằng phương thức nào?",
    a: "Xem tab Tuyển sinh — phương thức và lịch được cập nhật theo từng năm khi trường công bố trên CINs.",
  },
  {
    q: "Học phí và chi phí sinh hoạt khoảng bao nhiêu?",
    a: "Tham khảo mục học phí trên thanh thống kê hoặc liên hệ trực tiếp qua website trường.",
  },
  {
    q: "Làm sao xem điểm chuẩn từng ngành?",
    a: "Tab Ngành đào tạo — chọn năm và mở từng ngành, hoặc xem trang ngành chi tiết trên CINs.",
  },
] as const;

type Props = { school: TruongDetail };

export function TruongTabHoidap({ school }: Props) {
  const { year } = useYearFilter();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const calcOptions = school.programs.map((p) => ({
    label: p.nganhTitle,
    id: p.id,
    threshold: diemChuanForYear(p, year) ?? 0,
  }));

  return (
    <div className="faq-layout">
      <div>
        <div className="sec-hdr">
          <span className="sec-num">06</span>
          <h2 className="sec-title">Hỏi &amp; đáp</h2>
        </div>
        <div className="faq-list">
          {FAQ_ITEMS.map((item, i) => {
            const open = openFaq === i;
            return (
              <div key={item.q} className={`faq-item${open ? " open" : ""}`}>
                <button
                  type="button"
                  className="faq-q"
                  aria-expanded={open}
                  onClick={() => setOpenFaq(open ? null : i)}
                >
                  <span className="faq-q-text">{item.q}</span>
                  <span className="faq-q-icon" aria-hidden>
                    +
                  </span>
                </button>
                <div className="faq-a">{item.a}</div>
              </div>
            );
          })}
        </div>
      </div>
      <aside className="detail-sidebar">
        <TruongAdmissionCalc
          orgId={school.id}
          selectedYear={year}
          nganhOptions={calcOptions}
        />
      </aside>
    </div>
  );
}
