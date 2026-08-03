"use client";

type Props = { orgId: string };

/**
 * Phase 3: CRUD combo. Hiện chỉ khung — chờ migration bảng
 * `org_combo_hoc_phi` / `org_combo_thanh_phan`.
 */
export function HocPhiComboTab({ orgId: _orgId }: Props) {
  return (
    <section className="cso-dt-panel">
      <div className="cso-dt-panel-head">
        <h2 className="cso-dt-panel-title">Combo học phí</h2>
        <p className="cso-dt-panel-sub">
          Giảm giá khi học nhiều môn — VD: Guitar + Piano −20% hoặc
          −200.000đ.
        </p>
      </div>
      <div className="cso-dt-panel-body">
        <div className="cso-hv-empty cso-hp-combo-soon">
          <strong>Sắp có</strong>
          Tạo combo chọn khóa/gói, kiểu giảm (% hoặc số tiền), xem trước thành
          tiền. Đang dựng schema + API — quay lại sau khi Phase 3 ship.
        </div>
      </div>
    </section>
  );
}
