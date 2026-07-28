-- Thông tin người nhận hàng cho shop (phục vụ xuất vận đơn ViettelPost).
--
-- user_nguoi_dung: SĐT (so_dien_thoai) + địa chỉ (dia_chi_chi_tiet) + tỉnh/thành
-- (tinh_thanh) đã có sẵn với visibility_sdt / visibility_dia_chi. Chỉ thiếu
-- HỌ TÊN THẬT người nhận (ten_hien_thi thường là nickname) → thêm ho_ten_nhan
-- kèm visibility riêng, mặc định private (chỉ hiện cho người bán khi đặt đơn).
alter table public.user_nguoi_dung
  add column if not exists ho_ten_nhan text,
  add column if not exists visibility_ho_ten_nhan visibility_field_enum
    not null default 'private';

-- shop_don_hang: snapshot thông tin nhận hàng LÚC ĐẶT ĐƠN — bất biến, để người
-- bán xuất vận đơn đúng địa chỉ kể cả khi người mua đổi hồ sơ sau này.
alter table public.shop_don_hang
  add column if not exists mua_ho_ten text,
  add column if not exists mua_so_dien_thoai text,
  add column if not exists mua_dia_chi text;
