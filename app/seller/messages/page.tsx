import { redirect } from "next/navigation";

/** Tab Tin nhắn đã gỡ — dùng chat dock trên trang quản lý shop. */
export default function BanHangMessagesRedirectPage() {
  redirect("/seller/inventory");
}
