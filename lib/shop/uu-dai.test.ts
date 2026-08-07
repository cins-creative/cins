/**
 * Unit test engine ưu đãi — chạy:
 *   node --experimental-strip-types --test lib/shop/uu-dai.test.ts
 * hoặc: npm run test:shop-uu-dai
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ShopCombo, ShopGioChungDong } from "./types.ts";
import { applyUuDai, buildUnits, tinhGiamCombo } from "./uu-dai.ts";

function dong(partial: Partial<ShopGioChungDong> & {
  idBienThe: string;
  idSanPham: string;
  soLuong: number;
  giaHienThi: number;
}): ShopGioChungDong {
  return {
    idNhom: null,
    idNguoiBan: "seller",
    tenSanPham: "SP",
    nhanBienThe: "Mặc định",
    tienTe: "VND",
    anhUrl: null,
    soLuongTon: 99,
    ngungBan: false,
    ...partial,
  };
}

function combo(partial: Partial<ShopCombo> & Pick<ShopCombo, "id" | "ten" | "dieuKien">): ShopCombo {
  return {
    idNguoiDung: "seller",
    moTa: null,
    loaiGiam: "phan_tram",
    giaTri: 10,
    giamToiDa: null,
    apDungLap: false,
    batDau: null,
    ketThuc: null,
    kichHoat: true,
    thuTu: 0,
    taoLuc: new Date().toISOString(),
    ...partial,
  };
}

describe("uu-dai buildUnits", () => {
  it("bỏ dòng ngừng bán và nhân theo số lượng", () => {
    const units = buildUnits([
      dong({
        idBienThe: "bt1",
        idSanPham: "sp1",
        idNhom: "n1",
        soLuong: 2,
        giaHienThi: 100,
      }),
      dong({
        idBienThe: "bt2",
        idSanPham: "sp2",
        soLuong: 1,
        giaHienThi: 50,
        ngungBan: true,
      }),
    ]);
    assert.equal(units.length, 2);
    assert.equal(units.every((u) => u.idBienThe === "bt1"), true);
  });
});

describe("uu-dai combo lồng nhau", () => {
  it("Loại A×2 + Mẫu X×1 với X∈A, giỏ X×3 → khớp 1 lần, không đếm đôi", () => {
    const c = combo({
      id: "c1",
      ten: "Combo lồng",
      loaiGiam: "so_tien",
      giaTri: 30_000,
      dieuKien: [
        {
          id: "dk1",
          idCombo: "c1",
          phamVi: "loai_hang",
          idNhom: "A",
          idSanPham: null,
          idBienThe: null,
          soLuong: 2,
        },
        {
          id: "dk2",
          idCombo: "c1",
          phamVi: "san_pham",
          idNhom: null,
          idSanPham: "X",
          idBienThe: null,
          soLuong: 1,
        },
      ],
    });
    const cart = [
      dong({
        idBienThe: "btX1",
        idSanPham: "X",
        idNhom: "A",
        soLuong: 3,
        giaHienThi: 100_000,
      }),
    ];
    const units = buildUnits(cart);
    const { giamCombo, apDung } = tinhGiamCombo(units, [c]);
    assert.equal(apDung.length, 1);
    assert.equal(apDung[0]!.soLan, 1);
    assert.equal(giamCombo, 30_000);
    assert.equal(units.filter((u) => u.used).length, 3);
  });
});

describe("uu-dai ap_dung_lap", () => {
  it("mua đủ 2 lần tổ hợp → giảm ×2", () => {
    const c = combo({
      id: "c2",
      ten: "Combo lap",
      loaiGiam: "so_tien",
      giaTri: 10_000,
      apDungLap: true,
      dieuKien: [
        {
          id: "d1",
          idCombo: "c2",
          phamVi: "loai_hang",
          idNhom: "A",
          idSanPham: null,
          idBienThe: null,
          soLuong: 2,
        },
        {
          id: "d2",
          idCombo: "c2",
          phamVi: "loai_hang",
          idNhom: "C",
          idSanPham: null,
          idBienThe: null,
          soLuong: 1,
        },
      ],
    });
    const cart = [
      dong({
        idBienThe: "a1",
        idSanPham: "sa",
        idNhom: "A",
        soLuong: 4,
        giaHienThi: 50_000,
      }),
      dong({
        idBienThe: "c1",
        idSanPham: "sc",
        idNhom: "C",
        soLuong: 2,
        giaHienThi: 40_000,
      }),
    ];
    const r = applyUuDai(cart, [c], null);
    assert.equal(r.comboApDung[0]?.soLan, 2);
    assert.equal(r.giamCombo, 20_000);
    assert.equal(r.tongHang, 4 * 50_000 + 2 * 40_000);
    assert.equal(r.tongTien, r.tongHang - 20_000);
  });
});

describe("uu-dai voucher", () => {
  it("giảm % sau combo, so don_toi_thieu với tongHang", () => {
    const cart = [
      dong({
        idBienThe: "b1",
        idSanPham: "s1",
        idNhom: "n1",
        soLuong: 1,
        giaHienThi: 200_000,
      }),
    ];
    const r = applyUuDai(cart, [], {
      id: "v1",
      idNguoiDung: "seller",
      ma: "SALE10",
      ten: "Sale",
      moTa: null,
      loaiGiam: "phan_tram",
      giaTri: 10,
      giamToiDa: null,
      donToiThieu: 100_000,
      soLuongTong: null,
      soLuongDaDung: 0,
      gioiHanMoiNguoi: 1,
      batDau: null,
      ketThuc: null,
      kichHoat: true,
      congKhai: true,
      designKieu: "mac_dinh",
      designAnhId: null,
      designAnhUrl: null,
      designMauNen: null,
      designMauChu: null,
      designNhan: null,
      taoLuc: new Date().toISOString(),
    });
    assert.equal(r.giamVoucher, 20_000);
    assert.equal(r.tongTien, 180_000);
  });

  it("không áp khi dưới don_toi_thieu", () => {
    const cart = [
      dong({
        idBienThe: "b1",
        idSanPham: "s1",
        soLuong: 1,
        giaHienThi: 50_000,
      }),
    ];
    const r = applyUuDai(cart, [], {
      id: "v1",
      idNguoiDung: "seller",
      ma: "SALE10",
      ten: "Sale",
      moTa: null,
      loaiGiam: "phan_tram",
      giaTri: 10,
      giamToiDa: null,
      donToiThieu: 100_000,
      soLuongTong: null,
      soLuongDaDung: 0,
      gioiHanMoiNguoi: 1,
      batDau: null,
      ketThuc: null,
      kichHoat: true,
      congKhai: true,
      designKieu: "mac_dinh",
      designAnhId: null,
      designAnhUrl: null,
      designMauNen: null,
      designMauChu: null,
      designNhan: null,
      taoLuc: new Date().toISOString(),
    });
    assert.equal(r.giamVoucher, 0);
    assert.equal(r.tongTien, 50_000);
  });
});
